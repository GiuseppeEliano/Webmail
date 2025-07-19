export interface Language {
  id: string;
  name: string;
  flag: string;
}

export const languages: Language[] = [
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'pt', name: 'Português', flag: '🇧🇷' }
];

export const translations = {
  en: {
    // Navigation
    inbox: 'Inbox',
    starred: 'Starred', 
    sent: 'Sent',
    drafts: 'Drafts',
    junk: 'Junk',
    trash: 'Trash',
    compose: 'Compose',
    
    // Actions
    reply: 'Reply',
    forward: 'Forward',
    delete: 'Delete',
    archive: 'Archive',
    markAsRead: 'Mark as read',
    markAsUnread: 'Mark as unread',
    star: 'Star',
    unstar: 'Unstar',
    send: 'Send',
    saveDraft: 'Save Draft',
    addStar: 'Add star',
    removeStar: 'Remove star',
    backToInbox: 'Back to inbox',
    
    // Compose
    newMessage: 'New Message',
    to: 'To',
    cc: 'CC',
    bcc: 'BCC',
    subject: 'Subject',
    message: 'Message',
    attach: 'Attach',
    minimize: 'Minimize compose window',
    maximize: 'Expand to full screen',
    restore: 'Restore window size',
    close: 'Close compose window',
    
    // Settings
    settings: 'Settings',
    account: 'Account',
    security: 'Security',
    notifications: 'Notifications',
    appearance: 'Appearance',
    language: 'Language',
    selectLanguage: 'Select Language',
    
    // Email List
    noEmailSelected: 'No email selected',
    selectEmailToView: 'Select an email from the list to view its contents.',
    attachments: 'Attachments',
    moreActions: 'More actions',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    search: 'Search emails...',
    
    // Email Actions
    replyToEmail: 'Reply to this email',
    forwardEmail: 'Forward this email',
    deleteEmail: 'Delete this email',
    
    // Tooltips
    toggleSidebar: 'Toggle sidebar',
    theme: 'Theme',
    fullName: 'Full Name',
    email: 'Email',
    phone: 'Phone',
    timezone: 'Timezone',
    signature: 'Signature',
    
    // Email content
    from: 'From',
    date: 'Date',
    attachments: 'Attachments',
    
    // Search and filters
    searchEmails: 'Search emails',
    noEmailsFound: 'No emails found matching your search.',
    noEmailsInFolder: 'No emails in this folder.',
    
    // Toast messages
    emailSent: 'Email sent successfully',
    draftSaved: 'Draft saved successfully',
    emailDeleted: 'Email deleted',
    emailArchived: 'Email archived',
    
    // Full screen mode
    fullScreenMode: 'Full Screen Mode',
    exitFullScreen: 'Exit Full Screen',
    
    // Context menu
    moveToFolder: 'Move to Folder',
    createFolder: 'Create Folder',
    sendToJunk: 'Send to Junk',
    folderName: 'Folder Name',
    createNewFolder: 'Create New Folder',
  },
  pt: {
    // Navigation
    inbox: 'Caixa de Entrada',
    starred: 'Favoritos',
    sent: 'Enviados',
    drafts: 'Rascunhos',
    junk: 'Spam',
    trash: 'Lixeira',
    compose: 'Escrever',
    
    // Actions
    reply: 'Responder',
    forward: 'Encaminhar',
    delete: 'Excluir',
    archive: 'Arquivar',
    markAsRead: 'Marcar como lida',
    markAsUnread: 'Marcar como não lida',
    star: 'Favoritar',
    unstar: 'Remover dos favoritos',
    send: 'Enviar',
    saveDraft: 'Salvar Rascunho',
    
    // Compose
    newMessage: 'Nova Mensagem',
    to: 'Para',
    cc: 'CC',
    bcc: 'CCO',
    subject: 'Assunto',
    message: 'Mensagem',
    attach: 'Anexar',
    
    // Settings
    settings: 'Configurações',
    account: 'Conta',
    security: 'Segurança',
    notifications: 'Notificações',
    appearance: 'Aparência',
    language: 'Idioma',
    theme: 'Tema',
    fullName: 'Nome Completo',
    email: 'Email',
    phone: 'Telefone',
    timezone: 'Fuso Horário',
    signature: 'Assinatura',
    
    // Email content
    from: 'De',
    date: 'Data',
    attachments: 'Anexos',
    addStar: 'Adicionar aos favoritos',
    removeStar: 'Remover dos favoritos',
    backToInbox: 'Voltar para caixa de entrada',
    
    // More actions
    minimize: 'Minimizar janela de composição',
    maximize: 'Expandir para tela cheia',
    restore: 'Restaurar tamanho da janela',
    close: 'Fechar janela de composição',
    selectLanguage: 'Selecionar Idioma',
    
    // Email List
    noEmailSelected: 'Nenhum email selecionado',
    selectEmailToView: 'Selecione um email da lista para visualizar seu conteúdo.',
    moreActions: 'Mais ações',
    
    // Common
    save: 'Salvar',
    cancel: 'Cancelar',
    loading: 'Carregando...',
    search: 'Pesquisar emails...',
    
    // Email Actions
    replyToEmail: 'Responder a este email',
    forwardEmail: 'Encaminhar este email',
    deleteEmail: 'Excluir este email',
    
    // Tooltips
    toggleSidebar: 'Alternar barra lateral',
    
    // Search and filters
    searchEmails: 'Pesquisar emails',
    noEmailsFound: 'Nenhum email encontrado para sua pesquisa.',
    noEmailsInFolder: 'Nenhum email nesta pasta.',
    
    // Toast messages
    emailSent: 'Email enviado com sucesso',
    draftSaved: 'Rascunho salvo com sucesso',
    emailDeleted: 'Email excluído',
    emailArchived: 'Email arquivado',
    
    // Full screen mode
    fullScreenMode: 'Modo Tela Cheia',
    exitFullScreen: 'Sair da Tela Cheia',
    
    // Context menu
    moveToFolder: 'Mover para Pasta',
    createFolder: 'Criar Pasta',
    sendToJunk: 'Enviar para Spam',
    folderName: 'Nome da Pasta',
    createNewFolder: 'Criar Nova Pasta',
  }
};

export function getCurrentLanguage(): string {
  return localStorage.getItem('eliano-language') || 'en';
}

export function setCurrentLanguage(languageId: string) {
  localStorage.setItem('eliano-language', languageId);
}

export function t(key: string, language?: string): string {
  const currentLang = language || getCurrentLanguage();
  const langTranslations = translations[currentLang as keyof typeof translations];
  return langTranslations?.[key as keyof typeof langTranslations] || key;
}