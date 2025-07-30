import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  emailCount: number;
  folderName?: string;
  isPermanent?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  emailCount,
  folderName,
  isPermanent = false
}: DeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useLanguage();

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error deleting emails:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getTitle = () => {
    if (isPermanent) {
      return emailCount === 1 ? t('deleteEmailPermanently') : t('deleteEmailsPermanently');
    }
    return emailCount === 1 ? t('deleteEmail') : t('deleteEmails');
  };

  const getDescription = () => {
    if (isPermanent) {
      if (emailCount === 1) {
        return t('permanentDeleteWarning');
      }
      return t('permanentDeleteWarning'); // Use same warning for multiple emails
    }
    
    if (emailCount === 1) {
      return `Este email será movido para a lixeira e poderá ser recuperado posteriormente.`;
    }
    return `Estes ${emailCount} emails serão movidos para a lixeira e poderão ser recuperados posteriormente.`;
  };

  const getButtonText = () => {
    if (isDeleting) {
      return t('deleting');
    }
    return isPermanent ? t('deletePermanently') : "Mover para Lixeira";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] z-[15000]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPermanent ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Trash2 className="h-5 w-5 text-orange-500" />
            )}
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-left">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isDeleting}
          >
            {t('cancel')}
          </Button>
          <Button
            variant={isPermanent ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isDeleting}
            className={isPermanent ? "" : "bg-orange-500 hover:bg-orange-600"}
          >
            {getButtonText()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}