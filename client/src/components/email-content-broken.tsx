import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Email } from "@shared/schema";

interface EmailContentProps {
  email: Email | null;
  onReply: (email: Email) => void;
  onForward: (email: Email) => void;
  onToggleStar: (emailId: number) => void;
  onDelete: (email: Email) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onClose?: () => void;
}

export default function EmailContent({
  email,
  onReply,
  onForward,
  onToggleStar,
  onDelete,
  isFullScreen,
  onToggleFullScreen,
  onClose
}: EmailContentProps) {
  const [showFullHeaders, setShowFullHeaders] = useState(false);
  const isMobile = useIsMobile();

  if (!email) {
    return (
      <div className="flex-1 flex flex-col hidden lg:flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-muted-foreground"
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
            <h3 className="text-lg font-medium text-foreground mb-2">No email selected</h3>
            <p className="text-muted-foreground">
              Select an email from the list to view its contents.
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
      return email.attachments ? JSON.parse(email.attachments) : [];
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
    <div className={`flex-1 flex flex-col ${email ? 'flex' : 'hidden lg:flex'} bg-background`}>
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
          <span className="font-medium">Back to inbox</span>
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
            <span className="text-sm text-muted-foreground">Back to inbox</span>
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
          <Avatar className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} flex-shrink-0`}>
            <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(email)} text-primary-foreground font-semibold`}>
              {getAvatarContent(email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className={`${isMobile ? 'text-sm' : 'text-base'} space-y-1`}>
              <div>
                <span className="font-medium text-foreground">
                  {email.fromName || email.fromAddress.split('@')[0]}
                </span>
                <span className="text-muted-foreground ml-2">
                  {email.fromName ? `<${email.fromAddress}>` : ''}
                </span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">To:</span> {email.toAddress}
              </div>
              <div className="text-muted-foreground text-xs">
                {email.receivedAt ? new Date(email.receivedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : "Unknown"}
                {email.receivedAt && (
                  <span className="ml-2">
                    {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(email)}
              className="text-foreground/60 hover:text-foreground"
              title="Reply to this email"
            >
              <Reply className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onForward(email)}
              className="text-foreground/60 hover:text-foreground"
              title="Forward this email"
            >
              <Forward className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStar(email.id)}
              className={`${
                email.isStarred 
                  ? "text-yellow-400 hover:text-yellow-500" 
                  : "text-foreground/60 hover:text-yellow-400"
              }`}
              title={email.isStarred ? "Remove star" : "Add star"}
            >
              <Star className={`h-4 w-4 ${email.isStarred ? "fill-yellow-400" : "fill-none"}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(email)}
              className="text-foreground/60 hover:text-red-400"
              title="Delete this email"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 p-6 overflow-y-auto scroll-custom">
        <div className="max-w-none">
          <div className="text-foreground leading-relaxed">
            {formatEmailBody(email.body)}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Attachments ({attachments.length})
              </h3>
              <div className="space-y-3">
                {attachments.map((attachment: any, index: number) => (
                  <div
                    key={index}
                    className="bg-muted rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.size}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="ml-auto">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reply Section */}
      <div className="p-6 border-t border-border bg-card/30">
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => onReply(email)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            title="Reply to this email"
          >
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
          <Button
            variant="outline"
            onClick={() => onForward(email)}
            className="border-border text-foreground hover:bg-accent"
            title="Forward this email"
          >
            <Forward className="h-4 w-4 mr-2" />
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}
