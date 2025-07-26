import React, { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Filter,
  SortDesc,
  Star,
  Paperclip,
  Trash2,
  Archive,
  Circle,
  CheckCircle,
  ChevronDown,
  MailOpen,
  Mail,
  Folder as FolderIcon,
  X,
  Check,
  Tag as TagIcon,
  Plus,
  AlertTriangle,
  Folder,
  RotateCcw,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatRelativeTimeLocalized } from "@/lib/date-utils";
import { useDrag } from "@use-gesture/react";
import { animated, useSpring } from "react-spring";
import EmailContextMenu from "./email-context-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/hooks/use-language";
import { useTags } from "@/hooks/use-tags";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import TagManagerDialog from "./tag-manager-dialog";
import { DeleteConfirmationModal } from "./delete-confirmation-modal";
import type { Email, Folder as FolderType } from "@shared/schema";

// Swipeable Email Item Component with gesture support
interface SwipeableEmailItemProps {
  email: Email;
  selectedEmail: Email | null;
  onEmailSelect: (email: Email) => void;
  onDelete: (email: Email) => void;
  onArchive: (email: Email) => void;
  onToggleStar: (emailId: number) => void;
  onMoveToFolder: (emailId: number, folderId: number) => void;
  formatDate: (date: Date | null) => string;
  getAvatarContent: (email: Email) => string;
  getAvatarColor: (email: Email) => string;
  getTags: (email: Email) => string[];
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelection: (emailId: number) => void;
  onEnterSelectionMode: () => void;
  avatarShape: string;
  leftSwipeAction: string;
  rightSwipeAction: string;
  swipeCustomFolder: string;
  folders: FolderType[];
}

