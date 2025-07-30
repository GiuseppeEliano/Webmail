import { 
  users, 
  folders, 
  emails,
  tags,
  emailTags,
  aliases,
  blockedSenders,
  type User, 
  type Folder, 
  type Email,
  type Tag,
  type EmailTag,
  type Alias,
  type BlockedSender,
  type InsertUser, 
  type InsertFolder, 
  type InsertEmail,
  type InsertTag,
  type InsertEmailTag,
  type InsertAlias,
  type InsertBlockedSender,
  type UpdateUser,
  type UpdateEmail,
  type UpdateFolder,
  type UpdateTag,
  type UpdateAlias
} from "@shared/schema";
import bcrypt from "bcrypt";
import { encryptEmail, decryptEmail } from "./crypto";
import { fileStorageService } from "./file-storage";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: UpdateUser): Promise<User | undefined>;
  verifyPassword(userId: number, password: string): Promise<boolean>;
  updatePassword(userId: number, newPassword: string): Promise<boolean>;

  // Folder operations
  getFolders(userId: number): Promise<Folder[]>;
  getFolder(id: number): Promise<Folder | undefined>;
  getSystemFolder(userId: number, systemType: string): Promise<Folder | undefined>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  updateFolder(id: number, folder: UpdateFolder): Promise<Folder | undefined>;
  deleteFolder(id: number): Promise<boolean>;

  // Tag operations
  getTags(userId: number): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: number, tag: UpdateTag): Promise<Tag | undefined>;
  deleteTag(id: number): Promise<boolean>;

  // Email tag operations
  addEmailTag(emailId: number, tagId: number): Promise<boolean>;
  removeEmailTag(emailId: number, tagId: number): Promise<boolean>;
  getEmailTags(emailId: number): Promise<Tag[]>;
  getEmailsByTag(userId: number, tagId: number): Promise<Email[]>;
  
  // Active draft management
  createActiveDraft(userId: number, forceNew?: boolean): Promise<Email>;
  getActiveDraft(userId: number): Promise<Email | undefined>;
  clearActiveDraft(userId: number): Promise<void>;

  // Email operations
  getEmails(userId: number, folderId?: number, search?: string, limit?: number, offset?: number): Promise<Email[]>;
  getEmail(id: number): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: number, email: UpdateEmail): Promise<Email | undefined>;
  deleteEmail(id: number, permanent?: boolean): Promise<boolean>;
  moveEmail(id: number, folderId: number): Promise<Email | undefined>;
  toggleEmailStar(id: number): Promise<Email | undefined>;
  markEmailAsRead(id: number, isRead: boolean): Promise<Email | undefined>;
  getEmailsByFolder(userId: number, folderIdentifier: string): Promise<Email[]>;
  getEmailsByFolderPaginated(userId: number, folderIdentifier: string, limit: number, offset: number, filters?: { filterBy?: string, sortBy?: string, tagFilter?: number | null }): Promise<{ emails: Email[], totalCount: number }>;
  searchEmails(userId: number, query: string, folder?: string): Promise<Email[]>;
  getEmailCounts(userId: number): Promise<{ [key: string]: number }>;
  getEmailCount(userId: number, folderId?: number, search?: string): Promise<number>;
  getEmailCountByFolder(userId: number, folderIdentifier: string): Promise<number>;

  // Alias operations
  getAliases(userId: number): Promise<Alias[]>;
  getAlias(id: number): Promise<Alias | undefined>;
  createAlias(alias: InsertAlias): Promise<Alias>;
  updateAlias(id: number, alias: UpdateAlias): Promise<Alias | undefined>;
  deleteAlias(id: number): Promise<boolean>;
  toggleAliasStatus(id: number): Promise<Alias | undefined>;

  // Storage operations
  getUserStorageInfo(userId: number): Promise<{ used: number; quota: number }>;
  updateUserStorageUsed(userId: number, bytesUsed: number): Promise<boolean>;
  canUserReceiveEmails(userId: number): Promise<boolean>;
  processEmailAttachments(userId: number, attachmentFiles: any[]): Promise<string[]>;
  cleanupEmailAttachments(userId: number, attachmentPaths: string[]): Promise<void>;
  deleteAttachment(userId: number, filename: string): Promise<boolean>;

  // Blocked senders operations
  getBlockedSenders(userId: number): Promise<BlockedSender[]>;
  createBlockedSender(blockedSender: InsertBlockedSender): Promise<BlockedSender>;
  deleteBlockedSender(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private folders: Map<number, Folder>;
  private emails: Map<number, Email>;
  private tags: Map<number, Tag>;
  private emailTags: Map<number, EmailTag>;
  private aliases: Map<number, Alias>;
  private blockedSenders: Map<number, BlockedSender>;
  private activeDrafts: Map<number, number>; // userId -> draftId
  private currentUserId: number;
  private currentFolderId: number;
  private currentEmailId: number;
  private currentTagId: number;
  private currentEmailTagId: number;
  private currentAliasId: number;
  private currentBlockedSenderId: number;

  constructor() {
    this.users = new Map();
    this.folders = new Map();
    this.emails = new Map();
    this.tags = new Map();
    this.emailTags = new Map();
    this.aliases = new Map();
    this.blockedSenders = new Map();
    this.activeDrafts = new Map();
    this.currentUserId = 1;
    this.currentFolderId = 1;
    this.currentEmailId = 1;
    this.currentTagId = 1;
    this.currentEmailTagId = 1;
    this.currentAliasId = 1;
    this.currentBlockedSenderId = 1;
    
    this.initializeDefaultData();
    this.syncExistingTags();
    
    // Start auto-cleanup
    this.startAutoCleanup();
  }

  private initializeDefaultData() {
    // Create default user with bcrypt hashed password (1234) - generated with bcrypt.hash("1234", 10)
    const defaultUser: User = {
      id: 1,
      username: "john_doe",
      email: "john@example.com",
      password: "$2b$10$oYcWI8CStbBrLdP/mlrWlumpZumbz/X3iC.LDUtmIfyHE.NDD8Mha", // Hash for "1234"
      firstName: "John",
      lastName: "Doe",
      profilePicture: null,
      signature: "Best regards,\nJohn Doe\nSenior Developer",
      storageUsed: 0, // Will be calculated dynamically
      storageQuota: 104857600, // 100MB in bytes
      language: "pt",
      theme: "dark",
      avatarShape: "rounded",
      sidebarView: "expanded",
      emailsPerPage: 20,
      stayLoggedIn: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(1, defaultUser);
    this.currentUserId = 2;

    // Create system folders
    const systemFolders: Folder[] = [
      { id: 1, userId: 1, name: "Inbox", type: "system", systemType: "inbox", color: "#6366f1", icon: "inbox", createdAt: new Date() },
      { id: 2, userId: 1, name: "Archive", type: "system", systemType: "archive", color: "#f59e0b", icon: "archive", createdAt: new Date() },
      { id: 3, userId: 1, name: "Starred", type: "system", systemType: "starred", color: "#f59e0b", icon: "star", createdAt: new Date() },
      { id: 4, userId: 1, name: "Sent", type: "system", systemType: "sent", color: "#10b981", icon: "send", createdAt: new Date() },
      { id: 5, userId: 1, name: "Drafts", type: "system", systemType: "drafts", color: "#8b5cf6", icon: "file-text", createdAt: new Date() },
      { id: 6, userId: 1, name: "Junk", type: "system", systemType: "junk", color: "#f97316", icon: "alert-triangle", createdAt: new Date() },
      { id: 7, userId: 1, name: "Trash", type: "system", systemType: "trash", color: "#ef4444", icon: "trash2", createdAt: new Date() },
      { id: 8, userId: 1, name: "Work", type: "custom", systemType: null, color: "#3b82f6", icon: "briefcase", createdAt: new Date() },
      { id: 9, userId: 1, name: "Personal", type: "custom", systemType: null, color: "#ec4899", icon: "heart", createdAt: new Date() },
    ];

    systemFolders.forEach(folder => this.folders.set(folder.id, folder));
    this.currentFolderId = 10;

    // Start with empty tags - user will create their own
    this.currentTagId = 1;

    // Create sample emails
    const sampleEmails: Email[] = [
      {
        id: 1,
        userId: 1,
        folderId: 1,
        messageId: "msg-1",
        subject: "Project Update - Q4 Review",
        body: "Hi team,\n\nI wanted to share the latest updates on our Q4 project milestones. We've made significant progress on the user authentication system and are ahead of schedule on several key deliverables.\n\nKey Achievements:\n- Completed user authentication system with multi-factor authentication\n- Implemented real-time notification system\n- Optimized database queries resulting in 40% performance improvement\n- Finished UI/UX redesign for mobile responsiveness\n\nUpcoming Milestones:\n- API integration testing (Due: Dec 15)\n- Security audit and penetration testing (Due: Dec 20)\n- Performance optimization and load testing (Due: Dec 25)\n- Final deployment and monitoring setup (Due: Dec 30)\n\nPlease review the attached project timeline and let me know if you have any questions or concerns. We're on track to deliver everything by the end of the quarter.\n\nBest regards,\nSarah Anderson\nProject Manager",
        bodyHtml: null,
        fromAddress: "sarah@company.com",
        fromName: "Sarah Anderson",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: true,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Q4_Project_Timeline.pdf", size: "2.3 MB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        userId: 1,
        folderId: 1,
        messageId: "msg-2",
        subject: "Weekly Team Sync - Action Items",
        body: "Following up on our weekly sync meeting. Here are the action items and deadlines we discussed:\n\n1. Complete code review for user dashboard (Due: Tomorrow)\n2. Update API documentation (Due: Friday)\n3. Schedule client demo (Due: Next week)\n\nLet me know if you have any questions.\n\nBest,\nMichael",
        bodyHtml: null,
        fromAddress: "michael@company.com",
        fromName: "Michael Johnson",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        userId: 1,
        folderId: 1,
        messageId: "msg-3",
        subject: "Design System Documentation",
        body: "I've completed the design system documentation for our new component library. Please review and provide feedback by end of week.\n\nThe documentation includes:\n- Component guidelines\n- Color palette\n- Typography standards\n- Spacing and layout principles\n\nThanks,\nEmily",
        bodyHtml: null,
        fromAddress: "emily@company.com",
        fromName: "Emily Rodriguez",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Design_System_v2.pdf", size: "1.8 MB" }, { name: "Component_Library.sketch", size: "4.2 MB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 51,
        userId: 1,
        folderId: 6, // Trash folder
        messageId: "msg-51",
        subject: "Deleted Email - Newsletter Subscription",
        body: "Thank you for subscribing to our newsletter! You'll receive weekly updates about the latest features and improvements.",
        bodyHtml: null,
        fromAddress: "newsletter@service.com",
        fromName: "Newsletter Service",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 4,
        userId: 1,
        folderId: 6, // Trash folder
        messageId: "msg-4",
        subject: "Spam Email - Amazing Offer!",
        body: "Don't miss this incredible deal! Limited time offer just for you.",
        bodyHtml: null,
        fromAddress: "spam@promotions.com",
        fromName: "Marketing Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Additional test emails for inbox
      {
        id: 5,
        userId: 1,
        folderId: 1, // Inbox
        messageId: "msg-5",
        subject: "Reunião de planejamento estratégico",
        body: "Boa tarde,\n\nGostaria de agendar uma reunião para discutir nosso planejamento estratégico para o próximo trimestre. Preciso que todos os gerentes estejam presentes.\n\nData sugerida: Sexta-feira, 14h\nLocal: Sala de conferências principal\n\nPor favor, confirmem presença até amanhã.\n\nAtenciosamente,\nDiretora Executiva",
        bodyHtml: null,
        fromAddress: "ceo@empresa.com",
        fromName: "Ana Silva",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 6,
        userId: 1,
        folderId: 1,
        messageId: "msg-6",
        subject: "Invoice #2024-001234 - Payment Due",
        body: "Dear Customer,\n\nThis is a reminder that Invoice #2024-001234 for $2,450.00 is due in 5 days.\n\nPlease process payment at your earliest convenience to avoid any late fees.\n\nThank you for your business!\n\nAccounts Receivable Department",
        bodyHtml: null,
        fromAddress: "billing@supplier.com",
        fromName: "Billing Department",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Invoice_2024-001234.pdf", size: "156 KB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 7,
        userId: 1,
        folderId: 1,
        messageId: "msg-7",
        subject: "Security Alert: New Login Detected",
        body: "We detected a new login to your account from a new device:\n\nDevice: MacBook Pro\nLocation: São Paulo, Brazil\nTime: Today at 2:45 PM\nIP Address: 192.168.1.100\n\nIf this was you, you can ignore this message. If not, please secure your account immediately by changing your password.\n\nSecurity Team",
        bodyHtml: null,
        fromAddress: "security@platform.com",
        fromName: "Security Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: true,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 8,
        userId: 1,
        folderId: 1,
        messageId: "msg-8",
        subject: "Weekly Newsletter - Tech Trends",
        body: "This Week in Technology:\n\n1. AI Integration in Everyday Apps\n2. New Privacy Regulations in Europe\n3. Cloud Computing Cost Optimization\n4. Mobile App Security Best Practices\n\nRead the full articles on our website.\n\nBest regards,\nTech News Team",
        bodyHtml: null,
        fromAddress: "newsletter@technews.com",
        fromName: "Tech News",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "low",
        tags: null,
        receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 9,
        userId: 1,
        folderId: 1,
        messageId: "msg-9",
        subject: "Relatório mensal de vendas",
        body: "Segue anexo o relatório de vendas de dezembro:\n\n- Total de vendas: R$ 285.000\n- Crescimento: +15% vs mês anterior\n- Novos clientes: 47\n- Tickets médios: R$ 1.200\n\nDestaque para a região Sul que superou as metas em 25%.\n\nQualquer dúvida, estou à disposição.\n\nComercial",
        bodyHtml: null,
        fromAddress: "vendas@empresa.com",
        fromName: "Equipe Comercial",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "gerencia@empresa.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: true,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Relatorio_Vendas_Dezembro.xlsx", size: "2.1 MB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 10,
        userId: 1,
        folderId: 1,
        messageId: "msg-10",
        subject: "Conference Registration Confirmation",
        body: "Thank you for registering for TechConf 2024!\n\nEvent Details:\n- Date: March 15-17, 2024\n- Location: Convention Center, Downtown\n- Your Ticket ID: TC2024-789456\n\nYou'll receive detailed agenda and venue information closer to the event date.\n\nLooking forward to seeing you there!\n\nEvent Organizers",
        bodyHtml: null,
        fromAddress: "events@techconf.com",
        fromName: "TechConf Organizers",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "TechConf_2024_Ticket.pdf", size: "890 KB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 11,
        userId: 1,
        folderId: 1,
        messageId: "msg-11",
        subject: "Feedback on Latest Feature Release",
        body: "Hi John,\n\nI wanted to share some feedback on the latest feature release:\n\nPositives:\n- User interface is much cleaner\n- Performance improvements are noticeable\n- New search functionality works great\n\nAreas for improvement:\n- Mobile responsiveness on tablets\n- Loading time for large datasets\n- Export feature could be more intuitive\n\nOverall, great work! Users are responding positively.\n\nBest,\nProduct Team",
        bodyHtml: null,
        fromAddress: "product@company.com",
        fromName: "Product Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 12,
        userId: 1,
        folderId: 1,
        messageId: "msg-12",
        subject: "Sistema de backup - Manutenção programada",
        body: "Informamos que será realizada manutenção programada no sistema de backup:\n\nData: Sábado, 20 de janeiro\nHorário: 02:00 às 06:00\nImpacto: Backup automático temporariamente indisponível\n\nRecomendações:\n- Realizar backup manual antes da manutenção\n- Aguardar conclusão antes de alterações importantes\n- Em caso de urgência, contactar plantão técnico\n\nEquipe de TI",
        bodyHtml: null,
        fromAddress: "ti@empresa.com",
        fromName: "Equipe TI",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "usuarios@empresa.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 13,
        userId: 1,
        folderId: 1,
        messageId: "msg-13",
        subject: "Client Presentation - Final Review",
        body: "Hello team,\n\nPlease find attached the final version of tomorrow's client presentation. Key changes from yesterday's review:\n\n- Updated financial projections (slide 12)\n- Added competitive analysis (slides 15-17)\n- Revised timeline and milestones (slide 20)\n- Enhanced visual design throughout\n\nPlease review and provide any last-minute feedback by 6 PM today.\n\nThanks,\nStrategy Team",
        bodyHtml: null,
        fromAddress: "strategy@consulting.com",
        fromName: "Strategy Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "team@consulting.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: true,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Client_Presentation_Final_v3.pptx", size: "8.7 MB" }]),
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 14,
        userId: 1,
        folderId: 1,
        messageId: "msg-14",
        subject: "Welcome to the Team!",
        body: "Dear John,\n\nWelcome to our amazing team! We're thrilled to have you join us.\n\nYour first week schedule:\n- Monday: Orientation and IT setup\n- Tuesday: Team introductions and project overview\n- Wednesday: Training sessions\n- Thursday: Shadow a senior team member\n- Friday: First team meeting\n\nYour buddy for the first month will be Sarah from the development team. She'll help you get settled in.\n\nLooking forward to working with you!\n\nHR Team",
        bodyHtml: null,
        fromAddress: "hr@company.com",
        fromName: "HR Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: true,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Employee_Handbook.pdf", size: "3.2 MB" }, { name: "First_Week_Schedule.pdf", size: "245 KB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000), // 1.5 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 15,
        userId: 1,
        folderId: 1,
        messageId: "msg-15",
        subject: "Proposta comercial - Projeto de modernização",
        body: "Prezados,\n\nSegue nossa proposta para o projeto de modernização de sistemas:\n\nEscopo do projeto:\n- Migração para arquitetura cloud\n- Implementação de APIs RESTful\n- Modernização da interface do usuário\n- Integração com sistemas terceiros\n\nPrazo estimado: 6 meses\nInvestimento: R$ 450.000\n\nA proposta detalhada está em anexo. Estamos disponíveis para esclarecer dúvidas.\n\nAtenciosamente,\nEquipe Técnica",
        bodyHtml: null,
        fromAddress: "comercial@softwarehouse.com",
        fromName: "Software House",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Proposta_Modernizacao_2024.pdf", size: "4.1 MB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 16,
        userId: 1,
        folderId: 1,
        messageId: "msg-16",
        subject: "Database Performance Optimization Results",
        body: "Database optimization completed successfully!\n\nResults achieved:\n- Query performance improved by 65%\n- Index optimization reduced storage by 23%\n- Connection pooling eliminated timeout issues\n- Backup time reduced from 4h to 45min\n\nAll systems are running smoothly. No action required from your end.\n\nDatabase Administration Team",
        bodyHtml: null,
        fromAddress: "dba@company.com",
        fromName: "DBA Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "dev-team@company.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Performance_Report.pdf", size: "1.8 MB" }]),
        priority: "low",
        tags: null,
        receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 17,
        userId: 1,
        folderId: 1,
        messageId: "msg-17",
        subject: "Convite: Workshop de UX Design",
        body: "Você está convidado para nosso workshop de UX Design!\n\nDetalhes do evento:\n- Data: 25 de janeiro, 9h às 17h\n- Local: Auditório principal\n- Palestrante: Maria Santos (UX Lead da Google)\n- Vagas limitadas: 30 participantes\n\nTópicos abordados:\n- Pesquisa com usuários\n- Prototipagem rápida\n- Testes de usabilidade\n- Design thinking\n\nPara se inscrever, responda este e-mail até 20 de janeiro.\n\nDesign Team",
        bodyHtml: null,
        fromAddress: "design@empresa.com",
        fromName: "Design Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: true,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 18,
        userId: 1,
        folderId: 1,
        messageId: "msg-18",
        subject: "API Documentation Update v2.1",
        body: "The API documentation has been updated to version 2.1:\n\nNew features documented:\n- Real-time webhooks\n- Advanced filtering options\n- Batch operations endpoint\n- Rate limiting improvements\n\nBreaking changes:\n- Authentication token format updated\n- Deprecated endpoints removed\n- Response structure changes for /users endpoint\n\nMigration guide and examples are available on our developer portal.\n\nDeveloper Relations Team",
        bodyHtml: null,
        fromAddress: "devrel@api-company.com",
        fromName: "Developer Relations",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 19,
        userId: 1,
        folderId: 1,
        messageId: "msg-19",
        subject: "Aprovação de orçamento - Q1 2024",
        body: "Prezado John,\n\nInformamos que seu orçamento para Q1 2024 foi aprovado:\n\n- Desenvolvimento de software: R$ 75.000\n- Infraestrutura e cloud: R$ 35.000\n- Treinamentos e certificações: R$ 15.000\n- Equipamentos e licenças: R$ 25.000\n\nTotal aprovado: R$ 150.000\n\nO orçamento estará disponível a partir de 1º de janeiro. Lembre-se de seguir os procedimentos de aprovação para gastos acima de R$ 5.000.\n\nFinanceiro",
        bodyHtml: null,
        fromAddress: "financeiro@empresa.com",
        fromName: "Departamento Financeiro",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "gestores@empresa.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: true,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Orcamento_Q1_2024_Aprovado.pdf", size: "1.2 MB" }]),
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 20,
        userId: 1,
        folderId: 7, // Work folder
        messageId: "msg-20",
        subject: "Code Review Request - User Authentication Module",
        body: "Hi John,\n\nI've completed the user authentication module and would appreciate your code review:\n\nChanges include:\n- OAuth 2.0 integration\n- Two-factor authentication\n- Session management improvements\n- Password encryption upgrade\n- API security enhancements\n\nPull request: #PR-456\nBranch: feature/auth-module-v2\n\nExpected review time: 2-3 hours\nDeadline: End of week\n\nThanks!\nAlex",
        bodyHtml: null,
        fromAddress: "alex@company.com",
        fromName: "Alex Thompson",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 21,
        userId: 1,
        folderId: 1,
        messageId: "msg-21",
        subject: "Certificação AWS - Resultados do exame",
        body: "Parabéns!\n\nVocê foi aprovado no exame AWS Solutions Architect Associate!\n\nDetalhes do resultado:\n- Score: 847/1000 (mínimo: 720)\n- Data do exame: 15 de dezembro\n- Certificado válido até: 15 de dezembro de 2027\n- ID da certificação: AWS-SAA-789456123\n\nSeu certificado digital estará disponível em sua conta AWS Certification em até 5 dias úteis.\n\nPróximos passos sugeridos:\n- AWS Solutions Architect Professional\n- AWS DevOps Engineer\n\nAWS Training and Certification",
        bodyHtml: null,
        fromAddress: "certification@aws.amazon.com",
        fromName: "AWS Certification",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: true,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 22,
        userId: 1,
        folderId: 1,
        messageId: "msg-22",
        subject: "Client Feedback - Mobile App Beta",
        body: "Beta testing feedback summary:\n\nPositive feedback:\n- Intuitive user interface (92% satisfaction)\n- Fast loading times (average 1.2s)\n- Smooth navigation between screens\n- Offline functionality works well\n\nAreas for improvement:\n- Search functionality needs refinement\n- Push notifications timing\n- Battery consumption optimization\n- Android tablet layout adjustments\n\nUser engagement metrics:\n- Daily active users: 78%\n- Session duration: 8.5 minutes\n- Feature adoption rate: 65%\n\nDetailed report attached.\n\nProduct Team",
        bodyHtml: null,
        fromAddress: "product@startup.com",
        fromName: "Product Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "development@startup.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Beta_Testing_Report_Q4.pdf", size: "3.8 MB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 23,
        userId: 1,
        folderId: 1,
        messageId: "msg-23",
        subject: "Migração para novo servidor - Cronograma",
        body: "Cronograma da migração de servidores:\n\nFase 1 (28-29 janeiro):\n- Backup completo dos dados\n- Preparação do ambiente de produção\n- Testes de conectividade\n\nFase 2 (30 janeiro):\n- Migração dos bancos de dados\n- Configuração dos serviços\n- Testes de integridade\n\nFase 3 (31 janeiro):\n- Migração das aplicações\n- Configuração do DNS\n- Testes finais e go-live\n\nTempo de inatividade estimado: 4-6 horas\nJanela de manutenção: Sábado, 2h às 8h\n\nEquipe de Infraestrutura",
        bodyHtml: null,
        fromAddress: "infra@empresa.com",
        fromName: "Infraestrutura",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "all@empresa.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Cronograma_Migracao_Detalhado.xlsx", size: "567 KB" }]),
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 24,
        userId: 1,
        folderId: 1,
        messageId: "msg-24",
        subject: "Contract Renewal - Cloud Services",
        body: "Dear John,\n\nYour cloud services contract is due for renewal next month.\n\nCurrent plan details:\n- Plan: Enterprise Plus\n- Monthly cost: $2,890\n- Storage: 500TB\n- Bandwidth: Unlimited\n- Support: 24/7 Premium\n\nRenewal options:\n1. Continue current plan (5% discount for annual payment)\n2. Upgrade to Enterprise Premium (+50% storage, +$890/month)\n3. Customize plan based on usage analytics\n\nWe've also prepared a usage report showing potential optimizations that could reduce costs by 20-30%.\n\nAccount Manager",
        bodyHtml: null,
        fromAddress: "accounts@cloudprovider.com",
        fromName: "Account Manager",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: true,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Usage_Analytics_Report.pdf", size: "2.3 MB" }, { name: "Renewal_Options.pdf", size: "890 KB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), // 11 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 25,
        userId: 1,
        folderId: 8, // Personal folder
        messageId: "msg-25",
        subject: "Treinamento obrigatório - Segurança da informação",
        body: "Você foi inscrito no treinamento obrigatório de Segurança da Informação.\n\nDetalhes do treinamento:\n- Modalidade: Online\n- Duração: 4 horas\n- Prazo para conclusão: 30 dias\n- Certificado: Emitido automaticamente\n\nTópicos abordados:\n- Política de senhas\n- Phishing e engenharia social\n- Uso seguro de dispositivos\n- LGPD e proteção de dados\n- Backup e recuperação\n\nLink de acesso: [portal-treinamento]\nUsuário: john.doe\nSenha: temp2024\n\nRH e Compliance",
        bodyHtml: null,
        fromAddress: "treinamento@empresa.com",
        fromName: "RH e Compliance",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 26,
        userId: 1,
        folderId: 1,
        messageId: "msg-26",
        subject: "Performance Review - Q4 2023 Results",
        body: "Your Q4 2023 performance review is complete.\n\nOverall Rating: Exceeds Expectations\n\nKey achievements:\n- Led successful mobile app launch (+25% user engagement)\n- Mentored 3 junior developers\n- Reduced code deployment time by 40%\n- Completed AWS certification ahead of schedule\n\nAreas of growth:\n- Cross-team collaboration\n- Technical documentation\n- Public speaking/presentations\n\nGoals for Q1 2024:\n- Lead database optimization project\n- Complete Advanced React certification\n- Present at internal tech talks\n\nSalary adjustment: +8% effective January 1st\n\nHR will schedule a follow-up meeting to discuss career development.\n\nManager",
        bodyHtml: null,
        fromAddress: "manager@company.com",
        fromName: "Sarah Wilson",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "hr@company.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: true,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Performance_Review_Q4_2023.pdf", size: "1.1 MB" }]),
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), // 13 days ago
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // More test emails to reach 50 total
      {
        id: 27,
        userId: 1,
        folderId: 1,
        messageId: "msg-27",
        subject: "Lembrete: Reunião de equipe amanhã",
        body: "Lembrete da reunião de equipe agendada para amanhã às 14h na sala de conferências.\n\nPauta:\n- Review do sprint atual\n- Planejamento da próxima release\n- Discussão sobre melhorias no processo\n\nPor favor, tragam suas anotações sobre os projetos em andamento.\n\nObrigado!",
        bodyHtml: null,
        fromAddress: "manager@empresa.com",
        fromName: "Gerente de Projeto",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 28,
        userId: 1,
        folderId: 1,
        messageId: "msg-28",
        subject: "Software License Renewal Notice",
        body: "Your software licenses are expiring soon:\n\n- Visual Studio Professional (Expires: Feb 15)\n- Adobe Creative Suite (Expires: Feb 20)\n- JetBrains IntelliJ (Expires: Feb 25)\n\nTotal renewal cost: $2,890\n\nPlease approve renewal to avoid service interruption.\n\nIT Procurement",
        bodyHtml: null,
        fromAddress: "procurement@company.com",
        fromName: "IT Procurement",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "License_Renewal_Details.pdf", size: "890 KB" }]),
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 29,
        userId: 1,
        folderId: 1,
        messageId: "msg-29",
        subject: "Feedback do cliente - Projeto Alpha",
        body: "Recebemos feedback muito positivo do cliente sobre o Projeto Alpha:\n\n'A solução superou nossas expectativas. A interface é intuitiva e o desempenho é excelente. A equipe demonstrou grande profissionalismo durante todo o projeto.'\n\nEles estão interessados em expandir o escopo para incluir módulos adicionais.\n\nParabéns pela execução!\n\nAccount Manager",
        bodyHtml: null,
        fromAddress: "account@consultoria.com",
        fromName: "Account Manager",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "team@consultoria.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: true,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 30,
        userId: 1,
        folderId: 7, // Work folder
        messageId: "msg-30",
        subject: "Docker Container Deployment Guide",
        body: "Here's the updated deployment guide for our Docker containers:\n\n1. Build images with latest security patches\n2. Update environment variables in config files\n3. Run health checks before deployment\n4. Deploy to staging environment first\n5. Run automated tests\n6. Deploy to production with blue-green strategy\n\nRollback procedure is documented in the attached guide.\n\nDevOps Team",
        bodyHtml: null,
        fromAddress: "devops@tech-company.com",
        fromName: "DevOps Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Docker_Deployment_Guide_v3.pdf", size: "2.1 MB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 31,
        userId: 1,
        folderId: 1,
        messageId: "msg-31",
        subject: "Convite: Festa de fim de ano da empresa",
        body: "Você está convidado para nossa festa de fim de ano!\n\nDetalhes:\n- Data: 15 de dezembro, 19h\n- Local: Salão de eventos do hotel Marriott\n- Dress code: Traje esporte fino\n- Haverá jantar, música ao vivo e premiações\n\nConfirme presença até 10 de dezembro.\nPode trazer acompanhante!\n\nComitê de Eventos",
        bodyHtml: null,
        fromAddress: "eventos@empresa.com",
        fromName: "Comitê de Eventos",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "low",
        tags: null,
        receivedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 32,
        userId: 1,
        folderId: 1,
        messageId: "msg-32",
        subject: "API Rate Limit Increase Request Approved",
        body: "Good news! Your API rate limit increase request has been approved.\n\nNew limits (effective immediately):\n- Standard endpoints: 10,000 requests/hour (was 5,000)\n- Premium endpoints: 1,000 requests/hour (was 500)\n- Bulk operations: 100 requests/hour (was 50)\n\nNo additional costs for this upgrade.\nMonitor your usage in the developer dashboard.\n\nAPI Support Team",
        bodyHtml: null,
        fromAddress: "api-support@platform.com",
        fromName: "API Support",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: true,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 33,
        userId: 1,
        folderId: 1,
        messageId: "msg-33",
        subject: "Relatório de bug - Versão 2.4.1",
        body: "Relatório de bugs identificados na versão 2.4.1:\n\nCríticos (2):\n- Falha na autenticação OAuth em browsers antigos\n- Memory leak no módulo de upload de arquivos\n\nAltos (5):\n- Lentidão na busca com filtros complexos\n- Problema de layout em dispositivos móveis\n- Erro de validação em formulários aninhados\n\nMédios (12):\n- Vários problemas de UI/UX menores\n\nCorreções planejadas para versão 2.4.2 esta semana.\n\nQA Team",
        bodyHtml: null,
        fromAddress: "qa@software-company.com",
        fromName: "QA Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "dev-team@software-company.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Bug_Report_v2.4.1.xlsx", size: "1.5 MB" }]),
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 34,
        userId: 1,
        folderId: 1,
        messageId: "msg-34",
        subject: "Kubernetes Cluster Upgrade Scheduled",
        body: "Kubernetes cluster upgrade scheduled:\n\nUpgrade details:\n- From version 1.26 to 1.28\n- Includes security patches and performance improvements\n- Estimated downtime: 2-3 hours\n- Scheduled: Sunday, 3 AM - 6 AM\n\nPreparation checklist:\n- Backup all persistent volumes\n- Update deployment configurations\n- Test applications in staging cluster\n- Prepare rollback plan\n\nInfrastructure Team",
        bodyHtml: null,
        fromAddress: "infrastructure@cloudnative.com",
        fromName: "Infrastructure Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 35,
        userId: 1,
        folderId: 8, // Personal folder
        messageId: "msg-35",
        subject: "Novo processo de code review",
        body: "Implementamos um novo processo de code review para melhorar a qualidade do código:\n\nMudanças principais:\n- Todo PR deve ter pelo menos 2 aprovações\n- Testes automatizados obrigatórios\n- Análise de segurança automática\n- Review de performance para mudanças críticas\n\nFerramentas:\n- SonarQube para análise de qualidade\n- Snyk para vulnerabilidades\n- GitHub Actions para CI/CD\n\nTreinamento na sexta-feira às 14h.\n\nTech Lead",
        bodyHtml: null,
        fromAddress: "techlead@desenvolvimento.com",
        fromName: "Tech Lead",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "dev-team@desenvolvimento.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: true,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Code_Review_Process_v2.pdf", size: "1.2 MB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 36,
        userId: 1,
        folderId: 1,
        messageId: "msg-36",
        subject: "Monthly Team Building - Escape Room",
        body: "Let's have some fun! Our monthly team building activity:\n\nActivity: Escape Room Challenge\nDate: This Friday at 4 PM\nLocation: Puzzle Palace Downtown\nDuration: 2 hours\nTeam size: 6 people per room\n\nWe'll split into teams and see who can escape first!\nDinner afterward at the Italian restaurant next door.\n\nRSVP by Wednesday so we can book the rooms.\n\nHR Team",
        bodyHtml: null,
        fromAddress: "hr@funcompany.com",
        fromName: "HR Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "low",
        tags: null,
        receivedAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 37,
        userId: 1,
        folderId: 1,
        messageId: "msg-37",
        subject: "Database Migration Status Update",
        body: "Database migration progress update:\n\nCompleted (80%):\n- User data migration: ✅ Complete\n- Product catalog: ✅ Complete\n- Transaction history: ✅ Complete\n- File attachments: 🔄 In progress (75%)\n\nRemaining tasks:\n- Search indexes rebuild\n- Performance optimization\n- Final data validation\n\nExpected completion: Tomorrow evening\nGo-live scheduled: Monday morning\n\nDatabase Team",
        bodyHtml: null,
        fromAddress: "database@migration-project.com",
        fromName: "Database Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "project-managers@migration-project.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: true,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 38,
        userId: 1,
        folderId: 1,
        messageId: "msg-38",
        subject: "Certificações disponíveis - Budget 2024",
        body: "Orçamento para certificações em 2024 foi aprovado!\n\nCertificações disponíveis:\n- AWS Solutions Architect Professional\n- Google Cloud Professional Developer\n- Kubernetes CKA/CKAD\n- Docker Certified Associate\n- Scrum Master CSM\n- PMP Project Management\n\nOrçamento por funcionário: R$ 8.000\nPrazo para uso: até dezembro 2024\n\nEnvie sua escolha até final do mês para agendarmos.\n\nDesenvolvimento Humano",
        bodyHtml: null,
        fromAddress: "dh@empresa.com",
        fromName: "Desenvolvimento Humano",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: true,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Certificacoes_Disponiveis_2024.pdf", size: "950 KB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 39,
        userId: 1,
        folderId: 1,
        messageId: "msg-39",
        subject: "Security Audit Results - Action Required",
        body: "Security audit completed. Several items require immediate attention:\n\nCritical findings:\n- 3 dependencies with known vulnerabilities\n- 2 endpoints missing rate limiting\n- Password policy not enforced on legacy users\n\nRecommended actions:\n- Update vulnerable packages by end of week\n- Implement rate limiting on exposed APIs\n- Force password reset for accounts > 1 year old\n- Enable 2FA for all admin accounts\n\nDetailed report attached.\n\nSecurity Team",
        bodyHtml: null,
        fromAddress: "security@company.com",
        fromName: "Security Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "cto@company.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: true,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Security_Audit_Report_Q4.pdf", size: "3.2 MB" }]),
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 40,
        userId: 1,
        folderId: 1,
        messageId: "msg-40",
        subject: "Welcome to GitHub Copilot Enterprise",
        body: "Your organization now has access to GitHub Copilot Enterprise!\n\nNew features available:\n- AI-powered code suggestions across all repositories\n- Custom models trained on your codebase\n- Advanced security scanning\n- Team collaboration features\n\nSetup instructions:\n1. Install the VS Code extension\n2. Authenticate with your GitHub account\n3. Enable Copilot in your preferred IDE\n4. Complete the 15-minute tutorial\n\nQuestions? Check our internal wiki or Slack #dev-tools\n\nDeveloper Tools Team",
        bodyHtml: null,
        fromAddress: "devtools@techcorp.com",
        fromName: "Developer Tools",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 41,
        userId: 1,
        folderId: 1,
        messageId: "msg-41",
        subject: "Conferência TechBrasil 2024 - Inscrições abertas",
        body: "As inscrições para a TechBrasil 2024 estão abertas!\n\nDestaques do evento:\n- 50+ palestrantes internacionais\n- Workshops hands-on de 3 dias\n- Networking com 5000+ profissionais\n- Expo com 200+ empresas\n\nTemas principais:\n- Inteligência Artificial e Machine Learning\n- DevOps e Cloud Native\n- Blockchain e Web3\n- Desenvolvimento Mobile\n- Cibersegurança\n\nDesconto de 40% para inscrições antecipadas até 31/01.\nEmpresa patrocinará até 5 funcionários.\n\nOrganização TechBrasil",
        bodyHtml: null,
        fromAddress: "inscricoes@techbrasil.com",
        fromName: "TechBrasil",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "TechBrasil_2024_Programacao.pdf", size: "4.1 MB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 42,
        userId: 1,
        folderId: 1,
        messageId: "msg-42",
        subject: "Load Testing Results - Performance Analysis",
        body: "Load testing completed for the new release:\n\nTest scenarios:\n- 1,000 concurrent users: ✅ Passed (avg response 250ms)\n- 5,000 concurrent users: ✅ Passed (avg response 890ms)\n- 10,000 concurrent users: ⚠️ Warning (avg response 2.1s)\n- 15,000 concurrent users: ❌ Failed (timeouts)\n\nBottlenecks identified:\n- Database connection pool limit\n- Redis cache overload\n- CDN bandwidth saturation\n\nRecommendations:\n- Increase DB pool size to 200\n- Implement cache partitioning\n- Upgrade CDN plan\n\nPerformance Team",
        bodyHtml: null,
        fromAddress: "performance@loadtest.com",
        fromName: "Performance Team",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: "architects@loadtest.com",
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: true,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Load_Test_Results_Detailed.pdf", size: "5.2 MB" }]),
        priority: "high",
        tags: null,
        receivedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 43,
        userId: 1,
        folderId: 1,
        messageId: "msg-43",
        subject: "Open Source Contribution Guidelines",
        body: "New guidelines for contributing to open source projects:\n\nApproval process:\n1. Submit project proposal to tech committee\n2. Security review for sensitive areas\n3. Legal review for license compatibility\n4. Manager approval for time allocation\n\nAllowed contribution time: 20% (1 day per week)\n\nBenefits:\n- Company GitHub Pro account\n- Conference speaking opportunities\n- Tech blog publication support\n- Recognition in company newsletter\n\nSubmit your first proposal by month end!\n\nOpen Source Office",
        bodyHtml: null,
        fromAddress: "opensource@innovativecorp.com",
        fromName: "Open Source Office",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: true,
        attachments: JSON.stringify([{ name: "Open_Source_Guidelines.pdf", size: "1.8 MB" }]),
        priority: "normal",
        tags: null,
        receivedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Emails in Sent folder (folderId: 3)
      {
        id: 52,
        userId: 1,
        folderId: 3, // Sent folder
        messageId: "msg-52",
        subject: "RE: Project Timeline Confirmation",
        body: "Hi Sarah,\n\nThanks for the update. The timeline looks good from our end. I've reviewed the milestones and everything aligns with our resource allocation.\n\nConfirmed deliverables on our end:\n- API documentation review (Dec 12)\n- Integration testing support (Dec 15-18)\n- User acceptance testing (Dec 22-24)\n\nLet me know if you need any additional resources.\n\nBest regards,\nJohn",
        bodyHtml: null,
        fromAddress: "john@example.com",
        fromName: "John Doe",
        toAddress: "sarah@company.com",
        toName: "Sarah Anderson",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: null,
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 53,
        userId: 1,
        folderId: 3, // Sent folder
        messageId: "msg-53",
        subject: "Meeting Follow-up: Q1 Planning",
        body: "Team,\n\nGreat meeting today! Here's a summary of our Q1 planning decisions:\n\n1. Focus on mobile app optimization\n2. Implement advanced analytics dashboard\n3. Expand API capabilities\n4. Strengthen security protocols\n\nNext steps:\n- Emily: Create detailed project roadmap (Due: Next Friday)\n- Mike: Research new analytics tools (Due: Dec 10)\n- Team: Review and provide feedback on proposals (Due: Dec 12)\n\nNext planning session: December 15, 2PM\n\nThanks everyone!\nJohn",
        bodyHtml: null,
        fromAddress: "john@example.com",
        fromName: "John Doe",
        toAddress: "team@company.com",
        toName: "Development Team",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: null,
        sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Emails in Drafts folder (folderId: 4)
      {
        id: 54,
        userId: 1,
        folderId: 4, // Drafts folder
        messageId: "msg-54",
        subject: "Draft: Performance Review Discussion",
        body: "Hi Manager,\n\nI wanted to schedule some time to discuss my performance review and career development goals for the upcoming year.\n\nKey topics I'd like to cover:\n- Current project contributions and achievements\n- Areas for professional growth\n- Training and certification opportunities\n- Team collaboration and leadership opportunities\n\nI'm available next week for a 30-minute discussion. Please let me know what works best for your schedule.\n\n[DRAFT - Need to finish and send]",
        bodyHtml: null,
        fromAddress: "john@example.com",
        fromName: "John Doe",
        toAddress: "manager@company.com",
        toName: "Manager",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: true,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: null,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 55,
        userId: 1,
        folderId: 4, // Drafts folder
        messageId: "msg-55",
        subject: "Draft: Thank you note to client",
        body: "Dear Mr. Johnson,\n\nThank you for choosing our services for your recent project. We're committed to delivering exceptional results and appreciate the opportunity to work with your team.\n\n[Need to add more details about the specific project and outcomes]\n\nWe look forward to continuing our partnership.\n\nBest regards,\nJohn Doe",
        bodyHtml: null,
        fromAddress: "john@example.com",
        fromName: "John Doe",
        toAddress: "client@business.com",
        toName: "Mr. Johnson",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: true,
        hasAttachments: false,
        attachments: null,
        priority: "normal",
        tags: null,
        receivedAt: null,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Emails in Junk folder (folderId: 5)
      {
        id: 56,
        userId: 1,
        folderId: 5, // Junk folder
        messageId: "msg-56",
        subject: "URGENT: Claim Your Prize Now!!!",
        body: "Congratulations! You've won $10,000 in our exclusive lottery!\n\nCLICK HERE NOW to claim your prize before it expires!\n\nThis is a limited time offer. Act fast!\n\n[Obviously spam email]",
        bodyHtml: null,
        fromAddress: "noreply@fakeLottery123.com",
        fromName: "Prize Committee",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: false,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "low",
        tags: null,
        receivedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // More emails in Trash folder (folderId: 6)
      {
        id: 57,
        userId: 1,
        folderId: 6, // Trash folder
        messageId: "msg-57",
        subject: "Old Newsletter - Deleted",
        body: "This was an old newsletter that was deleted.",
        bodyHtml: null,
        fromAddress: "old@newsletter.com",
        fromName: "Old Newsletter",
        toAddress: "john@example.com",
        toName: "John Doe",
        ccAddress: null,
        bccAddress: null,
        replyToAddress: null,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: false,
        attachments: null,
        priority: "low",
        tags: null,
        receivedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    sampleEmails.forEach(email => this.emails.set(email.id, email));
    this.currentEmailId = 58;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      signature: insertUser.signature || null,
      profilePicture: insertUser.profilePicture || null,
      language: insertUser.language || "pt",
      theme: insertUser.theme || "dark",
      avatarShape: insertUser.avatarShape || "rounded",
      sidebarView: insertUser.sidebarView || "expanded",
      emailsPerPage: insertUser.emailsPerPage || 20,
      stayLoggedIn: insertUser.stayLoggedIn || 0,
      storageQuota: insertUser.storageQuota || 104857600, // 100MB default
      storageUsed: insertUser.storageUsed || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    
    // Create user storage folder
    await fileStorageService.createUserStorageFolder(id);

    // Create system folders for the new user
    this.ensureSystemFolders(id);
    
    return user;
  }

  async updateUser(id: number, updateUser: UpdateUser): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = { 
      ...user, 
      ...updateUser,
      // Ensure new fields have defaults if not provided
      language: updateUser.language ?? user.language ?? "pt",
      theme: updateUser.theme ?? user.theme ?? "light", 
      avatarShape: updateUser.avatarShape ?? user.avatarShape ?? "rounded",
      sidebarView: updateUser.sidebarView ?? user.sidebarView ?? "left",
      emailsPerPage: updateUser.emailsPerPage ?? user.emailsPerPage ?? 20
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getFolders(userId: number): Promise<Folder[]> {
    return Array.from(this.folders.values()).filter(folder => folder.userId === userId);
  }

  async getFolder(id: number): Promise<Folder | undefined> {
    return this.folders.get(id);
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const id = this.currentFolderId++;
    const folder: Folder = { 
      ...insertFolder, 
      id,
      systemType: null, // Custom folders never have systemType - prevents conflicts
      type: "custom", // Ensure all user-created folders are custom
      color: insertFolder.color || "#6366f1",
      icon: insertFolder.icon || "folder",
      createdAt: new Date()
    };
    this.folders.set(id, folder);
    return folder;
  }

  async updateFolder(id: number, updateFolder: UpdateFolder): Promise<Folder | undefined> {
    const folder = this.folders.get(id);
    if (!folder) return undefined;
    
    const updatedFolder: Folder = { 
      ...folder, 
      ...updateFolder,
      color: updateFolder.color || folder.color,
      icon: updateFolder.icon || folder.icon
    };
    this.folders.set(id, updatedFolder);
    return updatedFolder;
  }

  async deleteFolder(id: number): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder || folder.type === 'system') return false;
    
    // Find inbox folder for this user
    const inboxFolder = this.findSystemFolder(folder.userId, 'inbox');
    if (!inboxFolder) return false;
    
    // Move all emails from the deleted folder to inbox
    Array.from(this.emails.values())
      .filter(email => email.folderId === id)
      .forEach(email => {
        const updatedEmail: Email = { 
          ...email, 
          folderId: inboxFolder.id 
        };
        this.emails.set(email.id, updatedEmail);
      });
    
    this.folders.delete(id);
    return true;
  }

  private async enrichEmailWithTags(email: Email): Promise<Email> {
    // Get tags for this email from the email_tags table
    const emailTagRelations = Array.from(this.emailTags.values())
      .filter(relation => relation.emailId === email.id);
    
    const relatedTags = emailTagRelations
      .map(relation => this.tags.get(relation.tagId))
      .filter(tag => tag !== undefined)
      .map(tag => tag!.name);
    
    // Combine with existing tags from the email.tags field
    let existingTags: string[] = [];
    try {
      existingTags = email.tags ? JSON.parse(email.tags) : [];
    } catch {
      existingTags = [];
    }
    
    // Merge and deduplicate tags
    const allTagsSet = new Set<string>();
    existingTags.forEach(tag => allTagsSet.add(tag));
    relatedTags.forEach(tag => allTagsSet.add(tag));
    const allTags: string[] = [];
    allTagsSet.forEach(tag => allTags.push(tag));
    
    return {
      ...email,
      tags: JSON.stringify(allTags)
    };
  }

  private decryptEmailForUser(email: Email, userId: number): Email {
    const decrypted = { ...email };
    
    try {
      console.log(`🔓 Development mode: Decrypting email ${email.id} for user ${userId}`);
      
      // Decrypt all encrypted fields
      if (email.fromAddress) {
        console.log(`🔓 Decrypting fromAddress: ${email.fromAddress.substring(0, 20)}...`);
        decrypted.fromAddress = decryptEmail(email.fromAddress, userId);
        console.log(`✅ Decrypted fromAddress: ${decrypted.fromAddress}`);
      }
      if (email.toAddress) {
        console.log(`🔓 Decrypting toAddress: ${email.toAddress.substring(0, 20)}...`);
        decrypted.toAddress = decryptEmail(email.toAddress, userId);
      }
      if (email.ccAddress) {
        console.log(`🔓 Decrypting ccAddress: ${email.ccAddress.substring(0, 20)}...`);
        decrypted.ccAddress = decryptEmail(email.ccAddress, userId);
      }
      if (email.bccAddress) {
        console.log(`🔓 Decrypting bccAddress: ${email.bccAddress.substring(0, 20)}...`);
        decrypted.bccAddress = decryptEmail(email.bccAddress, userId);
      }
      if (email.subject) {
        console.log(`🔓 Decrypting subject: ${email.subject.substring(0, 20)}...`);
        decrypted.subject = decryptEmail(email.subject, userId);
        console.log(`✅ Decrypted subject: ${decrypted.subject.substring(0, 20)}...`);
      }
      if (email.body) {
        console.log(`🔓 Decrypting body: ${email.body.substring(0, 20)}...`);
        decrypted.body = decryptEmail(email.body, userId);
        console.log(`✅ Decrypted body: ${decrypted.body.substring(0, 20)}...`);
      }
      if (email.bodyHtml) {
        console.log(`🔓 Decrypting bodyHtml: ${email.bodyHtml.substring(0, 20)}...`);
        decrypted.bodyHtml = decryptEmail(email.bodyHtml, userId);
      }
      
      console.log(`✅ Email ${email.id} decrypted successfully`);
    } catch (error) {
      console.error('❌ Decryption error for email:', email.id, error);
      // If decryption fails, return the original encrypted content
      // This will help us identify where the issue is
      console.error('❌ Returning original content due to decryption failure');
      return email;
    }
    
    return decrypted;
  }

  async getEmails(userId: number, folderId?: number, search?: string, limit: number = 50, offset: number = 0): Promise<Email[]> {
    let emails = Array.from(this.emails.values())
      .filter(email => email.userId === userId);

    if (folderId) {
      emails = emails.filter(email => email.folderId === folderId);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      emails = emails.filter(email => 
        email.subject.toLowerCase().includes(searchLower) ||
        email.body.toLowerCase().includes(searchLower) ||
        email.fromName?.toLowerCase().includes(searchLower) ||
        email.fromAddress.toLowerCase().includes(searchLower)
      );
    }

    const sortedEmails = emails
      .sort((a, b) => {
        const dateA = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
        const dateB = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(offset, offset + limit);

    // Enrich emails with tags
    const enrichedEmails = await Promise.all(
      sortedEmails.map(email => this.enrichEmailWithTags(email))
    );

    // Decrypt emails for the user
    const decryptedEmails = await Promise.all(
      enrichedEmails.map(email => this.decryptEmailForUser(email, userId))
    );
    
    return decryptedEmails;
  }

  async getEmail(id: number): Promise<Email | undefined> {
    const email = this.emails.get(id);
    if (!email) return undefined;
    
    const enrichedEmail = await this.enrichEmailWithTags(email);
    return this.decryptEmailForUser(enrichedEmail, email.userId);
  }

  // Clean up empty drafts for a user
  private async cleanupEmptyDrafts(userId: number): Promise<void> {
    const draftsToDelete: number[] = [];
    
    this.emails.forEach((email, id) => {
      if (email.userId === userId && 
          email.isDraft && 
          (!email.subject || email.subject.trim() === '') &&
          (!email.body || email.body.trim() === '') &&
          (!email.toAddress || email.toAddress.trim() === '')) {
        // This is an empty draft, mark for deletion
        draftsToDelete.push(id);
      }
    });
    
    // Delete empty drafts
    for (const id of draftsToDelete) {
      this.emails.delete(id);
    }
    
    if (draftsToDelete.length > 0) {
      console.log(`Cleaned up ${draftsToDelete.length} empty drafts for user ${userId}`);
    }
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    // If this is a sent email (not a draft), check for active draft to convert
    if (!insertEmail.isDraft) {
      const activeDraft = await this.getActiveDraft(insertEmail.userId);
      if (activeDraft) {
        console.log(`📧 Converting active draft ${activeDraft.id} to sent email for user ${insertEmail.userId}`);
        return await this.convertDraftToSentEmail(activeDraft.id, insertEmail);
      }
    }

    // If creating a new draft, cleanup old empty drafts for this user first
    if (insertEmail.isDraft) {
      await this.cleanupEmptyDrafts(insertEmail.userId);
    }

    // Ensure system folders exist for this user
    this.ensureSystemFolders(insertEmail.userId);

    // Auto-determine system folder if folderId is 0
    if (insertEmail.folderId === 0) {
      if (insertEmail.isDraft) {
        // Find drafts folder
        const draftsFolder = this.findSystemFolder(insertEmail.userId, 'drafts');
        if (!draftsFolder) throw new Error('Drafts folder not found');
        insertEmail.folderId = draftsFolder.id;
      } else {
        // Find sent folder for sent emails
        const sentFolder = this.findSystemFolder(insertEmail.userId, 'sent');
        if (!sentFolder) throw new Error('Sent folder not found');
        insertEmail.folderId = sentFolder.id;
      }
    }
    
    const id = this.currentEmailId++;
    const now = new Date();
    
    // For emails that are not drafts (sent emails), set sentAt to current time
    const isSentEmail = !insertEmail.isDraft;
    
    // Encrypt sensitive email data
    const encryptedFromAddress = insertEmail.fromAddress ? encryptEmail(insertEmail.fromAddress, insertEmail.userId) : "";
    const encryptedSubject = insertEmail.subject ? encryptEmail(insertEmail.subject, insertEmail.userId) : "";
    const encryptedBody = insertEmail.body ? encryptEmail(insertEmail.body, insertEmail.userId) : "";
    const encryptedBodyHtml = insertEmail.bodyHtml ? encryptEmail(insertEmail.bodyHtml, insertEmail.userId) : null;
    
    const email: Email = { 
      ...insertEmail, 
      id,
      messageId: insertEmail.messageId || null,
      fromAddress: encryptedFromAddress,
      subject: encryptedSubject,
      body: encryptedBody,
      bodyHtml: encryptedBodyHtml ?? null,
      fromName: insertEmail.fromName || null,
      toName: insertEmail.toName || null,
      ccAddress: insertEmail.ccAddress || null,
      bccAddress: insertEmail.bccAddress || null,
      replyToAddress: insertEmail.replyToAddress || null,
      isRead: insertEmail.isRead ?? false,
      isStarred: insertEmail.isStarred ?? false,
      isDraft: insertEmail.isDraft ?? false,
      hasAttachments: insertEmail.hasAttachments ?? false,
      attachments: insertEmail.attachments || null,
      priority: insertEmail.priority || "normal",
      tags: insertEmail.tags || null,
      receivedAt: insertEmail.receivedAt || now,
      sentAt: isSentEmail ? now : null, // Set sentAt for sent emails
      createdAt: now,
      updatedAt: now
    };
    this.emails.set(id, email);
    
    // Debug log for draft creation
    if (email.isDraft) {
      console.log('🔍 DEBUG: New draft created:', {
        id: email.id,
        subject: email.subject,
        folderId: email.folderId,
        createdAt: email.createdAt,
        updatedAt: email.updatedAt,
        isDraft: email.isDraft
      });
    }
    
    return this.decryptEmailForUser(email, insertEmail.userId);
  }

  async updateEmail(id: number, updateEmail: UpdateEmail): Promise<Email | undefined> {
    const email = this.emails.get(id);
    if (!email) return undefined;
    
    // Encrypt data being updated
    const encryptedUpdate = { ...updateEmail };
    
    try {
      const { encryptEmail } = require('./crypto');
      
      if (updateEmail.fromAddress) encryptedUpdate.fromAddress = encryptEmail(updateEmail.fromAddress, email.userId);
      if (updateEmail.toAddress) encryptedUpdate.toAddress = encryptEmail(updateEmail.toAddress, email.userId);
      if (updateEmail.ccAddress) encryptedUpdate.ccAddress = encryptEmail(updateEmail.ccAddress, email.userId);
      if (updateEmail.bccAddress) encryptedUpdate.bccAddress = encryptEmail(updateEmail.bccAddress, email.userId);
      if (updateEmail.subject) encryptedUpdate.subject = encryptEmail(updateEmail.subject, email.userId);
      if (updateEmail.body) encryptedUpdate.body = encryptEmail(updateEmail.body, email.userId);
      if (updateEmail.bodyHtml) encryptedUpdate.bodyHtml = encryptEmail(updateEmail.bodyHtml, email.userId);
      
      // Handle attachments - preserve them as-is since they're already JSON strings or arrays
      if (updateEmail.attachments !== undefined) {
        encryptedUpdate.attachments = updateEmail.attachments;
      }
      
      // Handle hasAttachments flag
      if (updateEmail.hasAttachments !== undefined) {
        encryptedUpdate.hasAttachments = updateEmail.hasAttachments;
      }
    } catch (error) {
      console.error('Encryption error during update:', error);
      // Se a criptografia falhar, usa os dados originais
    }
    
    const updatedEmail: Email = { 
      ...email, 
      ...encryptedUpdate,
      updatedAt: new Date()
    };
    this.emails.set(id, updatedEmail);
    
    // Debug log for draft updates
    if (updatedEmail.isDraft) {
      console.log('🔍 DEBUG: Draft updated:', {
        id: updatedEmail.id,
        subject: updatedEmail.subject,
        folderId: updatedEmail.folderId,
        createdAt: updatedEmail.createdAt,
        updatedAt: updatedEmail.updatedAt,
        isDraft: updatedEmail.isDraft
      });
    }
    
    // Return decrypted version for use by the API
    return this.decryptEmailForUser(updatedEmail, email.userId);
  }

  async deleteEmail(id: number, permanent: boolean = false): Promise<boolean> {
    const email = this.emails.get(id);
    if (!email) return false;
    
    // If permanent deletion is forced, delete immediately
    if (permanent) {
      console.log(`🗑️ PERMANENT deletion requested for email ${id}`);
      return this.emails.delete(id);
    }
    
    // Find folders
    const trashFolder = this.findSystemFolder(email.userId, 'trash');
    const draftsFolder = this.findSystemFolder(email.userId, 'drafts');
    const spamFolder = this.findSystemFolder(email.userId, 'junk');
    
    if (!trashFolder) return false;
    
    // Check if email is in special folders that require permanent deletion
    const isInDrafts = draftsFolder && email.folderId === draftsFolder.id;
    const isInSpam = spamFolder && email.folderId === spamFolder.id;
    const isInTrash = email.folderId === trashFolder.id;
    
    // These folders require confirmation for permanent deletion - but this method should not be called
    // Frontend should handle confirmation and call with permanent=true
    if (isInDrafts || isInSpam || isInTrash) {
      console.log(`⚠️ Email ${id} is in special folder (drafts/spam/trash), requires confirmation for permanent deletion`);
      return this.emails.delete(id); // For now, delete permanently (will be handled by frontend confirmation)
    }
    
    // For regular folders (inbox, sent, custom), move to trash
    console.log(`📁 Moving email ${id} to trash folder ${trashFolder.id}`);
    const updatedEmail: Email = { 
      ...email, 
      folderId: trashFolder.id,
      updatedAt: new Date()
    };
    this.emails.set(id, updatedEmail);
    return true;
  }

  async moveEmail(id: number, folderId: number | string): Promise<Email | undefined> {
    const email = this.emails.get(id);
    if (!email) return undefined;
    
    // Handle special case for starred folder
    if (folderId === 'starred') {
      // For starred folder, mark as starred but keep in original folder
      const updatedEmail: Email = { 
        ...email, 
        isStarred: true,
        updatedAt: new Date()
      };
      this.emails.set(id, updatedEmail);
      return updatedEmail;
    }
    
    // For system folders, use the folder type directly
    // For custom folders, use the numeric ID
    const updatedEmail: Email = { 
      ...email, 
      folderId: folderId as any, // Can be string (system folder type) or number (custom folder ID)
      updatedAt: new Date()
    };
    this.emails.set(id, updatedEmail);
    return updatedEmail;
  }

  async toggleEmailStar(id: number): Promise<Email | undefined> {
    const email = this.emails.get(id);
    if (!email) return undefined;
    
    const updatedEmail: Email = { 
      ...email, 
      isStarred: !email.isStarred,
      updatedAt: new Date()
    };
    this.emails.set(id, updatedEmail);
    return updatedEmail;
  }

  async markEmailAsRead(id: number, isRead: boolean): Promise<Email | undefined> {
    const email = this.emails.get(id);
    if (!email) return undefined;
    
    const updatedEmail: Email = { 
      ...email, 
      isRead,
      updatedAt: new Date()
    };
    this.emails.set(id, updatedEmail);
    return updatedEmail;
  }

  // Helper method to find system folders by systemType (language-independent)
  // Note: System folders are now static, this method is deprecated
  private findSystemFolder(userId: number, systemType: string): Folder | undefined {
    // Map system types to their numeric IDs
    const systemFolderMap: { [key: string]: { id: number, name: string, color: string, icon: string } } = {
      'inbox': { id: 1, name: 'Inbox', color: '#6366f1', icon: 'inbox' },
      'archive': { id: 2, name: 'Archive', color: '#f59e0b', icon: 'archive' },
      'sent': { id: 3, name: 'Sent', color: '#10b981', icon: 'send' },
      'drafts': { id: 4, name: 'Drafts', color: '#8b5cf6', icon: 'file-text' },
      'junk': { id: 5, name: 'Junk', color: '#f97316', icon: 'alert-triangle' },
      'trash': { id: 6, name: 'Trash', color: '#ef4444', icon: 'trash2' }
    };

    const folderInfo = systemFolderMap[systemType];
    if (!folderInfo) return undefined;

    return {
      id: folderInfo.id,
      userId,
      name: folderInfo.name,
      type: 'system',
      systemType,
      color: folderInfo.color,
      icon: folderInfo.icon,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Folder;
  }

  // Helper method to find custom folders by exact name
  private findCustomFolder(userId: number, name: string): Folder | undefined {
    return Array.from(this.folders.values())
      .find(f => f.userId === userId && f.name === name && f.type === "custom");
  }

  // Public method to get system folder by systemType - for use in email operations
  async getSystemFolder(userId: number, systemType: string): Promise<Folder | undefined> {
    return this.findSystemFolder(userId, systemType);
  }

  async getEmailsByFolder(userId: number, folderIdentifier: string): Promise<Email[]> {
    // Special case for starred emails - they can be in any folder but marked as starred
    if (folderIdentifier === 'starred') {
      const starredEmails = Array.from(this.emails.values())
        .filter(email => email.userId === userId && email.isStarred)
        .sort((a, b) => {
          const dateA = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
          const dateB = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
          return dateB - dateA;
        });
      
      // Enrich with tags and decrypt
      const enrichedEmails = await Promise.all(starredEmails.map(email => this.enrichEmailWithTags(email)));
      return enrichedEmails.map(email => this.decryptEmailForUser(email, userId));
    }

    // Map folder names to numeric IDs for system folders
    const folderIdMap: { [key: string]: number } = {
      'inbox': 1,
      'archive': 2, 
      'sent': 3,
      'drafts': 4,
      'junk': 5,
      'trash': 6
    };

    let folderEmails: Email[];
    
    // Check if it's a system folder
    if (folderIdMap[folderIdentifier]) {
      // For system folders, filter by numeric folder ID
      const folderId = folderIdMap[folderIdentifier];
      folderEmails = Array.from(this.emails.values())
        .filter(email => email.userId === userId && email.folderId === folderId);
    } else {
      // For custom folders, find by database ID
      const folder = this.findCustomFolder(userId, folderIdentifier);
      if (!folder) return [];
      
      folderEmails = Array.from(this.emails.values())
        .filter(email => email.userId === userId && email.folderId === folder.id);
    }
    
    // Sort by date - use appropriate date field based on folder type
    folderEmails.sort((a, b) => {
      let dateA, dateB;
      
      // For drafts, sort by updatedAt since they don't have receivedAt
      if (folderIdentifier === 'drafts') {
        dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      } 
      // For sent emails, sort by sentAt
      else if (folderIdentifier === 'sent') {
        dateA = a.sentAt ? new Date(a.sentAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        dateB = b.sentAt ? new Date(b.sentAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      }
      // For all other folders, sort by receivedAt
      else {
        dateA = a.receivedAt ? new Date(a.receivedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        dateB = b.receivedAt ? new Date(b.receivedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      }
      
      return dateB - dateA; // Most recent first
    });
    
    // Enrich with tags and decrypt
    const enrichedEmails = await Promise.all(folderEmails.map(email => this.enrichEmailWithTags(email)));
    return enrichedEmails.map(email => this.decryptEmailForUser(email, userId));
  }

  // NEW: Paginated version of getEmailsByFolder with filtering support
  async getEmailsByFolderPaginated(userId: number, folderIdentifier: string, limit: number = 20, offset: number = 0, filters?: { filterBy?: string, sortBy?: string, tagFilter?: number | null }): Promise<{ emails: Email[], totalCount: number }> {
    // Special case for starred emails - they can be in any folder but marked as starred
    if (folderIdentifier === 'starred') {
      const allStarredEmails = Array.from(this.emails.values())
        .filter(email => email.userId === userId && email.isStarred)
        .sort((a, b) => {
          const dateA = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
          const dateB = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
          return dateB - dateA;
        });
      
      const totalCount = allStarredEmails.length;
      const paginatedEmails = allStarredEmails.slice(offset, offset + limit);
      
      // Enrich with tags and decrypt
      const enrichedEmails = await Promise.all(paginatedEmails.map(email => this.enrichEmailWithTags(email)));
      const emails = enrichedEmails.map(email => this.decryptEmailForUser(email, userId));
      
      return { emails, totalCount };
    }

    // Map folder names to numeric IDs for system folders
    const folderIdMap: { [key: string]: number } = {
      'inbox': 1,
      'archive': 2, 
      'sent': 3,
      'drafts': 4,
      'junk': 5,
      'trash': 6
    };

    let folderEmails: Email[];
    
    // Check if it's a system folder
    if (folderIdMap[folderIdentifier]) {
      // For system folders, filter by numeric folder ID
      const folderId = folderIdMap[folderIdentifier];
      folderEmails = Array.from(this.emails.values())
        .filter(email => email.userId === userId && email.folderId === folderId);
    } else {
      // For custom folders, find by database ID
      const folder = this.findCustomFolder(userId, folderIdentifier);
      if (!folder) return { emails: [], totalCount: 0 };
      
      folderEmails = Array.from(this.emails.values())
        .filter(email => email.userId === userId && email.folderId === folder.id);
    }
    
    // Sort by date - use appropriate date field based on folder type
    const sortedEmails = folderEmails
      .sort((a, b) => {
        let dateA, dateB;
        
        // For drafts, sort by updatedAt since they don't have receivedAt
        if (folderIdentifier === 'drafts') {
          dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        } 
        // For sent emails, sort by sentAt
        else if (folderIdentifier === 'sent') {
          dateA = a.sentAt ? new Date(a.sentAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          dateB = b.sentAt ? new Date(b.sentAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        }
        // For all other folders, sort by receivedAt
        else {
          dateA = a.receivedAt ? new Date(a.receivedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          dateB = b.receivedAt ? new Date(b.receivedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        }
        
        return dateB - dateA; // Most recent first
      });

    // Debug log for drafts folder
    if (folderIdentifier === 'drafts') {
      console.log('🔍 DEBUG: Drafts sorting for userId:', userId);
      console.log('Total drafts found:', folderEmails.length);
      console.log('Sorted drafts (first 5):', sortedEmails.slice(0, 5).map(e => ({
        id: e.id,
        subject: e.subject,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        isDraft: e.isDraft
      })));
      console.log('Pagination: offset=', offset, 'limit=', limit);
    }
    
    // Apply filters
    console.log('🔍 BEFORE FILTER:', {
      sortedEmailsCount: sortedEmails.length,
      starredInSorted: sortedEmails.filter(e => e.isStarred).length,
      filters: filters
    });
    
    let filteredEmails = this.applyEmailFilters(sortedEmails, filters);
    
    console.log('🔍 AFTER FILTER:', {
      filteredEmailsCount: filteredEmails.length,
      starredInFiltered: filteredEmails.filter(e => e.isStarred).length
    });
    
    const totalCount = filteredEmails.length;
    const paginatedEmails = filteredEmails.slice(offset, offset + limit);
    
    // Enrich with tags and decrypt
    const enrichedEmails = await Promise.all(paginatedEmails.map(email => this.enrichEmailWithTags(email)));
    const emails = enrichedEmails.map(email => this.decryptEmailForUser(email, userId));
    
    return { emails, totalCount };
  }

  // NEW: Get total count of emails for a specific folder
  async getEmailCountByFolder(userId: number, folderIdentifier: string): Promise<number> {
    // Special case for starred emails
    if (folderIdentifier === 'starred') {
      return Array.from(this.emails.values())
        .filter(email => email.userId === userId && email.isStarred)
        .length;
    }

    // Map folder names to numeric IDs for system folders
    const folderIdMap: { [key: string]: number } = {
      'inbox': 1,
      'archive': 2, 
      'sent': 3,
      'drafts': 4,
      'junk': 5,
      'trash': 6
    };

    // Check if it's a system folder
    if (folderIdMap[folderIdentifier]) {
      const folderId = folderIdMap[folderIdentifier];
      return Array.from(this.emails.values())
        .filter(email => email.userId === userId && email.folderId === folderId)
        .length;
    } else {
      // For custom folders, find by database ID
      const folder = this.findCustomFolder(userId, folderIdentifier);
      if (!folder) return 0;
      
      return Array.from(this.emails.values())
        .filter(email => email.userId === userId && email.folderId === folder.id)
        .length;
    }
  }

  // NEW: Get total count of emails (with optional folder and search filters)
  async getEmailCount(userId: number, folderId?: number, search?: string): Promise<number> {
    let emails = Array.from(this.emails.values())
      .filter(email => email.userId === userId);

    if (folderId) {
      emails = emails.filter(email => email.folderId === folderId);
    }

    if (search) {
      const searchLower = search.toLowerCase().trim();
      
      // Decrypt emails for search count
      const decryptedEmails = emails.map(email => this.decryptEmailForUser(email, userId));
      
      // Enhanced search filter with encrypted field support
      emails = decryptedEmails.filter(email => {
        const searches = [
          // Search in subject (now encrypted)
          email.subject?.toLowerCase().includes(searchLower),
          // Search in body content (encrypted)
          email.body?.toLowerCase().includes(searchLower),
          // Search in sender name (not encrypted)
          email.fromName?.toLowerCase().includes(searchLower),
          // Search in sender address (now encrypted)
          email.fromAddress?.toLowerCase().includes(searchLower),
          // Search in recipient address (encrypted)
          email.toAddress?.toLowerCase().includes(searchLower)
        ];
        
        return searches.some(match => match === true);
      });
    }

    return emails.length;
  }

  async searchEmails(userId: number, query: string, folder?: string): Promise<Email[]> {
    const searchLower = query.toLowerCase().trim();
    
    if (!searchLower) {
      return [];
    }
    
    console.log(`🔍 Searching emails for user ${userId} with query: "${query}" in folder: ${folder || 'all'}`);
    
    // Get all user emails
    let userEmails = Array.from(this.emails.values())
      .filter(email => email.userId === userId);
    
    // Filter by folder if specified (search only in current folder)
    if (folder) {
      const folderMapping: { [key: string]: number } = {
        'inbox': 1,
        'starred': 1, // Starred is filtered separately
        'sent': 3,
        'drafts': 4,
        'junk': 5,
        'trash': 6,
        'archive': 2
      };
      
      if (folder === 'starred') {
        // For starred folder, get emails from any folder that are starred
        userEmails = userEmails.filter(email => email.isStarred);
        console.log(`📂 Filtering by starred emails: ${userEmails.length} emails`);
      } else if (folderMapping[folder]) {
        // Filter by specific system folder ID
        userEmails = userEmails.filter(email => email.folderId === folderMapping[folder]);
        console.log(`📂 Filtering by system folder "${folder}" (ID: ${folderMapping[folder]}): ${userEmails.length} emails`);
      } else {
        // Handle custom folders by name - find folder ID first
        const customFolder = Array.from(this.folders.values())
          .find(f => f.userId === userId && f.name.toLowerCase() === folder.toLowerCase());
        if (customFolder) {
          userEmails = userEmails.filter(email => email.folderId === customFolder.id);
          console.log(`📂 Filtering by custom folder "${folder}" (ID: ${customFolder.id}): ${userEmails.length} emails`);
        } else {
          console.log(`⚠️ Custom folder "${folder}" not found for user ${userId}`);
          return [];
        }
      }
    } else {
      console.log(`📂 Searching in all folders: ${userEmails.length} emails`);
    }
    
    // Decrypt emails for search
    const decryptedEmails = userEmails.map(email => this.decryptEmailForUser(email, userId));
    
    // Enhanced search filter with partial matching support
    const filteredEmails = decryptedEmails.filter(email => {
      const searches = [
        // Search in subject (encrypted field)
        email.subject?.toLowerCase().includes(searchLower),
        // Search in body content (encrypted field)
        email.body?.toLowerCase().includes(searchLower),
        // Search in sender name (not encrypted - partial matching)
        email.fromName?.toLowerCase().includes(searchLower),
        // Search in sender address (now encrypted - partial matching)
        email.fromAddress?.toLowerCase().includes(searchLower),
        // Search in recipient address (encrypted field)
        email.toAddress?.toLowerCase().includes(searchLower)
      ];
      
      return searches.some(match => match === true);
    });
    
    console.log(`🎯 Search results: ${filteredEmails.length} emails found`);
    
    // Sort by relevance and date
    return filteredEmails.sort((a, b) => {
      // Sort by date (most recent first)
      const dateA = a.receivedAt ? new Date(a.receivedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.receivedAt ? new Date(b.receivedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA;
    });
  }

  private applyEmailFilters(emails: Email[], filters?: { filterBy?: string, sortBy?: string, tagFilter?: number | null }): Email[] {
    if (!filters) return emails;
    
    let filtered = emails;
    
    console.log('🔍 APPLY FILTERS DEBUG:', {
      inputEmailsCount: emails.length,
      filterBy: filters.filterBy,
      sortBy: filters.sortBy,
      tagFilter: filters.tagFilter,
      starredEmailsInInput: emails.filter(e => e.isStarred).length
    });
    
    // Apply filterBy
    switch (filters.filterBy) {
      case 'unread':
        filtered = filtered.filter(email => !email.isRead);
        console.log('📧 Unread filter applied:', filtered.length);
        break;
      case 'starred':
        filtered = filtered.filter(email => email.isStarred);
        console.log('⭐ Starred filter applied:', filtered.length);
        break;
      case 'attachments':
        filtered = filtered.filter(email => {
          try {
            const attachments = email.attachments ? JSON.parse(email.attachments) : [];
            return Array.isArray(attachments) && attachments.length > 0;
          } catch {
            return false;
          }
        });
        console.log('📎 Attachments filter applied:', filtered.length);
        break;
      case 'tags':
        if (filters.tagFilter) {
          // Filter by specific tag ID - fix: only show emails with the SPECIFIC tag
          const tagRelations = Array.from(this.emailTags.values())
            .filter(relation => relation.tagId === filters.tagFilter);
          const emailIdsWithTag = tagRelations.map(relation => relation.emailId);
          filtered = filtered.filter(email => emailIdsWithTag.includes(email.id));
          console.log('🏷️ Tags filter applied for tag ID', filters.tagFilter, ':', filtered.length, 'emails');
        } else {
          // If tagFilter is null but filterBy is 'tags', show emails that have ANY tags
          filtered = filtered.filter(email => {
            try {
              const emailTags = email.tags ? JSON.parse(email.tags) : [];
              return Array.isArray(emailTags) && emailTags.length > 0;
            } catch {
              return false;
            }
          });
          console.log('🏷️ Tags filter applied (any tags):', filtered.length);
        }
        break;
      case 'all':
      default:
        console.log('✅ No filtering applied (all)');
        break;
    }
    
    // Apply sorting if different from default
    if (filters.sortBy && filters.sortBy !== 'date') {
      filtered = filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'sender':
            const senderA = (a.fromName || a.fromAddress || '').toLowerCase();
            const senderB = (b.fromName || b.fromAddress || '').toLowerCase();
            return senderA.localeCompare(senderB);
          case 'subject':
            return a.subject.toLowerCase().localeCompare(b.subject.toLowerCase());
          default:
            return 0;
        }
      });
    }
    
    return filtered;
  }

  async getEmailCounts(userId: number): Promise<{ [key: string]: number }> {
    const emails = Array.from(this.emails.values()).filter(email => email.userId === userId);
    const counts: { [key: string]: number } = {};
    
    // Map folder names to numeric IDs
    const folderIdMap: { [key: string]: number } = {
      'inbox': 1,
      'archive': 2, 
      'sent': 3,
      'drafts': 4,
      'junk': 5,
      'trash': 6
    };
    
    // Count for static system folders using numeric IDs
    for (const [folderType, folderId] of Object.entries(folderIdMap)) {
      if (folderType === 'inbox' || folderType === 'junk') {
        // For inbox and junk, only count unread emails
        counts[folderType] = emails.filter(email => 
          email.folderId === folderId && !email.isRead
        ).length;
      } else if (folderType === 'drafts') {
        // For drafts, count all draft emails
        counts[folderType] = emails.filter(email => 
          email.folderId === folderId && email.isDraft
        ).length;
      } else {
        // For other system folders, don't show counts (set to 0)
        counts[folderType] = 0;
      }
    }
    
    // Count for custom folders
    const customFolders = Array.from(this.folders.values())
      .filter(f => f.userId === userId && f.type === 'custom');
    
    for (const folder of customFolders) {
      const folderEmails = emails.filter(email => email.folderId === folder.id);
      counts[folder.name.toLowerCase()] = folderEmails.length;
    }
    
    // Special count for starred emails (across all folders)
    counts.starred = emails.filter(email => email.isStarred).length;
    
    return counts;
  }

  // Email tag methods
  async addEmailTag(emailId: number, tagId: number): Promise<boolean> {
    // Check if the tag relationship already exists
    const existingTag = Array.from(this.emailTags.values())
      .find(tag => tag.emailId === emailId && tag.tagId === tagId);
    
    if (existingTag) return false;

    const id = this.currentEmailTagId++;
    const emailTag: EmailTag = {
      id,
      emailId,
      tagId,
      createdAt: new Date()
    };
    
    this.emailTags.set(id, emailTag);
    return true;
  }

  async removeEmailTag(emailId: number, tagId: number): Promise<boolean> {
    const tagToRemove = Array.from(this.emailTags.entries())
      .find(([_, tag]) => tag.emailId === emailId && tag.tagId === tagId);
    
    if (!tagToRemove) return false;
    
    this.emailTags.delete(tagToRemove[0]);
    return true;
  }

  async getEmailTags(emailId: number): Promise<Tag[]> {
    const emailTagIds = Array.from(this.emailTags.values())
      .filter(emailTag => emailTag.emailId === emailId)
      .map(emailTag => emailTag.tagId);
    
    return Array.from(this.tags.values())
      .filter(tag => emailTagIds.includes(tag.id));
  }

  async getEmailsByTag(userId: number, tagId: number): Promise<Email[]> {
    const emailIds = Array.from(this.emailTags.values())
      .filter(tag => tag.tagId === tagId)
      .map(tag => tag.emailId);
    
    return Array.from(this.emails.values())
      .filter(email => emailIds.includes(email.id) && email.userId === userId);
  }

  // Tag operations
  async getTags(userId: number): Promise<Tag[]> {
    return Array.from(this.tags.values()).filter(tag => tag.userId === userId);
  }

  async getTag(id: number): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const id = this.currentTagId++;
    const tag: Tag = { 
      ...insertTag, 
      id,
      color: insertTag.color || "#6366f1",
      createdAt: new Date()
    };
    this.tags.set(id, tag);
    return tag;
  }

  async updateTag(id: number, updateTag: UpdateTag): Promise<Tag | undefined> {
    const tag = this.tags.get(id);
    if (!tag) return undefined;
    
    const updatedTag: Tag = { ...tag, ...updateTag };
    this.tags.set(id, updatedTag);
    return updatedTag;
  }

  async deleteTag(id: number): Promise<boolean> {
    const tag = this.tags.get(id);
    if (!tag) return false;
    
    // Remove all email-tag associations for this tag
    Array.from(this.emailTags.values())
      .filter(emailTag => emailTag.tagId === id)
      .forEach(emailTag => this.emailTags.delete(emailTag.id));
    
    // Also remove the tag from emails' tags field (JSON string)
    const tagName = tag.name;
    Array.from(this.emails.values()).forEach(email => {
      if (email.tags) {
        try {
          const emailTags = JSON.parse(email.tags);
          if (Array.isArray(emailTags)) {
            const updatedTags = emailTags.filter(t => t.toLowerCase() !== tagName.toLowerCase());
            email.tags = JSON.stringify(updatedTags);
            email.updatedAt = new Date();
          }
        } catch (error) {
          // If tags field is not valid JSON, clear it
          email.tags = null;
        }
      }
    });
    
    this.tags.delete(id);
    return true;
  }

  // Sync existing tags from emails to email_tags table
  private syncExistingTags() {
    const allEmails = Array.from(this.emails.values());
    
    allEmails.forEach(email => {
      if (email.tags) {
        try {
          const tagNames = JSON.parse(email.tags);
          
          tagNames.forEach((tagName: string) => {
            // Find or create tag
            let tag = Array.from(this.tags.values()).find(t => t.name.toLowerCase() === tagName.toLowerCase());
            
            if (!tag) {
              // Create new tag
              const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
              const color = colors[this.currentTagId % colors.length];
              
              tag = {
                id: this.currentTagId++,
                userId: email.userId,
                name: tagName,
                color,
                createdAt: new Date()
              };
              this.tags.set(tag.id, tag);
            }
            
            // Check if email_tag relationship already exists
            const existingEmailTag = Array.from(this.emailTags.values())
              .find(et => et.emailId === email.id && et.tagId === tag!.id);
            
            if (!existingEmailTag) {
              // Create email_tag relationship
              const emailTag: EmailTag = {
                id: this.currentEmailTagId++,
                emailId: email.id,
                tagId: tag.id,
                createdAt: new Date()
              };
              this.emailTags.set(emailTag.id, emailTag);
            }
          });
        } catch (e) {
          // Skip emails with invalid tags JSON
        }
      }
    });
  }

  private startAutoCleanup() {
    // Run cleanup every hour (3600000 ms)
    setInterval(() => {
      this.cleanupOldEmails();
    }, 3600000);
    
    // Run initial cleanup on startup
    this.cleanupOldEmails();
  }

  private cleanupOldEmails() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get all emails
    const emailsToDelete: number[] = [];
    
    Array.from(this.emails.entries()).forEach(([emailId, email]) => {
      // Find trash and junk folders for this user
      const trashFolder = this.findSystemFolder(email.userId, 'trash');
      const junkFolder = this.findSystemFolder(email.userId, 'junk');
      
      // Check if email is in trash or junk and older than 30 days
      if ((email.folderId === trashFolder?.id || email.folderId === junkFolder?.id)) {
        // Use updatedAt for trash (when it was moved to trash) or receivedAt for junk
        const dateToCheck = email.folderId === trashFolder?.id 
          ? email.updatedAt || email.createdAt 
          : email.receivedAt || email.createdAt;
        
        if (dateToCheck && dateToCheck < thirtyDaysAgo) {
          emailsToDelete.push(emailId);
        }
      }
    });
    
    // Delete old emails permanently
    emailsToDelete.forEach(emailId => {
      this.emails.delete(emailId);
      
      // Also delete associated email tags
      const emailTagsToDelete = Array.from(this.emailTags.entries())
        .filter(([_, emailTag]) => emailTag.emailId === emailId)
        .map(([id, _]) => id);
      
      emailTagsToDelete.forEach(emailTagId => {
        this.emailTags.delete(emailTagId);
      });
    });
    
    if (emailsToDelete.length > 0) {
      console.log(`Auto-cleanup: Permanently deleted ${emailsToDelete.length} old emails from trash/junk`);
    }
  }

  // Ensure system folders exist for a user
  // Note: System folders are now static, this method is deprecated but kept for compatibility
  private ensureSystemFolders(userId: number): void {
    // System folders are now static and don't need to be created in database
    // This method is kept for backward compatibility but does nothing
    console.log(`📁 System folders are now static for user ${userId} - no database creation needed`);
  }

  // Active draft management methods
  async createActiveDraft(userId: number, forceNew: boolean = false): Promise<Email> {
    // Check if active draft already exists
    const existingDraft = await this.getActiveDraft(userId);
    if (existingDraft && !forceNew) {
      return existingDraft;
    }
    
    // Clear existing draft if forceNew is true
    if (forceNew) {
      await this.clearActiveDraft(userId);
    }

    // Use drafts folder ID directly (4 = drafts)
    const draftsFolderId = 4;
    
    const draftEmail: Email = {
      id: this.currentEmailId++,
      userId,
      folderId: draftsFolderId, // Use numeric ID for drafts folder
      messageId: `draft-${Date.now()}`,
      subject: '',
      body: '',
      bodyHtml: null,
      fromAddress: '',
      fromName: '',
      toAddress: '',
      toName: null,
      ccAddress: null,
      bccAddress: null,
      replyToAddress: null,
      isRead: true,
      isStarred: false,
      isDraft: true,
      hasAttachments: false,
      attachments: null,
      priority: 'normal',
      tags: null,
      sentAt: null,
      receivedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.emails.set(draftEmail.id, draftEmail);
    this.activeDrafts.set(userId, draftEmail.id);
    
    // Enrich with tags and decrypt before returning
    const enrichedDraft = await this.enrichEmailWithTags(draftEmail);
    return this.decryptEmailForUser(enrichedDraft, userId);
  }

  async getActiveDraft(userId: number): Promise<Email | undefined> {
    const draftId = this.activeDrafts.get(userId);
    if (!draftId) return undefined;
    
    const draft = this.emails.get(draftId);
    if (!draft) {
      this.activeDrafts.delete(userId);
      return undefined;
    }
    
    // Enrich with tags and decrypt before returning
    const enrichedDraft = await this.enrichEmailWithTags(draft);
    return this.decryptEmailForUser(enrichedDraft, userId);
  }

  async clearActiveDraft(userId: number): Promise<void> {
    this.activeDrafts.delete(userId);
  }

  // Convert a draft to a sent email (memory storage implementation)
  async convertDraftToSentEmail(draftId: number, emailData: InsertEmail): Promise<Email> {
    console.log(`📧 Converting draft ${draftId} to sent email`);
    
    // Get the draft email
    const draft = this.emails.get(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    // Add signature if user has one and this is not a draft
    //const user = await this.getUser(emailData.userId);
    //let body = emailData.body || '';
    //if (user?.signature && body) {
    //  body += `\n\n${user.signature}`;
    //}

    // Find sent folder
    const sentFolder = this.findSystemFolder(emailData.userId, 'sent');
    if (!sentFolder) {
      throw new Error('Sent folder not found');
    }

    // Update the draft to become a sent email
    const updatedEmail: Email = {
      ...draft,
      folderId: sentFolder.id, // Move to sent folder
      subject: encryptEmail(emailData.subject || '', emailData.userId),
      body: encryptEmail(emailData.body || '', emailData.userId),
      fromAddress: encryptEmail(emailData.fromAddress || '', emailData.userId),
      toAddress: encryptEmail(emailData.toAddress || '', emailData.userId),
      ccAddress: emailData.ccAddress ? encryptEmail(emailData.ccAddress, emailData.userId) : null,
      bccAddress: emailData.bccAddress ? encryptEmail(emailData.bccAddress, emailData.userId) : null,
      isDraft: false, // No longer a draft
      sentAt: new Date(),
      updatedAt: new Date()
    };

    // Update the email in memory
    this.emails.set(draftId, updatedEmail);
    
    // Clear the active draft reference
    this.activeDrafts.delete(emailData.userId);

    console.log(`✅ Draft ${draftId} converted to sent email successfully`);
    
    return this.decryptEmailForUser(updatedEmail, emailData.userId);
  }

  // Alias operations
  async getAliases(userId: number): Promise<Alias[]> {
    return Array.from(this.aliases.values()).filter(alias => alias.userId === userId);
  }

  async getAlias(id: number): Promise<Alias | undefined> {
    return this.aliases.get(id);
  }

  private generateUniqueAlias(aliasName: string): string {
    const digits = Math.floor(Math.random() * 9000) + 1000; // 4 random digits from 1000-9999
    return `${aliasName.toLowerCase()}.${digits}@email.com`;
  }

  async createAlias(insertAlias: InsertAlias): Promise<Alias> {
    const id = this.currentAliasId++;
    const fullAlias = this.generateUniqueAlias(insertAlias.aliasName);
    
    // Ensure the alias is unique
    while (Array.from(this.aliases.values()).some(a => a.fullAlias === fullAlias)) {
      const newDigits = Math.floor(Math.random() * 9000) + 1000;
      const parts = fullAlias.split('.');
      const newAlias = `${parts[0]}.${newDigits}@email.com`;
      if (!Array.from(this.aliases.values()).some(a => a.fullAlias === newAlias)) {
        break;
      }
    }

    const alias: Alias = {
      id,
      userId: insertAlias.userId,
      title: insertAlias.title,
      aliasName: insertAlias.aliasName,
      fullAlias,
      forwardTo: insertAlias.forwardTo,
      isActive: true,
      tagId: insertAlias.tagId || null,
      createdAt: new Date(),
    };

    this.aliases.set(id, alias);
    return alias;
  }

  async updateAlias(id: number, updateAlias: UpdateAlias): Promise<Alias | undefined> {
    const alias = this.aliases.get(id);
    if (!alias) return undefined;

    const updatedAlias: Alias = { ...alias, ...updateAlias };
    this.aliases.set(id, updatedAlias);
    return updatedAlias;
  }

  async deleteAlias(id: number): Promise<boolean> {
    return this.aliases.delete(id);
  }

  async toggleAliasStatus(id: number): Promise<Alias | undefined> {
    const alias = this.aliases.get(id);
    if (!alias) return undefined;

    const updatedAlias: Alias = { ...alias, isActive: !alias.isActive };
    this.aliases.set(id, updatedAlias);
    return updatedAlias;
  }

  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    try {
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  async updatePassword(userId: number, newPassword: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatedUser: User = { ...user, password: hashedPassword };
      this.users.set(userId, updatedUser);
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      return false;
    }
  }

  // Storage operations
  async getUserStorageInfo(userId: number): Promise<{ used: number; quota: number }> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    
    // Calculate real storage usage from file system
    const actualUsage = await fileStorageService.calculateUserStorageUsage(userId);
    
    // Update user's storage usage in memory
    user.storageUsed = actualUsage;
    
    return {
      used: actualUsage,
      quota: user.storageQuota
    };
  }
  
  async updateUserStorageUsed(userId: number, bytesUsed: number): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    user.storageUsed = bytesUsed;
    return true;
  }
  
  async canUserReceiveEmails(userId: number): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    const actualUsage = await fileStorageService.calculateUserStorageUsage(userId);
    return actualUsage < user.storageQuota;
  }
  
  async processEmailAttachments(userId: number, attachmentFiles: any[]): Promise<string[]> {
    const savedFiles: string[] = [];
    
    if (!attachmentFiles || attachmentFiles.length === 0) {
      return savedFiles;
    }
    
    for (const file of attachmentFiles) {
      try {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        
        // Save file to user's storage folder
        const savedFileName = await fileStorageService.saveFile(userId, fileName, file.buffer);
        savedFiles.push(savedFileName);
      } catch (error) {
        console.error(`Failed to save attachment ${file.name} for user ${userId}:`, error);
        throw error;
      }
    }
    
    return savedFiles;
  }
  
  async cleanupEmailAttachments(userId: number, attachmentPaths: string[]): Promise<void> {
    if (!attachmentPaths || attachmentPaths.length === 0) {
      return;
    }
    
    await fileStorageService.cleanupUserFiles(userId, attachmentPaths);
    
    // Update user's storage usage after cleanup
    const newUsage = await fileStorageService.calculateUserStorageUsage(userId);
    await this.updateUserStorageUsed(userId, newUsage);
  }

  async deleteAttachment(userId: number, filename: string): Promise<boolean> {
    try {
      const success = await fileStorageService.deleteFile(userId, filename);
      
      if (success) {
        // Update user's storage usage after deletion
        const newUsage = await fileStorageService.calculateUserStorageUsage(userId);
        await this.updateUserStorageUsed(userId, newUsage);
      }
      
      return success;
    } catch (error) {
      console.error(`Failed to delete attachment ${filename} for user ${userId}:`, error);
      return false;
    }
  }

  // Blocked senders operations
  async getBlockedSenders(userId: number): Promise<BlockedSender[]> {
    const blockedSenders = Array.from(this.blockedSenders.values())
      .filter(bs => bs.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return blockedSenders;
  }

  async createBlockedSender(blockedSender: InsertBlockedSender): Promise<BlockedSender> {
    const id = this.currentBlockedSenderId++;
    const newBlockedSender: BlockedSender = {
      ...blockedSender,
      id,
      createdAt: new Date()
    };
    
    this.blockedSenders.set(id, newBlockedSender);
    return newBlockedSender;
  }

  async deleteBlockedSender(id: number): Promise<boolean> {
    const exists = this.blockedSenders.has(id);
    if (exists) {
      this.blockedSenders.delete(id);
    }
    return exists;
  }
}

export const storage = new MemStorage();
