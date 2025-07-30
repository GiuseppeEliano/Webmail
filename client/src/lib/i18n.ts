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
    attach: 'Attach',
    attachment: 'attachment',
    attachments: 'attachments',
    dropFilesToAttach: 'Drop files to attach',
    removeAttachment: 'Remove attachment',
    
    // Actions
    reply: 'Reply',
    forward: 'Forward',
    edit: 'Edit',
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
    sending: 'Sending',
    
    // Compose
    newMessage: 'New Message',
    to: 'To:',
    cc: 'CC',
    bcc: 'BCC',
    subject: 'Subject',
    message: 'Message',
    minimize: 'Minimize compose window',
    maximize: 'Expand to full screen',
    restore: 'Restore window size',
    close: 'Close',
    
    // Settings
    settings: 'Settings',
    account: 'Account',
    security: 'Security',
    notifications: 'Notifications',
    appearance: 'Appearance',
    language: 'Language',
    selectLanguage: 'Select Language',
    theme: 'Theme',
    fullName: 'Full Name',
    email: 'Email',
    phone: 'Phone',
    timezone: 'Timezone',
    signature: 'Signature',
    openSettings: 'Open settings',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    
    // Email content
    from: 'From',
    date: 'Date',
    
    // Email List
    noEmailSelected: 'No email selected',
    selectEmail: 'Select an email',
    selectEmailToView: 'Select an email from the list to view its contents.',
    moreActions: 'More actions',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    saving: 'Saving...',
    loading: 'Loading...',
    search: 'Search emails...',
    enterSignature: 'Enter your email signature',
    
    // Email Actions
    replyToEmail: 'Reply to this email',
    forwardEmail: 'Forward this email',
    deleteEmail: 'Delete this email',
    
    // Tooltips
    toggleSidebar: 'Toggle sidebar',
    goTo: 'Go to',
    emails: 'emails',
    showing: 'Showing',
    of: 'of',
    
    // Search and filters
    searchEmails: 'Search emails',
    
    // Sort and filter
    sortBy: 'Sort by',
    sortByDate: 'Sort by Date',
    sortBySender: 'Sort by Sender',
    sortBySubject: 'Sort by Subject',
    filter: 'Filter',
    allEmails: 'All emails',
    unreadOnly: 'Unread only',
    starredOnly: 'Starred only',
    withAttachments: 'With attachments',
    dateSort: 'date',
    senderSort: 'sender',
    subjectSort: 'subject',
    allFilter: 'all',
    unreadFilter: 'unread',
    starredFilter: 'starred',
    attachmentsFilter: 'attachments',
    
    // Toast messages
    emailSent: 'Email sent successfully',
    draftSaved: 'Draft saved successfully',
    emailDeleted: 'Email deleted',
    
    // Delete confirmation modal
    deletePermanently: 'Delete Permanently',
    deleting: 'Deleting...',
    deleteEmailsPermanently: 'Delete emails permanently?',
    deleteEmailPermanently: 'Delete email permanently?',
    deleteEmails: 'Delete emails?',
    permanentDeleteWarning: 'This email will be permanently deleted and cannot be recovered. This action cannot be undone.',
    
    // File upload
    fileSizeExceeded: 'File size exceeded',
    fileSizeExceededMessage: 'File {name} exceeds 5MB limit',
    fileSizeError: 'File Error',
    fileTooBig: 'File too big',
    fileSizeExceedsLimit: 'The file "{name}" exceeds the 5MB limit.',
    ok: 'OK',
    manageAttachments: 'Manage your attachments here.',
    attachmentsTitle: 'Attachments',
    fileUploaded: 'File uploaded',
    uploadedSuccessfully: 'uploaded successfully',
    uploadError: 'Upload error',
    unknownError: 'Unknown error',
    emailArchived: 'Email archived',
    
    // Full screen mode
    fullScreenMode: 'Full Screen Mode',
    exitFullScreen: 'Exit Full Screen',
    
    // Context menu
    moveToFolder: 'Move to Folder',
    createFolder: 'Create Folder',
    sendToJunk: 'Send to Junk',
    blockSender: 'Block Sender',
    folderName: 'Folder Name',
    createNewFolder: 'Create New Folder',
    
    // Folders section
    folders: 'FOLDERS',
    
    // Tags
    tags: 'TAGS',
    createTag: 'Create Tag',
    editTag: 'Edit Tag',
    deleteTag: 'Delete Tag',
    tagColor: 'Tag Color',
    tagName: 'Tag Name',
    editFolder: 'Edit Folder',
    
    // Folder Modal
    enterFolderName: 'Enter folder name',
    color: 'Color',
    icon: 'Icon',
    folderSettings: 'Folder Settings',
    customFolder: 'Custom folder',
    
    // Validation messages
    nameRequired: 'Name is required',
    nameMaxLength: 'Name must be 14 characters or less',
    colorRequired: 'Color is required',
    iconRequired: 'Icon is required',
    aliasTitleRequired: 'Alias title is required',
    aliasTitleMaxLength: 'Title must be 18 characters or less',
    aliasNameRequired: 'Alias name is required',
    aliasNameMaxLength: 'Name must be 14 characters or less',
    aliasNameFormat: 'Alias name must contain only lowercase letters (a-z)',
    invalidEmail: 'Invalid email',
    
    // Icon labels
    folderIcon: 'Folder',
    tagIcon: 'Tag',
    heartIcon: 'Heart',
    starIconLabel: 'Star',
    workIcon: 'Work',
    homeIcon: 'Home',
    peopleIcon: 'People',
    studyIcon: 'Study',
    photosIcon: 'Photos',
    musicIcon: 'Music',
    gamesIcon: 'Games',
    shoppingIcon: 'Shopping',
    travelIcon: 'Travel',
    
    // Folder actions
    deleteFolder: 'Delete Folder',
    updateFolder: 'Update Folder',
    confirmDeleteFolder: 'Delete Folder?',
    deleteFolderDescription: 'Are you sure you want to delete this folder? All emails in this folder will be moved back to your Inbox. This action cannot be undone.',
    
    // Email composition
    confirmSendWithoutSubject: 'Send without subject?',
    noSubjectWarning: 'This email does not have a subject. Are you sure you want to send it anyway?',
    sendAnyway: 'Send Anyway',
    noSubject: 'No Subject',
    discardEmail: 'Discard Email',
    confirmDiscardDescription: 'Are you sure you want to discard this email? This action cannot be undone and the email will not be saved as a draft.',
    confirmDiscard: 'Yes, Discard',
    
    // Search and filters
    noEmailsFound: 'No emails found',
    noEmailsMatch: 'No emails match',
    noEmailsWithTag: 'No emails with selected tag',
    noEmailsIn: 'No emails in',
    selectTagToFilterTitle: 'Select Tag to Filter',
    chooseTagToFilter: 'Choose a tag to filter emails',
    resetFilters: 'Reset Filters',
    
    // Settings extended
    themeDescription: 'Choose from our collection of beautiful themes to customize your webmail interface.',
    system: 'System',
    systemDescription: 'Follow system preference',
    light: 'Light',
    lightDescription: 'Clean and bright',
    dark: 'Dark',
    darkDescription: 'Easy on the eyes',
    accentColor: 'Accent Color',
    accentColorDescription: 'Choose your preferred accent color for buttons and highlights.',
    blue: 'Blue',
    purple: 'Purple',
    green: 'Green',
    orange: 'Orange',
    red: 'Red',
    pink: 'Pink',
    emailViewMode: 'Email View Mode',
    emailViewModeDescription: 'Choose how you want to view your emails and organize your interface.',
    leftSidebar: 'Left Sidebar View',
    leftSidebarDescription: 'Email list on left, content on right',
    rightSidebar: 'Right Sidebar View',
    rightSidebarDescription: 'Email content on left, list on right',
    fullscreen: 'Fullscreen View',
    fullscreenDescription: 'Maximized email view for focus',
    emailNotifications: 'Email Notifications',
    emailNotificationsDescription: 'Configure how you receive notifications about new emails and updates.',
    resetToDefault: 'Reset to Default',
    avatarShape: 'Avatar Shape',
    avatarShapeDescription: 'Choose the shape for user avatars and selection indicators.',
    rounded: 'Rounded',
    roundedDescription: 'Perfect circle shape',
    square: 'Square',
    squareDescription: 'Square with rounded corners',
    emailsPerPage: 'Emails per Page',
    emailsPerPageDescription: 'Choose how many emails to display per page in the email list.',
    showingEmails: 'Showing {{start}}-{{end}} of {{total}} emails',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    pageOf: 'Page {{current}} of {{total}}',
    pagination: 'Pagination',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    
    // Tag management
 
    noCommonTags: 'No common tags between selected emails.',
    onlyCommonTagsCanBeRemoved: 'Only tags present in all emails can be removed in bulk.',
    addTagsAppliedAsPossible: 'Add tags (applied as possible):',
    tagsWillBeAddedOnlyToEligible: 'Tags will be added only to emails that don\'t have them and have less than 2 tags.',
    
    // Aliases
    aliases: 'Aliases',
    newAlias: 'New Alias',
    createFirstAlias: 'Create your first alias',
    noAliasesCreated: 'No aliases created',
    aliasesDescription: 'Manage your temporary email addresses to protect your privacy.',
    createAliasDescription: 'Create aliases to protect your real email when signing up for websites or services.',
    manageAliases: 'Manage Aliases',
    aliasTitle: 'Alias Title',
    aliasName: 'Alias Name',
    forwardTo: 'Forward to',
    aliasTag: 'Alias Tag',
    selectTag: 'Select Tag',
    inactive: 'Inactive',
    forwardsTo: 'Forwards to',
    copied: 'Copied!',
    aliasCopied: 'Alias email copied to clipboard.',
    deleteAlias: 'Delete Alias',
    confirmDeleteAlias: 'Are you sure you want to delete the alias "{{title}}"? This action cannot be undone and emails sent to this alias will no longer be received.',
    alsoDeleteTag: 'Also delete the tag "{{name}}" (not used by other aliases)',
    aliasDeleted: 'Alias deleted',
    aliasAndTagDeleted: 'The alias and its tag were successfully removed.',
    aliasRemoved: 'The alias was successfully removed.',
    deleteError: 'Delete error',
    aliasDeleteError: 'Failed to delete alias.',
    statusChangeError: 'Failed to change alias status.',
    createAlias: 'Create Alias',
    updateAlias: 'Update Alias',
    editAlias: 'Edit Alias',
    aliasTitleExample: 'E.g.: Online Shopping',
    aliasNameExample: 'E.g.: shopping',
    tagNote: 'Tag/Note',
    noTag: 'No tag',
    createNewTag: 'Create new tag',
    useExistingTag: 'Use existing tag',
    emailSelectedSingular: '1 email selected',
    emailSelectedPlural: 'emails selected',
    manageTags: 'Manage Tags',
    addRemoveTagsDescription: 'Add or remove tags from this email.',
    managingTagsOf: 'Managing tags of',
    emailsSelected: 'selected emails',
    noTagsAvailable: 'No tags available. Create a tag first.',
    commonTagsCanBeRemoved: 'Common tags can be removed from all emails',
    newTagsWillBeAdded: 'New tags will be added only to emails that allow (max. 2 tags per email)',
    
    // Batch tag operations for English only - Portuguese already has these keys above
    
    // Tags
    filterByTag: 'Filter by tag',
    filterByTags: 'Filter by Tags',
    selectTagToFilter: 'Select a tag to filter emails',
    noTagsFound: 'No tags found',
    createYourFirstTag: 'Create your first tag to organize your emails',
    showAliases: 'Show aliases',
    hideAliases: 'Hide aliases',
    
    // Settings - Profile and Security
    profilePicture: 'Profile Picture',
    changePassword: 'Change Password',
    updatePasswordDescription: 'Update your account password',
    removePhoto: 'Remove Photo',
    session: 'Session',
    logout: 'Logout',
    logoutDescription: 'Sign out from your account.',
    passwordUpdated: 'Password updated',
    passwordUpdatedDescription: 'Your password has been successfully changed.',
    passwordError: 'Error',
    incorrectCurrentPassword: 'Failed to update password. Please check your current password.',
    uploadNew: 'Upload New',
    fileFormatDescription: 'JPG, PNG or GIF (max 5MB)',
    enterCurrentPassword: 'Enter your current password to set a new one.',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    currentPasswordRequired: 'Current password is required',
    passwordMinLength: 'Password must be at least 8 characters',
    passwordsDoNotMatch: "Passwords don't match",
    
    // Swipe Actions
    swipeActions: 'Swipe Actions',
    swipeActionsDescription: 'Configure what happens when you swipe emails left or right',
    swipeLeftAction: 'Swipe Left Action',
    swipeRightAction: 'Swipe Right Action',
    moveToTrash: 'Move to Trash',
    addToStarred: 'Add to Starred',
    moveToSpam: 'Move to Spam',
    
    // Quill editor tooltips
    quillBold: 'Bold',
    quillItalic: 'Italic',
    quillUnderline: 'Underline',
    
    // Empty state messages
    user: 'user',
    messages: 'messages',
    inboxEmptyState: 'You have {count} {messages} in your inbox',
    inboxUnreadSingle: 'Hello, {userName}!\nYou have {unreadCount} unread message',
    inboxUnreadMultiple: 'Hello, {userName}!\nYou have {unreadCount} unread messages',
    spamWarning: 'Careful! Don\'t trust emails from unknown senders',
    folderEmptyState: 'You have {count} {messages} in this folder',
    quillStrike: 'Strikethrough',
    quillLink: 'Link',
    quillList: 'List',
    quillOrderedList: 'Numbered List',
    quillAlign: 'Alignment',
    quillBlockquote: 'Quote',
    
    // Storage
    storage: {
      title: 'Storage',
      loading: 'Loading...',
      error: 'Loading error',
      fullMessage: 'Storage full. Delete emails with attachments to free up space.',
      warningMessage: 'Storage almost full.',
      storageFull: 'Storage full',
      cannotSendReceive: 'Cannot send or receive emails.',
      deleteEmailsToFree: 'Delete emails with attachments to free up space.'
    },

    // Blocked Senders
    blocked: 'Blocked',
    blockedSenders: 'Blocked Senders',
    blockedSendersTitle: 'Blocked List',
    blockedSendersDescription: 'Manage email addresses you have blocked. Emails from these senders are automatically moved to the SPAM folder.',
    blockedOn: 'Blocked on',
    senderUnblocked: 'Sender unblocked',
    senderUnblockedDescription: 'The sender has been removed from the blocked list',
    noBlockedSenders: 'No blocked senders',
    error: 'Error',
    cannotBlockOwnEmail: 'You cannot block your own email address.',
    senderBlocked: 'Sender blocked',
    senderBlockedDescription: 'The sender has been blocked and the email moved to spam.',
    cannotUnblockSender: 'Could not unblock the sender.',
    cannotBlockSender: 'Could not block the sender.',

    // Connection Status
    connectionLost: 'Connection lost',
    connectionLostDescription: 'We lost connection to the server. Trying to reconnect...',
    connectionRestored: 'Connection restored',
    connectionRestoredDescription: 'The connection to the server has been reestablished'
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
    attach: 'Anexar',
    attachment: 'anexo',
    attachments: 'anexos',
    dropFilesToAttach: 'Solte arquivos para anexar',
    removeAttachment: 'Remover anexo',
    
    // Actions
    reply: 'Responder',
    forward: 'Encaminhar',
    edit: 'Editar',
    delete: 'Excluir',
    archive: 'Arquivar',
    markAsRead: 'Marcar como lida',
    markAsUnread: 'Marcar como não lida',
    star: 'Favoritar',
    unstar: 'Remover dos favoritos',
    send: 'Enviar',
    saveDraft: 'Salvar Rascunho',
    addStar: 'Adicionar aos favoritos',
    removeStar: 'Remover dos favoritos',
    backToInbox: 'Voltar para caixa de entrada',
    sending: 'Enviando',
    
    // Compose
    newMessage: 'Nova Mensagem',
    to: 'Para:',
    cc: 'CC',
    bcc: 'CCO',
    subject: 'Assunto',
    message: 'Mensagem',
    minimize: 'Minimizar janela de composição',
    maximize: 'Expandir para tela cheia',
    restore: 'Restaurar tamanho da janela',
    close: 'Fechar',
    
    // Compose toolbar
    boldText: 'Negrito - **texto** (Ctrl+B)',
    italicText: 'Itálico - *texto* (Ctrl+I)', 
    underlineText: 'Sublinhado - _texto_ (Ctrl+U)',
    strikethroughText: 'Riscado - ~~texto~~ (Ctrl+Shift+S)',
    insertLink: 'Inserir Link (Ctrl+K)',
    alignLeft: 'Alinhar à Esquerda',
    alignCenter: 'Centralizar',
    alignRight: 'Alinhar à Direita',
    bulletList: 'Lista com Marcadores (Ctrl+Shift+L)',
    numberedList: 'Lista Numerada (Ctrl+Shift+O)',
    quote: 'Citação',
    codeBlock: 'Bloco de Código',
    fontSize: 'Tamanho da Fonte',
    textColor: 'Cor do Texto',
    moreTools: 'Mais Ferramentas',
    previewFormatting: 'Visualizar Formatação',
    
    // Compose window actions
    minimizeCompose: 'Minimizar janela de composição',
    expandWindow: 'Expandir janela',
    restoreWindow: 'Restaurar janela',
    closeCompose: 'Fechar',
    
    // Quill editor tooltips
    quillBold: 'Negrito',
    quillItalic: 'Itálico',
    quillUnderline: 'Sublinhado',
    quillStrike: 'Riscado',
    quillLink: 'Link',
    quillList: 'Lista',
    quillOrderedList: 'Lista Numerada',
    quillAlign: 'Alinhamento',
    quillBlockquote: 'Citação',
    
    // Settings
    settings: 'Configurações',
    account: 'Conta',
    security: 'Segurança',
    notifications: 'Notificações',
    appearance: 'Aparência',
    language: 'Idioma',
    selectLanguage: 'Selecionar Idioma',
    selectCustomFolder: 'Selecionar Pasta Personalizada',
    chooseAFolder: 'Escolha uma Pasta',
    theme: 'Tema',
    fullName: 'Nome Completo',
    email: 'Email',
    phone: 'Telefone',
    timezone: 'Fuso Horário',
    signature: 'Assinatura',
    openSettings: 'Abrir configurações',
    collapseSidebar: 'Colapsar sidebar',
    expandSidebar: 'Expandir sidebar',
    
    // Email content
    from: 'De',
    date: 'Data',
    
    // Email List
    noEmailSelected: 'Nenhum email selecionado',
    selectEmail: 'Selecione um email',
    selectEmailToView: 'Selecione um email da lista para visualizar seu conteúdo.',
    moreActions: 'Mais ações',
    
    // Common
    save: 'Salvar',
    cancel: 'Cancelar',
    saving: 'Salvando...',
    loading: 'Carregando...',
    search: 'Pesquisar emails...',
    enterSignature: 'Digite sua assinatura de email',
    
    // Email Actions
    replyToEmail: 'Responder a este email',
    forwardEmail: 'Encaminhar este email',
    deleteEmail: 'Excluir este email',
    
    // Tooltips
    toggleSidebar: 'Alternar barra lateral',
    goTo: 'Ir para',
    emails: 'emails',
    showing: 'Mostrando',
    of: 'de',
    
    // Search and filters
    searchEmails: 'Pesquisar emails',
    noEmailsFound: 'Nenhum email encontrado',
    noEmailsMatch: 'Nenhum email corresponde a',
    noEmailsWithTag: 'Nenhum email com a tag selecionada',
    noEmailsIn: 'Nenhum email em',
    noEmailsInFolder: 'Nenhuma mensagem nesta pasta.',
    noEmailsWithFilters: 'Nenhum email corresponde aos filtros atuais.',
    selectTagToFilterTitle: 'Selecionar Tag para Filtrar',
    chooseTagToFilter: 'Escolha uma tag para filtrar os emails',
    resetFilters: 'Resetar Filtros',
    
    // Sort and filter
    sortBy: 'Ordenar por',
    sortByDate: 'Ordenar por Data',
    sortBySender: 'Ordenar por Remetente',
    sortBySubject: 'Ordenar por Assunto',
    filter: 'Filtrar',
    allEmails: 'Todos os emails',
    unreadOnly: 'Apenas não lidos',
    starredOnly: 'Apenas favoritos',
    withAttachments: 'Com anexos',
    dateSort: 'data',
    senderSort: 'remetente',
    subjectSort: 'assunto',
    allFilter: 'todos',
    unreadFilter: 'não lidos',
    starredFilter: 'favoritos',
    attachmentsFilter: 'anexos',
    
    // Toast messages
    emailSent: 'Email enviado com sucesso',
    draftSaved: 'Rascunho salvo com sucesso',
    emailDeleted: 'Email excluído',
    
    // Delete confirmation modal
    deletePermanently: 'Excluir Permanentemente',
    deleting: 'Excluindo...',
    deleteEmailsPermanently: 'Excluir emails permanentemente?',
    deleteEmailPermanently: 'Excluir email permanentemente?',
    deleteEmails: 'Excluir emails?',
    permanentDeleteWarning: 'Este email será excluído permanentemente e não poderá ser recuperado. Esta ação não pode ser desfeita.',
    
    // File upload
    fileSizeExceeded: 'Tamanho de arquivo excedido',
    fileSizeExceededMessage: 'O arquivo {name} excede o limite de 5MB',
    fileSizeError: 'Erro no arquivo',
    fileTooBig: 'Arquivo muito grande',
    fileSizeExceedsLimit: 'O arquivo "{name}" ultrapassa o limite de 5MB.',
    ok: 'OK',
    manageAttachments: 'Gerencie seus anexos aqui.',
    attachmentsTitle: 'Anexos',
    fileUploaded: 'Arquivo enviado',
    uploadedSuccessfully: 'foi enviado com sucesso',
    uploadError: 'Erro no upload',
    unknownError: 'Erro desconhecido',
    emailArchived: 'Email arquivado',
    
    // Full screen mode
    fullScreenMode: 'Modo Tela Cheia',
    exitFullScreen: 'Sair da Tela Cheia',
    
    // Context menu
    moveToFolder: 'Mover para Pasta',
    createFolder: 'Criar Pasta',
    sendToJunk: 'Enviar para Spam',
    blockSender: 'Bloquear Remetente',
    folderName: 'Nome da Pasta',
    createNewFolder: 'Criar Nova Pasta',
    
    // Folders section
    folders: 'PASTAS',
    
    // Tags
    tags: 'TAGS',
    createTag: 'Criar Tag',
    editTag: 'Editar Tag',
    deleteTag: 'Excluir Tag',
    tagColor: 'Cor da Tag',
    tagName: 'Nome da Tag',
    editFolder: 'Editar Pasta',
    
    // Folder Modal
    enterFolderName: 'Digite o nome da pasta',
    color: 'Cor',
    icon: 'Ícone',
    folderSettings: 'Configurações da Pasta',
    customFolder: 'Pasta personalizada',
    
    // Validation messages
    nameRequired: 'Nome é obrigatório',
    nameMaxLength: 'Nome deve ter no máximo 14 caracteres',
    colorRequired: 'Cor é obrigatória',
    iconRequired: 'Ícone é obrigatório',
    tagNameRequired: 'Nome da tag é obrigatório',
    aliasTitleRequired: 'Título da alias é obrigatório',
    aliasTitleMaxLength: 'Título deve ter no máximo 18 caracteres',
    aliasNameRequired: 'Nome da alias é obrigatório',
    aliasNameMaxLength: 'Nome deve ter no máximo 14 caracteres',
    aliasNameFormat: 'Nome da alias deve conter apenas letras minúsculas (a-z)',
    invalidEmail: 'Email inválido',
    
    // Icon labels
    folderIcon: 'Pasta',
    tagIcon: 'Etiqueta',
    heartIcon: 'Coração',
    starIconLabel: 'Estrela',
    workIcon: 'Trabalho',
    homeIcon: 'Casa',
    peopleIcon: 'Pessoas',
    studyIcon: 'Estudos',
    photosIcon: 'Fotos',
    musicIcon: 'Música',
    gamesIcon: 'Jogos',
    shoppingIcon: 'Compras',
    travelIcon: 'Viagem',
    
    // Folder actions
    deleteFolder: 'Excluir Pasta',
    updateFolder: 'Atualizar Pasta',
    confirmDeleteFolder: 'Excluir Pasta?',
    deleteFolderDescription: 'Tem certeza que deseja excluir esta pasta? Todos os emails desta pasta serão movidos de volta para a Caixa de Entrada. Esta ação não pode ser desfeita.',
    
    // Email composition
    confirmSendWithoutSubject: 'Enviar sem assunto?',
    noSubjectWarning: 'Este email não possui assunto. Tem certeza que deseja enviá-lo mesmo assim?',
    sendAnyway: 'Enviar Mesmo Assim',
    noSubject: 'Sem Assunto',
    
    // Compose modal
    discardEmail: 'Descartar Email',
    confirmDiscardDescription: 'Tem certeza de que deseja descartar este email? Esta ação não pode ser desfeita e o email não será salvo como rascunho.',
    confirmDiscard: 'Sim, Descartar',
    
    // Settings extended
    themeDescription: 'Escolha um dos nossos temas para personalizar sua interface de webmail.',
    system: 'Sistema',
    systemDescription: 'Seguir preferência do sistema',
    light: 'Claro',
    lightDescription: 'Limpo e brilhante',
    dark: 'Escuro',
    darkDescription: 'Suave para os olhos',
    accentColor: 'Cor de Destaque',
    accentColorDescription: 'Escolha sua cor preferida para botões e destaques.',
    blue: 'Azul',
    purple: 'Roxo',
    green: 'Verde',
    orange: 'Laranja',
    red: 'Vermelho',
    pink: 'Rosa',
    emailViewMode: 'Modo de Visualização',
    emailViewModeDescription: 'Escolha como deseja visualizar seus emails e organizar a interface.',
    leftSidebar: 'Barra Lateral Esquerda',
    leftSidebarDescription: 'Lista de emails à esquerda, conteúdo à direita',
    rightSidebar: 'Barra Lateral Direita',
    rightSidebarDescription: 'Conteúdo do email à esquerda, lista à direita',
    fullscreen: 'Tela Cheia',
    fullscreenDescription: 'Visualização maximizada para foco',
    emailNotifications: 'Notificações de Email',
    emailNotificationsDescription: 'Configure como receber notificações sobre novos emails e atualizações.',
    resetToDefault: 'Redefinir Padrão',
    avatarShape: 'Formato do Avatar',
    avatarShapeDescription: 'Escolha o formato dos avatares de usuário e indicadores de seleção.',
    rounded: 'Redondo',
    roundedDescription: 'Formato de círculo perfeito',
    square: 'Quadrado',
    squareDescription: 'Quadrado com bordas arredondadas',
    emailsPerPage: 'Emails por Página',
    emailsPerPageDescription: 'Escolha quantos emails exibir por página na lista de emails.',
    showingEmails: 'Mostrando {{start}}-{{end}} de {{total}} emails',
    previousPage: 'Página anterior',
    nextPage: 'Próxima página',
    pageOf: 'Página {{current}} de {{total}}',
    pagination: 'Paginação',
    previous: 'Anterior',
    next: 'Próximo',
    page: 'Página',
    
    // Aliases
    aliases: 'Aliases',
    newAlias: 'Nova Alias',
    createFirstAlias: 'Criar sua primeira alias',
    noAliasesCreated: 'Nenhuma alias criada',
    aliasesDescription: 'Gerencie seus endereços de email temporários para proteger sua privacidade.',
    createAliasDescription: 'Crie aliases para proteger seu email real ao se cadastrar em sites ou serviços.',
    manageAliases: 'Gerenciar Aliases',
    aliasTitle: 'Título da Alias',
    aliasName: 'Nome da Alias',
    forwardTo: 'Encaminhar para',
    aliasTag: 'Tag da Alias',
    selectTag: 'Selecionar Tag',
    inactive: 'Inativa',
    forwardsTo: 'Encaminha para',
    copied: 'Copiado!',
    aliasCopied: 'Email da alias copiado para a área de transferência.',
    deleteAlias: 'Excluir Alias',
    confirmDeleteAlias: 'Tem certeza que deseja excluir a alias "{{title}}"? Esta ação não pode ser desfeita e emails enviados para esta alias não serão mais recebidos.',
    alsoDeleteTag: 'Também excluir a tag "{{name}}" (não é usada por outras aliases)',
    aliasDeleted: 'Alias excluída',
    aliasAndTagDeleted: 'A alias e sua tag foram removidas com sucesso.',
    aliasRemoved: 'A alias foi removida com sucesso.',
    deleteError: 'Erro ao excluir',
    aliasDeleteError: 'Falha ao excluir a alias.',
    statusChangeError: 'Falha ao alterar status da alias.',
    createAlias: 'Criar Alias',
    updateAlias: 'Atualizar Alias',
    editAlias: 'Editar Alias',
    aliasTitleExample: 'Ex.: Compras Online',
    aliasNameExample: 'Ex.: compras',
    tagNote: 'Tag/Nota',
    noTag: 'Nenhuma tag',
    createNewTag: 'Criar nova tag',
    useExistingTag: 'Usar tag existente',
    emailSelectedSingular: '1 email selecionado',
    emailSelectedPlural: 'emails selecionados',
    manageTags: 'Gerenciar Tags',
    addRemoveTagsDescription: 'Adicione ou remova tags deste email.',
    managingTagsOf: 'Gerenciando tags de',
    emailsSelected: 'emails selecionados',
    noTagsAvailable: 'Nenhuma tag disponível. Crie uma tag primeiro.',
    
    // Batch tag operations
    commonTagsCanBeRemoved: 'Tags em comum podem ser removidas de todos os emails',
    newTagsWillBeAdded: 'Novas tags serão adicionadas apenas aos emails que permitem (máx. 2 tags por email)',
    noCommonTags: 'Nenhuma tag em comum entre os emails selecionados.',
    onlyCommonTagsCanBeRemoved: 'Apenas tags presentes em todos os emails podem ser removidas em lote.',
    addTagsAppliedAsPossible: 'Adicionar tags (aplicado conforme possível):',
    tagsWillBeAddedOnlyToEligible: 'Tags serão adicionadas apenas aos emails que não as possuem e têm menos de 2 tags.',
    
    // Tags
    filterByTag: 'Filtrar por tag',
    filterByTags: 'Filtrar por Tags',
    selectTagToFilter: 'Selecione uma tag para filtrar emails',
    noTagsFound: 'Nenhuma tag encontrada',
    createYourFirstTag: 'Crie sua primeira tag para organizar seus emails',
    showAliases: 'Mostrar aliases',
    hideAliases: 'Ocultar aliases',
    
    // Settings - Profile and Security
    firstName: 'Nome',
    lastName: 'Sobrenome',
    profilePicture: 'Foto de Perfil',
    changePassword: 'Alterar Senha',
    updatePasswordDescription: 'Atualize a senha da sua conta',
    removePhoto: 'Remover Foto',
    session: 'Sessão',
    logout: 'Sair',
    logoutDescription: 'Sair da sua conta.',
    passwordUpdated: 'Senha atualizada',
    passwordUpdatedDescription: 'Sua senha foi alterada com sucesso.',
    passwordError: 'Erro',
    incorrectCurrentPassword: 'Falha ao atualizar senha. Verifique sua senha atual.',
    uploadNew: 'Enviar Nova',
    fileFormatDescription: 'JPG, PNG ou GIF (máx 5MB)',
    enterCurrentPassword: 'Digite sua senha atual para definir uma nova.',
    currentPassword: 'Senha Atual',
    newPassword: 'Nova Senha',
    confirmNewPassword: 'Confirmar Nova Senha',
    currentPasswordRequired: 'Senha atual é obrigatória',
    passwordMinLength: 'Senha deve ter no mínimo 8 caracteres',
    passwordsDoNotMatch: 'As senhas não coincidem',
    
    // Swipe Actions
    swipeActions: 'Ações de Deslizar',
    swipeActionsDescription: 'Configure o que acontece quando você desliza emails para esquerda ou direita',
    swipeLeftAction: 'Ação Deslizar Esquerda',
    swipeRightAction: 'Ação Deslizar Direita',
    moveToTrash: 'Mover para Lixeira',
    addToStarred: 'Adicionar aos Favoritos',
    moveToSpam: 'Mover para Spam',
    
    // Empty state messages
    user: 'usuário',
    messages: 'mensagens',
    inboxEmptyState: 'Você tem {count} {messages} na caixa de entrada',
    inboxUnreadSingle: 'Olá, {userName}!\nVocê tem {unreadCount} mensagem não lida',
    inboxUnreadMultiple: 'Olá, {userName}!\nVocê tem {unreadCount} mensagens não lidas',
    spamWarning: 'Cuidado! Não confie em e-mails desconhecidos',
    folderEmptyState: 'Você tem {count} {messages} nesta pasta',
    
    // Storage
    storage: {
      title: 'Armazenamento',
      loading: 'Carregando...',
      error: 'Erro ao carregar',
      fullMessage: 'Armazenamento cheio. Exclua emails com anexos para liberar espaço.',
      warningMessage: 'Armazenamento quase cheio.',
      storageFull: 'Armazenamento cheio',
      cannotSendReceive: 'Não é possível enviar ou receber emails.',
      deleteEmailsToFree: 'Exclua emails com anexos para liberar espaço.'
    },

    // Blocked Senders
    blocked: 'Bloqueados',
    blockedSenders: 'Remetentes Bloqueados',
    blockedSendersTitle: 'Lista de Bloqueados',
    blockedSendersDescription: 'Gerencie os endereços de email que você bloqueou. Emails destes remetentes são automaticamente movidos para a pasta SPAM.',
    blockedOn: 'Bloqueado em',
    senderUnblocked: 'Remetente desbloqueado',
    senderUnblockedDescription: 'O remetente foi removido da lista de bloqueados',
    noBlockedSenders: 'Nenhum remetente bloqueado',
    error: 'Erro',
    cannotBlockOwnEmail: 'Você não pode bloquear seu próprio endereço de e-mail.',
    senderBlocked: 'Remetente bloqueado',
    senderBlockedDescription: 'O remetente foi bloqueado e o email movido para spam.',
    cannotUnblockSender: 'Não foi possível desbloquear o remetente.',
    cannotBlockSender: 'Não foi possível bloquear o remetente.',

    // Connection Status
    connectionLost: 'Conexão perdida',
    connectionLostDescription: 'Perdemos a conexão com o servidor. Tentando reconectar...',
    connectionRestored: 'Conexão restaurada',
    connectionRestoredDescription: 'A conexão com o servidor foi reestabelecida'
  }
};