function SwipeableEmailItem({
  email,
  selectedEmail,
  onEmailSelect,
  onDelete,
  onArchive,
  onToggleStar,
  onMoveToFolder,
  formatDate,
  getAvatarContent,
  getAvatarColor,
  getTags,
  isSelected,
  isSelectionMode,
  onToggleSelection,
  onEnterSelectionMode,
  avatarShape,
  leftSwipeAction,
  rightSwipeAction,
  swipeCustomFolder,
  folders,
}: SwipeableEmailItemProps) {
  const [{ x }, api] = useSpring(() => ({
    x: 0,
    config: { tension: 300, friction: 30, velocity: 0 },
  }));
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [hasSwiped, setHasSwiped] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [timerCanceled, setTimerCanceled] = useState(false);
  // Independent selection system using native events
  const selectionTimer = useRef<NodeJS.Timeout | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const isMobile = useIsMobile();
  
  // Drag & Drop states for desktop
  const [isDragging, setIsDragging] = useState(false);

  // Check if email is in drafts or sent folder
  const currentFolder = folders.find(f => f.id === email.folderId);
  const isInDraftsOrSent = currentFolder && (currentFolder.systemType.toLowerCase() === 'drafts' || currentFolder.systemType.toLowerCase() === 'sent');

  // Desktop drag & drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (isMobile) return;
    
    setIsDragging(true);
    const dragData = {
      emailId: email.id,
      currentFolderId: email.folderId,
      isInDraftsOrSent: isInDraftsOrSent // Add this info for the drop handler
    };
    
    // Store in global variable for immediate access
    (window as any).currentDragData = dragData;
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image positioned in the center
    const dragElement = e.currentTarget.cloneNode(true) as HTMLElement;
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-1000px';
    dragElement.style.left = '-1000px';
    dragElement.style.transform = 'rotate(-3deg)';
    dragElement.style.opacity = '0.9';
    dragElement.style.maxWidth = '400px';
    dragElement.style.backgroundColor = 'var(--background)';
    dragElement.style.border = '2px solid var(--primary)';
    dragElement.style.borderRadius = '8px';
    dragElement.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
    document.body.appendChild(dragElement);
    
    // Set drag image to center of the element (both horizontal and vertical)
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = Math.min(rect.width / 2, 200); // Limit to 200px from left edge
    const centerY = rect.height / 2;
    e.dataTransfer.setDragImage(dragElement, centerX, centerY);
    
    setTimeout(() => document.body.removeChild(dragElement), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Clear global drag data
    (window as any).currentDragData = null;
  };

  // Get swipe background color based on action
  const getSwipeBackground = (action: string) => {
    switch (action) {
      case "trash":
        return "bg-red-500/30";
      case "starred":
        return "bg-yellow-500/30";
      case "junk":
        return "bg-orange-500/30";
      case "archive":
        return "bg-green-500/30";
      case "custom":
        return "bg-blue-500/30";
      default:
        return "bg-gray-500/30";
    }
  };

  // Get swipe icon based on action
  const getSwipeIcon = (action: string) => {
    const iconClass = "h-6 w-6 drop-shadow-lg";
    const iconColor =
      action === "trash"
        ? "text-red-700"
        : action === "starred"
          ? "text-yellow-700"
          : action === "junk"
            ? "text-orange-700"
            : action === "archive"
              ? "text-green-700"
              : action === "custom"
                ? "text-blue-700"
                : "text-gray-700";

    switch (action) {
      case "trash":
        return <Trash2 className={`${iconClass} ${iconColor}`} />;
      case "starred":
        return <Star className={`${iconClass} ${iconColor}`} />;
      case "junk":
        return <AlertTriangle className={`${iconClass} ${iconColor}`} />;
      case "archive":
        return <Archive className={`${iconClass} ${iconColor}`} />;
      case "custom":
        return <FolderIcon className={`${iconClass} ${iconColor}`} />;
      default:
        return <Archive className={`${iconClass} ${iconColor}`} />;
    }
  };

  // Handle swipe actions based on configuration
  const handleSwipeAction = async (action: string, email: Email) => {
    try {
      // If email is in drafts or sent, disable all swipe actions
      if (isInDraftsOrSent) {
        console.log("Swipe action disabled: No swipe actions allowed for drafts/sent emails");
        return;
      }

      switch (action) {
        case "trash":
          await onDelete(email);
          break;
        case "archive":
          await onArchive(email);
          break;
        case "starred":
          await onToggleStar(email.id);
          break;
        case "junk":
          // Find junk folder and move email
          const junkFolder = folders.find((f: any) => f.systemType === "junk");
          if (junkFolder) {
            await onMoveToFolder(email.id, junkFolder.id);
          }
          break;
        case "custom":
          // Move to custom folder
          if (swipeCustomFolder) {
            await onMoveToFolder(email.id, parseInt(swipeCustomFolder));
          }
          break;
        default:
          await onArchive(email); // fallback
      }
    } catch (error) {
      console.error("Swipe action failed:", error);
    }
  };

  // Touch event handlers for mobile swipe
  const [touchStartX, setTouchStartX] = useState<number>(0);
  const [currentX, setCurrentX] = useState<number>(0);

  // Separate touch handlers for long press (selection)
  const [longPressStartTime, setLongPressStartTime] = useState<number>(0);
  const [longPressStartPos, setLongPressStartPos] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [longPressTriggered, setLongPressTriggered] = useState<boolean>(false);

  const handleLongPressStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const startTime = Date.now();
    setLongPressStartTime(startTime);
    setLongPressStartPos({x: touch.clientX, y: touch.clientY});
    setLongPressTriggered(false);

    // Start timer to trigger selection after 1 second
    const timer = setTimeout(() => {
      // Use the captured startTime instead of state
      setLongPressStartTime(current => {
        if (current === startTime) {
          setLongPressTriggered(true);
          
          // Schedule state updates for next tick to avoid setState during render
          setTimeout(() => {
            onEnterSelectionMode();
            onToggleSelection(email.id);
            
            // Add haptic feedback if available
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
          }, 0);
        }
        return current;
      });
    }, 1000); // 1 second

    setLongPressTimer(timer);
  };

  const handleLongPressMove = (e: React.TouchEvent) => {
    if (!isMobile || longPressStartTime === 0) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - longPressStartPos.x);
    const deltaY = Math.abs(touch.clientY - longPressStartPos.y);
    
    // Cancel long press if moved too much (more than 20px)
    if (deltaX > 20 || deltaY > 20) {
      setLongPressStartTime(0);
      setLongPressTriggered(false);
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }
  };

  const handleLongPressEnd = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    setLongPressStartTime(0);
    setLongPressTriggered(false);
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    // Block swipe if email is selected
    if (isSelected) return;
    
    // Disable swipe for emails in drafts or sent folders
    if (isInDraftsOrSent) {
      return;
    }
    
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setCurrentX(touch.clientX);
    setIsPressed(true);
    setHasMoved(false);
    setHasSwiped(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isPressed || isSelected) return;
    
    // Disable swipe for emails in drafts or sent folders
    if (isInDraftsOrSent) {
      return;
    }
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    setCurrentX(touch.clientX);
    
    api.set({ x: deltaX });

    const swipeThreshold = 100;
    const moveThreshold = 50;

    if (Math.abs(deltaX) > moveThreshold && !hasMoved) {
      setHasMoved(true);
      setHasSwiped(true);
    }

    // Show swipe indicators
    if (Math.abs(deltaX) > swipeThreshold) {
      setIsSwipeActive(true);
      setSwipeDirection(deltaX > 0 ? "right" : "left");
    } else {
      setIsSwipeActive(false);
      setSwipeDirection(null);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (!isMobile || !isPressed || isSelected) return;
    
    // Disable swipe for emails in drafts or sent folders
    if (isInDraftsOrSent) {
      setIsPressed(false);
      return;
    }
    
    const deltaX = currentX - touchStartX;
    const swipeThreshold = 100;
    
    setIsPressed(false);

    if (hasMoved && Math.abs(deltaX) > swipeThreshold) {
      const direction = deltaX > 0 ? "right" : "left";

      if (direction === "right") {
        await handleSwipeAction(rightSwipeAction, email);
      } else {
        await handleSwipeAction(leftSwipeAction, email);
      }
    }

    api.start({
      x: 0,
      config: { tension: 280, friction: 25 },
    });
    setIsSwipeActive(false);
    setSwipeDirection(null);

    setTimeout(() => {
      setHasSwiped(false);
      setHasMoved(false);
    }, 150);
  };

  const bind = useDrag(
    ({ active, movement: [mx], first, last, tap }) => {
      // Only for desktop drag & drop
      if (isMobile) return;
      
      const swipeThreshold = 100;
      const moveThreshold = 50;

      if (first) {
        setIsPressed(true);
        setHasMoved(false);
        setHasSwiped(false);
      }

      if (tap) return;

      if (active) {
        api.set({ x: mx });

        if (Math.abs(mx) > moveThreshold && !hasMoved) {
          setHasMoved(true);
          setHasSwiped(true);
        }

        // Show swipe indicators
        if (Math.abs(mx) > swipeThreshold) {
          setIsSwipeActive(true);
          setSwipeDirection(mx > 0 ? "right" : "left");
        } else {
          setIsSwipeActive(false);
          setSwipeDirection(null);
        }
      } else if (last) {
        setIsPressed(false);

        if (hasMoved && Math.abs(mx) > swipeThreshold) {
          const direction = mx > 0 ? "right" : "left";

          if (direction === "right") {
            handleSwipeAction(rightSwipeAction, email);
          } else {
            handleSwipeAction(leftSwipeAction, email);
          }
        }

        api.start({
          x: 0,
          config: { tension: 280, friction: 25 },
        });
        setIsSwipeActive(false);
        setSwipeDirection(null);

        setTimeout(() => {
          setHasSwiped(false);
          setHasMoved(false);
        }, 150);
      }
    },
    {
      enabled: !isMobile,
    },
  );

  // Native selection events (completely independent of swipe)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isMobile || isSelectionMode) return;

    startPos.current = { x: e.clientX, y: e.clientY };

    selectionTimer.current = setTimeout(() => {
      onEnterSelectionMode();
      onToggleSelection(email.id);
      selectionTimer.current = null;
    }, 1000);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPos.current || !selectionTimer.current) return;

    const deltaX = Math.abs(e.clientX - startPos.current.x);
    const deltaY = Math.abs(e.clientY - startPos.current.y);

    // Cancel if moved too much
    if (deltaX > 50 || deltaY > 50) {
      clearTimeout(selectionTimer.current);
      selectionTimer.current = null;
      startPos.current = null;
    }
  };

  const handlePointerUp = () => {
    if (selectionTimer.current) {
      clearTimeout(selectionTimer.current);
      selectionTimer.current = null;
    }
    startPos.current = null;
  };

  // Selection will be handled through tap detection in useDrag

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (selectionTimer.current) {
        clearTimeout(selectionTimer.current);
      }
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const bindProps = isMobile ? {} : bind();

  return (
    <animated.div
      {...bindProps}
      style={{
        x,
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: isMobile ? "none" : "auto",
      }}
      onPointerDown={undefined}
      onPointerMove={undefined}
      onPointerUp={undefined}
      onClick={(e) => {
        // Always prevent default navigation behavior
        e.preventDefault();
        e.stopPropagation();

        // Prevent email opening if user just swiped
        if (hasSwiped) {
          return;
        }

        // Handle selection mode
        if (isSelectionMode) {
          onToggleSelection(email.id);
          return;
        }

        // Normal email opening
        onEmailSelect(email);
      }}
      onTouchStart={(e) => {
        handleTouchStart(e);
        handleLongPressStart(e);
      }}
      onTouchMove={(e) => {
        handleTouchMove(e);
        handleLongPressMove(e);
      }}
      onTouchEnd={(e) => {
        handleTouchEnd(e);
        handleLongPressEnd(e);
      }}
      onDoubleClick={() => {
        // Double-click to enter selection mode on desktop only
        if (!isMobile && !isSelectionMode) {
          onEnterSelectionMode();
          onToggleSelection(email.id);
        }
      }}
      draggable={!isMobile && !isSelectionMode && !isSelected}
      onDragStart={!isMobile ? handleDragStart : undefined}
      onDragEnd={!isMobile ? handleDragEnd : undefined}
      data-drag-restricted={isInDraftsOrSent ? "true" : "false"}
      className={`email-item border-b border-border p-4 cursor-pointer transition-all duration-200 relative select-none touch-pan-x overflow-hidden ${
        isSelected && isSelectionMode
          ? "bg-primary/10 border-l-4 border-l-primary"
          : selectedEmail?.id === email.id && !isSelectionMode
            ? "selected bg-muted border-l-4 border-l-primary"
            : "hover:bg-muted/50"
      } ${isDragging ? "opacity-50 rotate-2 scale-95" : ""} ${!isMobile ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {/* Swipe Action Indicators */}
      {isSwipeActive && swipeDirection === "right" && (
        <div
          className={`absolute inset-y-0 left-0 w-20 flex items-center justify-start pl-4 pointer-events-none z-20 ${getSwipeBackground(rightSwipeAction)}`}
        >
          {getSwipeIcon(rightSwipeAction)}
        </div>
      )}

      {isSwipeActive && swipeDirection === "left" && (
        <div
          className={`absolute inset-y-0 right-0 w-20 flex items-center justify-end pr-4 pointer-events-none z-20 ${getSwipeBackground(leftSwipeAction)}`}
        >
          {getSwipeIcon(leftSwipeAction)}
        </div>
      )}

      <div className="flex items-start space-x-3 relative z-10 bg-card/80 overflow-hidden min-w-0">
        <div
          className={`avatar-container relative transition-all duration-200 ${
            isSelectionMode || !isMobile ? "cursor-pointer" : ""
          } ${
            !isMobile && !isSelectionMode
              ? `hover:ring-2 hover:ring-offset-2 hover:ring-primary/50 ${avatarShape === "square" ? "rounded-lg" : "rounded-full"} hover:shadow-md`
              : ""
          }`}
          onClick={(e) => {
            if (isSelectionMode) {
              e.stopPropagation();
              onToggleSelection(email.id);
            } else if (!isSelectionMode && !isMobile) {
              // On desktop, single-click avatar enters selection mode and selects email
              e.stopPropagation();
              onEnterSelectionMode();
              onToggleSelection(email.id);
            }
          }}
        >
          {isSelected ? (
            <div
              className={`w-full h-full bg-primary flex items-center justify-center ${
                avatarShape === "square" ? "rounded-lg" : "rounded-full"
              }`}
              title={`Avatar shape: ${avatarShape}`}
            >
              <Check className="w-5 h-5 text-primary-foreground" />
            </div>
          ) : (
            <Avatar
              className={`w-full h-full ${avatarShape === "square" ? "rounded-lg" : ""}`}
            >
              <AvatarFallback
                className={`w-full h-full bg-gradient-to-br ${getAvatarColor(email)} text-primary-foreground text-sm font-semibold flex items-center justify-center ${
                  avatarShape === "square" ? "rounded-lg" : ""
                }`}
                title={`Avatar shape: ${avatarShape}`}
                style={{
                  minWidth: "40px",
                  minHeight: "40px",
                  maxWidth: "40px",
                  maxHeight: "40px",
                }}
              >
                {getAvatarContent(email)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p
              className={`text-sm truncate text-foreground ${email.isRead ? "font-normal" : "font-bold"}`}
            >
              {email.isDraft
                ? email.toAddress || "No recipient"
                : email.fromName || email.fromAddress}
            </p>
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Tags */}
              {getTags(email)
                .slice(0, 2)
                .map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              {/* Attachment icon as tag-style badge */}
              {email.attachments && (
                <Badge
                  variant="outline"
                  className="text-xs px-2 py-0.5 flex items-center"
                  title="Has attachment"
                >
                  <Paperclip className="h-3 w-3" />
                </Badge>
              )}

              {/* Only show star button for non-draft and non-spam emails */}
              {!email.isDraft && currentFolder !== "junk" && currentFolder !== "spam" && currentFolder !== "drafts" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(email.id);
                  }}
                  className={`p-1 h-6 w-6 ${
                    email.isStarred
                      ? "text-yellow-500 hover:text-yellow-600"
                      : "text-foreground/60 hover:text-yellow-400"
                  }`}
                  title={email.isStarred ? "Remove star" : "Add star"}
                >
                  <Star
                    className="h-3 w-3"
                    fill={email.isStarred ? "currentColor" : "none"}
                    stroke="currentColor"
                  />
                </Button>
              )}
              <span className="text-xs text-foreground/60 w-16 text-right">
                {formatDate(email.isDraft ? email.updatedAt : (email.sentAt || email.receivedAt || email.createdAt))}
              </span>
            </div>
          </div>

          <p
            className={`text-sm truncate mb-0.5 ${email.isRead ? "text-muted-foreground font-normal" : "text-foreground font-bold"}`}
          >
            {email.subject}
          </p>

          <div
            className={`text-xs mb-1 flex-1 ${email.isRead ? "text-muted-foreground" : "text-foreground/60"}`}
          >
            <p className="line-clamp-2 overflow-hidden">{email.body.replace(/<[^>]*>/g, '').slice(0, 100)}</p>
          </div>
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
  folders: FolderType[];
  onEmailSelect: (email: Email) => void;
  onToggleStar: (emailId: number) => void;
  onDelete: (email: Email) => void;
  onArchive: (email: Email) => void;
  onMarkRead: (emailId: number, isRead: boolean) => void;
  onMoveToFolder: (emailId: number, folderId: number) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onSendToJunk: (email: Email) => void;
  searchQuery: string;
  hasExecutedSearch?: boolean;
  // Pagination props
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  emailsPerPage?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onGoToPage?: (page: number) => void;
  // Filter props - passed from parent
  filterBy?: string;
  sortBy?: string;
  selectedTagFilter?: number | null;
  onFilterChange?: (filterBy: string, sortBy: string, tagFilter: number | null) => void;
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
  hasExecutedSearch = false,
  // Pagination props
  totalCount = 0,
  totalPages: totalPagesFromProps = 0,
  currentPage = 1,
  emailsPerPage = 20,
  hasNext = false,
  hasPrevious = false,
  onNextPage,
  onPreviousPage,
  onGoToPage,
  // Filter props - use parent's filter state
  filterBy: parentFilterBy = "all",
  sortBy: parentSortBy = "date",
  selectedTagFilter: parentSelectedTagFilter = null,
  onFilterChange,
}: EmailListProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { tags } = useTags(user?.id || 0);
  const queryClient = useQueryClient();
  
  // Use parent's filter state if provided, otherwise use local state
  const [localSortBy, setLocalSortBy] = useState<"date" | "sender" | "subject">("date");
  const [localFilterBy, setLocalFilterBy] = useState<
    "all" | "unread" | "starred" | "attachments" | "tags"
  >("all");
  const [localSelectedTagFilter, setLocalSelectedTagFilter] = useState<number | null>(null);
  const [showTagSelector, setShowTagSelector] = useState(false);
  
  // Use parent's filter state if callback is provided, otherwise use local state
  const filterBy = onFilterChange ? parentFilterBy : localFilterBy;
  const sortBy = onFilterChange ? parentSortBy : localSortBy;
  const selectedTagFilter = onFilterChange ? parentSelectedTagFilter : localSelectedTagFilter;
  
  // Helper function to update filters
  const updateFilters = (newFilterBy: string, newSortBy: string, newTagFilter: number | null) => {
    if (onFilterChange) {
      onFilterChange(newFilterBy, newSortBy, newTagFilter);
    } else {
      setLocalFilterBy(newFilterBy as any);
      setLocalSortBy(newSortBy as any);
      setLocalSelectedTagFilter(newTagFilter);
    }
  };

  // Helper function to get tags from email
  const getTags = (email: Email) => {
    if (!email.tags) return [];
    try {
      return JSON.parse(email.tags);
    } catch {
      return [];
    }
  };
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [avatarShape, setAvatarShape] = useState(
    () => localStorage.getItem("avatarShape") || "rounded",
  );
  const [showTagLimitDialog, setShowTagLimitDialog] = useState(false);
  const [showTagManagerDialog, setShowTagManagerDialog] = useState(false);
  const [tagOperationLoading, setTagOperationLoading] = useState<string | null>(
    null,
  );
  const [leftSwipeAction, setLeftSwipeAction] = useState(
    () => localStorage.getItem("leftSwipeAction") || "trash",
  );
  const [rightSwipeAction, setRightSwipeAction] = useState(
    () => localStorage.getItem("rightSwipeAction") || "archive",
  );
  const [swipeCustomFolder, setSwipeCustomFolder] = useState(
    () => localStorage.getItem("swipeCustomFolder") || "",
  );

  // Delete confirmation modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    emails: Email[];
    folderName?: string;
    isPermanent?: boolean;
    onConfirm?: () => Promise<void>;
  }>({
    isOpen: false,
    emails: [],
    folderName: undefined,
    isPermanent: false,
    onConfirm: undefined,
  });

  // Clear selection when folder changes
  useEffect(() => {
    setSelectedEmails(new Set());
    setIsSelectionMode(false);
  }, [currentFolder]);

  // Listen for delete confirmation events
  useEffect(() => {
    const handleDeleteConfirmation = (event: CustomEvent) => {
      const { email, folderName, isPermanent, resolve, reject } = event.detail;
      
      setDeleteConfirmation({
        isOpen: true,
        emails: [email],
        folderName,
        isPermanent,
        onConfirm: async () => {
          try {
            // Call the delete function directly with permanent=true for special folders
            const currentFolder = folders.find(f => f.id === email.folderId);
            const isSpecialFolder = currentFolder && (
              currentFolder.systemType?.toLowerCase() === 'drafts' || 
              currentFolder.systemType?.toLowerCase() === 'sent' || 
              currentFolder.systemType?.toLowerCase() === 'junk' || 
              currentFolder.systemType?.toLowerCase() === 'trash'
            );
            
            if (isSpecialFolder) {
              // For special folders, perform permanent deletion
              console.log(`🗑️ Performing permanent deletion of email ${email.id} from ${currentFolder?.name}`);
              const response = await fetch(`/api/emails/${email.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ permanent: true })
              });
              
              if (!response.ok) {
                throw new Error(`Failed to delete email: ${response.statusText}`);
              }
              
              console.log(`✅ Email ${email.id} permanently deleted successfully`);
              
              // Refresh the UI by dispatching a refresh event
              window.dispatchEvent(new CustomEvent('refreshEmailData'));
            } else {
              // For regular folders, use the normal delete function (move to trash)
              await onDelete(email);
            }
            
            setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
            resolve();
          } catch (error) {
            console.error('Delete confirmation error:', error);
            reject(error);
          }
        },
      });
    };

    window.addEventListener('showDeleteConfirmation', handleDeleteConfirmation as EventListener);
    
    return () => {
      window.removeEventListener('showDeleteConfirmation', handleDeleteConfirmation as EventListener);
    };
  }, [onDelete, folders]);



  // Listen for avatar shape changes
  useEffect(() => {
    const handleAvatarShapeChange = (event: CustomEvent) => {
      console.log("Avatar shape changed to:", event.detail.shape);
      setAvatarShape(event.detail.shape);
    };

    window.addEventListener(
      "avatarShapeChange",
      handleAvatarShapeChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "avatarShapeChange",
        handleAvatarShapeChange as EventListener,
      );
    };
  }, []);

  // Debug current avatar shape
  useEffect(() => {
    console.log("Current avatar shape:", avatarShape);
  }, [avatarShape]);

  // Listen for swipe actions changes
  useEffect(() => {
    const handleSwipeActionsChange = (event: CustomEvent) => {
      setLeftSwipeAction(event.detail.leftSwipeAction);
      setRightSwipeAction(event.detail.rightSwipeAction);
    };

    const handleCustomFolderChange = (event: CustomEvent) => {
      setSwipeCustomFolder(event.detail);
    };

    window.addEventListener(
      "swipeActionsChanged",
      handleSwipeActionsChange as EventListener,
    );
    window.addEventListener(
      "swipeCustomFolderChanged",
      handleCustomFolderChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "swipeActionsChanged",
        handleSwipeActionsChange as EventListener,
      );
      window.removeEventListener(
        "swipeCustomFolderChanged",
        handleCustomFolderChange as EventListener,
      );
    };
  }, []);



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
    const allEmailIds = new Set(emails.map((email) => email.id));
    setSelectedEmails(allEmailIds);
    setIsSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedEmails(new Set());
    setIsSelectionMode(false);
  };

  // Bulk actions with intelligent deletion
  const handleBulkDelete = async () => {
    const selectedEmailsArray = Array.from(selectedEmails)
      .map(emailId => emails.find(e => e.id === emailId))
      .filter(Boolean) as Email[];
    
    if (selectedEmailsArray.length === 0) return;
    
    // Check if any emails require permanent deletion confirmation
    const requiresConfirmation = selectedEmailsArray.some(email => {
      const currentFolder = folders.find(f => f.id === email.folderId);
      return currentFolder && (
        currentFolder.systemType?.toLowerCase() === 'drafts' || 
        currentFolder.systemType?.toLowerCase() === 'sent' || 
        currentFolder.systemType?.toLowerCase() === 'junk' || 
        currentFolder.systemType?.toLowerCase() === 'trash'
      );
    });
    
    if (requiresConfirmation) {
      // Show confirmation modal for bulk deletion
      const currentFolder = folders.find(f => f.id === selectedEmailsArray[0].folderId);
      setDeleteConfirmation({
        isOpen: true,
        emails: selectedEmailsArray,
        folderName: currentFolder?.name,
        isPermanent: true,
        onConfirm: async () => {
          try {
            console.log(`🗑️ Bulk deleting ${selectedEmailsArray.length} emails permanently from ${currentFolder?.name}`);
            
            // Perform permanent deletion for all selected emails
            const deletePromises = selectedEmailsArray.map(async (email) => {
              console.log(`🗑️ Permanently deleting email ${email.id}`);
              const response = await fetch(`/api/emails/${email.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ permanent: true })
              });
              
              if (!response.ok) {
                throw new Error(`Failed to delete email ${email.id}: ${response.statusText}`);
              }
              
              return email.id;
            });
            
            const deletedIds = await Promise.all(deletePromises);
            console.log(`✅ Successfully deleted ${deletedIds.length} emails permanently:`, deletedIds);
            
            // Close modal and clear selection
            setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
            clearSelection();
            
            // Refresh the UI
            window.dispatchEvent(new CustomEvent('refreshEmailData'));
          } catch (error) {
            console.error('Bulk delete confirmation error:', error);
            throw error;
          }
        },
      });
    } else {
      // For regular folders, just move to trash (no confirmation needed)
      const promises = selectedEmailsArray.map(email => onDelete(email));
      await Promise.all(promises);
      clearSelection();
    }
  };

  const handleBulkMoveToFolder = async (folderId: number) => {
    const promises = Array.from(selectedEmails).map((emailId) =>
      onMoveToFolder(emailId, folderId),
    );
    await Promise.all(promises);
    clearSelection();
  };

  const handleBulkMarkRead = async (isRead: boolean) => {
    const promises = Array.from(selectedEmails).map((emailId) =>
      onMarkRead(emailId, isRead),
    );
    await Promise.all(promises);
    clearSelection();
  };

  const handleBulkRemoveTags = async () => {
    console.log("Removing tags from emails:", Array.from(selectedEmails));
    const promises = Array.from(selectedEmails).map(async (emailId) => {
      const email = emails.find((e) => e.id === emailId);
      if (email) {
        console.log(
          `Removing tags from email ${emailId}. Current tags:`,
          getTags(email),
        );
        // Remove all tags by setting empty array
        const response = await fetch(`/api/email/${emailId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: JSON.stringify([]) }),
        });
        console.log(
          `Response for email ${emailId}:`,
          response.status,
          response.ok,
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Failed to remove tags from email ${emailId}:`,
            errorText,
          );
          throw new Error("Failed to remove email tags");
        }
      }
    });
    await Promise.all(promises);
    // Refresh emails to show updated tags
    await queryClient.invalidateQueries();
    clearSelection();
  };

  // Filtering and sorting logic
  // Note: emails are already filtered and paginated from the API

  // Using emails from props (already paginated by the hook)
  const currentEmails = emails;

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown";
    const now = new Date();
    const emailDate = new Date(date);

    // Use localized formatting based on current language
    const locale = language === 'pt' ? 'pt-BR' : 'en-US';
    
    if (emailDate.toDateString() === now.toDateString()) {
      return emailDate.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (emailDate.getFullYear() === now.getFullYear()) {
      return emailDate.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      });
    } else {
      return emailDate.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  const getAvatarContent = (email: Email) => {
    const name = email.isDraft
      ? email.toAddress || "Draft"
      : email.fromName || email.fromAddress;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (email: Email) => {
    const colors = [
      "from-purple-400 to-pink-400",
      "from-blue-400 to-indigo-400",
      "from-green-400 to-teal-400",
      "from-yellow-400 to-orange-400",
      "from-red-400 to-pink-400",
      "from-indigo-400 to-purple-400",
    ];
    const hashString = email.isDraft
      ? email.toAddress || "draft"
      : email.fromAddress;
    const hash = hashString.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getAttachments = (email: Email) => {
    if (!email.attachments) return [];
    try {
      return JSON.parse(email.attachments);
    } catch {
      return [];
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 p-4 border-b">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    const hasActiveFilters =
      filterBy !== "all" || selectedTagFilter !== null || (hasExecutedSearch && searchQuery);

    const handleResetFilters = () => {
      updateFilters("all", "date", null);
      // Clear search through parent component
      if (hasExecutedSearch && searchQuery) {
        // Trigger search change on parent
        const event = new CustomEvent("clearSearch");
        window.dispatchEvent(event);
      }
    };

    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">📧</div>
          <h3 className="text-lg font-medium mb-2">{t('noEmailsFound')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {hasExecutedSearch && searchQuery
              ? `${t('noEmailsMatch')} "${searchQuery}"`
              : selectedTagFilter
                ? t('noEmailsWithTag')
                : filterBy !== "all"
                  ? `${t('noEmailsFound')} ${filterBy === "unread" ? t('unreadFilter') : filterBy === "starred" ? t('starredFilter') : filterBy === "attachments" ? t('attachmentsFilter') : filterBy}`
                  : `${t('noEmailsIn')} ${t(currentFolder?.toLowerCase()) || currentFolder}`}
          </p>
          {/* ALWAYS show reset filters button when no emails are found and filters/search are active */}
          {hasActiveFilters && (
            <Button
              onClick={handleResetFilters}
              variant="outline"
              size="sm"
              className="hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              {t('resetFilters')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-x-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* Email counter or selection input */}
          <div className="flex-1 md:flex-none flex justify-start">
            {isSelectionMode && selectedEmails.size > 0 ? (
              (() => {
                // Check if current folder is drafts or sent by checking currentFolder prop
                const isDraftsFolder = currentFolder?.toLowerCase() === 'drafts' || currentFolder === 'Drafts';
                const isSentFolder = currentFolder?.toLowerCase() === 'sent' || currentFolder === 'Sent';
                const isRestrictedFolder = isDraftsFolder || isSentFolder;
                
                // For drafts and sent folders, only show delete button (no move options)
                if (isRestrictedFolder) {
                  return (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="h-8 min-w-[100px] text-sm"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("delete")}
                    </Button>
                  );
                }
                
                // For other folders, show the dropdown menu
                return (
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 min-w-[140px] text-sm shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/20 hover:shadow-md hover:shadow-blue-500/20 transition-all duration-900 animate-[pulse-subtle_3s_ease-in-out_infinite]"
                    >
                      {selectedEmails.size === 1 ? t('emailSelectedSingular') : `${selectedEmails.size} ${t('emailSelectedPlural')}`}
                      <ChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleBulkMarkRead(true)}>
                      <MailOpen className="mr-2 h-4 w-4" />
                      {t("markAsRead")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkMarkRead(false)}>
                      <Mail className="mr-2 h-4 w-4" />
                      {t("markAsUnread")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled
                      className="text-xs font-medium text-muted-foreground opacity-70"
                    >
                      {t("moveToFolder")}
                    </DropdownMenuItem>
                    {(() => {
                      // Get current folder info for filtering
                      const selectedEmailsArray = Array.from(selectedEmails)
                        .map(emailId => emails.find(e => e.id === emailId))
                        .filter(Boolean);
                      const currentFolderObj = selectedEmailsArray.length > 0 ? 
                        folders.find(f => f.id === selectedEmailsArray[0].folderId) : null;
                      const currentSystemType = currentFolderObj?.systemType?.toLowerCase();

                      // Only show inbox, archive, junk, trash - exclude current folder and sent/drafts
                      return folders
                        .filter((f) => {
                          if (f.type !== "system") return false;
                          const systemType = f.systemType?.toLowerCase();
                          
                          // Exclude sent and drafts completely
                          if (systemType === "sent" || systemType === "drafts") return false;
                          
                          // Only show inbox, archive, junk, trash
                          if (!["inbox", "archive", "junk", "trash"].includes(systemType)) return false;
                          
                          // Don't show current folder
                          if (systemType === currentSystemType) return false;
                          
                          return true;
                        })
                        .map((folder) => {
                          // Map system types to Portuguese translations
                          const getTranslatedName = (systemType) => {
                            switch (systemType?.toLowerCase()) {
                              case "inbox": return "Caixa de Entrada";
                              case "archive": return "Arquivo";  
                              case "junk": return "Spam";
                              case "trash": return "Lixeira";
                              default: return folder.name;
                            }
                          };

                          return (
                            <DropdownMenuItem
                              key={folder.id}
                              onClick={() => handleBulkMoveToFolder(folder.id)}
                              className="flex items-center justify-between group hover:bg-accent/50"
                            >
                              <div className="flex items-center min-w-0 flex-1">
                                <FolderIcon className="mr-3 h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
                                <span className="truncate text-sm">
                                  {getTranslatedName(folder.systemType)}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          );
                        });
                    })()}
                    {(() => {
                      // For custom folders, don't show them if current email is in drafts or sent
                      const selectedEmailsArray = Array.from(selectedEmails)
                        .map(emailId => emails.find(e => e.id === emailId))
                        .filter(Boolean);
                      const currentFolderObj = selectedEmailsArray.length > 0 ? 
                        folders.find(f => f.id === selectedEmailsArray[0].folderId) : null;
                      const currentSystemType = currentFolderObj?.systemType?.toLowerCase();
                      
                      // Don't show custom folders if in drafts or sent
                      if (currentSystemType === "drafts" || currentSystemType === "sent") {
                        return null;
                      }
                      
                      const customFolders = folders.filter((f) => {
                        if (f.type !== "custom") return false;
                        // Don't show current folder
                        if (f.id === currentFolderObj?.id) return false;
                        return true;
                      });
                      
                      if (customFolders.length === 0) return null;
                      
                      return (
                        <>
                          <DropdownMenuSeparator />
                          {customFolders.map((folder) => (
                            <DropdownMenuItem
                              key={folder.id}
                              onClick={() => handleBulkMoveToFolder(folder.id)}
                              className="flex items-center justify-between group hover:bg-accent/50"
                            >
                              <div className="flex items-center min-w-0 flex-1">
                                <FolderIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-500 group-hover:text-blue-600" />
                                <span className="truncate text-sm">
                                  {folder.name}
                                </span>
                              </div>
                              <div className="text-xs text-blue-500/70 ml-2 opacity-60 group-hover:opacity-100">
                                Custom
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </>
                      );
                    })()}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowTagManagerDialog(true)}
                    >
                      <TagIcon className="mr-2 h-4 w-4" />
                      {t('manageTags')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleBulkDelete}
                      className="text-[hsl(0deg_91.89%_45.55%)] hover:text-[hsl(0deg_91.89%_40%)]"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("delete")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={clearSelection}>
                      <X className="mr-2 h-4 w-4" />
                      {t('cancel')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                );
              })()
            ) : null}
          </div>

          {/* Filter controls */}
          <div className="flex items-center gap-1 md:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs md:text-sm"
                >
                  <SortDesc className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                  <span className="hidden sm:inline">
                    {t("sortBy")} {t(`${sortBy}Sort`)}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => updateFilters(filterBy, "date", selectedTagFilter)}>
                  {t("sortByDate")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters(filterBy, "sender", selectedTagFilter)}>
                  {t("sortBySender")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters(filterBy, "subject", selectedTagFilter)}>
                  {t("sortBySubject")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs md:text-sm"
                  data-filter-button
                >
                  <Filter className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                  <span className="hidden sm:inline">
                    {t("filter")}: {t(`${filterBy}Filter`)}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => updateFilters("all", sortBy, selectedTagFilter)}>
                  {t("allEmails")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters("unread", sortBy, selectedTagFilter)}>
                  {t("unreadOnly")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters("starred", sortBy, selectedTagFilter)}>
                  {t("starredOnly")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters("attachments", sortBy, selectedTagFilter)}>
                  {t("withAttachments")}
                </DropdownMenuItem>
                {tags.length > 0 && (
                  <DropdownMenuItem
                    onClick={() => {
                      updateFilters("tags", sortBy, selectedTagFilter);
                      setShowTagSelector(true);
                    }}
                  >
                    {t("filterByTags")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Cancel Selection Button */}
            {isSelectionMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="h-8 text-xs md:text-sm text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <X className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden sm:inline">{t('cancel')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto overflow-x-hidden scroll-custom">
        {currentEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t("noEmailsFound")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {hasExecutedSearch && searchQuery
                ? `${t('noEmailsMatch')} "${searchQuery}"`
                : (filterBy !== 'all' || sortBy !== 'date' || selectedTagFilter) 
                  ? t("noEmailsWithFilters") 
                  : t("noEmailsInFolder")}
            </p>
            {(filterBy !== 'all' || sortBy !== 'date' || selectedTagFilter || (hasExecutedSearch && searchQuery)) && (
              <Button
                variant="outline"
                onClick={() => {
                  updateFilters('all', 'date', null);
                  // Clear search if active
                  if (hasExecutedSearch && searchQuery && window.dispatchEvent) {
                    window.dispatchEvent(new Event('clearSearch'));
                  }
                }}
                className="mt-2"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t("resetFilters")}
              </Button>
            )}
          </div>
        ) : (
          currentEmails.map((email) => (
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
                onMoveToFolder={onMoveToFolder}
                formatDate={formatDate}
                getAvatarContent={getAvatarContent}
                getAvatarColor={getAvatarColor}
                getTags={getTags}
                isSelected={selectedEmails.has(email.id)}
                isSelectionMode={isSelectionMode}
                onToggleSelection={toggleEmailSelection}
                onEnterSelectionMode={() => setIsSelectionMode(true)}
                avatarShape={avatarShape}
                leftSwipeAction={leftSwipeAction}
                rightSwipeAction={rightSwipeAction}
                swipeCustomFolder={swipeCustomFolder}
                folders={folders}
              />
            </EmailContextMenu>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPagesFromProps > 1 && (
        <div className="flex items-center justify-between p-4 border-t bg-background/95 backdrop-blur">
          <div className="text-sm text-muted-foreground">
            {t("pageOf")
              .replace("{{current}}", currentPage.toString())
              .replace("{{total}}", totalPagesFromProps.toString())}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGoToPage && onGoToPage(Math.max(1, currentPage - 1))}
              disabled={!hasPrevious}
              className="h-8 md:w-auto md:px-3 w-8 p-0"
            >
              <span className="md:hidden">{"<"}</span>
              <span className="hidden md:inline">{t("previous")}</span>
            </Button>

            <div className="flex items-center space-x-1">
              {(() => {
                const pages = [];
                const maxVisible = 4;
                
                if (totalPagesFromProps <= maxVisible) {
                  // Se tem 4 páginas ou menos, mostra todas
                  for (let i = 1; i <= totalPagesFromProps; i++) {
                    pages.push(
                      <Button
                        key={i}
                        variant={currentPage === i ? "default" : "outline"}
                        size="sm"
                        onClick={() => onGoToPage && onGoToPage(i)}
                        className="h-8 w-8 p-0"
                      >
                        {i}
                      </Button>
                    );
                  }
                } else {
                  // Lógica para mostrar páginas com elipses
                  const showFirst = currentPage > 3;
                  const showLast = currentPage < totalPagesFromProps - 2;
                  
                  if (currentPage <= 2) {
                    // Início: 1, 2, 3, ...
                    for (let i = 1; i <= 3; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => onGoToPage && onGoToPage(i)}
                          className="h-8 w-8 p-0"
                        >
                          {i}
                        </Button>
                      );
                    }
                    pages.push(
                      <span key="ellipsis" className="px-2 text-muted-foreground">...</span>
                    );
                  } else if (currentPage >= totalPagesFromProps - 1) {
                    // Final: ..., n-2, n-1, n
                    pages.push(
                      <span key="ellipsis" className="px-2 text-muted-foreground">...</span>
                    );
                    for (let i = totalPagesFromProps - 2; i <= totalPagesFromProps; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => onGoToPage && onGoToPage(i)}
                          className="h-8 w-8 p-0"
                        >
                          {i}
                        </Button>
                      );
                    }
                  } else {
                    // Meio: ..., current-1, current, current+1, ...
                    pages.push(
                      <span key="ellipsis1" className="px-2 text-muted-foreground">...</span>
                    );
                    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => onGoToPage && onGoToPage(i)}
                          className="h-8 w-8 p-0"
                        >
                          {i}
                        </Button>
                      );
                    }
                    pages.push(
                      <span key="ellipsis2" className="px-2 text-muted-foreground">...</span>
                    );
                  }
                }
                
                return pages;
              })()}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onGoToPage && onGoToPage(Math.min(totalPagesFromProps, currentPage + 1))
              }
              disabled={!hasNext}
              className="h-8 md:w-auto md:px-3 w-8 p-0"
            >
              <span className="md:hidden">{">"}</span>
              <span className="hidden md:inline">{t("next")}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Tag Limit Dialog */}
      <Dialog open={showTagLimitDialog} onOpenChange={setShowTagLimitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Limite de Tags Atingido</DialogTitle>
            <DialogDescription className="pt-2">
              Alguns emails já possuem 2 tags ou já têm a tag selecionada. Cada
              email pode ter no máximo 2 tags.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowTagLimitDialog(false)}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tag Selector Modal */}
      <Dialog
        open={showTagSelector}
        onOpenChange={(open) => {
          setShowTagSelector(open);
          if (!open && !selectedTagFilter) {
            // FIXED: Use updateFilters instead of setFilterBy to prevent ReferenceError
            updateFilters("all", sortBy, null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('selectTagToFilterTitle')}</DialogTitle>
            <DialogDescription>
              {t('chooseTagToFilter')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {selectedTagFilter && (
              <div className="pb-2 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateFilters("all", sortBy, null);
                    setShowTagSelector(false);
                  }}
                  className="w-full justify-start"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('resetFilters')}
                </Button>
              </div>
            )}
            {tags.map((tag) => (
              <Button
                key={tag.id}
                variant={selectedTagFilter === tag.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  updateFilters("tags", sortBy, tag.id);
                  setShowTagSelector(false);
                }}
                className="w-full justify-start"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span>{tag.name}</span>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tag Manager Dialog */}
      <TagManagerDialog
        open={showTagManagerDialog}
        onOpenChange={setShowTagManagerDialog}
        emailIds={Array.from(selectedEmails)}
        userId={1}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
        onConfirm={deleteConfirmation.onConfirm || (() => Promise.resolve())}
        emailCount={deleteConfirmation.emails.length}
        folderName={deleteConfirmation.folderName}
        isPermanent={deleteConfirmation.isPermanent}
      />
    </div>
  );
}
