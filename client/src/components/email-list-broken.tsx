import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, SortDesc, Star, Paperclip, Trash2, Archive, Circle, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { useDrag } from "@use-gesture/react";
import { animated, useSpring } from "react-spring";
import EmailContextMenu from "./email-context-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Email, Folder } from "@shared/schema";

// Swipeable Email Item Component with gesture support
interface SwipeableEmailItemProps {
  email: Email;
  selectedEmail: Email | null;
  onEmailSelect: (email: Email) => void;
  onDelete: (email: Email) => void;
  onArchive: (email: Email) => void;
  onToggleStar: (emailId: number) => void;
  formatDate: (date: Date | null) => string;
  getAvatarContent: (email: Email) => string;
  getAvatarColor: (email: Email) => string;
  getTags: (email: Email) => string[];
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelection: (emailId: number) => void;
  onEnterSelectionMode: () => void;
}

function SwipeableEmailItem({
  email,
  selectedEmail,
  onEmailSelect,
  onDelete,
  onArchive,
  onToggleStar,
  formatDate,
  getAvatarContent,
  getAvatarColor,
  getTags,
  isSelected,
  isSelectionMode,
  onToggleSelection,
  onEnterSelectionMode
}: SwipeableEmailItemProps) {
  const [{ x }, api] = useSpring(() => ({ x: 0 }));
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [hasSwiped, setHasSwiped] = useState(false);
  const isMobile = useIsMobile();
  
  // Long press detection for mobile
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Long press handlers for mobile
  const handleTouchStart = () => {
    if (isMobile && !isSelectionMode) {
      const timer = setTimeout(() => {
        setIsLongPressing(true);
        onEnterSelectionMode();
        onToggleSelection(email.id);
      }, 1000); // 1 second
      setLongPressTimer(timer);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  };

  const bind = useDrag(
    ({ active, movement: [mx], direction: [xDir], cancel, canceled }) => {
      // Handle swipe gestures - require 25% of screen width
      const screenWidth = window.innerWidth;
      const threshold = screenWidth * 0.25;
      const trigger = Math.abs(mx) > threshold;
      
      if (active && !canceled) {
        setIsSwipeActive(true);
        setSwipeDirection(mx > 0 ? 'right' : 'left');
        
        // If user is swiping significantly, mark as swiped to prevent click
        if (Math.abs(mx) > 20) {
          setHasSwiped(true);
        }
        
        // Just update position during drag, don't trigger action yet
        api.start({ x: mx, immediate: true });
      } else {
        // User stopped dragging - check if we should confirm action
        if (trigger && !canceled) {
          // Show confirmation by animating to action position
          if (xDir > 0) {
            // Swipe right = archive
            api.start({ x: 200, immediate: false });
            setTimeout(async () => {
              try {
                await onArchive(email);
                api.set({ x: 0 });
                setIsSwipeActive(false);
                setSwipeDirection(null);
                setTimeout(() => setHasSwiped(false), 100);
              } catch (error) {
                console.error("Failed to archive email:", error);
                api.start({ x: 0, immediate: false });
                setIsSwipeActive(false);
                setSwipeDirection(null);
                setTimeout(() => setHasSwiped(false), 100);
              }
            }, 200);
          } else {
            // Swipe left = delete
            api.start({ x: -200, immediate: false });
            setTimeout(async () => {
              try {
                await onDelete(email);
                api.set({ x: 0 });
                setIsSwipeActive(false);
                setSwipeDirection(null);
                setTimeout(() => setHasSwiped(false), 100);
              } catch (error) {
                console.error("Failed to delete email:", error);
                api.start({ x: 0, immediate: false });
                setIsSwipeActive(false);
                setSwipeDirection(null);
                setTimeout(() => setHasSwiped(false), 100);
              }
            }, 200);
          }
        } else {
          // Not enough swipe distance - snap back to original position
          api.start({ x: 0, immediate: false });
          setIsSwipeActive(false);
          setSwipeDirection(null);
          setTimeout(() => setHasSwiped(false), 50);
        }
      }
    },
    {
      axis: "x",
      bounds: { left: -window.innerWidth * 0.4, right: window.innerWidth * 0.4 },
      rubberband: true
    }
  );

  return (
    <animated.div
      {...bind()}
      style={{ 
        x,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'pan-x'
      }}
      onClick={(e) => {
        // Prevent email opening if user just swiped
        if (hasSwiped) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        
        // Handle mobile selection mode - simple click to select
        if (isSelectionMode && isMobile) {
          onToggleSelection(email.id);
          return;
        }
        
        // Handle desktop selection mode - only if not clicking on selection icon
        if (isSelectionMode && !isMobile) {
          onEmailSelect(email);
          return;
        }
        
        // Normal email opening
        onEmailSelect(email);
      }}
      onDoubleClick={() => {
        // Double-click to enter selection mode on desktop only
        if (!isMobile && !isSelectionMode) {
          onEnterSelectionMode();
          onToggleSelection(email.id);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`email-item border-b border-border p-4 cursor-pointer transition-all duration-200 relative select-none touch-pan-x ${
        isSelected
          ? "bg-muted border-l-4 border-l-primary"
          : selectedEmail?.id === email.id
          ? "email-item selected bg-muted border-l-4 border-l-primary"
          : "hover:bg-muted/50"
      }`}
    >
      {/* Swipe background indicators - only show during active swipe */}
      {isSwipeActive && (
        <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none z-0 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
          {swipeDirection === 'left' && (
            <div className="flex items-center text-red-500 animate-pulse select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
              <Trash2 className="h-8 w-8" />
            </div>
          )}
          {swipeDirection === 'right' && (
            <div className="flex items-center text-blue-500 animate-pulse ml-auto select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
              <Archive className="h-8 w-8" />
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-start space-x-3 relative z-10 bg-card/80">
        <div 
          className={`flex-shrink-0 relative ${isSelectionMode ? 'cursor-pointer' : ''}`}
          onClick={(e) => {
            if (isSelectionMode) {
              e.stopPropagation();
              onToggleSelection(email.id);
            }
          }}
        >
          <Avatar className="w-10 h-10">
            <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(email)} text-primary-foreground text-sm font-semibold`}>
              {getAvatarContent(email)}
            </AvatarFallback>
          </Avatar>
          
          {/* Selection overlay for mobile */}
          {isSelectionMode && isMobile && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
              {isSelected ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <Circle className="w-6 h-6 text-white" />
              )}
            </div>
          )}
          
          {/* Selection indicator for desktop */}
          {isSelectionMode && !isMobile && (
            <div className="absolute -top-1 -right-1">
              {isSelected ? (
                <CheckCircle className="w-5 h-5 text-primary bg-white rounded-full" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground bg-white rounded-full hover:text-primary" />
              )}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={`text-sm font-semibold truncate ${email.isRead ? "text-foreground/70" : "text-foreground"}`}>
              {email.fromName || email.fromAddress}
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(email.id);
                }}
                className={`p-1 h-6 w-6 ${
                  email.isStarred ? "text-yellow-400 hover:text-yellow-500" : "text-foreground/60 hover:text-yellow-400"
                }`}
                title={email.isStarred ? "Remove star" : "Add star"}
              >
                <Star className={`h-3 w-3 ${email.isStarred ? "fill-yellow-400" : "fill-none"}`} />
              </Button>
              <span className="text-xs text-foreground/60">
                {formatDate(email.receivedAt)}
              </span>
            </div>
          </div>
          
          <p className={`text-sm font-medium truncate mb-1 ${email.isRead ? "text-foreground/70" : "text-foreground"}`}>
            {email.subject}
          </p>
          
          <p className="text-xs text-foreground/60 line-clamp-2 mb-2">
            {email.body.substring(0, 150)}...
          </p>
          
          {(email.hasAttachments || getTags(email).length > 0) && (
            <div className="flex items-center space-x-2">
              {email.hasAttachments && (
                <Badge variant="secondary" className="inline-flex items-center px-2 py-1 text-xs">
                  <Paperclip className="mr-1 h-3 w-3" />
                  Attachment
                </Badge>
              )}
              {getTags(email).slice(0, 2).map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </animated.div>
  );
}

interface EmailListProps {
  emails: Email[];
  currentFolder: string;
  selectedEmail: Email | null;
  isLoading: boolean;
  folders: Folder[];
  onEmailSelect: (email: Email) => void;
  onToggleStar: (emailId: number) => void;
  onDelete: (email: Email) => void;
  onArchive: (email: Email) => void;
  onMarkRead: (emailId: number, isRead: boolean) => void;
  onMoveToFolder: (emailId: number, folderId: number) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onSendToJunk: (email: Email) => void;
  searchQuery: string;
}

export default function EmailList({
  emails,
  currentFolder,
  selectedEmail,
  isLoading,
  folders,
  onEmailSelect,
  onToggleStar,
  onDelete,
  onArchive,
  onMarkRead,
  onMoveToFolder,
  onCreateFolder,
  onSendToJunk,
  searchQuery,
}: EmailListProps) {
  const [sortBy, setSortBy] = useState<"date" | "sender" | "subject">("date");
  const [filterBy, setFilterBy] = useState<"all" | "unread" | "starred" | "attachments">("all");
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Selection management functions
  const toggleEmailSelection = (emailId: number) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
    
    // Exit selection mode if no emails are selected
    if (newSelected.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const selectAllEmails = () => {
    const allEmailIds = new Set(filteredAndSortedEmails.map(email => email.id));
    setSelectedEmails(allEmailIds);
    setIsSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedEmails(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) return;
    
    if (confirm(`Delete ${selectedEmails.size} selected emails?`)) {
      selectedEmails.forEach(async (emailId) => {
        const email = emails.find(e => e.id === emailId);
        if (email) await onDelete(email);
      });
      clearSelection();
    }
  };

  const handleBulkMoveToFolder = async (folderId: number) => {
    if (selectedEmails.size === 0) return;
    
    selectedEmails.forEach(async (emailId) => {
      await onMoveToFolder(emailId, folderId);
    });
    clearSelection();
  };

  const handleBulkMarkRead = async (isRead: boolean) => {
    if (selectedEmails.size === 0) return;
    
    selectedEmails.forEach(async (emailId) => {
      await onMarkRead(emailId, isRead);
    });
    clearSelection();
  };

  const filteredAndSortedEmails = useMemo(() => {
    let filtered = emails;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = emails.filter(
        (email) =>
          email.subject.toLowerCase().includes(query) ||
          email.body.toLowerCase().includes(query) ||
          email.fromName?.toLowerCase().includes(query) ||
          email.fromAddress.toLowerCase().includes(query)
      );
    }

    // Apply additional filters
    switch (filterBy) {
      case "unread":
        filtered = filtered.filter(email => !email.isRead);
        break;
      case "starred":
        filtered = filtered.filter(email => email.isStarred);
        break;
      case "attachments":
        filtered = filtered.filter(email => email.hasAttachments);
        break;
      case "all":
      default:
        break;
    }

    // Sort emails
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "sender":
          return (a.fromName || a.fromAddress).localeCompare(b.fromName || b.fromAddress);
        case "subject":
          return a.subject.localeCompare(b.subject);
        case "date":
        default:
          const dateA = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
          const dateB = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
          return dateB - dateA;
      }
    });
  }, [emails, searchQuery, sortBy]);

  const getAvatarContent = (email: Email) => {
    const name = email.fromName || email.fromAddress;
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (email: Email) => {
    const colors = [
      "from-green-400 to-green-500",
      "from-blue-400 to-blue-500",
      "from-purple-400 to-purple-500",
      "from-red-400 to-red-500",
      "from-indigo-400 to-indigo-500",
      "from-pink-400 to-pink-500",
      "from-yellow-400 to-yellow-500",
    ];
    const hash = email.fromAddress.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown";
    
    const now = new Date();
    const emailDate = new Date(date);
    const diffInHours = (now.getTime() - emailDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return emailDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return formatDistanceToNow(emailDate, { addSuffix: true });
    }
  };

  const getTags = (email: Email) => {
    try {
      return email.tags ? JSON.parse(email.tags) : [];
    } catch {
      return [];
    }
  };

  const getAttachments = (email: Email) => {
    try {
      return email.attachments ? JSON.parse(email.attachments) : [];
    } catch {
      return [];
    }
  };

  if (isLoading) {
    return (
      <div className="w-full lg:w-96 bg-card/30 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full lg:w-96 bg-card/30 border-r border-border flex flex-col ${selectedEmail ? 'hidden lg:flex' : 'flex'}`}>
      {/* Email List Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isSelectionMode ? (
            <>
              <span className="text-lg font-semibold">
                {selectedEmails.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                title="Clear selection"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold capitalize">
                {currentFolder === "starred" ? "Starred" : currentFolder}
              </h2>
              {currentFolder === "trash" && emails.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Delete all ${emails.length} emails permanently?`)) {
                      emails.forEach(email => onDelete(email));
                    }
                  }}
                  className="text-xs"
                  title={`Delete all ${emails.length} emails permanently`}
                >
                  Delete All
                </Button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-foreground/60 hover:text-foreground" title="Filter emails">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter emails</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterBy("all")} className={filterBy === "all" ? "bg-muted" : ""}>
                All emails
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy("unread")} className={filterBy === "unread" ? "bg-muted" : ""}>
                Unread only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy("starred")} className={filterBy === "starred" ? "bg-muted" : ""}>
                Starred only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy("attachments")} className={filterBy === "attachments" ? "bg-muted" : ""}>
                With attachments
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const nextSort = sortBy === "date" ? "sender" : sortBy === "sender" ? "subject" : "date";
              setSortBy(nextSort);
            }}
            className="text-foreground/60 hover:text-foreground"
            title={`Sort by ${sortBy === "date" ? "sender" : sortBy === "sender" ? "subject" : "date"}`}
          >
            <SortDesc className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {isSelectionMode && selectedEmails.size > 0 && (
        <div className="p-3 bg-muted/50 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllEmails}
              title="Select all emails"
            >
              Select All ({filteredAndSortedEmails.length})
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" title="Move selected emails">
                  Move to Folder
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Move to folder</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {folders.filter(f => f.type === "system").map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => handleBulkMoveToFolder(folder.id)}
                  >
                    {folder.name}
                  </DropdownMenuItem>
                ))}
                {folders.filter(f => f.type === "custom").length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {folders.filter(f => f.type === "custom").map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => handleBulkMoveToFolder(folder.id)}
                      >
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkMarkRead(true)}
              title="Mark selected as read"
            >
              Mark Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkMarkRead(false)}
              title="Mark selected as unread"
            >
              Mark Unread
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              title="Delete selected emails"
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Email Items */}
      <div className="flex-1 overflow-y-auto scroll-custom">
        {filteredAndSortedEmails.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? "No emails found matching your search." : "No emails in this folder."}
            </p>
          </div>
        ) : (
          filteredAndSortedEmails.map((email) => (
            <EmailContextMenu
              key={email.id}
              email={email}
              folders={folders}
              onDelete={onDelete}
              onArchive={onArchive}
              onToggleStar={onToggleStar}
              onMarkRead={onMarkRead}
              onMoveToFolder={onMoveToFolder}
              onCreateFolder={onCreateFolder}
              onSendToJunk={onSendToJunk}
            >
              <SwipeableEmailItem
                email={email}
                selectedEmail={selectedEmail}
                onEmailSelect={onEmailSelect}
                onDelete={onDelete}
                onArchive={onArchive}
                onToggleStar={onToggleStar}
                formatDate={formatDate}
                getAvatarContent={getAvatarContent}
                getAvatarColor={getAvatarColor}
                getTags={getTags}
                isSelected={selectedEmails.has(email.id)}
                isSelectionMode={isSelectionMode}
                onToggleSelection={toggleEmailSelection}
                onEnterSelectionMode={() => setIsSelectionMode(true)}
              />
            </EmailContextMenu>
          ))
        )}
      </div>
    </div>
  );
}
