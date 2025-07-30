import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  HighZAlertDialog,
  HighZAlertDialogAction,
  HighZAlertDialogCancel,
  HighZAlertDialogContent,
  HighZAlertDialogDescription,
  HighZAlertDialogFooter,
  HighZAlertDialogHeader,
  HighZAlertDialogTitle,
} from "@/components/high-z-alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  X,
  Send,
  Save,
  Minimize,
  Maximize,
  Minus,
  CloudUpload,
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Code,
  MoreHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Type,
  Palette,
  Eye,
  Upload,
  Paperclip
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import EmailInput from "@/components/email-input";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { User } from "@shared/schema";
import { FileSizeErrorModal } from "@/components/file-size-error-modal";

const composeSchema = z.object({
  to: z.array(z.string().email()).min(1, "Pelo menos um destinatário é obrigatório"),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().max(99, "O assunto deve ter no máximo 99 caracteres").optional(),
  body: z.string().optional(),
});

type ComposeFormData = z.infer<typeof composeSchema>;

// Backend format with string fields
type BackendEmailData = {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body: string;
  attachments?: Attachment[];
  inlineImages?: { id: string; dataUrl: string; filename: string }[];
};

// Attachment interface
interface Attachment {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

// React Quill configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean']
  ],
  clipboard: {
    matchVisual: false,
  }
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'list', 'bullet', 'align',
  'blockquote', 'code-block', 'link', 'image'
];

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (emailData: BackendEmailData) => Promise<void>;
  onSaveDraft?: (emailData: BackendEmailData, draftId?: number) => Promise<void>;
  replyTo?: { subject: string; to: string; body: string; cc?: string; bcc?: string };
  editingDraft?: { 
    id: number; 
    subject: string; 
    toAddress: string; 
    ccAddress?: string; 
    bccAddress?: string;
    body: string; 
    attachments?: Attachment[];
  };
}

