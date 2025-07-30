import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { t } from "@/lib/i18n";
import type { Alias, Tag } from "@shared/schema";

const createAliasSchema = () => z.object({
  title: z.string().min(1, t("aliasTitleRequired")).max(18, t("aliasTitleMaxLength")),
  aliasName: z.string()
    .min(1, t("aliasNameRequired"))
    .max(14, t("aliasNameMaxLength"))
    .regex(/^[a-z]+$/, t("aliasNameFormat")),
  forwardTo: z.string().email(t("invalidEmail")),
  tagId: z.number().optional(),
  newTagName: z.string().optional(),
  newTagColor: z.string().optional(),
});

type AliasFormData = z.infer<ReturnType<typeof createAliasSchema>>;

interface AliasModalProps {
  alias?: Alias;
  userId: number;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const availableColors = [
  "#ef4444", // red
  "#f97316", // orange  
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
];

export function AliasModal({ alias, userId, open, onClose, onSave }: AliasModalProps) {
  const [createNewTag, setCreateNewTag] = useState(false);
  const [selectedTagColor, setSelectedTagColor] = useState("#6366f1");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AliasFormData>({
    resolver: zodResolver(createAliasSchema()),
    defaultValues: {
      title: alias?.description || "", // Map backend 'description' to frontend 'title'
      aliasName: alias?.aliasName || "",
      forwardTo: alias?.forwardTo || "",
      tagId: alias?.tagId || undefined,
      newTagName: "",
      newTagColor: selectedTagColor,
    },
  });

  // Get user data for default email
  const { data: user } = useQuery<{ email: string }>({
    queryKey: [`/api/user/${userId}`],
    enabled: !!userId,
  });

  // Get available tags
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: [`/api/tags/${userId}`],
    enabled: !!userId,
  });

  // Set default forward email when user data loads
  useEffect(() => {
    if (user && !alias && user.email) {
      form.setValue("forwardTo", user.email);
    }
  }, [user, alias, form]);

  // Refresh tags when modal opens
  useEffect(() => {
    if (open) {
      queryClient.invalidateQueries({ queryKey: [`/api/tags/${userId}`] });
    }
  }, [open, userId, queryClient]);

  const createAliasMutation = useMutation({
    mutationFn: async (data: any) => {
      let tagId = data.tagId;
      
      // Handle "none" value for no tag
      if (tagId === "none") {
        tagId = undefined;
      } else if (tagId) {
        tagId = parseInt(tagId);
      }
      
      // Create new tag if needed
      if (createNewTag && data.newTagName) {
        const newTagResponse = await apiRequest("POST", `/api/tags`, {
          userId,
          name: data.newTagName,
          color: data.newTagColor,
        });
        const newTag = await newTagResponse.json();
        tagId = newTag.id;
      }

      const response = await apiRequest("POST", `/api/aliases`, {
        userId,
        description: data.title, // Map frontend 'title' to backend 'description'
        aliasName: data.aliasName,
        forwardTo: data.forwardTo,
        tagId,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Alias criada!",
        description: "Sua nova alias foi criada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/aliases/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tags/${userId}`] });
      // Invalidate all tag queries to update sidebar and other components
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      onSave();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar alias",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const updateAliasMutation = useMutation({
    mutationFn: async (data: any) => {
      let tagId = data.tagId;
      
      // Handle "none" value for no tag
      if (tagId === "none") {
        tagId = undefined;
      } else if (tagId) {
        tagId = parseInt(tagId);
      }
      
      // Create new tag if needed
      if (createNewTag && data.newTagName) {
        const newTagResponse = await apiRequest("POST", `/api/tags`, {
          userId,
          name: data.newTagName,
          color: data.newTagColor,
        });
        const newTag = await newTagResponse.json();
        tagId = newTag.id;
      }

      const response = await apiRequest("PUT", `/api/alias/${alias!.id}`, {
        description: data.title, // Map frontend 'title' to backend 'description'
        tagId,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Alias atualizada!",
        description: "Sua alias foi atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/aliases/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tags/${userId}`] });
      // Invalidate all tag queries to update sidebar and other components
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      onSave();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar alias",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (data: AliasFormData) => {
    setIsCreating(true);
    try {
      if (alias) {
        await updateAliasMutation.mutateAsync(data);
      } else {
        await createAliasMutation.mutateAsync(data);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {alias ? t('editAlias') : t('newAlias')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('aliasTitle')}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={t('aliasTitleExample')}
                      maxLength={18}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Alias Name */}
            <FormField
              control={form.control}
              name="aliasName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('aliasName')}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={t('aliasNameExample')}
                      maxLength={14}
                      disabled={!!alias}
                      onChange={(e) => {
                        // Filter input to only allow lowercase letters (a-z)
                        const filteredValue = e.target.value
                          .toLowerCase() // Convert to lowercase
                          .replace(/[^a-z]/g, ''); // Remove anything that's not a-z
                        
                        field.onChange(filteredValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  {!alias && (
                    <p className="text-xs text-muted-foreground">
                      Será gerado: {field.value ? `${field.value.toLowerCase()}.1234@email.com` : "nome.1234@email.com"}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Forward To */}
            <FormField
              control={form.control}
              name="forwardTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forwardTo')}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="email"
                      disabled
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tag Selection */}
            <div>
              <Label>{t('tagNote')}</Label>
              <div className="space-y-3 mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="existing-tag"
                    name="tag-option"
                    checked={!createNewTag}
                    onChange={() => setCreateNewTag(false)}
                  />
                  <label htmlFor="existing-tag" className="text-sm">{t('useExistingTag')}</label>
                </div>
                
                {!createNewTag && (
                  <FormField
                    control={form.control}
                    name="tagId"
                    render={({ field }) => (
                      <FormItem>
                        <Select 
                          value={field.value?.toString()} 
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectTag')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('noTag')}</SelectItem>
                            {tags.map((tag) => (
                              <SelectItem key={tag.id} value={tag.id.toString()}>
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span>{tag.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="new-tag"
                    name="tag-option"
                    checked={createNewTag}
                    onChange={() => setCreateNewTag(true)}
                  />
                  <label htmlFor="new-tag" className="text-sm">{t('createNewTag')}</label>
                </div>

                {createNewTag && (
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="newTagName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Nome da nova tag"
                              maxLength={18}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div>
                      <Label className="text-sm">Cor da tag</Label>
                      <div className="grid grid-cols-8 gap-2 mt-2">
                        {availableColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              setSelectedTagColor(color);
                              form.setValue("newTagColor", color);
                            }}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              selectedTagColor === color 
                                ? "border-foreground scale-110" 
                                : "border-border hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating || createAliasMutation.isPending || updateAliasMutation.isPending}
              >
                {isCreating ? t('saving') : alias ? t('updateAlias') : t('createAlias')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}