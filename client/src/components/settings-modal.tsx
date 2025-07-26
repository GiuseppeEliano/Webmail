import React, { useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/use-language";
import { languages, setCurrentLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  User, 
  Mail, 
  Palette, 
  X,
  Upload,
  Check,
  Monitor,
  Sun,
  Moon,
  Trash2,
  Star,
  AlertTriangle,
  Archive,
  Folder,
  ChevronLeft,
  ChevronRight,
  Lock,
  Copy,
  Shield
} from "lucide-react";
import type { User as UserType } from "shared/schema";
import { AliasPanel } from "./alias-panel";
import { PasswordChangeModal } from "./password-change-modal";

// Blocked Senders Panel Component
function BlockedSendersPanel({ userId }: { userId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  // Fetch blocked senders
  const { data: blockedSenders = [], isLoading } = useQuery({
    queryKey: [`/api/blocked-senders/${userId}`],
    enabled: !!userId
  });

  // Type the blockedSenders data properly
  const typedBlockedSenders = blockedSenders as Array<{
    id: number;
    blockedEmail: string;
    createdAt: string;
  }>;

  const unblockSender = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/blocked-senders/${id}`);
      queryClient.invalidateQueries({ queryKey: [`/api/blocked-senders/${userId}`] });
      toast({
        title: t('senderUnblocked'),
        description: t('senderUnblockedDescription'),
      });
    } catch (error) {
      console.error("Failed to unblock sender:", error);
      toast({
        title: t('error'),
        description: t('cannotUnblockSender'),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-medium mb-2">{t('blockedSenders')}</h4>
        <p className="text-muted-foreground mb-6">
          {t('blockedSendersDescription')}
        </p>
      </div>

      {typedBlockedSenders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('noBlockedSenders')}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {typedBlockedSenders.map((blocked) => (
            <div key={blocked.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{blocked.blockedEmail}</p>
                <p className="text-sm text-muted-foreground">
                  {t('blockedOn')} {new Date(blocked.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unblockSender(blocked.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const accountSchema = z.object({
  firstName: z.string()
    .min(2, "Nome é obrigatório")
    .max(48, "Nome deve ter no máximo 48 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ'\s]+$/, "Nome deve conter apenas letras, espaços e apostrofes")
    .refine(val => !val.startsWith(' ') && !val.startsWith("'"), "Nome não pode começar com espaço ou apostrofe")
    .transform(val => val.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')),
  lastName: z.string()
    .min(2, "Sobrenome é obrigatório")
    .max(48, "Sobrenome deve ter no máximo 48 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ'\s]+$/, "Sobrenome deve conter apenas letras, espaços e apostrofes")
    .refine(val => !val.startsWith(' ') && !val.startsWith("'"), "Sobrenome não pode começar com espaço ou apostrofe")
    .transform(val => val.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')),
  email: z.string().email("Invalid email address"),
  signature: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface SettingsModalProps {
  user: UserType;
  onClose: () => void;
  onSave: (userData: Partial<UserType>) => Promise<void>;
}

export default function SettingsModal({ user, onClose, onSave }: SettingsModalProps) {
  const { currentLanguage, t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(
    user.profilePicture || null
  );
  const [avatarKey, setAvatarKey] = useState<number>(0); // Force re-render key
  
  // Sync profilePicture state with user prop changes
  React.useEffect(() => {
    setProfilePicture(user.profilePicture || null);
  }, [user.profilePicture]);
  
  // Fetch folders for swipe configuration
  const { data: folders = [] } = useQuery({
    queryKey: [`/api/folders/${authUser?.id}`],
    enabled: activeTab === "appearance" && !!authUser?.id
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [theme, setTheme] = useState(() => 
    localStorage.getItem('theme') || 'system'
  );
  const [avatarShape, setAvatarShape] = useState(() =>
    localStorage.getItem('avatarShape') || 'rounded'
  );
  const [accentColor, setAccentColor] = useState(() => 
    localStorage.getItem('accentColor') || 'blue'
  );
  const [emailViewMode, setEmailViewMode] = useState(() => 
    localStorage.getItem('emailViewMode') || 'sidebar'
  );
  const [emailsPerPage, setEmailsPerPage] = useState(() => 
    user.emailsPerPage || 20
  );
  const [leftSwipeAction, setLeftSwipeAction] = useState(() => 
    localStorage.getItem('leftSwipeAction') || 'trash'
  );
  const [rightSwipeAction, setRightSwipeAction] = useState(() => 
    localStorage.getItem('rightSwipeAction') || 'archive'
  );
  const [swipeCustomFolder, setSwipeCustomFolder] = useState(() => 
    localStorage.getItem('swipeCustomFolder') || ''
  );
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      signature: user.signature || "",
    },
  });

  // Track changes to enable/disable save button
  const watchedFirstName = form.watch("firstName");
  const watchedLastName = form.watch("lastName");
  
  const hasNameChanges = useMemo(() => {
    const currentFirstName = watchedFirstName || "";
    const currentLastName = watchedLastName || "";
    const originalFirstName = user.firstName || "";
    const originalLastName = user.lastName || "";
    
    return currentFirstName !== originalFirstName || currentLastName !== originalLastName;
  }, [watchedFirstName, watchedLastName, user.firstName, user.lastName]);

  const handleSave = async (data: AccountFormData) => {
    setIsSaving(true);
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme immediately using the correct approach
    const root = document.documentElement;
    
    // Force a reflow to ensure theme changes are applied immediately
    if (newTheme === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.remove('dark', 'light');
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    }
    
    // Force browser to recalculate styles immediately
    document.body.offsetHeight;
    
    // Dispatch event for any components listening to theme changes
    window.dispatchEvent(new CustomEvent('themeChange', { 
      detail: { theme: newTheme } 
    }));
    
    // Additional force refresh for top bar
    setTimeout(() => {
      const topBar = document.querySelector('header');
      if (topBar) {
        topBar.style.transition = 'none';
        topBar.offsetHeight; // Force reflow
        topBar.style.transition = '';
      }
    }, 50);
  };

  const handleAvatarShapeChange = (newShape: string) => {
    setAvatarShape(newShape);
    localStorage.setItem('avatarShape', newShape);
    
    window.dispatchEvent(new CustomEvent('avatarShapeChange', { 
      detail: { shape: newShape } 
    }));
  };

  const handleAccentColorChange = (newColor: string) => {
    setAccentColor(newColor);
    localStorage.setItem('accentColor', newColor);
    
    // Apply accent color immediately
    const root = document.documentElement;
    const colors = {
      blue: { primary: 'hsl(243, 75%, 59%)', primaryForeground: 'hsl(0, 0%, 98%)' },
      purple: { primary: 'hsl(271, 81%, 56%)', primaryForeground: 'hsl(0, 0%, 98%)' },
      green: { primary: 'hsl(142, 76%, 36%)', primaryForeground: 'hsl(0, 0%, 98%)' },
      orange: { primary: 'hsl(25, 95%, 53%)', primaryForeground: 'hsl(0, 0%, 98%)' },
      red: { primary: 'hsl(346, 87%, 43%)', primaryForeground: 'hsl(0, 0%, 98%)' },
      pink: { primary: 'hsl(330, 81%, 60%)', primaryForeground: 'hsl(0, 0%, 98%)' }
    };
    
    const selectedColors = colors[newColor as keyof typeof colors] || colors.blue;
    root.style.setProperty('--primary', selectedColors.primary);
    root.style.setProperty('--primary-foreground', selectedColors.primaryForeground);
    
    window.dispatchEvent(new CustomEvent('accentColorChange', { 
      detail: { color: newColor } 
    }));
  };

  const handleEmailViewModeChange = (mode: string) => {
    setEmailViewMode(mode);
    localStorage.setItem('emailViewMode', mode);
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('emailViewModeChanged', { detail: mode }));
  }

  const handleEmailsPerPageChange = async (newValue: number) => {
    try {
      setEmailsPerPage(newValue);
      
      // Update the user's emailsPerPage setting in the database
      const response = await fetch(`/api/user/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          emailsPerPage: newValue
        })
      });
      
      if (response.ok) {
        // Clear user cache to refetch updated data
        queryClient.removeQueries({ queryKey: [`/api/user/${user.id}`] });
        queryClient.removeQueries({ queryKey: [`/api/user/${authUser?.id}`] });
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('emailsPerPageChanged', { detail: newValue }));
        
        toast({
          title: "Configuração salva",
          description: `Exibindo ${newValue} emails por página`,
        });
      } else {
        throw new Error('Failed to update emails per page setting');
      }
    } catch (error) {
      console.error('Error updating emailsPerPage:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configuração",
        variant: "destructive",
      });
      // Revert the local state on error
      setEmailsPerPage(user.emailsPerPage || 20);
    }
  };

  const handleSwipeActionChange = (direction: 'left' | 'right', action: string) => {
    // Prevent same action for both directions
    if (direction === 'left' && action === rightSwipeAction) return;
    if (direction === 'right' && action === leftSwipeAction) return;
    
    if (direction === 'left') {
      setLeftSwipeAction(action);
      localStorage.setItem('leftSwipeAction', action);
    } else {
      setRightSwipeAction(action);
      localStorage.setItem('rightSwipeAction', action);
    }
    
    window.dispatchEvent(new CustomEvent('swipeActionsChanged', { 
      detail: { leftSwipeAction: direction === 'left' ? action : leftSwipeAction, rightSwipeAction: direction === 'right' ? action : rightSwipeAction }
    }));
  };

  const handleCustomFolderChange = (folderId: string) => {
    setSwipeCustomFolder(folderId);
    localStorage.setItem('swipeCustomFolder', folderId);
    
    window.dispatchEvent(new CustomEvent('swipeCustomFolderChanged', { detail: folderId }));
  };

  const getUserInitials = (user: UserType) => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const initials = (firstName[0] || "") + (lastName[0] || "");
    return initials.toUpperCase() || user.email?.substring(0, 2).toUpperCase() || 'U';
  };

  const handleRemoveProfilePicture = async () => {
    try {
      const response = await fetch(`/api/user/${user.id}/profile-picture`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Update local state immediately
        setProfilePicture(null);
        
        // Force avatar re-render with new key
        setAvatarKey(prevKey => prevKey + 1);
        
        // Clear all user-related cache and force fresh data
        queryClient.removeQueries({ queryKey: [`/api/user/${authUser?.id}`] });
        queryClient.removeQueries({ queryKey: [`/api/user/${user.id}`] });
        
        // Force immediate refetch to get updated user data
        await queryClient.refetchQueries({ queryKey: [`/api/user/${authUser?.id}`] });
        await queryClient.refetchQueries({ queryKey: [`/api/user/${user.id}`] });
        
        // Create updated user data with null profile picture
        const updatedUserData = { ...user, profilePicture: null };
        
        // Dispatch comprehensive update events
        window.dispatchEvent(new CustomEvent('profilePictureChanged', { 
          detail: { userId: user.id, profilePicture: null }
        }));
        
        window.dispatchEvent(new CustomEvent('userDataUpdated', { 
          detail: updatedUserData
        }));

        window.dispatchEvent(new CustomEvent('forceProfilePictureRefresh', { 
          detail: { userId: user.id }
        }));

        // Force additional event after delay to ensure all components update
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('profilePictureChanged', { 
            detail: { userId: user.id, profilePicture: null }
          }));
          
          // Force complete UI refresh by triggering re-render
          window.dispatchEvent(new CustomEvent('forceUIRefresh', { 
            detail: { userId: user.id, action: 'profilePictureRemoved' }
          }));
        }, 100);

        toast({
          title: "Sucesso",
          description: "Foto de perfil removida com sucesso!",
        });
      } else {
        throw new Error('Failed to remove profile picture');
      }
    } catch (error) {
      console.error('Error removing profile picture:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover foto de perfil. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Clear all caches and reload
        queryClient.clear();
        window.location.reload();
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Force reload even if logout endpoint fails
      window.location.reload();
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem válido.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro", 
        description: "A imagem deve ter menos de 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create FormData for direct file upload
      const formData = new FormData();
      formData.append('profilePicture', file);

      // Upload file directly to the server
      const response = await fetch(`/api/user/${user.id}/profile-picture`, {
        method: 'POST',
        body: formData,
        credentials: 'include' // Include session cookie
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        // Update local state with server response (URL instead of base64)
        setProfilePicture(updatedUser.profilePicture);
        
        // Update query cache to reflect the change immediately
        queryClient.invalidateQueries({ queryKey: [`/api/user/${authUser?.id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/user/${user.id}`] });
        
        // Force a refresh of all user-related queries
        queryClient.refetchQueries({ queryKey: [`/api/user/${authUser?.id}`] });
        
        // Dispatch event to update avatar globally
        window.dispatchEvent(new CustomEvent('profilePictureChanged', { 
          detail: { userId: user.id, profilePicture: updatedUser.profilePicture }
        }));

        toast({
          title: "Sucesso",
          description: "Foto de perfil atualizada com sucesso!",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save profile picture');
      }
    } catch (error) {
      console.error('Error saving profile picture:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar foto de perfil. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEmailCopy = async () => {
    try {
      await navigator.clipboard.writeText(user.email || '');
      toast({
        title: "Copiado!",
        description: "Endereço de email copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o endereço de email.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] max-h-[85vh] flex flex-col lg:flex-row p-0 gap-0 overflow-hidden" style={{ zIndex: 100 }}>
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 bg-muted/30 border-r-0 lg:border-r border-b lg:border-b-0 border-border p-4 lg:p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-lg font-semibold">{t('settings')}</DialogTitle>
          </DialogHeader>
          
          {/* Mobile Dropdown */}
          <div className="lg:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="account">
                  <div className="flex items-center">
                    <User className="mr-3 h-4 w-4" />
                    {t('account')}
                  </div>
                </SelectItem>
                <SelectItem value="aliases">
                  <div className="flex items-center">
                    <Mail className="mr-3 h-4 w-4" />
                    {t('aliases')}
                  </div>
                </SelectItem>
                <SelectItem value="appearance">
                  <div className="flex items-center">
                    <Palette className="mr-3 h-4 w-4" />
                    {t('appearance')}
                  </div>
                </SelectItem>
                <SelectItem value="blocked">
                  <div className="flex items-center">
                    <Shield className="mr-3 h-4 w-4" />
                    {t('blocked')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex flex-col space-y-2">
            <button
              onClick={() => setActiveTab("account")}
              className={`w-full flex items-center justify-start p-4 rounded-xl font-medium transition-all duration-200 ${
                activeTab === "account"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                  : "bg-transparent text-foreground hover:bg-accent/50"
              }`}
            >
              <User className="mr-3 h-4 w-4" />
              {t('account')}
            </button>
            <button
              onClick={() => setActiveTab("aliases")}
              className={`w-full flex items-center justify-start p-4 rounded-xl font-medium transition-all duration-200 ${
                activeTab === "aliases"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                  : "bg-transparent text-foreground hover:bg-accent/50"
              }`}
            >
              <Mail className="mr-3 h-4 w-4" />
              {t('aliases')}
            </button>
            <button
              onClick={() => setActiveTab("appearance")}
              className={`w-full flex items-center justify-start p-4 rounded-xl font-medium transition-all duration-200 ${
                activeTab === "appearance"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                  : "bg-transparent text-foreground hover:bg-accent/50"
              }`}
            >
              <Palette className="mr-3 h-4 w-4" />
              {t('appearance')}
            </button>
            <button
              onClick={() => setActiveTab("blocked")}
              className={`w-full flex items-center justify-start p-4 rounded-xl font-medium transition-all duration-200 ${
                activeTab === "blocked"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                  : "bg-transparent text-foreground hover:bg-accent/50"
              }`}
            >
              <Shield className="mr-3 h-4 w-4" />
              {t('blocked')}
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-xl font-semibold">
              {t(activeTab)} {t('settings')}
            </h3>
          </div>

          {/* Settings Form */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsContent value="account" className="flex-1 overflow-y-auto scroll-custom m-0 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
              <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto scroll-custom p-4 lg:p-6 space-y-4 lg:space-y-6">
                  {/* Email field - full width, positioned above name fields */}
                  <div className="w-full">
                    <Label htmlFor="email">{t('email')}</Label>
                    <div className="relative mt-2">
                      <Input
                        id="email"
                        type="email"
                        value={user.email || ''}
                        readOnly
                        disabled
                        onClick={handleEmailCopy}
                        className="cursor-pointer pr-10 w-full"
                        title="Clique para copiar"
                      />
                      <Copy 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
                        onClick={handleEmailCopy}
                      />
                    </div>
                  </div>

                  {/* Name fields - side by side layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <Label htmlFor="firstName">{t('firstName') || 'Nome'}</Label>
                      <Input
                        id="firstName"
                        {...form.register("firstName")}
                        className="mt-2"
                        maxLength={48}
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t('lastName') || 'Sobrenome'}</Label>
                      <Input
                        id="lastName"
                        {...form.register("lastName")}
                        className="mt-2"
                        maxLength={48}
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 lg:gap-6">
                    <div>
                      <Label htmlFor="language">{t('language')}</Label>
                      <Select 
                        value={selectedLanguage} 
                        onValueChange={(value) => {
                          setSelectedLanguage(value);
                          setCurrentLanguage(value);
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder={t('selectLanguage')} />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((language) => (
                            <SelectItem key={language.id} value={language.id}>
                              <div className="flex items-center space-x-2">
                                <span>{language.flag}</span>
                                <span>{language.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <Label>{t('profilePicture')}</Label>
                      <div className="flex items-center space-x-4 mt-2">
                        <Avatar key={avatarKey} className="h-16 w-16">
                          {profilePicture ? (
                            <AvatarImage src={profilePicture} alt="Profile" />
                          ) : (
                            <AvatarFallback className="text-lg">
                              {getUserInitials(user)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureUpload}
                            className="hidden"
                          />
                          <div className="flex gap-2 flex-col">
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="mb-1"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {t('uploadNew')}
                            </Button>
                            {profilePicture && (
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="text-red-600 hover:text-red-700"
                                onClick={handleRemoveProfilePicture}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('removePhoto')}
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('fileFormatDescription')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label>{t('security')}</Label>
                      <div className="mt-2">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setShowPasswordModal(true)}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          {t('changePassword')}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('updatePasswordDescription')}
                        </p>
                      </div>
                    </div>
                    

                  </div>
                  
                  {/* Storage Usage - Mobile only - Full width section */}
                  <div className="md:hidden">
                    <Label className="text-base font-medium">Armazenamento</Label>
                    <div className="mt-3 p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Usado</span>
                        <span className="text-sm font-semibold">2MB de 500MB</span>
                      </div>
                      <Progress value={0.4} className="h-3" />
                      <p className="text-xs text-muted-foreground text-center">
                        0.4% do armazenamento total usado
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signature">{t('signature')}</Label>
                    <Textarea
                      id="signature"
                      {...form.register("signature")}
                      className="mt-2 h-32"
                      placeholder={t('enterSignature')}
                    />
                  </div>

                  {/* Logout Button */}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                      onClick={handleLogout}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('logout')}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {t('logoutDescription')}
                    </p>
                  </div>
                </div>
                
                {/* Fixed bottom buttons */}
                <div className="border-t border-border p-4 lg:p-6 bg-card/50">
                  <div className="flex items-center justify-end space-x-3">
                    <Button type="button" variant="ghost" onClick={onClose}>
                      {t('cancel')}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSaving || !hasNameChanges} 
                      onClick={async (e) => {
                        e.preventDefault();
                        const isValid = await form.trigger();
                        if (isValid) {
                          const formData = form.getValues();
                          await handleSave(formData);
                          onClose();
                        }
                      }}
                    >
                      {isSaving ? t('saving') : t('save')}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="aliases" className="flex-1 overflow-y-auto scroll-custom m-0 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
              <div className="p-4 lg:p-6">
                <AliasPanel userId={user.id} />
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="flex-1 overflow-y-auto scroll-custom m-0 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
              <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
                <div>
                  <h4 className="text-lg font-medium mb-4">{t('theme')}</h4>
                  <p className="text-muted-foreground mb-6">
                    {t('themeDescription')}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        theme === 'system' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleThemeChange('system')}
                    >
                      <div className="flex items-center space-x-3">
                        <Monitor className={`h-5 w-5 ${theme === 'system' ? 'text-primary' : ''}`} />
                        <div>
                          <h5 className="font-medium">{t('system')}</h5>
                          <p className="text-sm text-muted-foreground">{t('systemDescription')}</p>
                        </div>
                      </div>
                    </div>
                    <div 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        theme === 'light' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleThemeChange('light')}
                    >
                      <div className="flex items-center space-x-3">
                        <Sun className={`h-5 w-5 ${theme === 'light' ? 'text-primary' : ''}`} />
                        <div>
                          <h5 className="font-medium">{t('light')}</h5>
                          <p className="text-sm text-muted-foreground">{t('lightDescription')}</p>
                        </div>
                      </div>
                    </div>
                    <div 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        theme === 'dark' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleThemeChange('dark')}
                    >
                      <div className="flex items-center space-x-3">
                        <Moon className={`h-5 w-5 ${theme === 'dark' ? 'text-primary' : ''}`} />
                        <div>
                          <h5 className="font-medium">{t('dark')}</h5>
                          <p className="text-sm text-muted-foreground">{t('darkDescription')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h4 className="text-lg font-medium mb-4">{t('accentColor')}</h4>
                    <p className="text-muted-foreground mb-6">
                      {t('accentColorDescription')}
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { name: 'blue', label: t('blue'), color: 'hsl(243, 75%, 59%)' },
                        { name: 'purple', label: t('purple'), color: 'hsl(271, 81%, 56%)' },
                        { name: 'green', label: t('green'), color: 'hsl(142, 76%, 36%)' },
                        { name: 'orange', label: t('orange'), color: 'hsl(25, 95%, 53%)' },
                        { name: 'red', label: t('red'), color: 'hsl(346, 87%, 43%)' },
                        { name: 'pink', label: t('pink'), color: 'hsl(330, 81%, 60%)' }
                      ].map((colorOption) => (
                        <div
                          key={colorOption.name}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                            accentColor === colorOption.name 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleAccentColorChange(colorOption.name)}
                        >
                          <div className="flex items-center space-x-3">
                            <div 
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: colorOption.color }}
                            />
                            <span className="font-medium text-sm">{colorOption.label}</span>
                            {accentColor === colorOption.name && (
                              <Check className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium mb-4">{t('avatarShape')}</h4>
                  <p className="text-muted-foreground mb-6">
                    {t('avatarShapeDescription')}
                  </p>
                  
                  <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                    <div 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        avatarShape === 'rounded' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleAvatarShapeChange('rounded')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm text-primary-foreground font-medium">AB</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-medium">{t('rounded')}</h5>
                          <p className="text-sm text-muted-foreground">{t('roundedDescription')}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        avatarShape === 'square' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleAvatarShapeChange('square')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-sm text-primary-foreground font-medium">AB</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-medium">{t('square')}</h5>
                          <p className="text-sm text-muted-foreground">{t('squareDescription')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {!isMobile && (
                  <div>
                    <h4 className="text-lg font-medium mb-4">{t('emailViewMode')}</h4>
                    <p className="text-muted-foreground mb-6">
                      {t('emailViewModeDescription')}
                    </p>
                    
                    <div className="space-y-4">
                    <div 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        emailViewMode === 'sidebar' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleEmailViewModeChange('sidebar')}
                    >
                      <div className="flex items-start space-x-3">
                        {emailViewMode === 'sidebar' && (
                          <Check className="h-5 w-5 text-primary mt-0.5" />
                        )}
                        <div>
                          <h5 className="font-medium">{t('leftSidebar')}</h5>
                          <p className="text-sm text-muted-foreground">
                            {t('leftSidebarDescription')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        emailViewMode === 'right-sidebar' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleEmailViewModeChange('right-sidebar')}
                    >
                      <div className="flex items-start space-x-3">
                        {emailViewMode === 'right-sidebar' && (
                          <Check className="h-5 w-5 text-primary mt-0.5" />
                        )}
                        <div>
                          <h5 className="font-medium">{t('rightSidebar')}</h5>
                          <p className="text-sm text-muted-foreground">
                            {t('rightSidebarDescription')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        emailViewMode === 'fullscreen' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleEmailViewModeChange('fullscreen')}
                    >
                      <div className="flex items-start space-x-3">
                        {emailViewMode === 'fullscreen' && (
                          <Check className="h-5 w-5 text-primary mt-0.5" />
                        )}
                        <div>
                          <h5 className="font-medium">{t('fullscreen')}</h5>
                          <p className="text-sm text-muted-foreground">
                            {t('fullscreenDescription')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                )}

                <div>
                  <h4 className="text-lg font-medium mb-4">{t('emailsPerPage')}</h4>
                  <p className="text-muted-foreground mb-6">
                    {t('emailsPerPageDescription')}
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[5, 20, 50, 100].map((value) => (
                      <div
                        key={value}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                          emailsPerPage === value 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleEmailsPerPageChange(value)}
                      >
                        <div className="text-center">
                          <h5 className="font-medium">{value}</h5>
                          <p className="text-sm text-muted-foreground">emails</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile-only swipe configuration */}
                <div className="block sm:hidden">
                  <h4 className="text-lg font-medium mb-4">{t('swipeActions')}</h4>
                  <p className="text-muted-foreground mb-6">
                    {t('swipeActionsDescription')}
                  </p>
                  
                  <div className="space-y-6">
                    {/* Left Swipe Configuration */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        <h5 className="font-medium">{t('swipeLeftAction')}</h5>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { id: 'trash', label: t('moveToTrash'), icon: Trash2, color: 'bg-red-500/30 border-red-500', disabled: rightSwipeAction === 'trash' },
                          { id: 'starred', label: t('addToStarred'), icon: Star, color: 'bg-yellow-500/30 border-yellow-500', disabled: rightSwipeAction === 'starred' },
                          { id: 'junk', label: t('moveToSpam'), icon: AlertTriangle, color: 'bg-orange-500/30 border-orange-500', disabled: rightSwipeAction === 'junk' },
                          { id: 'custom', label: t('customFolder'), icon: Folder, color: 'bg-blue-500/30 border-blue-500', disabled: rightSwipeAction === 'custom' }
                        ].map((action) => (
                          <div
                            key={action.id}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                              leftSwipeAction === action.id && !action.disabled
                                ? 'border-primary bg-primary/5' 
                                : action.disabled
                                ? 'border-border bg-muted/50 opacity-50 cursor-not-allowed'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => !action.disabled && handleSwipeActionChange('left', action.id)}
                          >
                            <div className="text-center space-y-2">
                              <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center ${
                                leftSwipeAction === action.id && !action.disabled ? action.color : 'bg-muted'
                              }`}>
                                <action.icon className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-medium">{action.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Swipe Configuration */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <h5 className="font-medium">{t('swipeRightAction')}</h5>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { id: 'trash', label: t('moveToTrash'), icon: Trash2, color: 'bg-red-500/30 border-red-500', disabled: leftSwipeAction === 'trash' },
                          { id: 'starred', label: t('addToStarred'), icon: Star, color: 'bg-yellow-500/30 border-yellow-500', disabled: leftSwipeAction === 'starred' },
                          { id: 'junk', label: t('moveToSpam'), icon: AlertTriangle, color: 'bg-orange-500/30 border-orange-500', disabled: leftSwipeAction === 'junk' },
                          { id: 'custom', label: t('customFolder'), icon: Folder, color: 'bg-blue-500/30 border-blue-500', disabled: leftSwipeAction === 'custom' }
                        ].map((action) => (
                          <div
                            key={action.id}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                              rightSwipeAction === action.id && !action.disabled
                                ? 'border-primary bg-primary/5' 
                                : action.disabled
                                ? 'border-border bg-muted/50 opacity-50 cursor-not-allowed'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => !action.disabled && handleSwipeActionChange('right', action.id)}
                          >
                            <div className="text-center space-y-2">
                              <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center ${
                                rightSwipeAction === action.id && !action.disabled ? action.color : 'bg-muted'
                              }`}>
                                <action.icon className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-medium">{action.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Custom Folder Selection */}
                    {(leftSwipeAction === 'custom' || rightSwipeAction === 'custom') && (
                      <div>
                        <h5 className="font-medium mb-3">{t('selectCustomFolder')}</h5>
                        <Select value={swipeCustomFolder} onValueChange={handleCustomFolderChange}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('chooseAFolder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {(folders as any[]).filter((f: any) => f.type === "custom").map((folder: any) => (
                              <SelectItem key={folder.id} value={folder.id.toString()}>
                                <div className="flex items-center space-x-2">
                                  <Folder className="h-4 w-4" />
                                  <span>{folder.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="blocked" className="flex-1 overflow-y-auto scroll-custom m-0 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
              <div className="p-4 lg:p-6">
                <BlockedSendersPanel userId={user.id} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>

    {/* Password Change Modal */}
    <PasswordChangeModal 
      isOpen={showPasswordModal}
      onClose={() => setShowPasswordModal(false)}
      userId={user.id}
    />
    </>
  );
}