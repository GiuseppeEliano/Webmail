import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Reply, 
  Forward, 
  Star, 
  Trash2, 
  Download,
  MoreHorizontal,
  Archive,
  Flag,
  Maximize,
  Minimize,
  X,
  ArrowLeft,
  Edit,
  MailOpen,
  Mail,
  FolderOpen,
  Tag,
  Shield,
  Printer,
  Eye,
  Folder
} from "lucide-react";
import { formatEmailDate, formatRelativeTimeLocalized } from "@/lib/date-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/hooks/use-language";
import type { Email, Folder as FolderType } from "@shared/schema";

interface EmailContentProps {
  email: Email | null;
  onReply: (email: Email) => void;
  onForward: (email: Email) => void;
  onToggleStar: (emailId: number) => void;
  onDelete: (email: Email) => void;
  onEdit?: (email: Email) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onClose?: () => void;
  currentFolder?: string;
  emailCounts?: { [key: string]: number };
  currentUser?: { username: string } | null;
  onMarkRead?: (emailId: number, isRead: boolean) => void;
  onMoveToFolder?: (emailId: number, folderId: number) => void;
  onManageTags?: (email: Email) => void;
  onMoveToJunk?: (email: Email) => void;
  onArchive?: (email: Email) => void;
  onBlockSender?: (email: Email) => void;
  folders?: FolderType[];
}