export default function ComposeModal({ open, onClose, onSend, onSaveDraft, replyTo, editingDraft }: ComposeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNoSubjectConfirm, setShowNoSubjectConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [pendingEmailData, setPendingEmailData] = useState<ComposeFormData | null>(null);
  const [showBccField, setShowBccField] = useState(false);
  const [showAdvancedToolbar, setShowAdvancedToolbar] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [textareaElement, setTextareaElement] = useState<HTMLTextAreaElement | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [quillRef, setQuillRef] = useState<ReactQuill | null>(null);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [signatureAdded, setSignatureAdded] = useState(false);
  const [bodyContent, setBodyContent] = useState<string>("");
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [inlineImages, setInlineImages] = useState<{ id: string; dataUrl: string; filename: string }[]>([]);
  const [isActivelyEditing, setIsActivelyEditing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>("");
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [showFileSizeError, setShowFileSizeError] = useState(false);
  const [errorFileName, setErrorFileName] = useState('');

  // Add beforeunload warning when compose modal is open
  useEffect(() => {
    if (open) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "Você tem alterações não salvas no compose. Tem certeza que deseja sair?";
        return "Você tem alterações não salvas no compose. Tem certeza que deseja sair?";
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [open]);

  // Remove user fetching - signatures will be added server-side when sending

  // File upload handlers
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;
    
    // Check file size limit (5MB per file)
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorFileName(file.name);
        setShowFileSizeError(true);
        return;
      }
    }
    
    // Upload files immediately
    await uploadFiles(files);
    
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!user || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch(`/api/attachments/upload/${user.id}`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setUploadedAttachments(prev => [...prev, ...result.attachments]);
        console.log('Files uploaded successfully:', result.attachments);
      } else {
        const error = await response.json();
        toast({
          title: "Upload Error",
          description: error.message || 'Failed to upload files',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload Error",
        description: 'Error uploading files',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = async (attachment: Attachment) => {
    if (!user) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/attachments/remove/${user.id}/${encodeURIComponent(attachment.filename)}`);
      
      if (response.ok) {
        setUploadedAttachments(prev => prev.filter(a => a.filename !== attachment.filename));
        console.log('Attachment removed:', attachment.filename);
      } else {
        const error = await response.json();
        toast({
          title: "Remove Error",
          description: error.message || 'Failed to remove attachment',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error removing attachment:', error);
      toast({
        title: "Remove Error", 
        description: 'Error removing attachment',
        variant: "destructive",
      });
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    // Only set drag over if we're not already in drag state
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
    // Set a timeout to clear the drag state to prevent flickering
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragOver(false);
    }, 50);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    // Check file size limit (5MB per file)
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorFileName(file.name);
        setShowFileSizeError(true);
        return;
      }
    }
    
    // Upload dropped files
    await uploadFiles(files);
  };

  const handleDiscardEmail = () => {
    setShowDiscardConfirm(true);
  };

  const handleConfirmDiscard = async () => {
    try {
      // If editing a draft, delete it from the server
      if (editingDraft) {
        await apiRequest('DELETE', `/api/emails/${editingDraft.id}`);
        console.log('Deleted editing draft:', editingDraft.id);
      }
      
      // Always check for and delete any active draft for this user
      if (user) {
        try {
          const activeDraftResponse = await apiRequest('GET', `/api/drafts/active/${user.id}`);
          if (activeDraftResponse.ok) {
            const activeDraft = await activeDraftResponse.json();
            
            if (activeDraft && activeDraft.id) {
              // Delete the actual email from drafts folder
              await apiRequest('DELETE', `/api/emails/${activeDraft.id}`);
              console.log('Deleted active draft email:', activeDraft.id);
            }
          }
        } catch (error) {
          console.log('No active draft to delete or error accessing:', error);
        }
        
        // Clear active draft state on server
        try {
          await apiRequest('DELETE', `/api/drafts/active/${user.id}`);
          console.log('Cleared active draft state');
        } catch (error) {
          console.log('No active draft state to clear');
        }
        
        // Force refresh of all email-related queries with aggressive cache clearing
        await queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/counts'] });
        await queryClient.invalidateQueries({ queryKey: [`/api/emails/${user.id}/folder/drafts`] });
        
        // Clear specific draft-related cache entries
        queryClient.removeQueries({ queryKey: ['/api/emails'] });
        queryClient.removeQueries({ queryKey: ['/api/counts'] });
        queryClient.removeQueries({ queryKey: [`/api/emails/${user.id}/folder/drafts`] });
        
        // Force immediate refetch
        await queryClient.refetchQueries({ queryKey: ['/api/emails'] });
        await queryClient.refetchQueries({ queryKey: ['/api/counts'] });
        await queryClient.refetchQueries({ queryKey: [`/api/emails/${user.id}/folder/drafts`] });
      }
      
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
    
    // Reset form and close modal without saving to drafts
    form.reset({
      to: [],
      cc: [],
      bcc: [],
      subject: "",
      body: "",
    });
    setShowDiscardConfirm(false);
    onClose();
  };

  const removeLocalAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle paste events for inline images
  const handlePaste = async (e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || []);
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        // Check file size limit (5MB)
        if (file.size > 5 * 1024 * 1024) {
          setErrorFileName(file.name || 'pasted-image');
          setShowFileSizeError(true);
          return;
        }

        // Convert to base64 data URL
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const imageId = `inline-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Add to inline images list
          setInlineImages(prev => [...prev, {
            id: imageId,
            dataUrl,
            filename: file.name || `pasted-image-${Date.now()}.${item.type.split('/')[1]}`
          }]);

          // Insert image using Quill's API for better rendering
          if (quillRef && quillRef.getEditor) {
            const quill = quillRef.getEditor();
            const range = quill.getSelection();
            const index = range ? range.index : quill.getLength();
            
            // Insert image at cursor position
            quill.insertEmbed(index, 'image', dataUrl, 'user');
            
            // Wait for Quill to render the image, then add our custom attributes
            setTimeout(() => {
              let newContent = quill.root.innerHTML;
              
              // Find the most recent image without data-inline-id and add it
              // This regex finds img tags with data URLs that don't have data-inline-id
              newContent = newContent.replace(
                /(<img[^>]*src="data:image[^"]*"[^>]*?)(?!.*data-inline-id)([^>]*>)/,
                `$1 data-inline-id="${imageId}" alt="Inline Image" style="max-width: 100%; height: auto;"$2`
              );
              
              setBodyContent(newContent);
              form.setValue("body", newContent);
              quill.setSelection(index + 1);
            }, 100);
            
          } else {
            // Fallback to HTML insertion if Quill ref is not available
            const currentContent = bodyContent || '';
            const imgHtml = `<p><img src="${dataUrl}" alt="Inline Image" style="max-width: 100%; height: auto;" data-inline-id="${imageId}" /></p>`;
            const newContent = currentContent + imgHtml;
            setBodyContent(newContent);
            form.setValue("body", newContent);
          }

          // Show success toast
          toast({
            title: "Imagem inserida",
            description: "A imagem foi inserida inline no e-mail.",
            duration: 2000,
          });

          console.log('🖼️ Imagem inserida:', { imageId, hasQuillRef: !!quillRef, bodyContentLength: bodyContent?.length || 0 });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Add paste event listener to the document when compose is open
  useEffect(() => {
    if (open) {
      document.addEventListener('paste', handlePaste);
      return () => {
        document.removeEventListener('paste', handlePaste);
      };
    }
  }, [open, bodyContent]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Simplified rich text functionality - replace current Textarea with ReactQuill
  const insertTextAtCursor = (textarea: HTMLTextAreaElement, before: string, after: string = '') => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = before + selectedText + after;
    
    const newValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    
    form.setValue('body', newValue);
    
    setTimeout(() => {
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
      textarea.focus();
    }, 0);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      const textarea = e.target as HTMLTextAreaElement;
      
      if (e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            insertTextAtCursor(textarea, '~~', '~~');
            break;
        }
      } else {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            insertTextAtCursor(textarea, '**', '**');
            break;
          case 'i':
            e.preventDefault();
            insertTextAtCursor(textarea, '*', '*');
            break;
          case 'u':
            e.preventDefault();
            insertTextAtCursor(textarea, '_', '_');
            break;
        }
      }
    }
  };
  const { t, currentLanguage } = useLanguage();
  const isMobile = useIsMobile();

  const form = useForm<ComposeFormData>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      to: replyTo?.to ? [replyTo.to] : [],
      cc: replyTo?.cc ? [replyTo.cc] : [],
      bcc: replyTo?.bcc ? [replyTo.bcc] : [],
      subject: replyTo?.subject || "",
      body: replyTo?.body || "",
    },
  });





  // Check if there's any content to save
  const hasContent = (data: ComposeFormData) => {
    return !!(
      (data.to && data.to.length > 0) ||
      (data.cc && data.cc.length > 0) ||
      (data.bcc && data.bcc.length > 0) ||
      data.subject?.trim() ||
      data.body?.trim()
    );
  };

  // Save draft when closing modal (only when user clicks X button)
  const handleModalClose = async () => {
    const currentData = form.getValues();
    
    // Close modal immediately for better UX
    setHasUnsavedChanges(false);
    onClose();
    
    // ONLY save draft if there's content AND it's not being sent
    if (hasContent(currentData) && !isSending) {
      const convertedData = {
        to: Array.isArray(currentData.to) ? currentData.to.join(',') : currentData.to || '',
        cc: Array.isArray(currentData.cc) ? currentData.cc.join(',') : currentData.cc || undefined,
        bcc: Array.isArray(currentData.bcc) ? currentData.bcc.join(',') : currentData.bcc || undefined,
        subject: currentData.subject,
        body: currentData.body || "",
        attachments: uploadedAttachments,
        inlineImages: inlineImages, // Include inline images in draft
      };
      
      console.log("🔧 DEBUG: Converted data for draft save:", convertedData);
      console.log("🔧 DEBUG: uploadedAttachments:", uploadedAttachments);
      
      // Save draft in background (non-blocking)
      if (onSaveDraft) {
        try {
          // Never pass draftId for new compose - always create new draft
          // Only pass editingDraft.id if we're actually editing an existing draft
          const draftIdToUpdate = editingDraft ? editingDraft.id : undefined;
          console.log("🔧 Saving draft - editingDraft:", editingDraft ? `ID: ${editingDraft.id}` : "none (new compose)");
          console.log("🔧 Draft ID to update:", draftIdToUpdate);
          await onSaveDraft(convertedData, draftIdToUpdate);
          console.log("Draft saved successfully on modal close");
        } catch (error) {
          console.error("Failed to save draft on close:", error);
        }
      }
    }
  };

  // Reset form when modal closes and initialize with draft data when it opens
  useEffect(() => {
    if (!open) {
      // Do NOT save draft here - this duplicates the functionality in handleModalClose
      
      form.reset({
        to: [],
        cc: [],
        bcc: [],
        subject: "",
        body: "",
      });
      setBodyContent("");
      setToEmails([]);
      setCcEmails([]);
      setBccEmails([]);
      
      // Clear attachments when modal closes
      setAttachedFiles([]);
      setUploadedAttachments([]);

      lastSavedDataRef.current = "";
      setSignatureAdded(false);
    } else if (editingDraft) {
      // Pre-populate form immediately with available draft data to avoid blank screen
      
      // Parse email addresses from comma-separated strings
      const toEmails = editingDraft.toAddress ? editingDraft.toAddress.split(',').map(e => e.trim()).filter(e => e) : [];
      const ccEmails = editingDraft.ccAddress ? editingDraft.ccAddress.split(',').map(e => e.trim()).filter(e => e) : [];
      const bccEmails = editingDraft.bccAddress ? editingDraft.bccAddress.split(',').map(e => e.trim()).filter(e => e) : [];
      
      // Populate form with draft data immediately
      form.reset({
        to: toEmails,
        cc: ccEmails,
        bcc: bccEmails,
        subject: editingDraft.subject || "",
        body: editingDraft.body || "",
      });
      
      // Update state variables
      setBodyContent(editingDraft.body || "");
      setToEmails(toEmails);
      setCcEmails(ccEmails);
      setBccEmails(bccEmails);
      
      // Load attachments if editing a draft
      if (editingDraft.attachments) {
        try {
          // If attachments is a string (from database), parse it
          const attachments = typeof editingDraft.attachments === 'string' 
            ? JSON.parse(editingDraft.attachments) 
            : editingDraft.attachments;
          
          console.log('📎 Loading existing draft attachments:', {
            originalAttachments: editingDraft.attachments,
            parsedAttachments: attachments,
            attachmentsCount: Array.isArray(attachments) ? attachments.length : 0
          });
          
          setUploadedAttachments(Array.isArray(attachments) ? attachments : []);
        } catch (error) {
          console.error('Error parsing draft attachments:', error);
          setUploadedAttachments([]);
        }
      } else {
        setUploadedAttachments([]);
      }
      
      // Show fields if they have content
      if (ccEmails.length > 0 || bccEmails.length > 0) {
        setShowBccField(true);
      }
    } else if (replyTo) {
      // Handle reply functionality - prefill form with replyTo data
      const toEmails = replyTo.to ? [replyTo.to] : [];
      const ccEmails = replyTo.cc ? [replyTo.cc] : [];
      const bccEmails = replyTo.bcc ? [replyTo.bcc] : [];
      
      form.reset({
        to: toEmails,
        cc: ccEmails,
        bcc: bccEmails,
        subject: replyTo.subject || "",
        body: replyTo.body || "",
      });
      
      // Update state variables
      setBodyContent(replyTo.body || "");
      setToEmails(toEmails);
      setCcEmails(ccEmails);
      setBccEmails(bccEmails);
      
      // Show CC/BCC fields if they have content
      if (ccEmails.length > 0 || bccEmails.length > 0) {
        setShowBccField(true);
      }
    }
  }, [open, form, editingDraft, replyTo]);



  // Sync contentEditable with form value - but only when not actively editing
  useEffect(() => {
    if (textareaElement && open && !isActivelyEditing) {
      const currentFormValue = bodyContent;
      if (textareaElement.innerHTML !== currentFormValue) {
        textareaElement.innerHTML = currentFormValue || '';
      }
    }
  }, [textareaElement, bodyContent, open, isActivelyEditing]);

  // Signature logic removed - signatures will be added server-side during send

  // Add tooltips to Quill editor buttons
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const quillButtons = document.querySelectorAll('.ql-toolbar button');
        quillButtons.forEach((button) => {
          const classList = button.className;
          if (classList.includes('ql-bold')) {
            button.setAttribute('title', t('quillBold'));
          } else if (classList.includes('ql-italic')) {
            button.setAttribute('title', t('quillItalic'));
          } else if (classList.includes('ql-underline')) {
            button.setAttribute('title', t('quillUnderline'));
          } else if (classList.includes('ql-strike')) {
            button.setAttribute('title', t('quillStrike'));
          } else if (classList.includes('ql-link')) {
            button.setAttribute('title', t('quillLink'));
          } else if (classList.includes('ql-list[value="ordered"]')) {
            button.setAttribute('title', t('quillOrderedList'));
          } else if (classList.includes('ql-list')) {
            button.setAttribute('title', t('quillList'));
          } else if (classList.includes('ql-blockquote')) {
            button.setAttribute('title', t('quillBlockquote'));
          }
        });
      }, 100);
    }
  }, [open, t]);



  // Clear saved data when modal closes
  useEffect(() => {
    if (!open) {
      lastSavedDataRef.current = "";
      setAttachedFiles([]); // Clear attachments when modal closes
    }
  }, [open]);

  // Window beforeunload handler - warn if user tries to close window with unsaved changes
  useEffect(() => {
    if (!open) return;

    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Modern browsers require this
        
        // Save draft before unloading
        const currentData = form.getValues();
        if (hasContent(currentData)) {
          try {
            const convertedData = {
              to: Array.isArray(currentData.to) ? currentData.to.join(',') : currentData.to || '',
              cc: Array.isArray(currentData.cc) ? currentData.cc.join(',') : currentData.cc || undefined,
              bcc: Array.isArray(currentData.bcc) ? currentData.bcc.join(',') : currentData.bcc || undefined,
              subject: currentData.subject,
              body: currentData.body || "",
              attachments: uploadedAttachments,
              inlineImages: inlineImages, // Include inline images in draft
            };
            
            if (onSaveDraft) {
              await onSaveDraft(convertedData, editingDraft?.id);
            }
          } catch (error) {
            console.error("Failed to save draft on unload:", error);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [open, hasUnsavedChanges, form, onSaveDraft, editingDraft]);

  // Track changes to enable unsaved changes warning
  useEffect(() => {
    if (!open) {
      setHasUnsavedChanges(false);
      return;
    }

    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });

    return () => subscription.unsubscribe();
  }, [open, form]);

  // Save draft when closing if there's content (removed to prevent auto-close issues)

  const handleSend = async (data: ComposeFormData) => {
    // Check if subject is empty
    if (!data.subject || data.subject.trim() === "") {
      setPendingEmailData(data);
      setShowNoSubjectConfirm(true);
      return;
    }

    try {
      setIsSending(true);
      const convertedData = {
        to: data.to.join(','),
        cc: data.cc?.length ? data.cc.join(',') : undefined,
        bcc: data.bcc?.length ? data.bcc.join(',') : undefined,
        subject: data.subject,
        body: data.body || "",
        attachments: uploadedAttachments,
        inlineImages: inlineImages, // Include inline images
        // Include draftId if we're editing an existing draft
        draftId: editingDraft?.id
      };
      
      console.log('🔄 Sending email with draft ID:', convertedData.draftId);
      await onSend(convertedData);
      setHasUnsavedChanges(false); // Clear unsaved changes after successful send
      onClose();
    } catch (error) {
      console.error("Failed to send email:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmSendWithoutSubject = async () => {
    if (!pendingEmailData) return;
    
    setIsSending(true);
    setShowNoSubjectConfirm(false);
    try {
      // Auto-fill subject based on language
      const noSubjectText = t('noSubject');
      const emailDataWithSubject = {
        ...pendingEmailData,
        subject: noSubjectText
      };
      const convertedData = {
        to: emailDataWithSubject.to.join(','),
        cc: emailDataWithSubject.cc?.length ? emailDataWithSubject.cc.join(',') : undefined,
        bcc: emailDataWithSubject.bcc?.length ? emailDataWithSubject.bcc.join(',') : undefined,
        subject: emailDataWithSubject.subject,
        body: emailDataWithSubject.body || "",
        attachments: uploadedAttachments,
        inlineImages: inlineImages, // Include inline images
        // Include draftId if we're editing an existing draft
        draftId: editingDraft?.id
      };
      
      console.log('🔄 Sending email without subject with draft ID:', convertedData.draftId);
      await onSend(convertedData);
      setHasUnsavedChanges(false); // Clear unsaved changes after successful send
      onClose();
    } catch (error) {
      console.error("Failed to send email:", error);
    } finally {
      setIsSending(false);
      setPendingEmailData(null);
    }
  };

  const applyFormatting = (command: string, value?: string) => {
    if (!textareaElement) return;
    
    // Ensure element is focused and editable
    textareaElement.focus();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // Insert formatting tag at the end with cursor inside
      const content = textareaElement.innerHTML;
      let newTag = '';
      
      switch (command) {
        case 'bold':
          newTag = '<b></b>';
          break;
        case 'italic':
          newTag = '<i></i>';
          break;
        case 'underline':
          newTag = '<u></u>';
          break;
        case 'strikeThrough':
          newTag = '<s></s>';
          break;
        case 'createLink':
          const url = value || prompt('Digite a URL:');
          if (url) {
            newTag = `<a href="${url}"></a>`;
          }
          break;
        default:
          return;
      }
      
      textareaElement.innerHTML = content + newTag;
      form.setValue('body', textareaElement.innerHTML);
      return;
    }
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText) {
      // No text selected, insert empty formatting tag at cursor
      let newElement: HTMLElement;
      switch (command) {
        case 'bold':
          newElement = document.createElement('b');
          break;
        case 'italic':
          newElement = document.createElement('i');
          break;
        case 'underline':
          newElement = document.createElement('u');
          break;
        case 'strikeThrough':
          newElement = document.createElement('s');
          break;
        case 'createLink':
          newElement = document.createElement('a');
          const url = value || prompt('Digite a URL:');
          if (url) {
            (newElement as HTMLAnchorElement).href = url;
          } else {
            return;
          }
          break;
        default:
          return;
      }
      
      try {
        range.insertNode(newElement);
        range.setStart(newElement, 0);
        range.setEnd(newElement, 0);
        selection.removeAllRanges();
        selection.addRange(range);
        form.setValue('body', textareaElement.innerHTML);
      } catch (e) {
        console.warn('Failed to insert formatting:', e);
      }
      return;
    }
    
    // Text is selected - check if it's already formatted
    const commonAncestor = range.commonAncestorContainer;
    let parentElement = commonAncestor.nodeType === Node.TEXT_NODE 
      ? commonAncestor.parentElement 
      : commonAncestor as Element;
    
    // Check if selection is already wrapped in the target formatting
    let targetTagName = '';
    switch (command) {
      case 'bold':
        targetTagName = 'B';
        break;
      case 'italic':
        targetTagName = 'I';
        break;
      case 'underline':
        targetTagName = 'U';
        break;
      case 'strikeThrough':
        targetTagName = 'S';
        break;
      case 'createLink':
        targetTagName = 'A';
        break;
      default:
        return;
    }
    
    // Look for existing formatting in parent elements
    let formattedElement: Element | null = null;
    let currentElement = parentElement;
    
    while (currentElement && currentElement !== textareaElement) {
      if (currentElement.tagName === targetTagName) {
        formattedElement = currentElement;
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    try {
      if (formattedElement) {
        // Remove existing formatting
        const textContent = formattedElement.textContent || '';
        const textNode = document.createTextNode(textContent);
        formattedElement.parentNode?.replaceChild(textNode, formattedElement);
        
        // Select the text that was just unformatted
        const newRange = document.createRange();
        newRange.selectNode(textNode);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // Apply new formatting
        let wrapper: HTMLElement;
        switch (command) {
          case 'bold':
            wrapper = document.createElement('b');
            break;
          case 'italic':
            wrapper = document.createElement('i');
            break;
          case 'underline':
            wrapper = document.createElement('u');
            break;
          case 'strikeThrough':
            wrapper = document.createElement('s');
            break;
          case 'createLink':
            wrapper = document.createElement('a');
            const url = value || prompt('Digite a URL:');
            if (url) {
              (wrapper as HTMLAnchorElement).href = url;
            } else {
              return;
            }
            break;
          default:
            return;
        }
        
        // Wrap selected content
        wrapper.textContent = selectedText;
        range.deleteContents();
        range.insertNode(wrapper);
        
        // Select the newly wrapped content
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      
      // Update form value and keep focus
      form.setValue('body', textareaElement.innerHTML);
      textareaElement.focus();
      
    } catch (e) {
      console.warn('Formatting operation failed:', e);
    }
  }





  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      applyFormatting('createLink', url);
    }
  };

  const RichTextToolbar = () => (
    <div className="border-b border-border bg-muted/30">
      <div className="flex items-center p-2 gap-1 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('bold')}
          className="h-8 w-8 p-0"
          title={t('boldText')}
        >
          <Bold className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('italic')}
          className="h-8 w-8 p-0"
          title={t('italicText')}
        >
          <Italic className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('underline')}
          className="h-8 w-8 p-0"
          title={t('underlineText')}
        >
          <Underline className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('strikeThrough')}
          className="h-8 w-8 p-0"
          title={t('strikethroughText')}
        >
          <Strikethrough className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
          className="h-8 w-8 p-0"
          title="Insert Link (Ctrl+K)"
        >
          <Link className="h-3 w-3" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('justifyLeft')}
          className="h-8 w-8 p-0"
          title="Align Left"
        >
          <AlignLeft className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('justifyCenter')}
          className="h-8 w-8 p-0"
          title="Align Center"
        >
          <AlignCenter className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('justifyRight')}
          className="h-8 w-8 p-0"
          title="Align Right"
        >
          <AlignRight className="h-3 w-3" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('insertUnorderedList')}
          className="h-8 w-8 p-0"
          title="Bullet List (Ctrl+Shift+L)"
        >
          <List className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('insertOrderedList')}
          className="h-8 w-8 p-0"
          title="Numbered List (Ctrl+Shift+O)"
        >
          <ListOrdered className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormatting('formatBlock', 'blockquote')}
          className="h-8 w-8 p-0"
          title="Quote"
        >
          <Quote className="h-3 w-3" />
        </Button>
        {showAdvancedToolbar && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('formatBlock', 'code')}
              className="h-8 w-8 p-0"
              title="Code Block"
            >
              <Code className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('fontSize', '3')}
              className="h-8 w-8 p-0"
              title="Font Size"
            >
              <Type className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyFormatting('foreColor', '#007acc')}
              className="h-8 w-8 p-0"
              title="Text Color"
            >
              <Palette className="h-3 w-3" />
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvancedToolbar(!showAdvancedToolbar)}
          className="h-8 w-8 p-0"
          title="More Tools"
        >
          <MoreHorizontal className="h-3 w-3" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant={showPreview ? "default" : "ghost"}
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="h-8 w-8 p-0"
          title="Preview Formatting"
        >
          <Eye className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
          title="Restore compose window"
        >
          Rascunho
        </Button>
      </div>
    );
  }

  // Mobile: Full-screen modal
  if (isMobile) {
    return (
      <>
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="!fixed !inset-0 !max-w-none !w-screen !h-screen !p-0 !m-0 !rounded-none !border-0 !translate-x-0 !translate-y-0 !left-0 !top-0 flex flex-col z-[99999]">
            <DialogHeader className="p-4 border-b border-border bg-background relative flex flex-row items-center justify-between z-[100000] flex-shrink-0">
              <DialogTitle className="text-lg font-semibold">{t('newMessage')}</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleModalClose}
                  className="h-6 w-6 p-0"
                  title={t('close')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription className="sr-only">
                Compose and send a new email message
              </DialogDescription>
            </DialogHeader>
            <form 
              onSubmit={form.handleSubmit(handleSend)} 
              className="flex flex-col flex-1 overflow-hidden"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
                {/* Drag overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
                    <div className="text-center">
                      <Upload className="h-12 w-12 mx-auto mb-2 text-primary" />
                      <p className="text-sm font-medium text-primary">{t('dropFilesToAttach')}</p>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="to" className="text-sm font-medium text-foreground">
                      {t('to')}
                    </Label>
                    <div className="mt-2">
                      <EmailInput
                        emails={toEmails}
                        onChange={(emails) => {
                          setToEmails(emails);
                          form.setValue("to", emails);
                        }}
                        onFocus={() => setIsActivelyEditing(true)}
                        onBlur={() => setIsActivelyEditing(false)}
                        placeholder="recipient@example.com"
                        className="border border-input rounded-md"
                      />
                      {form.formState.errors.to && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.to.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cc" className="text-sm font-medium text-foreground">
                      {t('cc')}
                    </Label>
                    <div className="flex items-start space-x-2 mt-2">
                      <EmailInput
                        emails={ccEmails}
                        onChange={(emails) => {
                          setCcEmails(emails);
                          form.setValue("cc", emails);
                        }}
                        onFocus={() => setIsActivelyEditing(true)}
                        onBlur={() => setIsActivelyEditing(false)}
                        placeholder="cc@example.com"
                        className="flex-1 border border-input rounded-md"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBccField(!showBccField)}
                        className="text-sm text-muted-foreground hover:text-foreground h-auto px-1 py-0 shrink-0 mt-2"
                      >
                        {t('bcc')}
                      </Button>
                    </div>
                  </div>
                  {showBccField && (
                    <div>
                      <Label htmlFor="bcc" className="text-sm font-medium text-foreground">
                        {t('bcc')}
                      </Label>
                      <div className="mt-2">
                        <EmailInput
                          emails={bccEmails}
                          onChange={(emails) => {
                            setBccEmails(emails);
                            form.setValue("bcc", emails);
                          }}
                          onFocus={() => setIsActivelyEditing(true)}
                          onBlur={() => setIsActivelyEditing(false)}
                          placeholder="bcc@example.com"
                          className="border border-input rounded-md"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="subject" className="text-sm font-medium text-foreground">
                      {t('subject')}
                    </Label>
                    <Input
                      id="subject"
                      {...form.register("subject")}
                      onFocus={() => setIsActivelyEditing(true)}
                      onBlur={() => setIsActivelyEditing(false)}
                      className="mt-2"
                      maxLength={99}
                    />
                  </div>
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  <RichTextToolbar />
                  <div
                    contentEditable={true}
                    className={`p-4 resize-none border-0 focus:ring-0 focus:outline-none focus:border-0 text-left overflow-y-auto ${
                      showBccField ? 'min-h-[150px] h-[30vh]' : 'min-h-[200px] h-[35vh]'
                    }`}
                    style={{ direction: 'ltr', textAlign: 'left', boxShadow: 'none' }}
                    data-placeholder="Compose your message..."
                    onFocus={() => setIsActivelyEditing(true)}
                    onBlur={(e) => {
                      setIsActivelyEditing(false);
                      const content = e.currentTarget.innerHTML;
                      form.setValue('body', content);
                    }}
                    onInput={(e) => {
                      const content = e.currentTarget.innerHTML;
                      form.setValue('body', content);
                    }}
                    ref={(el) => {
                      if (el) {
                        setTextareaElement(el as any);
                      }
                    }}
                  />
                  {form.formState.errors.body && (
                    <p className="text-sm text-destructive p-4 border-t border-border">
                      {form.formState.errors.body.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-border flex-shrink-0">
                <div className="flex items-center justify-between w-full gap-2">
                  <Button
                    type="submit"
                    disabled={isSending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 min-w-[120px]"
                  >
                    {isSending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t('sending')}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t('send')}
                      </>
                    )}
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDiscardEmail}
                      className="text-muted-foreground hover:text-destructive p-2"
                      title={t('discardEmail')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* No Subject Confirmation Alert */}
        <HighZAlertDialog open={showNoSubjectConfirm} onOpenChange={setShowNoSubjectConfirm}>
          <HighZAlertDialogContent>
            <HighZAlertDialogHeader>
              <HighZAlertDialogTitle>{t('confirmSendWithoutSubject')}</HighZAlertDialogTitle>
              <HighZAlertDialogDescription>
                {t('noSubjectWarning')}
              </HighZAlertDialogDescription>
            </HighZAlertDialogHeader>
            <HighZAlertDialogFooter>
              <HighZAlertDialogCancel onClick={() => {
                setShowNoSubjectConfirm(false);
                setPendingEmailData(null);
              }}>
                {t('cancel')}
              </HighZAlertDialogCancel>
              <HighZAlertDialogAction onClick={handleConfirmSendWithoutSubject}>
                {t('sendAnyway')}
              </HighZAlertDialogAction>
            </HighZAlertDialogFooter>
          </HighZAlertDialogContent>
        </HighZAlertDialog>
      </>
    );
  }

  // Desktop: Fixed positioned window
  if (!open) return null;
  
  return (
    <>
      <div className={`fixed ${isExpanded ? 'z-[100]' : 'z-50'} bg-background border-l border-t border-border rounded-tl-lg shadow-xl compose-modal ${
        isExpanded ? 'compose-modal-expanded' : 'compose-modal-normal'
      } flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="px-4 pt-3 pb-3 border-b border-border flex flex-row items-center justify-between">
          <h3 className="text-sm font-semibold">{t('newMessage')}</h3>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
              title={t('minimizeCompose')}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
              title={isExpanded ? t('restoreWindow') : t('expandWindow')}
            >
              {isExpanded ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleModalClose}
              className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
              title={t('closeCompose')}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form 
          onSubmit={form.handleSubmit(handleSend)} 
          className="flex flex-col h-full"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex-1 overflow-y-auto flex flex-col relative">
            {/* Drag overlay */}
            {isDragOver && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium text-primary">{t('dropFilesToAttach')}</p>
                </div>
              </div>
            )}
            <div className="p-4 space-y-3 flex-shrink-0">
              <div className="flex space-x-3">
                <Label htmlFor="to" className="text-sm font-medium text-foreground min-w-[60px] pt-2 shrink-0">
                  {t('to')}:
                </Label>
                <div className="flex-1">
                  <EmailInput
                    emails={toEmails}
                    onChange={(emails) => {
                      setToEmails(emails);
                      form.setValue("to", emails);
                    }}
                    placeholder="recipient@example.com, user@domain.com, ..."
                  />
                  {form.formState.errors.to && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.to.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-3">
                <Label htmlFor="cc" className="text-sm font-medium text-foreground min-w-[60px] pt-2 shrink-0">
                  {t('cc')}:
                </Label>
                <div className="flex-1 flex items-start space-x-2">
                  <EmailInput
                    emails={ccEmails}
                    onChange={(emails) => {
                      setCcEmails(emails);
                      form.setValue("cc", emails);
                    }}
                    placeholder="cc@example.com, user@domain.com, ..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBccField(!showBccField)}
                    className="text-sm text-muted-foreground hover:text-foreground h-auto px-1 py-0 shrink-0 mt-2"
                  >
                    :
                  </Button>
                </div>
              </div>
              {showBccField && (
                <div className="flex space-x-3">
                  <Label htmlFor="bcc" className="text-sm font-medium text-foreground min-w-[60px] pt-2 shrink-0">
                    {t('bcc')}:
                  </Label>
                  <EmailInput
                    emails={bccEmails}
                    onChange={(emails) => {
                      setBccEmails(emails);
                      form.setValue("bcc", emails);
                    }}
                    placeholder="bcc@example.com, user@domain.com, ..."
                    className="flex-1"
                  />
                </div>
              )}
              <div className="flex space-x-3">
                <Label htmlFor="subject" className="text-sm font-medium text-foreground min-w-[60px] pt-2 shrink-0">
                  {t('subject')}:
                </Label>
                <Input
                  id="subject"
                  {...form.register("subject")}
                  className="flex-1 text-left border-0 focus:ring-0 focus:ring-offset-0 shadow-none !border-transparent focus:!border-transparent outline-none"
                  maxLength={99}
                  style={{ 
                    direction: 'ltr', 
                    textAlign: 'left',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none'
                  }}
                />
              </div>
            </div>
            <div className="px-4 pb-4 flex-1 flex flex-col">
              <div className="rounded-lg overflow-hidden flex-1 flex flex-col">
                <div className={`flex-1 flex flex-col ${
                  attachedFiles.length > 0 
                    ? (showBccField ? 'min-h-[200px]' : 'min-h-[240px]')
                    : (showBccField ? 'min-h-[250px]' : 'min-h-[300px]')
                }`}>
                  <div className={`${isDragOver ? 'quill-drag-over' : ''}`}>
                    <ReactQuill
                      ref={setQuillRef}
                      value={bodyContent}
                      onChange={(content) => {
                        setBodyContent(content);
                        form.setValue("body", content);
                      }}
                      onFocus={() => setIsActivelyEditing(true)}
                      onBlur={() => setIsActivelyEditing(false)}
                      modules={quillModules}
                      formats={quillFormats}
                      theme="snow"
                      placeholder="Write your message..."
                      style={{ 
                        height: '329px',
                        maxHeight: '329px',
                        border: 'none',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    />
                  </div>
                </div>
                {form.formState.errors.body && (
                  <p className="text-sm text-destructive p-4 border-t border-border">
                    {form.formState.errors.body.message}
                  </p>
                )}
              </div>


            </div>
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 pt-2 border-t border-border flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                type="submit"
                disabled={isSending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('sending')}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t('send')}
                  </>
                )}
              </Button>

            </div>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDiscardEmail}
                className="text-muted-foreground hover:text-destructive"
                title={t('discardEmail')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAttachClick}
                className="text-muted-foreground hover:text-foreground"
                title={t('attach')}
              >
                <CloudUpload className="h-4 w-4" />
              </Button>
              {uploadedAttachments.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAttachmentsModal(true)}
                  className="text-muted-foreground hover:text-foreground relative"
                  title={`${uploadedAttachments.length} ${uploadedAttachments.length === 1 ? t('attachment') : t('attachments')}`}
                >
                  <Paperclip className="h-4 w-4 animate-pulse" />
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                    {uploadedAttachments.length}
                  </span>
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
              />
            </div>
          </div>
        </form>
      </div>

      {/* No Subject Confirmation Alert */}
      <HighZAlertDialog open={showNoSubjectConfirm} onOpenChange={setShowNoSubjectConfirm}>
        <HighZAlertDialogContent>
          <HighZAlertDialogHeader>
            <HighZAlertDialogTitle>{t('confirmSendWithoutSubject')}</HighZAlertDialogTitle>
            <HighZAlertDialogDescription>
              {t('noSubjectWarning')}
            </HighZAlertDialogDescription>
          </HighZAlertDialogHeader>
          <HighZAlertDialogFooter>
            <HighZAlertDialogCancel onClick={() => {
              setShowNoSubjectConfirm(false);
              setPendingEmailData(null);
            }}>
              {t('cancel')}
            </HighZAlertDialogCancel>
            <HighZAlertDialogAction onClick={handleConfirmSendWithoutSubject}>
              {t('sendAnyway')}
            </HighZAlertDialogAction>
          </HighZAlertDialogFooter>
        </HighZAlertDialogContent>
      </HighZAlertDialog>

      {/* Discard Email Confirmation Alert */}
      <HighZAlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <HighZAlertDialogContent>
          <HighZAlertDialogHeader>
            <HighZAlertDialogTitle>{t('discardEmail')}</HighZAlertDialogTitle>
            <HighZAlertDialogDescription>
              {t('confirmDiscardDescription')}
            </HighZAlertDialogDescription>
          </HighZAlertDialogHeader>
          <HighZAlertDialogFooter>
            <HighZAlertDialogCancel onClick={() => setShowDiscardConfirm(false)}>
              {t('cancel')}
            </HighZAlertDialogCancel>
            <HighZAlertDialogAction onClick={handleConfirmDiscard}>
              {t('confirmDiscard')}
            </HighZAlertDialogAction>
          </HighZAlertDialogFooter>
        </HighZAlertDialogContent>
      </HighZAlertDialog>

      {/* Custom Attachments Modal - Fixed z-index */}
      {showAttachmentsModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          style={{ zIndex: 10000 }}
          onClick={() => setShowAttachmentsModal(false)}
        >
          <div
            className="bg-background rounded-lg border shadow-lg w-full max-w-[425px] max-h-[80vh] flex flex-col"
            style={{ zIndex: 10001 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {t('attachmentsTitle')} ({uploadedAttachments.length})
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('manageAttachments')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowAttachmentsModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] px-6 pb-6">
              <div className="space-y-2">
                {uploadedAttachments.map((attachment, index) => {
                  // Format filename to show extension if truncated
                  const formatFileName = (filename: string) => {
                    if (filename.length <= 25) return filename;
                    const extension = filename.split('.').pop();
                    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
                    const truncatedName = nameWithoutExt.substring(0, 20 - (extension?.length || 0));
                    return `${truncatedName}...${extension}`;
                  };
                  
                  const formatFileSize = (bytes: number): string => {
                    if (bytes === 0) return '0 Bytes';
                    const k = 1024;
                    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                  };

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-3 text-sm border hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div 
                            className="font-medium truncate" 
                            title={attachment.filename}
                          >
                            {formatFileName(attachment.filename)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {formatFileSize(attachment.size)}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await removeAttachment(attachment);
                          // If no more attachments, close modal
                          if (uploadedAttachments.length === 1) {
                            setShowAttachmentsModal(false);
                          }
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive flex-shrink-0 ml-2"
                        disabled={isUploading}
                        title={t('removeAttachment')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* File Size Error Modal */}
      <FileSizeErrorModal
        isOpen={showFileSizeError}
        onClose={() => setShowFileSizeError(false)}
        fileName={errorFileName}
      />
    </>
  );
}