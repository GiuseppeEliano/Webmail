import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Mail, 
  Star, 
  Send, 
  FileText, 
  AlertTriangle, 
  Trash2, 
  Folder as FolderIcon, 
  Plus,
  Settings,
  Inbox,
  Heart,
  Briefcase,
  Home,
  Users,
  BookOpen,
  Camera,
  Music,
  Gamepad2,
  ShoppingCart,
  Plane,
  Tag as TagIcon,
  Edit,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Archive
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useIsMobile } from "@/hooks/use-mobile";
import { StorageIndicator } from "@/components/storage-indicator";
import { SYSTEM_FOLDERS, getSystemFolderName } from "@/lib/system-folders";
import type { Folder, User, Tag as TagType } from "@shared/schema";

interface SidebarProps {
  currentFolder: string;
  folders: Folder[];
  tags?: TagType[];
  emailCounts: { [key: string]: number };
  currentUser: User | null;
  onFolderChange: (folderType: string) => void;
  onTagSelect?: (tagName: string) => void;
  onCompose: () => void;
  onSettingsClick: () => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: Folder) => void;
  onCreateTag?: () => void;
  onEditTag?: (tag: TagType) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onEmailDrop?: (emailId: number, folderId: number) => void;
  onToggleStar?: (emailId: number) => void;
}

const folderIcons = {
  inbox: Mail,
  archive: Archive,
  starred: Star,
  sent: Send,
  drafts: FileText,
  junk: AlertTriangle,
  trash: Trash2,
};

const iconMap = {
  "inbox": Inbox,
  "star": Star,
  "send": Send,
  "file-text": FileText,
  "alert-triangle": AlertTriangle,
  "trash2": Trash2,
  "folder": FolderIcon,
  "tag": TagIcon,
  "heart": Heart,
  "briefcase": Briefcase,
  "home": Home,
  "users": Users,
  "book-open": BookOpen,
  "camera": Camera,
  "music": Music,
  "gamepad2": Gamepad2,
  "shopping-cart": ShoppingCart,
  "plane": Plane,
};

// Tag Item Component
interface TagItemProps {
  tag: TagType;
  onClick: () => void;
  onEdit: () => void;
  isCollapsed: boolean;
}

function TagItem({ tag, onClick, onEdit, isCollapsed }: TagItemProps) {
  const tagButton = (
    <button
      onClick={onClick}
      className={`flex items-center text-left text-sm font-medium ${isCollapsed ? 'w-full justify-center' : 'flex-1'}`}
    >
      <div 
        className={`w-2 h-2 rounded-full flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`}
        style={{ backgroundColor: tag.color }}
      />
      {!isCollapsed && (
        <span className="truncate flex-1">{tag.name}</span>
      )}
    </button>
  );

  return (
    <div className={`relative group flex items-center w-full hover:bg-accent rounded-lg transition-colors ${isCollapsed ? 'px-2 py-3' : 'px-3 py-2'}`}>
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {tagButton}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {tag.name}
          </TooltipContent>
        </Tooltip>
      ) : (
        tagButton
      )}
      {!isCollapsed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-foreground/60 hover:text-foreground ml-2"
        >
          <Edit className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}



