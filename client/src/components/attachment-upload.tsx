import React, { useState, useCallback } from 'react';
import { Upload, X, Paperclip, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { FileSizeErrorModal } from '@/components/file-size-error-modal';

export interface AttachmentInfo {
  id: string;
  filename: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
  userId: number;
}

interface AttachmentUploadProps {
  attachments: AttachmentInfo[];
  onAttachmentsChange: (attachments: AttachmentInfo[]) => void;
  maxFileSize?: number; // in bytes
  maxTotalSize?: number; // in bytes
  allowedTypes?: string[];
  disabled?: boolean;
  showUploadArea?: boolean; // New prop to control visibility of upload area
  triggerUpload?: () => void; // New prop to trigger file input from external button
}

export function AttachmentUpload({
  attachments,
  onAttachmentsChange,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  maxTotalSize = 50 * 1024 * 1024, // 50MB default
  allowedTypes = [],
  disabled = false,
  showUploadArea = true,
  triggerUpload
}: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showFileSizeError, setShowFileSizeError] = useState(false);
  const [errorFileName, setErrorFileName] = useState('');
  const { toast } = useToast();
  const { t } = useLanguage();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `Arquivo muito grande. Tamanho máximo: ${formatFileSize(maxFileSize)}`;
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(', ')}`;
    }

    const currentTotalSize = attachments.reduce((sum, att) => sum + att.size, 0);
    if (currentTotalSize + file.size > maxTotalSize) {
      return `Tamanho total dos anexos excedido. Limite: ${formatFileSize(maxTotalSize)}`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<AttachmentInfo> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/attachments/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao fazer upload do arquivo');
    }

    return response.json();
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (disabled || files.length === 0) return;

    setUploading(true);
    const newAttachments: AttachmentInfo[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file
        const error = validateFile(file);
        if (error) {
          // Show React modal instead of DOM modal
          setErrorFileName(file.name);
          setShowFileSizeError(true);
          continue;
        }

        // Upload file
        const attachmentInfo = await uploadFile(file);
        newAttachments.push(attachmentInfo);
        
        toast({
          title: t('fileUploaded') || 'Arquivo enviado',
          description: `${file.name} ${t('uploadedSuccessfully') || 'foi enviado com sucesso'}`,
        });
      }

      // Update attachments list
      onAttachmentsChange([...attachments, ...newAttachments]);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('uploadError') || 'Erro no upload',
        description: error instanceof Error ? error.message : (t('unknownError') || 'Erro desconhecido'),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [attachments, onAttachmentsChange, disabled, maxFileSize, maxTotalSize, allowedTypes, toast]);

  const handleRemoveAttachment = async (attachmentId: string) => {
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao remover arquivo');
      }

      const updatedAttachments = attachments.filter(att => att.id !== attachmentId);
      onAttachmentsChange(updatedAttachments);
      
      toast({
        title: "Arquivo removido",
        description: "O arquivo foi removido com sucesso",
      });
    } catch (error) {
      console.error('Remove error:', error);
      toast({
        title: "Erro ao remover",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  };

  // Expose trigger function through useImperativeHandle or ref
  React.useEffect(() => {
    if (triggerUpload) {
      (window as any).triggerFileUpload = () => {
        document.getElementById('attachment-file-input')?.click();
      };
    }
  }, [triggerUpload]);

  const currentTotalSize = attachments.reduce((sum, att) => sum + att.size, 0);

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        id="attachment-file-input"
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {/* Upload Area - only show if showUploadArea is true */}
      {showUploadArea && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && document.getElementById('attachment-file-input')?.click()}
        >
          <div className="flex flex-col items-center space-y-2">
            {uploading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Enviando...</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Clique para enviar</span> ou arraste arquivos aqui
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Tamanho máximo: {formatFileSize(maxFileSize)} por arquivo
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Anexos ({attachments.length})</span>
            <span className="text-xs text-gray-500">
              {formatFileSize(currentTotalSize)} / {formatFileSize(maxTotalSize)}
            </span>
          </div>
          
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Paperclip className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium">{attachment.filename}</div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)} • {attachment.mimetype}
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storage warning */}
      {currentTotalSize > maxTotalSize * 0.8 && (
        <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-300">
            Você está próximo do limite de armazenamento
          </span>
        </div>
      )}
      
      {/* File Size Error Modal */}
      <FileSizeErrorModal
        isOpen={showFileSizeError}
        onClose={() => setShowFileSizeError(false)}
        fileName={errorFileName}
      />
    </div>
  );
}