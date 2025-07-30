import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Copy, Mail, Tag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AliasModal } from "./alias-modal";
import { t } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Alias, Tag as TagType } from "@shared/schema";

interface AliasPanelProps {
  userId: number;
}

export function AliasPanel({ userId }: AliasPanelProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlias, setEditingAlias] = useState<Alias | null>(null);
  const [deletingAlias, setDeletingAlias] = useState<Alias | null>(null);
  const [shouldDeleteTag, setShouldDeleteTag] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch aliases
  const { data: aliases = [], isLoading } = useQuery<Alias[]>({
    queryKey: [`/api/aliases/${userId}`],
    enabled: !!userId,
  });

  // Fetch tags for display
  const { data: tags = [] } = useQuery<TagType[]>({
    queryKey: [`/api/tags/${userId}`],
    enabled: !!userId,
  });

  // Toggle alias status
  const toggleStatusMutation = useMutation({
    mutationFn: async (aliasId: number) => {
      const response = await apiRequest("PATCH", `/api/alias/${aliasId}/toggle`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/aliases/${userId}`] });
    },
    onError: (error: any) => {
      toast({
        title: t("deleteError"),
        description: error.message || t("statusChangeError"),
        variant: "destructive",
      });
    },
  });

  // Delete alias (and optionally the tag)
  const deleteMutation = useMutation({
    mutationFn: async (aliasId: number) => {
      const response = await apiRequest("DELETE", `/api/alias/${aliasId}`);
      
      // If user chose to delete the tag too, delete it
      if (shouldDeleteTag && deletingAlias?.tagId) {
        await apiRequest("DELETE", `/api/tags/${deletingAlias.tagId}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: t("aliasDeleted"),
        description: shouldDeleteTag ? t("aliasAndTagDeleted") : t("aliasRemoved"),
      });
      queryClient.invalidateQueries({ queryKey: [`/api/aliases/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tags/${userId}`] });
      if (shouldDeleteTag) {
        // Invalidate all tag-related queries if tag was deleted
        queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
        queryClient.invalidateQueries({ queryKey: [`/api/emails/${userId}`] });
      }
      setDeletingAlias(null);
      setShouldDeleteTag(false);
    },
    onError: (error: any) => {
      toast({
        title: t("deleteError"),
        description: error.message || t("aliasDeleteError"),
        variant: "destructive",
      });
    },
  });

  // Check if tag is only used by this alias
  const isTagOnlyUsedByAlias = (tagId: number, aliasId: number): boolean => {
    const aliasesWithTag = aliases.filter(alias => alias.tagId === tagId);
    return aliasesWithTag.length === 1 && aliasesWithTag[0].id === aliasId;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t("copied"),
      description: t("aliasCopied"),
    });
  };

  const getTagForAlias = (tagId: number | null) => {
    if (!tagId) return null;
    return tags.find(tag => tag.id === tagId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("aliases")}</h3>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            {t("newAlias")}
          </Button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("aliases")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("aliasesDescription")}
          </p>
        </div>
        {aliases.length > 0 && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("newAlias")}
          </Button>
        )}
      </div>

      {aliases.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">{t("noAliasesCreated")}</h4>
            <p className="text-muted-foreground mb-4">
              {t("createAliasDescription")}
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("createFirstAlias")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {aliases.map((alias) => {
            const aliasTag = getTagForAlias(alias.tagId);
            
            return (
              <Card key={alias.id} className={`transition-opacity ${!alias.isActive ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {alias.description}
                        {!alias.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            {t("inactive")}
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {alias.aliasName}@eliano.dev
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`${alias.aliasName}@eliano.dev`)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("forwardsTo")}: {alias.forwardTo}
                      </p>
                      {aliasTag && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{ backgroundColor: aliasTag.color + '20', color: aliasTag.color }}
                          >
                            {aliasTag.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!alias.isActive}
                        onCheckedChange={() => toggleStatusMutation.mutate(alias.id)}
                        disabled={toggleStatusMutation.isPending}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAlias(alias)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingAlias(alias)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAlias) && (
        <AliasModal
          alias={editingAlias || undefined}
          userId={userId}
          open={true}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAlias(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingAlias(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAlias} onOpenChange={() => setDeletingAlias(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAlias")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                {t("confirmDeleteAlias").replace("{{title}}", deletingAlias?.title || "")}
              </p>
              
              {/* Show option to delete tag if it's only used by this alias */}
              {deletingAlias?.tagId && isTagOnlyUsedByAlias(deletingAlias.tagId, deletingAlias.id) && (
                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-md">
                  <Checkbox 
                    id="deleteTag"
                    checked={shouldDeleteTag}
                    onCheckedChange={(checked) => setShouldDeleteTag(checked as boolean)}
                  />
                  <label 
                    htmlFor="deleteTag" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("alsoDeleteTag").replace("{{name}}", tags.find(t => t.id === deletingAlias?.tagId)?.name || "")}
                  </label>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAlias && deleteMutation.mutate(deletingAlias.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}