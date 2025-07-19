import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Star,
  Trash2,
  Archive,
  Folder,
  Flag,
  Mail,
  MailOpen,
  FolderPlus,
} from "lucide-react";
import type { Email, Folder as FolderType } from "@shared/schema";

interface EmailContextMenuProps {
  children: React.ReactNode;
  email: Email;
  folders: FolderType[];
  onDelete: (email: Email) => void;
  onArchive: (email: Email) => void;
  onToggleStar: (emailId: number) => void;
  onMarkRead: (emailId: number, isRead: boolean) => void;
  onMoveToFolder: (emailId: number, folderId: number) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onSendToJunk: (email: Email) => void;
}

export default function EmailContextMenu({
  children,
  email,
  folders,
  onDelete,
  onArchive,
  onToggleStar,
  onMarkRead,
  onMoveToFolder,
  onCreateFolder,
  onSendToJunk,
}: EmailContextMenuProps) {
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setShowCreateFolder(false);
    }
  };

  const systemFolders = folders.filter(f => f.type === "system" && f.systemType !== "sent" && f.systemType !== "drafts");
  const customFolders = folders.filter(f => f.type === "custom");

  // Check if email is in drafts or spam/junk to hide star option
  const isInDraftsOrSpam = email.isDraft || 
    folders.some(f => f.id === email.folderId && (f.systemType === "junk" || f.systemType === "spam"));

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem
            onClick={() => onMarkRead(email.id, !email.isRead)}
            className="flex items-center space-x-3"
          >
            {email.isRead ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
            <span>Mark as {email.isRead ? "unread" : "read"}</span>
          </ContextMenuItem>

          {/* Only show star option for non-draft and non-spam emails */}
          {!isInDraftsOrSpam && (
            <ContextMenuItem
              onClick={() => onToggleStar(email.id)}
              className="flex items-center space-x-3"
            >
              <Star className={`h-4 w-4 ${email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'fill-none'}`} />
              <span>{email.isStarred ? "Remove star" : "Add star"}</span>
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          <ContextMenuItem disabled className="text-xs font-medium text-muted-foreground opacity-70">
            Move to folder
          </ContextMenuItem>
          {systemFolders.map((folder) => (
            <ContextMenuItem
              key={folder.id}
              onClick={() => onMoveToFolder(email.id, folder.id)}
              className="flex items-center justify-between group hover:bg-accent/50"
            >
              <div className="flex items-center min-w-0 flex-1 space-x-3">
                <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
                <span className="truncate text-sm">{folder.name}</span>
              </div>
              {folder.name.length > 15 && (
                <div className="text-xs text-muted-foreground ml-2 opacity-60 group-hover:opacity-100">
                  System
                </div>
              )}
            </ContextMenuItem>
          ))}
          
          {customFolders.length > 0 && (
            <>
              <ContextMenuSeparator />
              {customFolders.map((folder) => (
                <ContextMenuItem
                  key={folder.id}
                  onClick={() => onMoveToFolder(email.id, folder.id)}
                  className="flex items-center justify-between group hover:bg-accent/50"
                >
                  <div className="flex items-center min-w-0 flex-1 space-x-3">
                    <Folder className="h-4 w-4 flex-shrink-0 text-blue-500 group-hover:text-blue-600" />
                    <span className="truncate text-sm">{folder.name}</span>
                  </div>
                  <div className="text-xs text-blue-500/70 ml-2 opacity-60 group-hover:opacity-100">
                    Custom
                  </div>
                </ContextMenuItem>
              ))}
            </>
          )}
          
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center space-x-3 text-blue-600 hover:text-blue-700"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Create new folder</span>
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => onArchive(email)}
            className="flex items-center space-x-3"
          >
            <Archive className="h-4 w-4" />
            <span>Archive</span>
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => onSendToJunk(email)}
            className="flex items-center space-x-3"
          >
            <Flag className="h-4 w-4" />
            <span>Send to junk</span>
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={() => onDelete(email)}
            className="flex items-center space-x-3 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new custom folder to organize your emails.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="mt-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder();
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => setShowCreateFolder(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}