export default function EmailContent({
  email,
  onReply,
  onForward,
  onToggleStar,
  onDelete,
  onEdit,
  isFullScreen,
  onToggleFullScreen,
  onClose,
  currentFolder = 'inbox',
  emailCounts = {},
  currentUser,
  onMarkRead,
  onMoveToFolder,
  onManageTags,
  onMoveToJunk,
  onArchive,
  onBlockSender,
  folders = []
}: EmailContentProps) {
  const [showFullHeaders, setShowFullHeaders] = useState(false);
  const [avatarShape, setAvatarShape] = useState(() => 
    localStorage.getItem('avatarShape') || 'rounded'
  );
  const isMobile = useIsMobile();
  const { t, currentLanguage } = useLanguage();

  // Listen for avatar shape changes
  useEffect(() => {
    const handleAvatarShapeChange = (event: CustomEvent) => {
      setAvatarShape(event.detail.shape);
    };

    window.addEventListener('avatarShapeChange', handleAvatarShapeChange as EventListener);
    
    return () => {
      window.removeEventListener('avatarShapeChange', handleAvatarShapeChange as EventListener);
    };
  }, []);

  // Keyboard shortcuts for email actions
  useEffect(() => {
    if (!email) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input, textarea, or contentEditable
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      // Don't trigger if any modifier keys are pressed
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'r':
          event.preventDefault();
          if (onReply) {
            onReply(email);
          }
          break;
        case 'escape':
          event.preventDefault();
          if (onClose) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [email, onReply, onClose]);

  const handlePrintEmail = () => {
    if (!email) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email - ${email.subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
              background: white;
            }
            .email-header {
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .email-subject {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 20px;
              color: #1f2937;
            }
            .email-meta {
              display: grid;
              gap: 8px;
              font-size: 14px;
              color: #6b7280;
            }
            .email-meta-row {
              display: flex;
              gap: 8px;
            }
            .email-meta-label {
              font-weight: 600;
              min-width: 60px;
            }
            .email-body {
              font-size: 16px;
              line-height: 1.7;
              color: #374151;
              white-space: pre-wrap;
            }
            .email-body p {
              margin-bottom: 16px;
            }
            .email-body p:last-child {
              margin-bottom: 0;
            }
            .attachments {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .attachments-title {
              font-weight: 600;
              margin-bottom: 16px;
              color: #1f2937;
            }
            .attachment-item {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 8px;
              font-size: 14px;
            }
            @media print {
              body {
                padding: 20px;
              }
              .email-header {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-header">
            <h1 class="email-subject">${email.subject}</h1>
            <div class="email-meta">
              <div class="email-meta-row">
                <span class="email-meta-label">De:</span>
                <span>${email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress}</span>
              </div>
              <div class="email-meta-row">
                <span class="email-meta-label">Para:</span>
                <span>${email.toAddress}</span>
              </div>
              ${email.ccAddress ? `
                <div class="email-meta-row">
                  <span class="email-meta-label">CC:</span>
                  <span>${email.ccAddress}</span>
                </div>
              ` : ''}
              ${email.bccAddress ? `
                <div class="email-meta-row">
                  <span class="email-meta-label">BCC:</span>
                  <span>${email.bccAddress}</span>
                </div>
              ` : ''}
              <div class="email-meta-row">
                <span class="email-meta-label">Data:</span>
                <span>${email.receivedAt ? new Date(email.receivedAt).toLocaleString('pt-BR') : 'Data desconhecida'}</span>
              </div>
            </div>
          </div>
          
          <div class="email-body">
            ${email.body.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}
          </div>
          
          ${getAttachments(email).length > 0 ? `
            <div class="attachments">
              <h3 class="attachments-title">Anexos (${getAttachments(email).length})</h3>
              ${getAttachments(email).map((attachment: any) => `
                <div class="attachment-item">
                  <strong>${attachment.filename || 'Arquivo desconhecido'}</strong>
                  ${attachment.size ? ` - ${attachment.size}` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Aguardar o carregamento e imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const getEmptyStateMessage = () => {
    const userName = currentUser?.username || t('user');
    const count = emailCounts[currentFolder] || 0;
    const unreadCount = count; // Assuming all emails in folder for simplicity

    switch (currentFolder) {
      case 'inbox':
        if (unreadCount === 0) {
          return {
            title: t('inbox').toUpperCase(),
            message: t('inboxEmptyState', { count, messages: count === 1 ? t('message') : t('messages') })
          };
        } else if (unreadCount === 1) {
          return {
            title: t('inbox').toUpperCase(), 
            message: t('inboxUnreadSingle', { userName, unreadCount })
          };
        } else {
          return {
            title: t('inbox').toUpperCase(),
            message: t('inboxUnreadMultiple', { userName, unreadCount })
          };
        }
      case 'junk':
      case 'spam':
        return {
          title: t('junk').toUpperCase(),
          message: t('spamWarning')
        };
      case 'sent':
        return {
          title: t('sent').toUpperCase(),
          message: t('folderEmptyState', { count, messages: count === 1 ? t('message') : t('messages') })
        };
      case 'trash':
        return {
          title: t('trash').toUpperCase(), 
          message: t('folderEmptyState', { count, messages: count === 1 ? t('message') : t('messages') })
        };
      case 'starred':
        return {
          title: t('starred').toUpperCase(),
          message: t('folderEmptyState', { count, messages: count === 1 ? t('message') : t('messages') })
        };
      default:
        return {
          title: currentFolder.toUpperCase(),
          message: t('folderEmptyState', { count, messages: count === 1 ? t('message') : t('messages') })
        };
    }
  };

  // Check folder types for proper action restrictions
  const isInSentFolder = currentFolder === 'sent' || 
    folders.some(f => f.id === email?.folderId && f.systemType === 'sent');
  
  const isInDraftsFolder = currentFolder === 'drafts' || 
    folders.some(f => f.id === email?.folderId && f.systemType === 'drafts') || 
    email?.isDraft;
  
  const isInSpamFolder = currentFolder === 'junk' || currentFolder === 'spam' ||
    folders.some(f => f.id === email?.folderId && (f.systemType === "junk" || f.systemType === "spam"));
    
  const isInArchiveFolder = currentFolder === 'archive' ||
    folders.some(f => f.id === email?.folderId && f.systemType === "archive");

  if (!email) {
    const emptyState = getEmptyStateMessage();
    
    return (
      <div className="flex-1 flex flex-col hidden lg:flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="mb-6">
              <svg
                className="w-12 h-12 text-muted-foreground mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-3 tracking-wider">
              [{emptyState.title}]
            </h3>
            <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-line">
              {emptyState.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getAvatarContent = (email: Email) => {
    const name = email.fromName || email.fromAddress;
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (email: Email) => {
    const colors = [
      "from-green-400 to-green-500",
      "from-blue-400 to-blue-500",
      "from-purple-400 to-purple-500",
      "from-red-400 to-red-500",
      "from-indigo-400 to-indigo-500",
    ];
    const hash = email.fromAddress.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getAttachments = (email: Email) => {
    try {
      return email.attachments ? JSON.parse(email.attachments as string) : [];
    } catch {
      return [];
    }
  };

  const formatEmailBody = (body: string) => {
    return body.split('\n').map((line, index) => (
      <p key={index} className="mb-2 last:mb-0">
        {line || '\u00A0'}
      </p>
    ));
  };

  const attachments = getAttachments(email);

  return (
    <div className={`flex-1 flex flex-col ${email ? 'flex' : 'hidden lg:flex'} bg-background min-h-0 h-full ${isFullScreen ? 'overflow-y-auto scroll-custom' : ''}`}>
      {/* Mobile Header with Back Button */}
      {isMobile && (
        <div className="flex items-center p-4 border-b border-border bg-card/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onClose?.()}
            className="mr-3 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-medium">{t('backToInbox')}</span>
        </div>
      )}

      {/* Email Header */}
      <div className={`${isMobile ? 'p-4' : 'p-6'} border-b border-border bg-card/30`}>
        {/* Desktop back button */}
        {!isMobile && (
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClose?.()}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{t('backToInbox')}</span>
          </div>
        )}

        {/* Email Subject */}
        <div className="mb-4">
          <h1 className={`font-semibold text-foreground ${isMobile ? 'text-lg leading-tight' : 'text-xl'} mb-2`}>
            {email.subject}
          </h1>
        </div>

        {/* Sender Info */}
        <div className="flex items-start space-x-3 mb-4">
          <Avatar className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} flex-shrink-0 ${avatarShape === 'square' ? 'rounded-lg' : ''}`}>
            <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(email)} text-primary-foreground font-semibold ${avatarShape === 'square' ? 'rounded-lg' : ''}`}>
              {getAvatarContent(email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className={`${isMobile ? 'text-sm' : 'text-base'} space-y-1`}>
              <div>
                <span className="font-medium text-foreground">
                  {email.fromName || email.fromAddress.split('@')[0]}
                </span>
                {email.fromName && (
                  <span className="text-muted-foreground ml-2">
                    &lt;{email.fromAddress}&gt;
                  </span>
                )}
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">{t('to')}</span> {email.toAddress}
              </div>
              <div className="text-muted-foreground text-xs">
                {email.receivedAt ? formatEmailDate(email.receivedAt, currentLanguage as 'en' | 'pt') : "Unknown"}
                {email.receivedAt && (
                  <span className="ml-2">
                    {formatRelativeTimeLocalized(email.receivedAt, currentLanguage as 'en' | 'pt')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
            {/* For drafts, only show Edit and Delete buttons */}
            {email.isDraft ? (
              <>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(email)}
                    className="text-foreground/60 hover:text-primary"
                    title={t('edit')}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(email)}
                  className="text-foreground/60 hover:text-red-400"
                  title={t('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : isInSentFolder ? (
              /* For SENT emails, only show Delete button */
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(email)}
                  className="text-foreground/60 hover:text-red-400"
                  title={t('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              /* Primary action buttons for other folders */
              <>
                {/* Mark as read/unread */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkRead?.(email.id, !email.isRead)}
                  className="text-foreground/60 hover:text-foreground"
                  title={email.isRead ? t('markAsUnread') : t('markAsRead')}
                >
                  {email.isRead ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                </Button>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(email)}
                  className="text-foreground/60 hover:text-red-400"
                  title={t('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>



                {/* Manage tags - hide for SENT emails */}
                {onManageTags && !isInSentFolder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onManageTags(email)}
                    className="text-foreground/60 hover:text-foreground"
                    title={t('manageTags')}
                  >
                    <Tag className="h-4 w-4" />
                  </Button>
                )}

                {/* More actions dropdown - hide for SENT and DRAFTS emails */}
                {!isInSentFolder && !isInDraftsFolder && (
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-foreground/60 hover:text-foreground cursor-pointer"
                      title={t('moreActions')}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {/* Only show Reply for non-draft, non-sent emails */}
                    <DropdownMenuItem onClick={() => onReply(email)} className="cursor-pointer">
                      <Reply className="mr-2 h-4 w-4" />
                      {t('reply')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onToggleStar(email.id)} className="cursor-pointer">
                      <Star className="mr-2 h-4 w-4" fill={email.isStarred ? "currentColor" : "none"} />
                      {email.isStarred ? t('removeStar') : t('addStar')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handlePrintEmail} className="cursor-pointer">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBlockSender?.(email)} className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      {t('blockSender')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className={`flex-1 ${isMobile ? 'p-4' : 'p-6'} ${isFullScreen ? '' : 'overflow-y-auto scroll-custom'}`}>
        <div className="max-w-none">
          <div className="text-foreground leading-relaxed">
            {email.body.includes('<') && email.body.includes('>') ? (
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: email.body }}
              />
            ) : (
              <div className="whitespace-pre-wrap">
                {formatEmailBody(email.body)}
              </div>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-3">
                Attachments ({attachments.length})
              </h4>
              <div className="space-y-2">
                {attachments.map((attachment: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                        <Download className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {attachment.filename || 'Unknown File'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.size || 'Unknown Size'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-foreground/60 hover:text-foreground"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}