import { 
  Mail, 
  Star, 
  Send, 
  FileText, 
  AlertTriangle, 
  Trash2,
  Archive
} from "lucide-react";

// Define system folders with numeric IDs: 1=inbox, 2=archive, 3=sent, 4=drafts, 5=junk, 6=trash
export const SYSTEM_FOLDERS = [
  {
    id: 1,
    type: 'inbox',
    name: 'Inbox',
    namePortuguese: 'Caixa de Entrada',
    icon: 'mail',
    color: 'text-purple-500',
    order: 1,
    systemType: 'inbox'
  },
  {
    id: 2,
    type: 'Archive', 
    name: 'Archive',
    namePortuguese: 'Arquivo',
    icon: 'archive',
    color: 'text-yellow-500',
    order: 2,
    systemType: 'archive'
  },
  {
    id: 3,
    type: 'Sent',
    name: 'Sent',
    namePortuguese: 'Enviados',
    icon: 'send',
    color: 'text-green-500',
    order: 3,
    systemType: 'sent'
  },
  {
    id: 4,
    type: 'Drafts',
    name: 'Drafts',
    namePortuguese: 'Rascunhos',
    icon: 'file-text',
    color: 'text-purple-500',
    order: 4,
    systemType: 'drafts'
  },
  {
    id: 5,
    type: 'Junk',
    name: 'Junk',
    namePortuguese: 'Spam',
    icon: 'alert-triangle',
    color: 'text-orange-500',
    order: 5,
    systemType: 'junk'
  },
  {
    id: 6,
    type: 'Trash',
    name: 'Trash',
    namePortuguese: 'Lixeira',
    icon: 'trash2',
    color: 'text-red-500',
    order: 6,
    systemType: 'trash'
  }
];

export function getSystemFolder(type: string) {
  return SYSTEM_FOLDERS.find(folder => folder.type === type);
}

export function getSystemFolderById(id: number) {
  return SYSTEM_FOLDERS.find(folder => folder.id === id);
}

export function getSystemFolderName(type: string, language: string = 'pt') {
  const folder = getSystemFolder(type);
  if (!folder) return type;
  return language === 'pt' ? folder.namePortuguese : folder.name;
}

// Helper to get drafts folder ID (for backend)
export function getDraftsFolderId(): number {
  return 4; // drafts folder ID
}