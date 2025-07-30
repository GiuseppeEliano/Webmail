import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useFolders } from "./use-folders";
import type { Email, Folder, User, InsertEmail, InsertFolder } from "@shared/schema";

export function useEmails(userId: number) {
  const queryClient = useQueryClient();

  // Global function to refresh all email-related data - ensures consistent UI updates
  const refreshAllEmailData = () => {
    // Invalidate all email queries for this user
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0]?.toString() || '';
        return key.includes(`/api/emails/${userId}`) || key.includes(`/api/counts/${userId}`);
      }
    });
    
    // Force refetch of all main queries for immediate UI update
    queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}`] });
    queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/inbox`] });
    queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/starred`] });
    queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/sent`] });
    queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/drafts`] });
    queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/junk`] });
    queryClient.refetchQueries({ queryKey: [`/api/emails/${userId}/folder/trash`] });
    queryClient.refetchQueries({ queryKey: [`/api/counts/${userId}`] });
  };

  // Fetch user
  const { data: currentUser } = useQuery<User>({
    queryKey: [`/api/user/${userId}`],
  });

  // Use new folder hook that combines system and custom folders
  const { folders = [] } = useFolders(userId);

  // Fetch emails
  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: [`/api/emails/${userId}`],
  });

  // Fetch email counts
  const { data: emailCounts = {} } = useQuery<{ [key: string]: number }>({
    queryKey: [`/api/counts/${userId}`],
  });

  // Get emails by folder with pagination
  const getEmailsByFolder = (folderType: string, customLimit?: number, offset: number = 0) => {
    // Use customLimit if provided, otherwise read from localStorage (user's preference)
    const limit = customLimit || parseInt(localStorage.getItem('emailsPerPage') || '20');
    
    return useQuery<{
      emails: Email[];
      totalCount: number;
      hasMore: boolean;
      currentPage: number;
      totalPages: number;
    }>({
      queryKey: [`/api/emails/${userId}/folder/${folderType}`, limit, offset],
      queryFn: async ({ queryKey }) => {
        const [url, limitParam, offsetParam] = queryKey;
        const response = await fetch(`${url}?limit=${limitParam}&offset=${offsetParam}`);
        if (!response.ok) {
          throw new Error('Failed to fetch emails');
        }
        return response.json();
      },
      enabled: !!folderType,
    });
  };

  // Search emails in current folder only - DISABLED AUTO-SEARCH for consistent behavior
  const searchEmails = (query: string, folder?: string, shouldExecute: boolean = false) => {
    return useQuery<Email[]>({
      queryKey: [`/api/search/${userId}`, query, folder, shouldExecute],
      queryFn: async () => {
        if (!shouldExecute) {
          return []; // Don't execute search unless explicitly requested
        }
        const params = new URLSearchParams({ q: query });
        if (folder) {
          params.append('folder', folder);
        }
        const response = await fetch(`/api/search/${userId}?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        return response.json();
      },
      enabled: !!query.trim() && shouldExecute, // Only search when explicitly requested
    });
  };

  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async ({ emailId, updates }: { emailId: number; updates: Partial<Email> }) => {
      const response = await apiRequest("PUT", `/api/email/${emailId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      // Use global refresh function for consistent UI updates
      refreshAllEmailData();
    },
  });

  // Toggle star mutation
  const toggleStarMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await apiRequest("PUT", `/api/email/${emailId}/star`, {});
      return response.json();
    },
    onMutate: async (emailId: number) => {
      // Cancel any outgoing refetches for all related queries
      await queryClient.cancelQueries({ queryKey: [`/api/emails/${userId}`] });
      await queryClient.cancelQueries({ queryKey: [`/api/emails/${userId}/folder`] });
      
      // Snapshot previous values
      const previousEmails = queryClient.getQueryData([`/api/emails/${userId}`]);
      const previousInboxEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/inbox`]);
      const previousStarredEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/starred`]);
      
      // Helper function to update emails in any structure (array or paginated object)
      const updateEmailInAnyStructure = (old: any) => {
        if (!old) return old;
        
        // Check if it's a direct array of emails
        if (Array.isArray(old)) {
          return old.map((email: Email) => 
            email.id === emailId 
              ? { ...email, isStarred: !email.isStarred }
              : email
          );
        }
        
        // Check if it's a paginated object with emails array
        if (old.emails && Array.isArray(old.emails)) {
          return {
            ...old,
            emails: old.emails.map((email: Email) => 
              email.id === emailId 
                ? { ...email, isStarred: !email.isStarred }
                : email
            )
          };
        }
        
        // If it's neither, return as-is
        return old;
      };

      // Helper function to update starred folder (add/remove emails)
      const updateStarredFolder = (old: any) => {
        if (!old || !old.emails) return old;
        
        // Find the email being toggled
        const email = old.emails.find((e: Email) => e.id === emailId);
        
        if (email) {
          // Email is in starred folder and being unstarred - remove it
          return {
            ...old,
            emails: old.emails.filter((e: Email) => e.id !== emailId),
            totalCount: old.totalCount - 1
          };
        } else {
          // Email is not in starred folder and being starred - we need to get it from somewhere
          // Check if it's in the main emails cache
          const allEmails = queryClient.getQueryData([`/api/emails/${userId}`]) as Email[] | undefined;
          const emailToAdd = Array.isArray(allEmails) ? allEmails.find(e => e.id === emailId) : undefined;
          if (emailToAdd) {
            return {
              ...old,
              emails: [...old.emails, { ...emailToAdd, isStarred: true }],
              totalCount: old.totalCount + 1
            };
          }
        }
        return old;
      };
      
      // Optimistically update email queries
      queryClient.setQueryData([`/api/emails/${userId}`], updateEmailInAnyStructure);
      
      // Update paginated folder queries
      const folderQueries = queryClient.getQueriesData({ 
        predicate: (query) => {
          const key = query.queryKey[0]?.toString() || '';
          return key.includes(`/api/emails/${userId}/folder/`);
        }
      });
      
      folderQueries.forEach(([queryKey, queryData]) => {
        const folderType = queryKey[0]?.toString().split('/').pop();
        if (folderType === 'starred') {
          queryClient.setQueryData(queryKey, updateStarredFolder);
        } else {
          queryClient.setQueryData(queryKey, updateEmailInAnyStructure);
        }
      });
      
      // Return context with all previous values
      return { previousEmails, previousInboxEmails, previousStarredEmails };
    },
    onError: (err, emailId, context) => {
      // If the mutation fails, roll back all optimistic updates
      if (context?.previousEmails) {
        queryClient.setQueryData([`/api/emails/${userId}`], context.previousEmails);
      }
      if (context?.previousInboxEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/inbox`], context.previousInboxEmails);
      }
      if (context?.previousStarredEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/starred`], context.previousStarredEmails);
      }
    },
    onSuccess: () => {
      // Use global refresh function for consistent UI updates
      refreshAllEmailData();
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async ({ emailId, isRead }: { emailId: number; isRead: boolean }) => {
      const response = await apiRequest("PUT", `/api/email/${emailId}/read`, { isRead });
      return response.json();
    },
    onMutate: async ({ emailId, isRead }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/emails/${userId}`] });
      await queryClient.cancelQueries({ queryKey: [`/api/emails/${userId}/folder`] });
      
      // Snapshot previous values
      const previousEmails = queryClient.getQueryData([`/api/emails/${userId}`]);
      const previousFolderEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/inbox`]);
      
      // Helper function to update emails in any structure (array or paginated object)
      const updateEmailInAnyStructure = (old: any) => {
        if (!old) return old;
        
        // Check if it's a direct array of emails
        if (Array.isArray(old)) {
          return old.map((email: Email) => 
            email.id === emailId 
              ? { ...email, isRead }
              : email
          );
        }
        
        // Check if it's a paginated object with emails array
        if (old.emails && Array.isArray(old.emails)) {
          return {
            ...old,
            emails: old.emails.map((email: Email) => 
              email.id === emailId 
                ? { ...email, isRead }
                : email
            )
          };
        }
        
        // If it's neither, return as-is
        return old;
      };
      
      // Update main emails query
      queryClient.setQueryData([`/api/emails/${userId}`], updateEmailInAnyStructure);
      
      // Update all paginated folder queries
      const folderQueries = queryClient.getQueriesData({ 
        predicate: (query) => {
          const key = query.queryKey[0]?.toString() || '';
          return key.includes(`/api/emails/${userId}/folder/`);
        }
      });
      
      folderQueries.forEach(([queryKey, queryData]) => {
        queryClient.setQueryData(queryKey, updateEmailInAnyStructure);
      });
      
      return { previousEmails, previousFolderEmails };
    },
    onError: (err, { emailId, isRead }, context) => {
      // If the mutation fails, roll back
      if (context?.previousEmails) {
        queryClient.setQueryData([`/api/emails/${userId}`], context.previousEmails);
      }
      if (context?.previousFolderEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/inbox`], context.previousFolderEmails);
      }
    },
    onSettled: () => {
      // Use global refresh function for consistent UI updates
      refreshAllEmailData();
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      console.log("Send email data:", emailData);
      console.log("Available folders:", folders);
      console.log("Draft ID being sent:", emailData.draftId);
      
      // If we're sending from a draft (has draftId), use conversion endpoint
      if (emailData.draftId) {
        console.log("🔄 Converting existing draft to sent email - Draft ID:", emailData.draftId);
        const response = await apiRequest("PUT", `/api/emails/${emailData.draftId}/convert-to-sent`, {
          subject: emailData.subject || "",
          body: emailData.body || "",
          toAddress: emailData.to || "",
          ccAddress: emailData.cc || null,
          bccAddress: emailData.bcc || null,
          attachments: emailData.attachments || null,
        });
        return response.json();
      }
      
      // Otherwise, create new sent email (for compose modal without draft)
      console.log("📧 Creating new sent email");
      const newEmail: InsertEmail = {
        userId,
        folderId: 0, // Backend will determine correct system folder
        messageId: `msg-${Date.now()}`,
        subject: emailData.subject || "",
        body: emailData.body || "",
        fromAddress: currentUser?.email || "",
        fromName: currentUser?.fullName || "",
        toAddress: emailData.to || "",
        toName: null,
        ccAddress: emailData.cc || null,
        bccAddress: emailData.bcc || null,
        hasAttachments: emailData.attachments && emailData.attachments.length > 0,
        attachments: emailData.attachments && emailData.attachments.length > 0 ? JSON.stringify(emailData.attachments) : null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false, // Never a draft when sending
        priority: "normal",
        tags: null,
        // Remove date fields - let server handle them
      };

      // Use the new /api/emails/send endpoint that handles draft conversion
      const response = await apiRequest("POST", "/api/emails/send", newEmail);
      return response.json();
    },
    onSuccess: () => {
      // Use global refresh function for consistent UI updates
      refreshAllEmailData();
    },
  });

  // Move email mutation
  const moveEmailMutation = useMutation({
    mutationFn: async ({ emailId, folderId }: { emailId: number; folderId: number }) => {
      const response = await apiRequest("PUT", `/api/email/${emailId}/move`, { folderId });
      return response.json();
    },
    onMutate: async ({ emailId, folderId }) => {
      // Cancel any outgoing refetches for all related queries
      await queryClient.cancelQueries({ queryKey: [`/api/emails/${userId}`] });
      await queryClient.cancelQueries({ queryKey: [`/api/emails/${userId}/folder`] });
      
      // Snapshot previous values for rollback
      const previousEmails = queryClient.getQueryData([`/api/emails/${userId}`]);
      const previousInboxEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/inbox`]);
      const previousStarredEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/starred`]);
      const previousTrashEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/trash`]);
      const previousJunkEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/junk`]);
      const previousSentEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/sent`]);
      const previousDraftEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/drafts`]);
      
      // Get the email being moved to understand source and destination
      const allEmails = queryClient.getQueryData([`/api/emails/${userId}`]) as Email[] | undefined;
      const emailToMove = Array.isArray(allEmails) ? allEmails.find(e => e.id === emailId) : undefined;
      
      if (emailToMove) {
        // Helper function to remove email from source folder - handle both array and paginated structure
        const removeFromFolder = (old: any) => {
          if (!old) return old;
          
          // Check if it's a paginated structure with emails array
          if (old.emails && Array.isArray(old.emails)) {
            return {
              ...old,
              emails: old.emails.filter((email: Email) => email.id !== emailId),
              totalCount: old.totalCount - 1
            };
          }
          
          // Check if it's a direct array of emails
          if (Array.isArray(old)) {
            return old.filter((email: Email) => email.id !== emailId);
          }
          
          // If it's neither, return as-is
          return old;
        };
        
        // Helper function to add email to destination folder - handle both array and paginated structure
        const addToFolder = (old: any) => {
          if (!old) return old;
          
          // Check if it's a paginated structure with emails array
          if (old.emails && Array.isArray(old.emails)) {
            // Only add if not already present
            const exists = old.emails.some((email: Email) => email.id === emailId);
            if (!exists) {
              return {
                ...old,
                emails: [...old.emails, { ...emailToMove, folderId }],
                totalCount: old.totalCount + 1
              };
            }
            return old;
          }
          
          // Check if it's a direct array of emails
          if (Array.isArray(old)) {
            // Only add if not already present
            const exists = old.some((email: Email) => email.id === emailId);
            if (!exists) {
              return [...old, { ...emailToMove, folderId }];
            }
            return old;
          }
          
          // If it's neither, return as-is
          return old;
        };
        
        // Helper function to update email in main list - handle both array and paginated structure
        const updateEmailInList = (old: any) => {
          if (!old) return old;
          
          // Check if it's a paginated structure with emails array
          if (old.emails && Array.isArray(old.emails)) {
            return {
              ...old,
              emails: old.emails.map((email: Email) => 
                email.id === emailId 
                  ? { ...email, folderId }
                  : email
              )
            };
          }
          
          // Check if it's a direct array of emails
          if (Array.isArray(old)) {
            return old.map((email: Email) => 
              email.id === emailId 
                ? { ...email, folderId }
                : email
            );
          }
          
          // If it's neither, return as-is
          return old;
        };
        
        // Update main emails list
        queryClient.setQueryData([`/api/emails/${userId}`], updateEmailInList);
        
        // Update all folder caches optimistically
        queryClient.setQueryData([`/api/emails/${userId}/folder/inbox`], removeFromFolder);
        queryClient.setQueryData([`/api/emails/${userId}/folder/starred`], removeFromFolder);
        queryClient.setQueryData([`/api/emails/${userId}/folder/trash`], removeFromFolder);
        queryClient.setQueryData([`/api/emails/${userId}/folder/junk`], removeFromFolder);
        queryClient.setQueryData([`/api/emails/${userId}/folder/sent`], removeFromFolder);
        queryClient.setQueryData([`/api/emails/${userId}/folder/drafts`], removeFromFolder);
        
        // Add to destination folder based on folderId
        const folderTypeMap: { [key: number]: string } = {
          1: 'inbox',
          2: 'starred', 
          3: 'sent',
          4: 'drafts',
          5: 'junk',
          6: 'trash'
        };
        
        const destinationFolderType = folderTypeMap[folderId];
        if (destinationFolderType) {
          queryClient.setQueryData([`/api/emails/${userId}/folder/${destinationFolderType}`], addToFolder);
        }
      }
      
      return { 
        previousEmails, 
        previousInboxEmails, 
        previousStarredEmails, 
        previousTrashEmails, 
        previousJunkEmails, 
        previousSentEmails, 
        previousDraftEmails 
      };
    },
    onError: (err, { emailId, folderId }, context) => {
      // Roll back all optimistic updates if mutation fails
      if (context?.previousEmails) {
        queryClient.setQueryData([`/api/emails/${userId}`], context.previousEmails);
      }
      if (context?.previousInboxEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/inbox`], context.previousInboxEmails);
      }
      if (context?.previousStarredEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/starred`], context.previousStarredEmails);
      }
      if (context?.previousTrashEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/trash`], context.previousTrashEmails);
      }
      if (context?.previousJunkEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/junk`], context.previousJunkEmails);
      }
      if (context?.previousSentEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/sent`], context.previousSentEmails);
      }
      if (context?.previousDraftEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/drafts`], context.previousDraftEmails);
      }
    },
    onSuccess: () => {
      // Use global refresh function for consistent UI updates
      refreshAllEmailData();
    },
  });

  // Delete email mutation with intelligent deletion logic
  const deleteEmailMutation = useMutation({
    mutationFn: async ({ emailId, permanent = false }: { emailId: number; permanent?: boolean }) => {
      console.log(`🗑️ Frontend: Deleting email ${emailId}, permanent: ${permanent}`);
      const response = await apiRequest("DELETE", `/api/emails/${emailId}`, { permanent });
      return response.json();
    },
    onSuccess: () => {
      // Use global refresh function for consistent UI updates
      refreshAllEmailData();
    },
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderData: InsertFolder) => {
      const response = await apiRequest("POST", "/api/folders", folderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/folders/${userId}`] });
    },
  });

  // Update folder mutation
  const updateFolderMutation = useMutation({
    mutationFn: async ({ folderId, folderData }: { folderId: number; folderData: any }) => {
      const response = await apiRequest("PUT", `/api/folders/${folderId}`, folderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/folders/${userId}`] });
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      const response = await apiRequest("DELETE", `/api/folders/${folderId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/folders/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/counts/${userId}`] });
    },
  });

  // Save draft mutation - ALWAYS create NEW drafts for compose sessions
  const saveDraftMutation = useMutation({
    mutationFn: async (emailData: any) => {
      console.log('💾 saveDraftMutation called - ALWAYS creating NEW draft');
      
      // Convert arrays to strings if needed for backward compatibility
      const toAddress = Array.isArray(emailData.to) ? emailData.to.join(', ') : (emailData.to || "");
      const ccAddress = Array.isArray(emailData.cc) ? emailData.cc.join(', ') : (emailData.cc || null);
      const bccAddress = Array.isArray(emailData.bcc) ? emailData.bcc.join(', ') : (emailData.bcc || null);
      
      // Create a NEW draft email - never update existing ones
      const newDraftData: InsertEmail = {
        userId,
        folderId: 4, // Backend will determine correct drafts folder
        messageId: `draft-${Date.now()}`,
        subject: emailData.subject || "",
        body: emailData.body || "",
        fromAddress: currentUser?.email || "",
        fromName: currentUser?.fullName || "",
        toAddress,
        toName: null,
        ccAddress,
        bccAddress,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: true, // This is a draft
        hasAttachments: (emailData.attachments && emailData.attachments.length > 0) || false,
        attachments: emailData.attachments ? JSON.stringify(emailData.attachments) : null,
        priority: "normal",
        tags: null,
      };
      
      console.log('💾 Creating NEW draft with data:', newDraftData);
      const response = await apiRequest("POST", "/api/emails", newDraftData);
      const newDraft = await response.json();
      console.log('✅ NEW draft created with ID:', newDraft.id);
      return newDraft;
    },
    onMutate: async (emailData: any) => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: [`/api/emails/${userId}`] });
      await queryClient.cancelQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0]?.toString() || '';
          return key.includes(`/api/emails/${userId}/folder/drafts`);
        }
      });
      
      // Snapshot previous values for rollback - get all drafts-related queries
      const previousAllEmails = queryClient.getQueryData([`/api/emails/${userId}`]);
      const previousDraftEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/drafts`]);
      
      // Get all draft queries to snapshot them
      const allDraftQueries = queryClient.getQueriesData({ 
        predicate: (query) => {
          const key = query.queryKey[0]?.toString() || '';
          return key.includes(`/api/emails/${userId}/folder/drafts`);
        }
      });
      

      
      // Get current active draft info
      let activeDraft;
      try {
        const activeDraftResponse = await apiRequest("POST", `/api/drafts/active/${userId}`, {});
        activeDraft = await activeDraftResponse.json();
      } catch (error) {
        console.log('No active draft found, will create new one');
        activeDraft = null;
      }
      
      if (activeDraft && activeDraft.id) {
        // Update existing draft optimistically
        const optimisticEmail = {
          ...activeDraft,
          subject: emailData.subject || "",
          body: emailData.body || "",
          toAddress: Array.isArray(emailData.to) ? emailData.to.join(', ') : (emailData.to || ""),
          ccAddress: Array.isArray(emailData.cc) ? emailData.cc.join(', ') : (emailData.cc || null),
          bccAddress: Array.isArray(emailData.bcc) ? emailData.bcc.join(', ') : (emailData.bcc || null),
          updatedAt: new Date().toISOString(),
        };
        
        // Optimistically update all emails cache
        queryClient.setQueryData([`/api/emails/${userId}`], (old: Email[] | undefined) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map(email => 
            email.id === activeDraft.id ? optimisticEmail : email
          );
        });
        
        // Optimistically update all drafts folder cache queries - handle both array and paginated structure
        allDraftQueries.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            
            // Check if it's a paginated structure with emails array
            if (old.emails && Array.isArray(old.emails)) {
              return {
                ...old,
                emails: old.emails.map((email: Email) => 
                  email.id === activeDraft.id ? optimisticEmail : email
                )
              };
            }
            
            // Check if it's a direct array of emails
            if (Array.isArray(old)) {
              return old.map((email: Email) => 
                email.id === activeDraft.id ? optimisticEmail : email
              );
            }
            
            // If it's neither, return as-is
            return old;
          });
        });
      } else {
        // Create new draft optimistically
        const optimisticNewEmail = {
          id: Date.now(), // Temporary ID until server responds
          subject: emailData.subject || "",
          body: emailData.body || "",
          toAddress: Array.isArray(emailData.to) ? emailData.to.join(', ') : (emailData.to || ""),
          ccAddress: Array.isArray(emailData.cc) ? emailData.cc.join(', ') : (emailData.cc || null),
          bccAddress: Array.isArray(emailData.bcc) ? emailData.bcc.join(', ') : (emailData.bcc || null),
          userId: userId,
          folderId: 'drafts',
          isDraft: 1,
          isActiveDraft: 1,
          isRead: 1,
          isStarred: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [] as any[],
          attachments: null,
          messageId: null,
        } as Email;
        
        // Add to all drafts cache queries optimistically - handle both array and paginated structure
        allDraftQueries.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return [optimisticNewEmail];
            
            // Check if it's a paginated structure with emails array
            if (old.emails && Array.isArray(old.emails)) {
              return {
                ...old,
                emails: [optimisticNewEmail, ...old.emails],
                totalCount: old.totalCount + 1
              };
            }
            
            // Check if it's a direct array of emails
            if (Array.isArray(old)) {
              return [optimisticNewEmail, ...old];
            }
            
            // If it's neither, return new array
            return [optimisticNewEmail];
          });
        });
        
        // Add to all emails cache optimistically
        queryClient.setQueryData([`/api/emails/${userId}`], (old: Email[] | undefined) => {
          if (!old) return [optimisticNewEmail];
          return [optimisticNewEmail, ...old];
        });
      }
      
      return { previousAllEmails, previousDraftEmails, activeDraft, allDraftQueries };
    },
    onSuccess: (updatedEmail, variables, context) => {
      // Use global refresh function for consistent UI updates
      refreshAllEmailData();
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousAllEmails) {
        queryClient.setQueryData([`/api/emails/${userId}`], context.previousAllEmails);
      }
      if (context?.previousDraftEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/drafts`], context.previousDraftEmails);
      }
      
      // Rollback all draft queries if available
      if (context?.allDraftQueries) {
        context.allDraftQueries.forEach(([queryKey, queryData]: [any, any]) => {
          queryClient.setQueryData(queryKey, queryData);
        });
      }
      
      console.error('Draft save failed, rolling back:', err);
    },
  });

  // Refetch function for folders
  const refetchFolders = () => {
    return queryClient.invalidateQueries({ queryKey: [`/api/folders/${userId}`] });
  };

  return {
    currentUser,
    folders,
    emails,
    emailCounts,
    isLoading,
    getEmailsByFolder,
    searchEmails,
    updateEmail: updateEmailMutation.mutateAsync,
    toggleEmailStar: toggleStarMutation.mutateAsync,
    markEmailAsRead: markAsReadMutation.mutateAsync,
    sendEmail: sendEmailMutation.mutateAsync,
    saveDraft: saveDraftMutation.mutateAsync,
    moveEmail: moveEmailMutation.mutateAsync,
    deleteEmail: deleteEmailMutation.mutateAsync,
    deleteEmailWithConfirmation: async (email: Email, folders: Folder[]) => {
      // Determine if this requires permanent deletion confirmation
      const currentFolder = folders.find(f => f.id === email.folderId);
      const requiresConfirmation = currentFolder && (
        currentFolder.systemType?.toLowerCase() === 'drafts' || 
        currentFolder.systemType?.toLowerCase() === 'junk' || 
        currentFolder.systemType?.toLowerCase() === 'trash'
      );
      
      console.log(`🗑️ Delete request for email ${email.id} in folder ${currentFolder?.name || 'unknown'} (systemType: ${currentFolder?.systemType}). Requires confirmation: ${!!requiresConfirmation}`);
      console.log(`🗑️ Current folder:`, currentFolder);
      console.log(`🗑️ System types check (lowercase): drafts=${currentFolder?.systemType?.toLowerCase() === 'drafts'}, junk=${currentFolder?.systemType?.toLowerCase() === 'junk'}, trash=${currentFolder?.systemType?.toLowerCase() === 'trash'}`);
      
      if (requiresConfirmation) {
        // Return a promise that resolves when user confirms deletion
        return new Promise((resolve, reject) => {
          // This will be handled by the component showing the confirmation modal
          const confirmationData = {
            email,
            folderName: currentFolder?.name,
            isPermanent: true,
            resolve,
            reject
          };
          
          console.log(`🗑️ Emitting showDeleteConfirmation event with:`, confirmationData);
          // Emit event to show confirmation modal
          window.dispatchEvent(new CustomEvent('showDeleteConfirmation', { detail: confirmationData }));
        });
      } else {
        // For regular folders, just move to trash (no confirmation needed)
        return deleteEmailMutation.mutateAsync({ emailId: email.id, permanent: false });
      }
    },
    createFolder: createFolderMutation.mutateAsync,
    updateFolder: updateFolderMutation.mutateAsync,
    deleteFolder: deleteFolderMutation.mutateAsync,
    refetchFolders,
  };
}