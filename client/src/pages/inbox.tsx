import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import EmailList from "@/components/email-list";
import EmailContent from "@/components/email-content";
import ComposeModal from "@/components/compose-modal";
import SettingsModal from "@/components/settings-modal";
import FolderTagModal from "@/components/folder-tag-modal";
import TagModal from "@/components/tag-modal";
import TagManagerDialog from "@/components/tag-manager-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Filter, RefreshCw } from "lucide-react";
import { useEmails } from "@/hooks/use-emails";
import { usePaginatedEmails } from "@/hooks/use-paginated-emails";
import { useTags } from "@/hooks/use-tags";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";

import { t } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Email, Folder, Tag } from "@shared/schema";

export default function Inbox() {
  const [location, setLocation] = useLocation();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>("inbox");
  const [showCompose, setShowCompose] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [composeContext, setComposeContext] = useState<{
    type: "compose" | "reply" | "forward";
    email?: Email;
  }>({ type: "compose" });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Email[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasExecutedSearch, setHasExecutedSearch] = useState(false);
  const [isFullScreenEmail, setIsFullScreenEmail] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [emailViewMode, setEmailViewMode] = useState(() => {
    const saved = localStorage.getItem("emailViewMode");
    if (saved) return saved;
    // Usar fullscreen como padrão para telas menores que 1369px
    return window.innerWidth < 1369 ? "fullscreen" : "sidebar";
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // Aplicar novo padrão de 264px (+20%)
    const currentSaved = localStorage.getItem("sidebarWidth");
    if (!currentSaved || parseInt(currentSaved) !== 264) {
      localStorage.setItem("sidebarWidth", "264");
      return 264;
    }
    return parseInt(currentSaved);
  });
  const { toast } = useToast();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  const [emailListWidth, setEmailListWidth] = useState(() => {
    const saved = localStorage.getItem("emailListWidth");
    if (saved) {
      return parseInt(saved);
    }
    // Valor inicial proporcional à tela
    const sidebarWidth = 264;
    const availableWidth = window.innerWidth - sidebarWidth;
    return window.innerWidth <= 1024
      ? availableWidth * 0.45
      : availableWidth * 0.35;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingEmailList, setIsResizingEmailList] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1280);
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [showTagManagerDialog, setShowTagManagerDialog] = useState(false);
  const isMobile = useIsMobile();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    setLocation("/login");
    return null;
  }

  // Show loading if auth is still loading
  if (authLoading || !user) {
    return <div>Loading...</div>;
  }

  const userId = user.id;



  const {
    emails: allEmails,
    folders,
    emailCounts,
    currentUser,
    isLoading,
    getEmailsByFolder,
    updateEmail,
    toggleEmailStar,
    markEmailAsRead,
    sendEmail,
    saveDraft,
    deleteEmailWithConfirmation,
    moveEmail,
    createFolder,
    updateFolder,
    deleteFolder,
    refetchFolders,
  } = useEmails(userId);

  // Tags hook
  const {
    tags,
    isLoading: tagsLoading,
    createTag,
    updateTag,
    deleteTag,
  } = useTags(userId);

  // Filter states
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [selectedTagFilter, setSelectedTagFilter] = useState<number | null>(null);
  
  // Use new paginated emails hook with filters
  const {
    emails: paginatedEmails,
    totalCount,
    totalPages,
    currentPage,
    emailsPerPage,
    isLoading: folderLoading,
    hasNext,
    hasPrevious,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    getCacheInfo
  } = usePaginatedEmails(userId, currentFolder, { filterBy, sortBy, tagFilter: selectedTagFilter });
  // Use search results only when search was explicitly executed via ENTER or button click
  // This ensures consistent behavior: all folders (system and custom) require explicit search action
  const emails = hasExecutedSearch ? searchResults : paginatedEmails;

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

  const handleSearchSubmit = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasExecutedSearch(false);
      return;
    }

    setIsSearching(true);
    setHasExecutedSearch(true); // Mark that search was explicitly executed
    try {
      // Add current folder to search parameters to restrict search to current folder
      const params = new URLSearchParams({ q: query });
      if (currentFolder) {
        params.append('folder', currentFolder);
      }
      
      const response = await fetch(`/api/search/${userId}?${params.toString()}`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      } else {
        console.error("Search failed:", response.statusText);
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Listen for email view mode changes
  useEffect(() => {
    const handleViewModeChange = (event: CustomEvent) => {
      setEmailViewMode(event.detail);
    };

    window.addEventListener(
      "email-view-mode-changed",
      handleViewModeChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "email-view-mode-changed",
        handleViewModeChange as EventListener,
      );
    };
  }, []);

  // Update current folder based on URL
  useEffect(() => {
    const pathSegments = location.split("/");
    const folderType = pathSegments[2] || "inbox";
    setCurrentFolder(folderType);
  }, [location]);

  // Listen for email view mode changes from settings
  useEffect(() => {
    const handleEmailViewModeChange = (event: CustomEvent) => {
      setEmailViewMode(event.detail);
    };

    window.addEventListener(
      "emailViewModeChanged",
      handleEmailViewModeChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "emailViewModeChanged",
        handleEmailViewModeChange as EventListener,
      );
    };
  }, []);

  // Handle window resize for desktop detection
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1280);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for clear search event from EmailList
  useEffect(() => {
    const handleClearSearch = () => {
      setSearchQuery("");
      setSearchResults([]);
      setHasExecutedSearch(false); // Reset search execution state
    };

    window.addEventListener("clearSearch", handleClearSearch);
    return () => window.removeEventListener("clearSearch", handleClearSearch);
  }, []);

  // Clear search results when search query is cleared - but don't auto-search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setHasExecutedSearch(false); // Reset search execution state when clearing query
    }
    // IMPORTANT: Do not auto-search when user types - only search on ENTER key or button click
    // This ensures consistent behavior across all folder types (system and custom)
  }, [searchQuery]);

  // Listen for refresh email data events (from delete confirmation)
  useEffect(() => {
    const handleRefreshEmailData = () => {
      console.log("🔄 Received refresh email data event - refreshing queries");
      handleRefresh();
    };

    window.addEventListener("refreshEmailData", handleRefreshEmailData);
    return () => window.removeEventListener("refreshEmailData", handleRefreshEmailData);
  }, []);

  // Update page title with unread count
  useEffect(() => {
    const unreadCount = emailCounts?.inbox || 0;
    const title = unreadCount > 0 ? `Eliano Mail (${unreadCount})` : 'Eliano Mail';
    document.title = title;
  }, [emailCounts]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      await handleRefresh();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle sidebar resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    console.log("Resize handle clicked, isMobile:", isMobile);
    if (isMobile) return;
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // Handle email list resizing
  const handleEmailListMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsResizingEmailList(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = Math.min(Math.max(200, e.clientX), 500); // Min 200px, Max 500px
      setSidebarWidth(newWidth);
      localStorage.setItem("sidebarWidth", newWidth.toString());
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Handle email list resizing
  useEffect(() => {
    if (!isResizingEmailList) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingEmailList) return;

      // Apenas permitir redimensionamento em desktop (1024px+)
      if (window.innerWidth < 1024) {
        setIsResizingEmailList(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        return;
      }

      const sidebarActualWidth = isMobile
        ? 0
        : isSidebarCollapsed
          ? 64
          : sidebarWidth;
      const availableWidth = window.innerWidth - sidebarActualWidth;

      // Proporções fixas para desktop (1280px+)
      const minPercent = 0.5; // 50% mínimo em desktop
      const maxPercent = 0.7; // 70% máximo em desktop

      const minWidth = availableWidth * minPercent;
      const maxWidth = availableWidth * maxPercent;
      let newWidth;
      
      if (emailViewMode === "right-sidebar") {
        // No right-sidebar, calcular a partir da direita
        // Limitação especial: email list max 40% para garantir que email content tenha pelo menos 60%
        const maxEmailListWidthRightSidebar = availableWidth * 0.6;
        const calculatedWidth = window.innerWidth - e.clientX;
        newWidth = Math.min(
          Math.max(minWidth, calculatedWidth),
          Math.min(maxWidth, maxEmailListWidthRightSidebar),
        );
      } else {
        // No left sidebar, calcular a partir da esquerda
        // Limitação especial: email list max 60% para garantir que email content tenha pelo menos 40%
        const maxEmailListWidthLeftSidebar = availableWidth * 0.6;
        const calculatedWidth = e.clientX - sidebarActualWidth;
        newWidth = Math.min(
          Math.max(minWidth, calculatedWidth),
          Math.min(maxWidth, maxEmailListWidthLeftSidebar),
        );
      }
      setEmailListWidth(newWidth);
      localStorage.setItem("emailListWidth", newWidth.toString());
    };

    const handleMouseUp = () => {
      setIsResizingEmailList(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingEmailList, sidebarWidth, isMobile, isSidebarCollapsed]);

  // Ajustar largura quando a janela for redimensionada
  useEffect(() => {
    const handleResize = () => {
      const sidebarActualWidth = isMobile
        ? 0
        : isSidebarCollapsed
          ? 64
          : sidebarWidth;
      const availableWidth = window.innerWidth - sidebarActualWidth;

      let minPercent, maxPercent;
      if (window.innerWidth <= 1024) {
        minPercent = 0.4;
        maxPercent = 0.75;
      } else {
        minPercent = 0.3;
        maxPercent = 0.7;
      }

      const minWidth = availableWidth * minPercent;
      const maxWidth = availableWidth * maxPercent;

      // Ajustar se a largura atual estiver fora dos limites
      if (emailListWidth < minWidth || emailListWidth > maxWidth) {
        const newWidth = Math.min(Math.max(emailListWidth, minWidth), maxWidth);
        setEmailListWidth(newWidth);
        localStorage.setItem("emailListWidth", newWidth.toString());
      }
    };

    window.addEventListener("resize", handleResize);
    // Executar uma vez ao carregar
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [emailListWidth, sidebarWidth, isMobile, isSidebarCollapsed]);

  const handleEmailSelect = async (email: Email) => {
    setSelectedEmail(email);

    if (!email.isRead && email.id) {
      try {
        await markEmailAsRead({ emailId: email.id, isRead: true });
      } catch (error) {
        console.error("Failed to mark email as read:", error);
        // Email might have been deleted, clear selection
        setSelectedEmail(null);
      }
    }
    // Hide email list on mobile when selecting email
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen(false);
    }
  };

  const handleFolderChange = (folderType: string) => {
    setCurrentFolder(folderType);
    setSelectedEmail(null);
    // Clear selected emails when changing folders as requested by user
    setSelectedEmails(new Set());
    // Reset search when changing folders as requested by user
    setSearchQuery("");
    setSearchResults([]);
    setHasExecutedSearch(false);
  };

  const handleCompose = () => {
    // Open compose modal immediately for better UX
    // DO NOT create database entry until user closes compose box or sends email
    setComposeContext({ type: "compose" });
    setShowCompose(true);
  };

  const handleSendEmail = async (emailData: any) => {
    try {
      await sendEmail(emailData);
      
      // Close the currently opened email automatically (Back to inbox)
      setSelectedEmail(null);
      
      // Smooth cache revalidation without page reload
      await queryClient.invalidateQueries({ queryKey: [`/api/emails/${currentUser?.id}`] });
      await queryClient.invalidateQueries({ queryKey: [`/api/counts/${currentUser?.id}`] });
      
      setShowCompose(false);
      setComposeContext({ type: "compose" });
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  const handleSaveDraft = async (emailData: any, draftId?: number) => {
    try {
      console.log("🚀 handleSaveDraft called with:");
      console.log("  - emailData:", emailData);
      console.log("  - draftId:", draftId);
      console.log("  - composeContext.type:", composeContext.type);
      console.log("  - composeContext.email?.isDraft:", composeContext.email?.isDraft);
      
      // Check if there's any content to save
      const hasContent = (
        (emailData.subject && emailData.subject.trim().length > 0) ||
        (emailData.body && emailData.body.trim().length > 0) ||
        (emailData.to && emailData.to.trim().length > 0) ||
        (emailData.cc && emailData.cc.trim().length > 0) ||
        (emailData.bcc && emailData.bcc.trim().length > 0)
      );
      
      if (!hasContent) {
        console.log("No content to save, skipping draft creation");
        setShowCompose(false);
        setComposeContext({ type: "compose" });
        return;
      }
      
      // Check if we're editing an existing draft (has ID) - UPDATE instead of creating new
      if (draftId && composeContext.email?.isDraft) {
        console.log("📝 UPDATING existing draft with ID:", draftId);
        console.log("📎 Attachments data:", emailData.attachments);
        console.log("📎 Attachments count:", emailData.attachments ? emailData.attachments.length : 0);
        
        // Update existing draft
        const response = await apiRequest("PUT", `/api/email/${draftId}`, {
          subject: emailData.subject || "",
          body: emailData.body || "",
          toAddress: emailData.to || "",
          ccAddress: emailData.cc || null,
          bccAddress: emailData.bcc || null,
          attachments: emailData.attachments || [],
        });
        console.log("✅ Existing draft updated successfully!");
        
        // Comprehensive cache invalidation for draft updates - force immediate UI update
        console.log('🔄 Forcing comprehensive cache invalidation for draft update...');
        
        // 1. Remove all cached queries for the drafts folder (all pagination pages)
        queryClient.removeQueries({
          predicate: (query) => {
            const key = query.queryKey[0]?.toString() || '';
            return key === `/api/emails/${currentUser?.id}/folder/drafts`;
          }
        });
        
        // 2. If we're currently viewing drafts, also invalidate current folder cache
        if (currentFolder === 'drafts') {
          queryClient.removeQueries({
            predicate: (query) => {
              const key = query.queryKey[0]?.toString() || '';
              return key === `/api/emails/${currentUser?.id}/folder/${currentFolder}`;
            }
          });
        }
        
        // 3. Remove email counts cache to update counters
        queryClient.removeQueries({ queryKey: [`/api/counts/${currentUser?.id}`] });
        
        // 4. Add a small delay to ensure backend has processed the update
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 5. Force immediate refetch of the drafts folder to update the UI
        await queryClient.refetchQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0]?.toString() || '';
            return key === `/api/emails/${currentUser?.id}/folder/drafts`;
          }
        });
        
        // 6. Also refetch current folder if we're viewing drafts (for pagination)
        if (currentFolder === 'drafts') {
          await queryClient.refetchQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0]?.toString() || '';
              return key === `/api/emails/${currentUser?.id}/folder/${currentFolder}`;
            }
          });
        }
        
        // 7. Force refetch of email counts to update counters
        await queryClient.refetchQueries({ queryKey: [`/api/counts/${currentUser?.id}`] });
        
        // 8. Force invalidation and refetch of all folder-related queries to ensure UI updates
        await queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0]?.toString() || '';
            return key.includes(`/api/emails/${currentUser?.id}/folder/`);
          }
        });
        
        // 9. Additional forced refresh for paginated emails specifically
        await queryClient.refetchQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0]?.toString() || '';
            return key.includes(`/api/emails/${currentUser?.id}/folder/`);
          }
        });
        
        console.log('✅ Cache invalidation complete for draft update - UI should update immediately');
      } else {
        // This is a new compose - ALWAYS create a new draft
        console.log("📝 Creating NEW draft (new compose session)");
        await saveDraft(emailData);
        console.log("✅ New draft created successfully!");
        
        // Force invalidation and refetch to ensure UI updates immediately
        console.log('🔄 Forcing cache invalidation and refetch...');
        queryClient.invalidateQueries({ queryKey: [`/api/emails/${currentUser?.id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/emails/${currentUser?.id}/folder/drafts`] });
        queryClient.invalidateQueries({ queryKey: [`/api/counts/${currentUser?.id}`] });
        
        // Ensure fresh refetch
        await queryClient.refetchQueries({ queryKey: [`/api/emails/${currentUser?.id}/folder/drafts`] });
      }

      // Close the compose modal
      setShowCompose(false);
      setComposeContext({ type: "compose" });
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  };

  // Function to strip HTML tags and get plain text
  const stripHtmlTags = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const handleCloseCompose = () => {
    // Close the currently opened email automatically (Back to inbox) when closing compose
    setSelectedEmail(null);
    
    // Modal close is now handled by handleModalClose in compose-modal.tsx
    // This function is kept for compatibility but no longer used for X button clicks
    setShowCompose(false);
    setComposeContext({ type: "compose" });
  };

  const handleCreateFolder = () => {
    setEditingFolder(null);
    setShowFolderModal(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setShowFolderModal(true);
  };

  const handleSaveFolder = async (folderData: {
    name: string;
    color: string;
    icon: string;
  }) => {
    try {
      await createFolder({
        ...folderData,
        userId: currentUser?.id || 1,
        type: "custom",
      });

      setShowFolderModal(false);
      setEditingFolder(null);
    } catch (error: any) {
      console.error("Failed to save folder:", error);
      // Re-throw error so modal can handle it
      throw error;
    }
  };

  const handleUpdateFolder = async (
    folderId: number,
    folderData: { name: string; color: string; icon: string },
  ) => {
    try {
      await updateFolder({ folderId, folderData });
      setShowFolderModal(false);
      setEditingFolder(null);
    } catch (error: any) {
      console.error("Failed to update folder:", error);
      // Re-throw error so modal can handle it
      throw error;
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    try {
      // The backend should handle moving emails back to inbox
      await deleteFolder(folderId);
      setShowFolderModal(false);
      setEditingFolder(null);
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  };

  const handleCloseFolderModal = () => {
    setShowFolderModal(false);
    setEditingFolder(null);
  };

  // Tag handlers
  const handleTagSelect = (tagName: string) => {
    // For now, just log. In the future, this could filter emails by tag
    console.log("Selected tag:", tagName);
  };

  const handleEmailDrop = async (emailId: number, folderId: number) => {
    try {
      await moveEmail({ emailId, folderId });
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
      
      // Force refresh after drag & drop
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/counts'] });
    } catch (error) {
      console.error("Failed to move email via drag & drop:", error);
    }
  };

  // Optimistic star toggle - updates UI immediately without flash
  const handleToggleStarViaDropOrAction = async (emailId: number) => {
    try {
      // Call the toggleEmailStar mutation that already has optimistic updates
      await toggleEmailStar(emailId);
      
      // Update selected email if it's the one being starred
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail({
          ...selectedEmail,
          isStarred: selectedEmail.isStarred ? 0 : 1
        });
      }
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  const handleCreateTag = () => {
    setEditingTag(null);
    setShowTagModal(true);
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setShowTagModal(true);
  };

  const handleSaveTag = async (tagData: any) => {
    try {
      await createTag(tagData);
      setShowTagModal(false);
      setEditingTag(null);
    } catch (error: any) {
      console.error("Failed to create tag:", error);
      // Re-throw error so modal can handle it
      throw error;
    }
  };

  const handleUpdateTag = async (tagId: number, tagData: any) => {
    try {
      await updateTag({ id: tagId, ...tagData });
      setShowTagModal(false);
      setEditingTag(null);
    } catch (error: any) {
      console.error("Failed to update tag:", error);
      // Re-throw error so modal can handle it
      throw error;
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    try {
      await deleteTag(tagId);
      setShowTagModal(false);
      setEditingTag(null);
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  };

  const handleCloseTagModal = () => {
    setShowTagModal(false);
    setEditingTag(null);
  };

  const handleEditDraft = (email: Email) => {
    // Set up compose context for editing the draft
    setComposeContext({
      type: "compose", // Use 'compose' since we're editing the draft
      email: email,
    });
    setShowCompose(true);
  };

  const handleToggleSidebarCollapse = () => {
    const newCollapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsed);
    localStorage.setItem("sidebarCollapsed", newCollapsed.toString());
  };

  return (
    <div className="flex h-screen overflow-hidden overflow-x-hidden">
      {/* Sidebar with resize functionality */}
      <div
        className="relative flex-shrink-0 hidden sm:block"
        style={{ width: `${isSidebarCollapsed ? 64 : sidebarWidth}px` }}
      >
        <Sidebar
          currentFolder={currentFolder}
          folders={folders}
          tags={tags}
          emailCounts={emailCounts}
          currentUser={currentUser ?? null}
          onFolderChange={handleFolderChange}
          onTagSelect={handleTagSelect}
          onCompose={handleCompose}
          onSettingsClick={() => setShowSettings(true)}
          onCreateFolder={handleCreateFolder}
          onEditFolder={handleEditFolder}
          onCreateTag={handleCreateTag}
          onEditTag={handleEditTag}
          isMobileOpen={false}
          onMobileClose={() => {}}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
          onEmailDrop={handleEmailDrop}
          onToggleStar={handleToggleStarViaDropOrAction}
        />

        {/* Resize Handle - Desktop only (1024px+) */}
        {!isMobile && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-border hover:bg-primary/50 transition-all duration-200 group z-10"
            onMouseDown={handleMouseDown}
            style={{
              background: isResizing ? "hsl(var(--primary))" : undefined,
            }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
              <div className="w-1 h-8 bg-primary/80 rounded-full"></div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sidebar - Only show on mobile */}
      <div className="sm:hidden">
        <Sidebar
          currentFolder={currentFolder}
          folders={folders}
          tags={tags}
          emailCounts={emailCounts}
          currentUser={currentUser ?? null}
          onFolderChange={handleFolderChange}
          onTagSelect={handleTagSelect}
          onCompose={handleCompose}
          onSettingsClick={() => setShowSettings(true)}
          onCreateFolder={handleCreateFolder}
          onEditFolder={handleEditFolder}
          onCreateTag={handleCreateTag}
          onEditTag={handleEditTag}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={false}
          onToggleCollapse={undefined}
          onEmailDrop={handleEmailDrop}
          onToggleStar={handleToggleStarViaDropOrAction}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onSidebarToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          currentUser={currentUser}
          onSettingsClick={() => setShowSettings(true)}
        />

        {/* Email Interface */}
        <div
          className={`email-interface flex-1 flex overflow-hidden overflow-x-hidden ${!selectedEmail ? "no-email-selected" : ""} ${emailViewMode === "right-sidebar" ? "flex-row-reverse" : ""}`}
        >
          {/* Email List with dynamic width - Hidden based on view mode and mobile behavior */}
          {(!isMobile || !selectedEmail) &&
            !(emailViewMode === "fullscreen" && selectedEmail) && (
              <div
                className={`email-list-container relative ${emailViewMode === "sidebar" || emailViewMode === "right-sidebar" ? "flex-shrink-0" : "flex-1"} ${
                  emailViewMode === "sidebar"
                    ? "border-r border-border"
                    : emailViewMode === "right-sidebar"
                      ? "border-l border-border"
                      : ""
                }`}
                style={{
                  width: isMobile
                    ? "100%"
                    : emailViewMode === "sidebar" ||
                        emailViewMode === "right-sidebar"
                      ? `${emailListWidth}px`
                      : "100%",
                }}
              >
                <EmailList
                  emails={emails}
                  currentFolder={currentFolder}
                  selectedEmail={selectedEmail}
                  isLoading={isLoading || folderLoading || isSearching}
                  folders={folders}
                  onEmailSelect={handleEmailSelect}
                  onToggleStar={(emailId) => handleToggleStarViaDropOrAction(emailId)}
                  onDelete={async (email) => {
                    try {
                      await deleteEmailWithConfirmation(email, folders);
                      if (selectedEmail?.id === email.id) {
                        setSelectedEmail(null);
                      }
                    } catch (error) {
                      console.error("Failed to delete email:", error);
                    }
                  }}
                  onArchive={async (email) => {
                    try {
                      // Move to archive folder
                      const archiveFolder = folders.find(
                        (f) => f.systemType === "archive",
                      );
                      if (archiveFolder) {
                        await moveEmail({
                          emailId: email.id,
                          folderId: archiveFolder.id,
                        });
                        if (selectedEmail?.id === email.id) {
                          setSelectedEmail(null);
                        }
                      }
                    } catch (error) {
                      console.error("Failed to archive email:", error);
                    }
                  }}
                  onMarkRead={(emailId, isRead) =>
                    markEmailAsRead({ emailId, isRead })
                  }
                  onMoveToFolder={async (emailId, folderId) => {
                    try {
                      await moveEmail({ emailId, folderId });
                      if (selectedEmail?.id === emailId) {
                        setSelectedEmail(null);
                      }
                    } catch (error) {
                      console.error("Failed to move email:", error);
                    }
                  }}
                  onCreateFolder={async (name) => {
                    // TODO: Implement create folder functionality
                    console.log("Create folder:", name);
                  }}
                  onSendToJunk={(email) => {
                    // TODO: Implement send to junk functionality
                    console.log("Send to junk:", email.id);
                  }}
                  searchQuery={searchQuery}
                  hasExecutedSearch={hasExecutedSearch}
                  // Pagination props
                  totalCount={totalCount}
                  totalPages={totalPages}
                  currentPage={currentPage}
                  emailsPerPage={emailsPerPage}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                  onNextPage={goToNextPage}
                  onPreviousPage={goToPreviousPage}
                  onGoToPage={goToPage}
                  // Filter props
                  filterBy={filterBy}
                  sortBy={sortBy}
                  selectedTagFilter={selectedTagFilter}
                  onFilterChange={(newFilterBy, newSortBy, newTagFilter) => {
                    setFilterBy(newFilterBy);
                    setSortBy(newSortBy);
                    setSelectedTagFilter(newTagFilter);
                  }}
                />

                {/* Resize Handle for email list - Desktop only */}
                {!isMobile &&
                  (emailViewMode === "sidebar" ||
                    emailViewMode === "right-sidebar") && (
                    <div
                      className={`absolute top-0 w-1 h-full cursor-col-resize bg-border hover:bg-primary/50 transition-all duration-200 group z-10 ${
                        emailViewMode === "sidebar" ? "right-0" : "left-0"
                      }`}
                      onMouseDown={handleEmailListMouseDown}
                      style={{
                        background: isResizingEmailList
                          ? "hsl(var(--primary))"
                          : undefined,
                      }}
                    >
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                          emailViewMode === "sidebar" ? "-right-1" : "-left-1"
                        }`}
                      >
                        <div className="w-1 h-8 bg-primary/80 rounded-full"></div>
                      </div>
                    </div>
                  )}
              </div>
            )}

          {/* Email Content - Show based on view mode and selection */}
          {(selectedEmail ||
            emailViewMode === "sidebar" ||
            emailViewMode === "right-sidebar") && (
            <div className="email-content-container flex-1 overflow-hidden">
              {selectedEmail ? (
                <EmailContent
                  email={selectedEmail}
                  currentFolder={currentFolder}
                  emailCounts={emailCounts}
                  currentUser={currentUser}
                  folders={folders}
                  onReply={(email) => {
                    setComposeContext({ type: "reply", email });
                    setShowCompose(true);
                  }}
                  onForward={(email) => {
                    setComposeContext({ type: "forward", email });
                    setShowCompose(true);
                  }}
                  onEdit={handleEditDraft}
                  onToggleStar={(emailId) => handleToggleStarViaDropOrAction(emailId)}
                  onClose={() => setSelectedEmail(null)}
                  onDelete={async (email) => {
                    try {
                      await deleteEmailWithConfirmation(email, folders);
                      setSelectedEmail(null);
                    } catch (error) {
                      console.error("Failed to delete email:", error);
                    }
                  }}
                  onMarkRead={async (emailId, isRead) => {
                    try {
                      await markEmailAsRead({ emailId, isRead });
                      // Update selected email if it's the same email
                      if (selectedEmail?.id === emailId) {
                        setSelectedEmail({ ...selectedEmail, isRead: isRead ? 1 : 0 });
                      }
                    } catch (error) {
                      console.error("Failed to mark email as read:", error);
                    }
                  }}
                  onMoveToFolder={async (emailId, folderId) => {
                    try {
                      await moveEmail({ emailId, folderId });
                      if (selectedEmail?.id === emailId) {
                        setSelectedEmail(null);
                      }
                    } catch (error) {
                      console.error("Failed to move email:", error);
                    }
                  }}
                  onManageTags={(email) => {
                    setSelectedEmails(new Set([email.id]));
                    setShowTagManagerDialog(true);
                  }}
                  onMoveToJunk={async (email) => {
                    try {
                      console.log("Moving email to junk:", email.id);
                      console.log("Available folders:", folders.map(f => ({ name: f.name, systemType: f.systemType })));
                      const junkFolder = folders.find(f => f.systemType === "junk");
                      console.log("Found junk folder:", junkFolder);
                      if (junkFolder) {
                        await moveEmail({ emailId: email.id, folderId: junkFolder.id });
                        
                        // Comprehensive cache invalidation
                        await queryClient.invalidateQueries({ queryKey: ['emails'] });
                        await queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
                        await queryClient.invalidateQueries({ queryKey: ['/api/counts'] });
                        await queryClient.invalidateQueries({ queryKey: ['folder-emails'] });
                        await queryClient.refetchQueries({ queryKey: ['emails'] });
                        await queryClient.refetchQueries({ queryKey: ['/api/emails'] });
                        
                        if (selectedEmail?.id === email.id) {
                          setSelectedEmail(null);
                        }
                        
                        toast({
                          title: "Email movido",
                          description: "O email foi movido para a pasta de spam.",
                        });
                      } else {
                        console.error("Junk folder not found");
                        toast({
                          title: "Erro",
                          description: "Pasta de spam não encontrada.",
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      console.error("Failed to move to junk:", error);
                      toast({
                        title: "Erro",
                        description: "Não foi possível mover o email para spam.",
                        variant: "destructive",
                      });
                    }
                  }}
                  onArchive={async (email) => {
                    try {
                      console.log("Archiving email:", email.id);
                      console.log("Available folders:", folders.map(f => ({ name: f.name, systemType: f.systemType })));
                      const archiveFolder = folders.find(f => f.systemType === "archive");
                      console.log("Found archive folder:", archiveFolder);
                      if (archiveFolder) {
                        await moveEmail({ emailId: email.id, folderId: archiveFolder.id });
                        
                        // Comprehensive cache invalidation
                        await queryClient.invalidateQueries({ queryKey: ['emails'] });
                        await queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
                        await queryClient.invalidateQueries({ queryKey: ['/api/counts'] });
                        await queryClient.invalidateQueries({ queryKey: ['folder-emails'] });
                        await queryClient.refetchQueries({ queryKey: ['emails'] });
                        await queryClient.refetchQueries({ queryKey: ['/api/emails'] });
                        
                        if (selectedEmail?.id === email.id) {
                          setSelectedEmail(null);
                        }
                        
                        toast({
                          title: "Email arquivado",
                          description: "O email foi movido para a pasta de arquivo.",
                        });
                      } else {
                        console.error("Archive folder not found");
                        toast({
                          title: "Erro",
                          description: "Pasta de arquivo não encontrada.",
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      console.error("Failed to archive email:", error);
                      toast({
                        title: "Erro",
                        description: "Não foi possível arquivar o email.",
                        variant: "destructive",
                      });
                    }
                  }}
                  onBlockSender={async (email) => {
                    try {
                      // Check if user is trying to block their own email address
                      if (email.fromAddress === currentUser?.email) {
                        toast({
                          title: t('error'),
                          description: t('cannotBlockOwnEmail'),
                          variant: "destructive",
                        });
                        return;
                      }

                      // Block the sender (backend automatically moves email to SPAM)
                      const response = await apiRequest("POST", "/api/blocked-senders", {
                        userId: currentUser?.id,
                        blockedEmail: email.fromAddress,
                        emailId: email.id
                      });
                      
                      // Comprehensive cache invalidation to refresh all folder views
                      const userId = currentUser?.id;
                      if (userId) {
                        // Invalidate and refetch all system folders
                        await queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}`] });
                        await queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/inbox`] });
                        await queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/starred`] });
                        await queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/sent`] });
                        await queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/drafts`] });
                        await queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/junk`] });
                        await queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/trash`] });
                        await queryClient.refetchQueries({ queryKey: [`/api/counts/${userId}`] });
                        
                        // Invalidate all folder-related queries including custom folders
                        await queryClient.invalidateQueries({ queryKey: ['emails'] });
                        await queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
                        await queryClient.invalidateQueries({ queryKey: ['/api/counts'] });
                        await queryClient.invalidateQueries({ queryKey: ['folder-emails'] });
                        
                        // Get all custom folders and refresh them too
                        const foldersData = queryClient.getQueryData([`/api/folders/${userId}`]) as any[];
                        if (foldersData) {
                          for (const folder of foldersData) {
                            if (folder.type === 'custom') {
                              await queryClient.refetchQueries({ 
                                queryKey: [`/api/emails/${userId}/folder/${folder.name.toLowerCase()}`] 
                              });
                            }
                          }
                        }
                      }
                      
                      if (selectedEmail?.id === email.id) {
                        setSelectedEmail(null);
                      }
                      
                      toast({
                        title: t('senderBlocked'),
                        description: t('senderBlockedDescription'),
                      });
                    } catch (error) {
                      console.error("Failed to block sender:", error);
                      toast({
                        title: t('error'),
                        description: t('cannotBlockSender'),
                        variant: "destructive",
                      });
                    }
                  }}
                  isFullScreen={emailViewMode === "fullscreen" && !isMobile}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground pt-16">
                  <div className="text-center max-w-md px-4">
                    {currentFolder === "junk" ? (
                      <>
                        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-red-500/30">
                          <svg
                            className="w-10 h-10 text-red-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium mb-4 text-foreground">
                          Não dê chance ao spam!
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground/80">
                          Não abra links desconhecidos.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-blue-500/30">
                          <svg
                            className="w-10 h-10 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium mb-4 text-foreground">
                          {t('selectEmail') || 'Select an email'}
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground/80">
                          {t('selectEmailToView') || 'Select an email from the list to view its contents.'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ComposeModal
        open={showCompose}
        onClose={handleCloseCompose}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
        editingDraft={
          composeContext.type === "compose" && composeContext.email?.isDraft
            ? {
                id: composeContext.email.id,
                subject: composeContext.email.subject || "",
                toAddress: composeContext.email.toAddress || "",
                ccAddress: composeContext.email.ccAddress || "",
                bccAddress: composeContext.email.bccAddress || "",
                body: composeContext.email.body || "",
                attachments: Array.isArray(composeContext.email.attachments) ? composeContext.email.attachments : [],
              }
            : undefined
        }
        replyTo={
          composeContext.type === "reply" && composeContext.email
            ? {
                subject: `Re: ${composeContext.email.subject}`,
                to: composeContext.email.fromAddress,
                //body: `\n\n\n--- Original Message ---\nFrom: ${composeContext.email.fromAddress}\nDate: ${composeContext.email.receivedAt ? new Date(composeContext.email.receivedAt).toLocaleString() : "Unknown"}\nSubject: ${composeContext.email.subject}\n\n${composeContext.email.body}`,
                body: composeContext.email.body
              }
            : composeContext.type === "forward" && composeContext.email
              ? {
                  subject: `Fwd: ${composeContext.email.subject}`,
                  to: "",
                  //body: `\n\n\n--- Forwarded Message ---\nFrom: ${composeContext.email.fromAddress}\nDate: ${composeContext.email.receivedAt ? new Date(composeContext.email.receivedAt).toLocaleString() : "Unknown"}\nTo: ${composeContext.email.toAddress}\nSubject: ${composeContext.email.subject}\n\n${composeContext.email.body}`,
                  body: composeContext.email.body
                }
              : undefined
        }
      />

      {showSettings && currentUser && (
        <SettingsModal
          user={currentUser}
          onClose={() => setShowSettings(false)}
          onSave={async (userData) => {
            try {
              const response = await fetch(`/api/user/${userId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
                credentials: 'include'
              });

              if (!response.ok) {
                throw new Error('Failed to update user data');
              }

              // Invalidate user queries to refresh UI
              queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}`] });
              
              toast({
                title: "Sucesso",
                description: "Dados atualizados com sucesso!",
              });
              
              setShowSettings(false);
            } catch (error) {
              console.error('Error updating user data:', error);
              toast({
                title: "Erro",
                description: "Falha ao atualizar dados. Tente novamente.",
                variant: "destructive",
              });
            }
          }}
        />
      )}

      {showFolderModal && (
        <FolderTagModal
          folder={editingFolder || undefined}
          onClose={handleCloseFolderModal}
          onSave={handleSaveFolder}
          onUpdate={handleUpdateFolder}
          onDelete={handleDeleteFolder}
        />
      )}

      {showTagModal && (
        <TagModal
          tag={editingTag || undefined}
          userId={1}
          onClose={handleCloseTagModal}
          onSave={handleSaveTag}
          onUpdate={handleUpdateTag}
          onDelete={handleDeleteTag}
        />
      )}

      {/* Tag Manager Dialog */}
      {showTagManagerDialog && (
        <TagManagerDialog
          open={showTagManagerDialog}
          onOpenChange={setShowTagManagerDialog}
          emailIds={Array.from(selectedEmails)}
          userId={1}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Floating Compose Button */}
      <Button
        onClick={handleCompose}
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg z-30 lg:hidden"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