function Sidebar({
  currentFolder,
  folders,
  tags = [],
  emailCounts,
  currentUser,
  onFolderChange,
  onTagSelect,
  onCompose,
  onSettingsClick,
  onCreateFolder,
  onEditFolder,
  onCreateTag,
  onEditTag,
  isMobileOpen,
  onMobileClose,
  isCollapsed = false,
  onToggleCollapse,
  onEmailDrop,
  onToggleStar,
}: SidebarProps) {
  const [location] = useLocation();
  const { t } = useLanguage();
  const [customFoldersExpanded, setCustomFoldersExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);

  const getUserInitials = (user: User | null) => {
    if (!user) return "U";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const initials = (firstName[0] || "") + (lastName[0] || "");
    return initials.toUpperCase() || user.email?.substring(0, 2).toUpperCase() || 'U';
  };

  // Use native system folders instead of database folders
  const customFolders = folders.filter(f => f.type === "custom");

  const NavItem = ({ 
    folder, 
    isActive, 
    onClick,
    onEmailDrop
  }: { 
    folder: Folder; 
    isActive: boolean; 
    onClick: () => void;
    onEmailDrop?: (emailId: number, folderId: number) => void;
  }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const isMobile = useIsMobile();
    
    // Check if this folder can accept drops
    const canAcceptDrop = (dragData: any) => {
      if (!dragData || !onEmailDrop || isMobile) return false;
      
      // Special case: If email is from drafts or sent, only allow drop to trash folder
      if (dragData.isInDraftsOrSent === true) {
        return folder.systemType.toLowerCase() === 'trash';
      }
      
      // Don't allow drop on sent, drafts, or current folder
      const restrictedTypes = ['sent', 'drafts'];
      if (restrictedTypes.includes(folder.systemType.toLowerCase() || '')) return false;
      if (dragData.currentFolderId === folder.id) return false;
      
      return true;
    };

    const handleDragOver = (e: React.DragEvent) => {
      if (isMobile) return;
      
      e.preventDefault();
      
      // Get drag data from global variable since dataTransfer.getData() is empty during dragover
      const dragData = (window as any).currentDragData || {};
      
      if (canAcceptDrop(dragData)) {
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      } else {
        e.dataTransfer.dropEffect = 'none';
        setIsDragOver(false);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      if (isMobile) return;
      
      // Only hide drag over if we're leaving the actual folder item
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragOver(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      if (isMobile) return;
      
      e.preventDefault();
      setIsDragOver(false);
      
      // Try to get drag data safely
      let dragData = {};
      try {
        const dataText = e.dataTransfer.getData('application/json');
        if (dataText) {
          dragData = JSON.parse(dataText);
        }
      } catch (error) {
        console.warn('Failed to parse drop data:', error);
        return;
      }
      

      
      if (canAcceptDrop(dragData) && onEmailDrop) {
        // Special handling for starred folder - just toggle star instead of moving
        if (folder.systemType === 'starred') {
          onToggleStar?.(dragData.emailId);
        } else {
          onEmailDrop(dragData.emailId, folder.id);
        }
      }
    };

    // Use custom icon if available, fallback to system icon, then to folder icon
    const IconComponent = folder.icon 
      ? iconMap[folder.icon as keyof typeof iconMap] || FolderIcon
      : folder.systemType 
        ? folderIcons[folder.systemType as keyof typeof folderIcons] || FolderIcon 
        : FolderIcon;
    
    const count = emailCounts[folder.systemType || folder.name] || 0;
    const folderColor = folder.color || "#6366f1";
    
    // Only show count for inbox and junk, and only if > 0
    const shouldShowCount = (folder.systemType === "inbox" || folder.systemType === "junk") && count > 0;

    return (
      <div className="flex items-center group relative">
        <button
          onClick={onClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`nav-item flex-1 flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2'} text-sm font-medium rounded-lg transition-all duration-200 ${
            isActive
              ? "nav-item active bg-gradient-to-r from-primary/20 to-blue-500/20 text-primary border border-primary/30"
              : "text-foreground/70 hover:bg-accent hover:text-accent-foreground hover:text-foreground"
          } ${isDragOver ? "bg-primary/30 border-2 border-primary border-dashed" : ""}`}
          title={`${t('goTo')} ${folder.name}${shouldShowCount ? ` (${count} ${t('emails')})` : ''}`}
        >
          <div 
            className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} rounded flex items-center justify-center relative shrink-0`}
            style={{ backgroundColor: folderColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconComponent className="h-3 w-3 text-white block" style={{ margin: 'auto' }} />
            {/* Badge para modo colapsado */}
            {isCollapsed && shouldShowCount && (
              <Badge 
                variant="secondary"
                className={`absolute -top-1 -right-3 flex items-center justify-center p-1 ${
                  count > 999
                    ? "text-[9px] min-w-[20px] h-5 px-1" // Números grandes (1000+)
                    : count > 99
                    ? "text-[10px] min-w-[18px] h-4 px-1" // Números médios (100-999)
                    : "text-xs min-w-[16px] h-4 px-1" // Números pequenos (1-99)
                }`}
              >
                {count > 999 ? `${Math.floor(count/1000)}k` : count}
              </Badge>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-left">
              {folder.name}
            </span>
          )}
        </button>
        {!isCollapsed && shouldShowCount && (
          <Badge 
            variant="secondary"
            className="absolute right-2 text-xs shrink-0"
          >
            {count}
          </Badge>
        )}
        {!isCollapsed && folder.type === "custom" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEditFolder(folder);
            }}
            className={`opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-foreground/60 hover:text-foreground ${shouldShowCount ? 'right-11' : 'right-3'}`}
            title={t('editFolder')}
          >
            <Edit className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div
        className={`${isCollapsed ? 'w-16' : 'w-64'} sm:w-full bg-gradient-to-b from-card to-muted/50 border-r border-border flex flex-col transform transition-all duration-300 ease-in-out sm:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } fixed sm:relative z-30 h-full`}
      >
        {/* Logo Section */}
        <div className={`${isCollapsed ? 'p-3' : 'p-6'} border-b border-border`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-500 rounded-xl flex items-center justify-center">
              <Mail className="text-primary-foreground text-lg" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  eliano
                </h1>
                <p className="text-xs text-foreground/60">Modern Webmail</p>
              </div>
            )}
          </div>
        </div>

        {/* Compose Button */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'}`}>
          <Button
            onClick={onCompose}
            className={`${isCollapsed ? 'w-12 h-12 p-0' : 'w-full py-3 px-4'} bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-primary-foreground font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg ${isCollapsed ? 'flex items-center justify-center' : ''}`}
            title={t('compose')}
          >
            <Plus className={`${isCollapsed ? '' : 'mr-2'} h-4 w-4`} />
            {!isCollapsed && t('compose')}
          </Button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto max-h-[calc(100vh-240px)] scroll-thin">
          <div className="space-y-1">
            {SYSTEM_FOLDERS.map((systemFolder) => {
              const { t } = useLanguage();
              // Convert system folder to Folder type for NavItem
              // Map CSS color classes to actual hex colors
              const colorMap: Record<string, string> = {
                'text-purple-500': '#a855f7',
                'text-yellow-500': '#eab308',
                'text-green-500': '#22c55e',
                'text-orange-500': '#f97316',
                'text-red-500': '#ef4444'
              };
              
              const folderForNavItem: Folder = {
                id: systemFolder.id,
                userId: currentUser?.id || 0,
                name: t((systemFolder.type).toLowerCase()),
                type: 'system',
                systemType: systemFolder.type,
                color: colorMap[systemFolder.color] || "#6366f1", // Convert CSS class to hex color
                icon: systemFolder.icon, // Use the system type for icon mapping
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              return (
                <NavItem
                  key={systemFolder.type}
                  folder={folderForNavItem}
                  isActive={currentFolder === systemFolder.type}
                  onClick={() => {
                    onFolderChange(systemFolder.type);
                    onMobileClose();
                  }}
                  onEmailDrop={onEmailDrop}
                />
              );
            })}
          </div>

          {/* Custom Folders */}
          <div className="pt-4 mt-4 border-t border-border">
            {!isCollapsed && (
              <div className="flex items-center justify-between mb-2 px-3">
                <button
                  onClick={() => setCustomFoldersExpanded(!customFoldersExpanded)}
                  className="flex items-center space-x-2 text-xs font-semibold text-foreground/60 uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  <span>{t('folders')}</span>
                  {customFolders.length > 0 && (
                    customFoldersExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )
                  )}
                  {!customFoldersExpanded && customFolders.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                      {customFolders.length}
                    </Badge>
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCreateFolder}
                  className="h-6 w-6 p-0 text-foreground/60 hover:text-foreground"
                  title={t('createFolder')}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
            {isCollapsed && (
              <div className="flex justify-center mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCreateFolder}
                  className="h-8 w-8 p-0 text-foreground/60 hover:text-foreground"
                  title={t('createFolder')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
            {customFoldersExpanded && (
              <div className="space-y-1">
                {customFolders.map((folder) => (
                  <NavItem
                    key={folder.id}
                    folder={folder}
                    isActive={currentFolder === folder.name}
                    onClick={() => {
                      onFolderChange(folder.name);
                      onMobileClose();
                    }}
                    onEmailDrop={onEmailDrop}
                  />
                ))}
                {customFolders.length === 0 && !isCollapsed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCreateFolder}
                    className="w-full text-left justify-start text-muted-foreground hover:text-foreground py-2 px-3"
                  >
                    <Plus className="h-4 w-4 mr-3" />
                    {t('createFolder')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Tags Section */}
          {(tags.length > 0 || onCreateTag) && (
            <div className="pt-4 mt-4 border-t border-border">
              {!isCollapsed && (
                <div className="flex items-center justify-between mb-2 px-3">
                  <button
                    onClick={() => setTagsExpanded(!tagsExpanded)}
                    className="flex items-center space-x-2 text-xs font-semibold text-foreground/60 uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    <span>{t('tags')}</span>
                    {tags.length > 0 && (
                      tagsExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    )}
                    {!tagsExpanded && tags.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                        {tags.length}
                      </Badge>
                    )}
                  </button>
                  {onCreateTag && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCreateTag}
                      className="h-6 w-6 p-0 text-foreground/60 hover:text-foreground"
                      title={t('createTag')}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              {isCollapsed && onCreateTag && (
                <div className="flex justify-center mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCreateTag}
                    className="h-8 w-8 p-0 text-foreground/60 hover:text-foreground"
                    title={t('createTag')}
                  >
                    <TagIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {tagsExpanded && (
                <div className="space-y-1">
                  {tags.map((tag) => (
                    <TagItem
                      key={tag.id}
                      tag={tag}
                      onClick={() => {
                        if (onTagSelect) {
                          onTagSelect(tag.name);
                          onMobileClose();
                        }
                      }}
                      onEdit={() => {
                        if (onEditTag) {
                          onEditTag(tag);
                        }
                      }}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                  {tags.length === 0 && onCreateTag && !isCollapsed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCreateTag}
                      className="w-full text-left justify-start text-muted-foreground hover:text-foreground py-2 px-3"
                    >
                      <TagIcon className="h-4 w-4 mr-3" />
                      {t('createTag')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

        </nav>

        {/* Collapse Button - Outside user profile section */}
        {!isCollapsed && onToggleCollapse && (
          <div className="px-4 pb-2">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-8 w-8 p-0 text-foreground/60 hover:text-foreground"
                title={t('collapseSidebar')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Storage Usage */}
        <div className="border-t border-border">
          {!isCollapsed ? (
            <div className="p-4">
              {currentUser && (
                <StorageIndicator 
                  userId={currentUser.id} 
                  className="bg-muted/30 border-border"
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center p-4">
              {onToggleCollapse && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className="h-8 w-8 p-0 text-foreground/60 hover:text-foreground"
                  title={t('expandSidebar')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default Sidebar;
