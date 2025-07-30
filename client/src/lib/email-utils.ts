import type { Email, Folder } from "@shared/schema";

export function getEmailFolderName(email: Email, folders: Folder[]): string {
  const folder = folders.find((f) => f.id === email.folderId);
  return folder?.name || "Unknown";
}

export function formatEmailDate(date: Date): string {
  const now = new Date();
  const emailDate = new Date(date);
  const diffInHours = (now.getTime() - emailDate.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return emailDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else if (diffInHours < 168) {
    return emailDate.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    return emailDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

export function getEmailPreview(body: string, maxLength: number = 150): string {
  return body.length > maxLength ? body.substring(0, maxLength) + "..." : body;
}

export function parseEmailTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    return JSON.parse(tagsJson);
  } catch {
    return [];
  }
}

export function parseEmailAttachments(attachmentsJson: string | null): any[] {
  if (!attachmentsJson) return [];
  try {
    return JSON.parse(attachmentsJson);
  } catch {
    return [];
  }
}

export function generateEmailId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createReplySubject(originalSubject: string): string {
  return originalSubject.startsWith("Re: ") 
    ? originalSubject 
    : `Re: ${originalSubject}`;
}

export function createForwardSubject(originalSubject: string): string {
  return originalSubject.startsWith("Fwd: ") 
    ? originalSubject 
    : `Fwd: ${originalSubject}`;
}

export function createReplyBody(originalEmail: Email): string {
  const date = new Date(originalEmail.receivedAt).toLocaleString();
  //return `\n\n--- Original Message ---\nFrom: ${originalEmail.fromName || originalEmail.fromAddress}\nDate: ${date}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body}`;
  return originalEmail.body;
}

export function createForwardBody(originalEmail: Email): string {
  const date = new Date(originalEmail.receivedAt).toLocaleString();
  //return `\n\n--- Forwarded Message ---\nFrom: ${originalEmail.fromName || originalEmail.fromAddress}\nTo: ${originalEmail.toName || originalEmail.toAddress}\nDate: ${date}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body}`;
  return originalEmail.body;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateEmailList(emails: string): boolean {
  if (!emails.trim()) return true;
  const emailList = emails.split(',').map(e => e.trim());
  return emailList.every(validateEmail);
}

export function getUnreadCount(emails: Email[]): number {
  return emails.filter(email => !email.isRead).length;
}

export function getStarredCount(emails: Email[]): number {
  return emails.filter(email => email.isStarred).length;
}

export function filterEmailsByFolder(emails: Email[], folderId: number): Email[] {
  return emails.filter(email => email.folderId === folderId);
}

export function filterStarredEmails(emails: Email[]): Email[] {
  return emails.filter(email => email.isStarred);
}

export function searchEmails(emails: Email[], query: string): Email[] {
  if (!query.trim()) return emails;
  
  const searchQuery = query.toLowerCase();
  return emails.filter(email => 
    email.subject.toLowerCase().includes(searchQuery) ||
    email.body.toLowerCase().includes(searchQuery) ||
    email.fromName?.toLowerCase().includes(searchQuery) ||
    email.fromAddress.toLowerCase().includes(searchQuery) ||
    email.toName?.toLowerCase().includes(searchQuery) ||
    email.toAddress.toLowerCase().includes(searchQuery)
  );
}