export function getCurrentLanguage(): string {
  return localStorage.getItem('language') || 'pt';
}

export function setCurrentLanguage(languageId: string) {
  localStorage.setItem('language', languageId);
  // Trigger a storage event to update components
  window.dispatchEvent(new CustomEvent('languageChange', { detail: languageId }));
}

export function t(key: string, languageOrParams?: string | Record<string, any>, params?: Record<string, any>): string {
  let currentLang: string;
  let interpolationParams: Record<string, any> = {};
  
  // Handle different parameter patterns
  if (typeof languageOrParams === 'string' && params) {
    currentLang = languageOrParams;
    interpolationParams = params;
  } else if (typeof languageOrParams === 'object') {
    currentLang = getCurrentLanguage();
    interpolationParams = languageOrParams;
  } else {
    currentLang = languageOrParams || getCurrentLanguage();
  }
  
  const translation = translations[currentLang as keyof typeof translations];
  
  let result: string;
  
  // Handle nested keys like "storage.title"
  if (key.includes('.')) {
    const keys = key.split('.');
    let value: any = translation;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (value) {
      result = value;
    } else {
      // Fallback to English
      value = translations.en;
      for (const k of keys) {
        value = value?.[k];
      }
      result = value || key;
    }
  } else {
    result = (translation as any)?.[key as keyof typeof translation] || (translations.en as any)[key as keyof typeof translations.en] || key;
  }
  
  // Handle parameter interpolation
  if (interpolationParams && typeof result === 'string') {
    Object.keys(interpolationParams).forEach(paramKey => {
      const paramValue = interpolationParams[paramKey];
      result = result.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
    });
  }
  
  return result;
}