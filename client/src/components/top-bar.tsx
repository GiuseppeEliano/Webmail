import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, Search, RefreshCw, Settings } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  onSidebarToggle: () => void;
  currentUser?: User | null;
  onSettingsClick?: () => void;
}

export default function TopBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSidebarToggle,
  currentUser,
  onSettingsClick,
}: TopBarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<number>(0); // Force re-render key

  useEffect(() => {
    // Update profile picture when currentUser changes, but only once to avoid duplicate loading
    if (currentUser?.profilePicture !== profilePicture) {
      setProfilePicture(currentUser?.profilePicture || null);
    }
  }, [currentUser?.profilePicture]);

  useEffect(() => {
    const handleProfilePictureChange = (event: CustomEvent) => {
      const { userId, profilePicture } = event.detail;
      if (currentUser && userId === currentUser.id) {
        console.log('TopBar: Profile picture changed event received', { userId, profilePicture });
        setProfilePicture(profilePicture);
      }
    };

    const handleUserDataUpdate = (event: CustomEvent) => {
      const userData = event.detail;
      if (currentUser && userData.id === currentUser.id) {
        console.log('TopBar: User data update event received', userData);
        setProfilePicture(userData.profilePicture || null);
      }
    };

    const handleForceProfilePictureRefresh = (event: CustomEvent) => {
      const { userId } = event.detail;
      if (currentUser && userId === currentUser.id) {
        console.log('TopBar: Force profile picture refresh event received', { userId });
        // Force refresh by refetching user data
        queryClient.refetchQueries({ queryKey: [`/api/user/${userId}`] });
        setProfilePicture(null);
      }
    };

    const handleForceUIRefresh = (event: CustomEvent) => {
      const { userId, action } = event.detail;
      if (currentUser && userId === currentUser.id) {
        console.log('TopBar: Force UI refresh event received', { userId, action });
        // Force immediate state update to null and trigger re-render
        setProfilePicture(null);
        // Force avatar re-render with new key
        setAvatarKey(prevKey => prevKey + 1);
        // Then force a complete refetch and re-render
        queryClient.refetchQueries({ queryKey: [`/api/user/${userId}`] });
      }
    };

    window.addEventListener('profilePictureChanged', handleProfilePictureChange as EventListener);
    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    window.addEventListener('forceProfilePictureRefresh', handleForceProfilePictureRefresh as EventListener);
    window.addEventListener('forceUIRefresh', handleForceUIRefresh as EventListener);
    
    return () => {
      window.removeEventListener('profilePictureChanged', handleProfilePictureChange as EventListener);
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
      window.removeEventListener('forceProfilePictureRefresh', handleForceProfilePictureRefresh as EventListener);
      window.removeEventListener('forceUIRefresh', handleForceUIRefresh as EventListener);
    };
  }, [currentUser?.id, queryClient]);

  // Mock storage data - in real app this would come from API
  const usedStorage = 2; // MB
  const totalStorage = 500; // MB
  const storagePercentage = (usedStorage / totalStorage) * 100;

  const getUserInitials = (user: User | null) => {
    if (!user) return "U";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const initials = (firstName[0] || "") + (lastName[0] || "");
    return initials.toUpperCase() || "U";
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all queries to force refresh
      await queryClient.invalidateQueries();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      onSearchSubmit(searchQuery.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  return (
    <header className="bg-card/50 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between gap-4 relative" style={{ zIndex: 60 }}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onSidebarToggle}
        className="lg:hidden text-muted-foreground hover:text-foreground flex-shrink-0"
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="flex-1 max-w-[593px]">
        <div className="relative">
          <Input
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-muted border-border rounded-xl py-2 pl-10 pr-12 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <Search className="absolute left-3 top-2.5 text-muted-foreground h-4 w-4" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearchSubmit}
            className="absolute right-1 top-1 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
            title={t('search')}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-4" style={{ zIndex: 70, position: 'relative' }}>
        {/* Mobile: Settings icon, Desktop: Refresh icon */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSettingsClick}
          className="md:hidden text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Configurações"
        >
          <Settings className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="hidden md:block text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Atualizar"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>

        {/* User Info - Desktop only */}
        {currentUser && (
          <Button
            variant="ghost"
            onClick={onSettingsClick}
            className="hidden md:flex items-center space-x-2 p-2 rounded-xl hover:bg-accent"
            style={{ zIndex: 70, position: 'relative' }}
            title={t('openSettings')}
          >
            <Avatar key={avatarKey} className="w-7 h-7">
              {profilePicture ? (
                <AvatarImage src={profilePicture} alt="Profile" />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-primary to-blue-400 text-primary-foreground text-xs">
                  {getUserInitials(currentUser)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium truncate max-w-32">
                {`${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentUser.email || "user@example.com"}
              </p>
            </div>
            <Settings className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>
    </header>
  );
}
