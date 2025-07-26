import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';

interface FileSizeErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
}

export function FileSizeErrorModal({ isOpen, onClose, fileName }: FileSizeErrorModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 150000 }}
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg border shadow-lg w-full max-w-md"
        style={{ zIndex: 150001 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {t('fileTooBig')}
              </h3>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="px-6 pb-6">
          <p className="text-muted-foreground">
            {t('fileSizeExceedsLimit').replace('{name}', fileName)}
          </p>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
              {t('ok')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}