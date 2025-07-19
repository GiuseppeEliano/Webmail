import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Tag, InsertTag, UpdateTag } from "@shared/schema";

export function useTags(userId: number) {
  const queryClient = useQueryClient();

  const {
    data: tags = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/tags", userId],
    queryFn: () => fetch(`/api/tags/${userId}`).then((res) => res.json()) as Promise<Tag[]>,
  });

  const createTagMutation = useMutation({
    mutationFn: async (tagData: InsertTag) => {
      const res = await apiRequest("POST", "/api/tags", tagData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags", userId] });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, ...tagData }: { id: number } & UpdateTag) => {
      const res = await apiRequest("PUT", `/api/tags/${id}`, tagData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags", userId] });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const res = await apiRequest("DELETE", `/api/tags/${tagId}`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all tag-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: [`/api/tags/${userId}`] });
      
      // Invalidate all email queries to update tag display
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.includes('/api/emails');
        }
      });
      
      // Force immediate refetch of all email-related data
      queryClient.refetchQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.includes('/api/emails');
        }
      });
      
      // Also invalidate all queries to be safe
      queryClient.invalidateQueries();
    },
  });

  return {
    tags,
    isLoading,
    error,
    createTag: createTagMutation.mutateAsync,
    updateTag: updateTagMutation.mutateAsync,
    deleteTag: deleteTagMutation.mutateAsync,
    isCreating: createTagMutation.isPending,
    isUpdating: updateTagMutation.isPending,
    isDeleting: deleteTagMutation.isPending,
  };
}