import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Email, Folder, User, InsertEmail } from "@shared/schema";

export function useEmails(userId: number) {
  const queryClient = useQueryClient();

  // Fetch user
  const { data: currentUser } = useQuery<User>({
    queryKey: [`/api/user/${userId}`],
  });

  // Fetch folders
  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: [`/api/folders/${userId}`],
  });

  // Fetch emails
  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: [`/api/emails/${userId}`],
  });

  // Fetch email counts
  const { data: emailCounts = {} } = useQuery<{ [key: string]: number }>({
    queryKey: [`/api/counts/${userId}`],
  });

  // Get emails by folder
  const getEmailsByFolder = (folderType: string) => {
    return useQuery<Email[]>({
      queryKey: [`/api/emails/${userId}/folder/${folderType}`],
      enabled: !!folderType,
    });
  };

  // Search emails
  const searchEmails = (query: string) => {
    return useQuery<Email[]>({
      queryKey: [`/api/search/${userId}`, query],
      enabled: !!query.trim(),
    });
  };

  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async ({ emailId, data }: { emailId: number; data: Partial<Email> }) => {
      const response = await apiRequest("PUT", `/api/email/${emailId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/counts/${userId}`] });
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
      
      // Helper function to update emails
      const updateEmailInList = (old: Email[] | undefined) => {
        if (!old) return old;
        return old.map(email => 
          email.id === emailId 
            ? { ...email, isStarred: !email.isStarred }
            : email
        );
      };
      
      // Optimistically update all email queries
      queryClient.setQueryData([`/api/emails/${userId}`], updateEmailInList);
      queryClient.setQueryData([`/api/emails/${userId}/folder/inbox`], updateEmailInList);
      queryClient.setQueryData([`/api/emails/${userId}/folder/starred`], updateEmailInList);
      
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
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}/folder`] });
      queryClient.invalidateQueries({ queryKey: [`/api/counts/${userId}`] });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async ({ emailId, isRead }: { emailId: number; isRead: boolean }) => {
      const response = await apiRequest("PUT", `/api/email/${emailId}/read`, { isRead });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/counts/${userId}`] });
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      const sentFolder = folders.find(f => f.systemType === "sent");
      const newEmail: InsertEmail = {
        userId,
        folderId: sentFolder?.id || 3, // fallback to sent folder
        subject: emailData.subject,
        body: emailData.body,
        fromAddress: currentUser?.email || "john@example.com",
        fromName: currentUser?.fullName || "John Doe",
        toAddress: emailData.to,
        toName: null,
        ccAddress: emailData.cc || null,
        bccAddress: emailData.bcc || null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        sentAt: new Date(),
      };

      const response = await apiRequest("POST", "/api/emails", newEmail);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/counts/${userId}`] });
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
      
      // Snapshot previous values
      const previousEmails = queryClient.getQueryData([`/api/emails/${userId}`]);
      const previousInboxEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/inbox`]);
      
      // Helper function to update or remove email from list based on folder
      const updateEmailInList = (old: Email[] | undefined) => {
        if (!old) return old;
        // For inbox folder query, remove the email when moved
        if (folderId !== 1) { // assuming 1 is inbox folder
          return old.filter(email => email.id !== emailId);
        }
        return old.map(email => 
          email.id === emailId 
            ? { ...email, folderId }
            : email
        );
      };
      
      // Optimistically update all email queries
      queryClient.setQueryData([`/api/emails/${userId}`], updateEmailInList);
      queryClient.setQueryData([`/api/emails/${userId}/folder/inbox`], updateEmailInList);
      
      // Return context with all previous values
      return { previousEmails, previousInboxEmails };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, roll back all optimistic updates
      if (context?.previousEmails) {
        queryClient.setQueryData([`/api/emails/${userId}`], context.previousEmails);
      }
      if (context?.previousInboxEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/inbox`], context.previousInboxEmails);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}/folder`] });
      queryClient.invalidateQueries({ queryKey: [`/api/counts/${userId}`] });
    },
  });

  // Delete email mutation
  const deleteEmailMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await apiRequest("DELETE", `/api/email/${emailId}`);
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
      
      // Helper function to remove email from list
      const removeEmailFromList = (old: Email[] | undefined) => {
        if (!old) return old;
        return old.filter(email => email.id !== emailId);
      };
      
      // Optimistically remove email from all queries
      queryClient.setQueryData([`/api/emails/${userId}`], removeEmailFromList);
      queryClient.setQueryData([`/api/emails/${userId}/folder/inbox`], removeEmailFromList);
      queryClient.setQueryData([`/api/emails/${userId}/folder/starred`], removeEmailFromList);
      
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
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}/folder`] });
      queryClient.invalidateQueries({ queryKey: [`/api/counts/${userId}`] });
    },
  });

  // Delete email mutation
  const deleteEmailMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await apiRequest("DELETE", `/api/email/${emailId}`, {});
      return response.json();
    },
    onMutate: async (emailId) => {
      // Cancel any outgoing refetches for all related queries
      await queryClient.cancelQueries({ queryKey: [`/api/emails/${userId}`] });
      await queryClient.cancelQueries({ queryKey: [`/api/emails/${userId}/folder`] });
      
      // Snapshot previous values
      const previousEmails = queryClient.getQueryData([`/api/emails/${userId}`]);
      const previousInboxEmails = queryClient.getQueryData([`/api/emails/${userId}/folder/inbox`]);
      
      // Helper function to remove email from list
      const removeEmailFromList = (old: Email[] | undefined) => {
        if (!old) return old;
        return old.filter(email => email.id !== emailId);
      };
      
      // Optimistically update all email queries
      queryClient.setQueryData([`/api/emails/${userId}`], removeEmailFromList);
      queryClient.setQueryData([`/api/emails/${userId}/folder/inbox`], removeEmailFromList);
      
      // Return context with all previous values
      return { previousEmails, previousInboxEmails };
    },
    onError: (err, emailId, context) => {
      // If the mutation fails, roll back all optimistic updates
      if (context?.previousEmails) {
        queryClient.setQueryData([`/api/emails/${userId}`], context.previousEmails);
      }
      if (context?.previousInboxEmails) {
        queryClient.setQueryData([`/api/emails/${userId}/folder/inbox`], context.previousInboxEmails);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}/folder`] });
      queryClient.invalidateQueries({ queryKey: [`/api/counts/${userId}`] });
    },
  });

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
    moveEmail: moveEmailMutation.mutateAsync,
    deleteEmail: deleteEmailMutation.mutateAsync,
  };
}
