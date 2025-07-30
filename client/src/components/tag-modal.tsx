import { useState } from "react";
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
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { Tag as TagType } from "@shared/schema";

// Create a function to get schema with translated messages
const createTagSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('tagNameRequired')).max(18, "Nome deve ter no máximo 18 caracteres"),
  color: z.string().min(1, "Tag color is required"),
});

type TagFormData = z.infer<ReturnType<typeof createTagSchema>>;

interface TagModalProps {
  tag?: TagType;
  userId: number;
  onClose: () => void;
  onSave: (tagData: TagFormData & { userId: number }) => Promise<void>;
  onUpdate?: (tagId: number, tagData: TagFormData) => Promise<void>;
  onDelete?: (tagId: number) => Promise<void>;
}

const colorOptions = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // yellow
  "#10b981", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#6b7280", // gray
];

export default function TagModal({ tag, userId, onClose, onSave, onUpdate, onDelete }: TagModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const tagSchema = createTagSchema(t);

  const form = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: tag?.name || "",
      color: tag?.color || colorOptions[0],
    },
  });

  const handleSave = async (data: TagFormData) => {
    try {
      if (tag && onUpdate) {
        await onUpdate(tag.id, data);
      } else {
        await onSave({ ...data, userId });
      }
      onClose();
    } catch (error: any) {
      console.error("Error saving tag:", error);
      
      // Extract clean error message
      let errorMessage = "Uma pasta ou tag com este nome já existe.";
      if (error.message && typeof error.message === 'string') {
        // If error.message contains JSON, try to parse it
        if (error.message.includes('{') && error.message.includes('}')) {
          try {
            const parsed = JSON.parse(error.message);
            errorMessage = parsed.message || errorMessage;
          } catch {
            // If parsing fails, extract message from "409: {message:...}" format
            const match = error.message.match(/:\s*{[^}]*"message"\s*:\s*"([^"]+)"/);
            if (match) {
              errorMessage = match[1];
            }
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      // Check if it's a conflict error and show appropriate message
      if (error.status === 409 || errorMessage.includes("já existe")) {
        toast({
          title: "Nome existente!",
          description: errorMessage,
          variant: "destructive",
          duration: 5000, // Auto-dismiss after 5 seconds
        });
      } else {
        toast({
          title: "Erro ao salvar tag",
          description: "Ocorreu um erro inesperado. Tente novamente.",
          variant: "destructive",
          duration: 5000, // Auto-dismiss after 5 seconds
        });
      }
    }
  };

  const handleDelete = async () => {
    if (!tag || !onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(tag.id);
      onClose();
    } catch (error) {
      console.error("Error deleting tag:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {tag ? t('editTag') : t('createTag')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tagName')}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter tag name..."
                      className="w-full"
                      maxLength={18}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tagColor')}</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-4 gap-3">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-110 ${
                            field.value === color
                              ? "border-foreground shadow-lg"
                              : "border-border hover:border-foreground/50"
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between space-x-3">
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? t('saving') : t('save')}
                </Button>
              </div>

              {tag && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : t('deleteTag')}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}