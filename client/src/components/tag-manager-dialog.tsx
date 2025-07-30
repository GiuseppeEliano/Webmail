import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { t } from "@/lib/i18n";
import type { Tag } from "@shared/schema";

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailIds: number[];
  userId: number;
}

export default function TagManagerDialog({
  open,
  onOpenChange,
  emailIds,
  userId,
}: TagManagerDialogProps) {

  const [tagOperationLoading, setTagOperationLoading] = useState<string>("");
  const queryClient = useQueryClient();

  // Get all available tags (cached for performance)
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags", userId],
  });

  // Get current tags for the selected emails (simple approach)
  const { data: emailsWithTags = [], isLoading } = useQuery({
    queryKey: ["/api/emails/tags", emailIds],
    enabled: emailIds.length > 0 && open,
    queryFn: async () => {
      const results = await Promise.all(
        emailIds.map(async (emailId) => {
          const response = await fetch(`/api/emails/${emailId}/tags`);
          const tags = response.ok ? await response.json() : [];
          return { emailId, tags };
        })
      );
      return results;
    },
  });

  // Add tag mutation
  const addTagMutation = useMutation({
    mutationFn: async ({ emailId, tagId }: { emailId: number; tagId: number }) => {
      // Add to email_tags table
      const response = await fetch(`/api/emails/${emailId}/tags/${tagId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to add tag");
      
      return response.json();
    },
    onSuccess: () => {
      // CRITICAL FIX: Comprehensive cache invalidation for tag ADD operations
      // 1. Invalidate ALL email-related queries to force complete refresh
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key && (
            key.includes('/api/emails') || 
            key.includes('/api/counts') ||
            key.includes('/api/tags')
          );
        }
      });
      
      // 2. Force immediate refetch of current folder view
      queryClient.refetchQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key && key.includes(`/api/emails/${userId}/folder`);
        }
      });
      
      // 3. Refresh tag dialog data
      queryClient.invalidateQueries({ queryKey: ["/api/emails/tags", emailIds] });
    },
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async ({ emailId, tagId }: { emailId: number; tagId: number }) => {
      // Remove from email_tags table
      const response = await fetch(`/api/emails/${emailId}/tags/${tagId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove tag");
      
      return response.json();
    },
    onSuccess: () => {
      // CRITICAL FIX: Comprehensive cache invalidation for tag REMOVE operations
      // 1. Invalidate ALL email-related queries to force complete refresh
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key && (
            key.includes('/api/emails') || 
            key.includes('/api/counts') ||
            key.includes('/api/tags')
          );
        }
      });
      
      // 2. Force immediate refetch of current folder view
      queryClient.refetchQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key && key.includes(`/api/emails/${userId}/folder`);
        }
      });
      
      // 3. Refresh tag dialog data
      queryClient.invalidateQueries({ queryKey: ["/api/emails/tags", emailIds] });
    },
  });

  // Get common tags across all selected emails
  const getCommonTags = () => {
    if (emailsWithTags.length === 0) return [];
    
    const firstEmailTags = emailsWithTags[0]?.tags || [];
    return firstEmailTags.filter((tag: any) =>
      emailsWithTags.every((emailData: any) =>
        emailData.tags?.some((t: any) => t.id === tag.id)
      )
    );
  };

  // Get available tags to add (respecting 2-tag limit per email)
  const getAvailableTagsToAdd = () => {
    if (emailIds.length === 0) return [];
    
    const commonTags = getCommonTags();
    const commonTagIds = commonTags.map((tag: any) => tag.id);
    
    // Filter out common tags and tags that would violate 2-tag limit
    return tags.filter(tag => {
      if (commonTagIds.includes(tag.id)) return false;
      
      // Check if tag can be added to at least one email without violating 2-tag limit
      return emailsWithTags.some(emailData => {
        const currentTagCount = emailData.tags?.length || 0;
        const hasThisTag = emailData.tags?.some((t: any) => t.id === tag.id);
        return !hasThisTag && currentTagCount < 2;
      });
    });
  };

  const handleAddTag = async (tag: Tag) => {
    setTagOperationLoading(`add-${tag.name}`);
    try {
      let successCount = 0;
      let skippedCount = 0;
      
      // Check each email individually before adding
      for (const emailId of emailIds) {
        // Check current tags for this specific email
        const response = await fetch(`/api/emails/${emailId}/tags`);
        const currentTags = response.ok ? await response.json() : [];
        
        // Skip if email already has this tag or has 2 tags
        if (currentTags.some((t: any) => t.id === tag.id) || currentTags.length >= 2) {
          skippedCount++;
          continue;
        }
        
        await addTagMutation.mutateAsync({ emailId, tagId: tag.id });
        successCount++;
      }
      
      // Show result feedback for bulk operations
      if (emailIds.length > 1) {
        console.log(`Tag "${tag.name}": adicionada a ${successCount} emails, ${skippedCount} ignorados (já tinha tag ou máximo de 2 tags)`);
      }
    } catch (error) {
      console.error("Failed to add tag:", error);
    } finally {
      setTagOperationLoading("");
    }
  };

  const handleRemoveTag = async (tag: any) => {
    setTagOperationLoading(`remove-${tag.name}`);
    try {
      await Promise.all(
        emailIds.map(emailId =>
          removeTagMutation.mutateAsync({ emailId, tagId: tag.id })
        )
      );
    } catch (error) {
      console.error("Failed to remove tag:", error);
    } finally {
      setTagOperationLoading("");
    }
  };

  const commonTags = getCommonTags();
  const availableTags = getAvailableTagsToAdd();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('manageTags')}</DialogTitle>
          <DialogDescription className="pt-2">
            {emailIds.length === 1 
              ? t('addRemoveTagsDescription') 
              : `${t('managingTagsOf')} ${emailIds.length} ${t('emailsSelected')}.`}
          </DialogDescription>
          {emailIds.length > 1 && (
            <div className="mt-2 text-xs text-muted-foreground">
              • {t("commonTagsCanBeRemoved")}<br/>
              • {t("newTagsWillBeAdded")}
            </div>
          )}
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Current tags - can be removed */}
          {commonTags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                {emailIds.length === 1 ? t('manageTags') + ":" : `${t('commonTagsCanBeRemoved')} (${emailIds.length} emails):`}
              </h4>
              <div className="flex flex-wrap gap-2">
                {commonTags.map((tag: any) => (
                  <div key={tag.id} className="flex items-center gap-1">
                    <div 
                      className="px-2 py-1 rounded-md text-xs flex items-center gap-1"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        disabled={tagOperationLoading === `remove-${tag.name}`}
                        className="hover:bg-black/10 rounded p-0.5 disabled:opacity-50"
                        title={emailIds.length > 1 ? `${t('delete')} (${emailIds.length} emails)` : t('delete')}
                      >
                        {tagOperationLoading === `remove-${tag.name}` ? (
                          <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"></div>
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show message when no common tags in bulk selection */}
          {emailIds.length > 1 && commonTags.length === 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <p className="mb-1">{t('noCommonTags')}</p>
              <p className="text-xs">{t('onlyCommonTagsCanBeRemoved')}</p>
            </div>
          )}

          {/* Available tags to add */}
          {availableTags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                {emailIds.length === 1 ? t('manageTags') + ":" : t('addTagsAppliedAsPossible')}
              </h4>
              {emailIds.length > 1 && (
                <p className="text-xs text-muted-foreground mb-2">
                  {t('tagsWillBeAddedOnlyToEligible')}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag)}
                    disabled={tagOperationLoading === `add-${tag.name}`}
                    className="px-2 py-1 rounded-md text-xs border border-dashed border-gray-300 hover:border-gray-500 transition-colors flex items-center gap-1 disabled:opacity-50"
                    title={emailIds.length > 1 ? `Adicionar aos emails elegíveis (máx. 2 tags por email)` : `Adicionar tag "${tag.name}"`}
                  >
                    <div 
                      className="h-2 w-2 rounded-sm" 
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                    {tagOperationLoading === `add-${tag.name}` ? (
                      <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"></div>
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {commonTags.length === 0 && availableTags.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              {t('noTagsAvailable')}
            </div>
          )}
        </div>
        
        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}