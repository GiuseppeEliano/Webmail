import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface UserPreferences {
  language: string;
  theme: string;
  avatarShape: string;
  sidebarView: string;
}

export function useUserPreferences(userId: number) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: [`/api/user/${userId}`],
  });

  const updatePreferences = useMutation({
    mutationFn: async (preferences: Partial<UserPreferences>) => {
      const response = await fetch(`/api/user/${userId}/preferences`, {
        method: "PUT",
        body: JSON.stringify(preferences),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user query to refetch updated data
      queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}`] });
    },
  });

  const preferences: UserPreferences = {
    language: user?.language || "pt",
    theme: user?.theme || "light",
    avatarShape: user?.avatarShape || "rounded", 
    sidebarView: user?.sidebarView || "left",
  };

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}