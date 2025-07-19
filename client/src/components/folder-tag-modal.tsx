import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  X,
  Folder,
  Tag,
  Heart,
  Star,
  Briefcase,
  Home,
  Users,
  Settings,
  BookOpen,
  Camera,
  Music,
  Gamepad2,
  ShoppingCart,
  Plane
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import type { Folder as FolderType } from "@shared/schema";

const createFolderSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t("nameRequired")).max(14, t("nameMaxLength")),
  color: z.string().min(4, t("colorRequired")),
  icon: z.string().min(1, t("iconRequired")),
});

type FolderFormData = {
  name: string;
  color: string;
  icon: string;
};

interface FolderTagModalProps {
  folder?: FolderType;
  onClose: () => void;
  onSave: (folderData: FolderFormData) => Promise<void>;
  onUpdate?: (folderId: number, folderData: FolderFormData) => Promise<void>;
  onDelete?: (folderId: number) => Promise<void>;
}

const getAvailableIcons = (t: (key: string) => string) => [
  { name: "folder", icon: Folder, label: t("folderIcon") },
  { name: "tag", icon: Tag, label: t("tagIcon") },
  { name: "heart", icon: Heart, label: t("heartIcon") },
  { name: "star", icon: Star, label: t("starIconLabel") },
  { name: "briefcase", icon: Briefcase, label: t("workIcon") },
  { name: "home", icon: Home, label: t("homeIcon") },
  { name: "users", icon: Users, label: t("peopleIcon") },
  { name: "settings", icon: Settings, label: t("settings") },
  { name: "book-open", icon: BookOpen, label: t("studyIcon") },
  { name: "camera", icon: Camera, label: t("photosIcon") },
  { name: "music", icon: Music, label: t("musicIcon") },
  { name: "gamepad2", icon: Gamepad2, label: t("gamesIcon") },
  { name: "shopping-cart", icon: ShoppingCart, label: t("shoppingIcon") },
  { name: "plane", icon: Plane, label: t("travelIcon") },
];

const availableColors = [
  "#6366f1", // Indigo
  "#f59e0b", // Yellow
  "#10b981", // Green
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#f97316", // Orange
  "#3b82f6", // Blue
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#84cc16", // Lime
  "#f43f5e", // Rose
  "#6b7280", // Gray
];

export default function FolderTagModal({ folder, onClose, onSave, onUpdate, onDelete }: FolderTagModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedColor, setSelectedColor] = useState(folder?.color || "#6366f1");
  const [selectedIcon, setSelectedIcon] = useState(folder?.icon || "folder");
  const [folderName, setFolderName] = useState(folder?.name || "");
  const { t } = useLanguage();
  const { toast } = useToast();

  const folderSchema = createFolderSchema(t);

  const form = useForm<FolderFormData>({
    resolver: zodResolver(folderSchema),
    defaultValues: {
      name: folder?.name || "",
      color: folder?.color || "#6366f1",
      icon: folder?.icon || "folder",
    },
  });

  const handleSave = async (data: FolderFormData) => {
    setIsSaving(true);
    try {
      if (folder && onUpdate) {
        await onUpdate(folder.id, data);
      } else {
        await onSave(data);
      }
      onClose();
    } catch (error: any) {
      console.error("Failed to save folder:", error);
      
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
          title: "Erro ao salvar pasta",
          description: "Ocorreu um erro inesperado. Tente novamente.",
          variant: "destructive",
          duration: 5000, // Auto-dismiss after 5 seconds
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!folder || !onDelete) return;
    
    try {
      setIsSaving(true);
      await onDelete(folder.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete folder:", error);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const availableIcons = getAvailableIcons(t);
  const SelectedIcon = availableIcons.find(icon => icon.name === selectedIcon)?.icon || Folder;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {folder ? t('editFolder') : t('createFolder')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          {/* Preview */}
          <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg border">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: selectedColor }}
            >
              <SelectedIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {folderName || t('folderName')}
              </p>
              <p className="text-sm text-muted-foreground">{t('customFolder')}</p>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <Label htmlFor="name">{t('folderName')}</Label>
            <Input
              id="name"
              {...form.register("name", {
                onChange: (e) => setFolderName(e.target.value)
              })}
              className="mt-2"
              placeholder={t('enterFolderName')}
              maxLength={14}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Color Picker */}
          <div>
            <Label>{t('color')}</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {availableColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    form.setValue("color", color);
                  }}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    selectedColor === color 
                      ? "border-foreground scale-110" 
                      : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <Label>{t('icon')}</Label>
            <div className="grid grid-cols-7 gap-2 mt-2">
              {availableIcons.map((iconItem) => {
                const IconComponent = iconItem.icon;
                return (
                  <button
                    key={iconItem.name}
                    type="button"
                    onClick={() => {
                      setSelectedIcon(iconItem.name);
                      form.setValue("icon", iconItem.name);
                    }}
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
                      selectedIcon === iconItem.name 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border hover:bg-accent"
                    }`}
                    title={iconItem.label}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            {/* Delete button - only show for custom folders */}
            {folder && folder.type === 'custom' && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
              >
                {t('deleteFolder')}
              </Button>
            )}
            
            <div className="flex space-x-3 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90"
              >
                {isSaving ? t('saving') : (folder ? t('updateFolder') : t('createFolder'))}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteFolder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteFolderDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('deleteFolder')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}