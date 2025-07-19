import { eq, desc, and, or, like, sql, count } from 'drizzle-orm';
import { db } from './db-production';
import { 
  users, emails, folders, tags, emailTags, aliases,
  type User, type Email, type Folder, type Tag, type Alias,
  type InsertUser, type UpdateUser, type InsertEmail, type UpdateEmail,
  type InsertFolder, type UpdateFolder, type InsertTag, type UpdateTag,
  type InsertAlias, type UpdateAlias, type EmailTag
} from '@shared/schema';
import { encryptEmail, decryptEmail } from './crypto';
import { fileStorageService } from './file-storage';
import bcrypt from 'bcrypt';
import type { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    // Insert user 
    await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    });

    // Get the newly created user by email (unique field)
    const [user] = await db.select().from(users).where(eq(users.email, insertUser.email));
    
    if (!user) {
      throw new Error('Failed to create user');
    }

    // Create user storage folder
    await fileStorageService.createUserStorageFolder(user.id);
    
    // Create system folders for the new user
    await this.createSystemFolders(user.id);
    
    return user;
  }

  async updateUser(id: number, updateUser: UpdateUser): Promise<User | undefined> {
    console.log('updateUser called with id:', id, 'data:', updateUser);
    
    // Filter out undefined values and empty strings, but ALLOW null values for clearing fields
    const filteredUpdate = Object.fromEntries(
      Object.entries(updateUser).filter(([_, value]) => 
        value !== undefined && 
        value !== ''
      )
    );
    
    console.log('Filtered update data (null values preserved):', filteredUpdate);
    
    // If no valid fields to update, return current user
    if (Object.keys(filteredUpdate).length === 0) {
      console.log('No valid fields to update, returning current user');
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    }
    
    try {
      console.log('Executing update query...');
      const result = await db.update(users)
        .set(filteredUpdate)
        .where(eq(users.id, id));
      
      console.log('Update result:', result);
      
      // Fetch the updated user
      const [user] = await db.select().from(users).where(eq(users.id, id));
      console.log('Updated user fetched:', user);
      return user;
    } catch (error) {
      console.error('SQL Error in updateUser:', error);
      throw error;
    }
  }

  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    return await bcrypt.compare(password, user.password);
  }

  async updatePassword(userId: number, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
    return result.length > 0;
  }

  // Method to create default system folders for a new user
  async createSystemFolders(userId: number): Promise<void> {
    const systemFolders = [
      { 
        userId, 
        name: "Inbox", 
        type: "system", 
        systemType: "inbox", 
        color: "#6366f1", 
        icon: "mail" 
      },
      { 
        userId, 
        name: "Starred", 
        type: "system", 
        systemType: "starred", 
        color: "#f59e0b", 
        icon: "star" 
      },
      { 
        userId, 
        name: "Sent", 
        type: "system", 
        systemType: "sent", 
        color: "#10b981", 
        icon: "send-horizontal" 
      },
      { 
        userId, 
        name: "Drafts", 
        type: "system", 
        systemType: "drafts", 
        color: "#8b5cf6", 
        icon: "file-text" 
      },
      { 
        userId, 
        name: "Junk", 
        type: "system", 
        systemType: "junk", 
        color: "#f97316", 
        icon: "alert-triangle" 
      },
      { 
        userId, 
        name: "Trash", 
        type: "system", 
        systemType: "trash", 
        color: "#ef4444", 
        icon: "trash-2" 
      }
    ];

    for (const folder of systemFolders) {
      await db.insert(folders).values(folder);
    }
  }

  // Method to update existing users' system folders to the new standard
  async updateSystemFoldersForAllUsers(): Promise<void> {
    console.log('📁 Updating system folders for all users...');
    
    // Get all users
    const allUsers = await db.select({ id: users.id }).from(users);
    
    for (const user of allUsers) {
      console.log(`📁 Updating folders for user ${user.id}`);
      
      // Delete existing system folders for this user
      await db.delete(folders).where(
        and(
          eq(folders.userId, user.id),
          eq(folders.type, "system")
        )
      );
      
      // Create new standardized system folders
      await this.createSystemFolders(user.id);
    }
    
    console.log('✅ System folders updated for all users');
  }

  // Folder operations
  async getFolders(userId: number): Promise<Folder[]> {
    return await db.select().from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(folders.type, folders.name);
  }

  async getFolder(id: number): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.id, id));
    return folder;
  }

  async getSystemFolder(userId: number, systemType: string): Promise<Folder | undefined> {
    // Return static system folders - no longer stored in database

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

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const result = await db.insert(folders).values({
      ...insertFolder,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const insertId = result.insertId || result[0]?.insertId;
    if (!insertId) {
      throw new Error('Failed to get insert ID');
    }
    
    const [folder] = await db.select().from(folders).where(eq(folders.id, Number(insertId)));
    if (!folder) throw new Error('Failed to create folder');
    return folder;
  }

  async updateFolder(id: number, updateFolder: UpdateFolder): Promise<Folder | undefined> {
    const [folder] = await db.update(folders)
      .set(updateFolder)
      .where(eq(folders.id, id))
    return folder;
  }

  async deleteFolder(id: number): Promise<boolean> {
    // Move emails to inbox before deleting folder
    const folder = await this.getFolder(id);
    if (!folder) return false;

    const inboxFolder = await this.getSystemFolder(folder.userId, 'inbox');
    if (inboxFolder) {
      await db.update(emails)
        .set({ folderId: inboxFolder.id })
        .where(eq(emails.folderId, id));
    }

    const result = await db.delete(folders).where(eq(folders.id, id));
    return result.length > 0;
  }

  // Tag operations
  async getTags(userId: number): Promise<Tag[]> {
    return await db.select().from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(tags.name);
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const result = await db.insert(tags).values(insertTag);
    
    // Get insertId properly for MySQL - try different possible locations
    let insertId: number | undefined;
    
    // Try common properties where insertId might be stored
    if (typeof result.insertId === 'number' && result.insertId > 0) {
      insertId = result.insertId;
    } else if (typeof (result as any).insertId === 'number' && (result as any).insertId > 0) {
      insertId = (result as any).insertId;
    } else if (typeof (result as any).lastInsertRowid === 'number' && (result as any).lastInsertRowid > 0) {
      insertId = (result as any).lastInsertRowid;
    } else if (typeof (result as any).lastInsertId === 'number' && (result as any).lastInsertId > 0) {
      insertId = (result as any).lastInsertId;
    } else if (Array.isArray(result) && result.length > 0 && typeof result[0].insertId === 'number') {
      insertId = result[0].insertId;
    }
    
    if (!insertId) {
      throw new Error('Failed to get insert ID from database. Result: ' + JSON.stringify(result));
    }
    
    // Fetch the created tag
    const [tag] = await db.select().from(tags).where(eq(tags.id, insertId));
    if (!tag) throw new Error('Failed to create tag');
    
    return tag;
  }

  async updateTag(id: number, updateTag: UpdateTag): Promise<Tag | undefined> {
    await db.update(tags)
      .set(updateTag)
      .where(eq(tags.id, id));
    
    // Fetch the updated tag
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async deleteTag(id: number): Promise<boolean> {
    // Remove tag associations first
    await db.delete(emailTags).where(eq(emailTags.tagId, id));
    
    const result = await db.delete(tags).where(eq(tags.id, id));
    return result.length > 0;
  }

  // Email tag operations
  async addEmailTag(emailId: number, tagId: number): Promise<boolean> {
    try {
      await db.insert(emailTags).values({ emailId, tagId });
      return true;
    } catch {
      return false;
    }
  }

  async removeEmailTag(emailId: number, tagId: number): Promise<boolean> {
    const result = await db.delete(emailTags)
      .where(and(eq(emailTags.emailId, emailId), eq(emailTags.tagId, tagId)));
    return result.length > 0;
  }

  async getEmailTags(emailId: number): Promise<Tag[]> {
    const result = await db.select({
      id: tags.id,
      userId: tags.userId,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    })
    .from(emailTags)
    .innerJoin(tags, eq(emailTags.tagId, tags.id))
    .where(eq(emailTags.emailId, emailId));
    
    return result;
  }

  async getEmailsByTag(userId: number, tagId: number): Promise<Email[]> {
    const emailsWithTags = await db.select()
      .from(emails)
      .innerJoin(emailTags, eq(emails.id, emailTags.emailId))
      .where(and(eq(emails.userId, userId), eq(emailTags.tagId, tagId)))
      .orderBy(desc(emails.receivedAt));

    return await Promise.all(
      emailsWithTags.map(async ({ emails: email }) => {
        const decryptedEmail = this.decryptEmailForUser(email, userId);
        return await this.enrichEmailWithTags(decryptedEmail);
      })
    );
  }

  // Active draft management
  async createActiveDraft(userId: number, forceNew: boolean = false): Promise<Email> {
    console.log('📝 Creating NEW active draft for user:', userId, 'forceNew:', forceNew);

    // Always cleanup and create new draft if forceNew is true or none exists
    await this.clearActiveDraft(userId);
    await this.cleanupEmptyDrafts(userId);

    // Use drafts folder ID directly (4 = drafts) - static system folder
    const draftsFolderId = 4;

    const draftData = {
      userId,
      folderId: draftsFolderId, // Use static numeric ID for drafts folder
      fromAddress: '',
      toAddress: encryptEmail('', userId),
      subject: encryptEmail('', userId),
      body: encryptEmail('', userId),
      isDraft: 1, // MySQL tinyint for boolean
      isActiveDraft: 1, // MySQL tinyint for boolean
      isRead: 0,
      isStarred: 0
    };

    // Insert draft and get the result
    const result = await db.insert(emails).values(draftData);
    
    // Get insertId properly for MySQL - try different possible locations
    let insertId: number | undefined;
    
    // Try common properties where insertId might be stored
    if (typeof result.insertId === 'number' && result.insertId > 0) {
      insertId = result.insertId;
    } else if (typeof (result as any).insertId === 'number' && (result as any).insertId > 0) {
      insertId = (result as any).insertId;
    } else if (typeof (result as any).lastInsertRowid === 'number' && (result as any).lastInsertRowid > 0) {
      insertId = (result as any).lastInsertRowid;
    } else if (typeof (result as any).lastInsertId === 'number' && (result as any).lastInsertId > 0) {
      insertId = (result as any).lastInsertId;
    } else if (Array.isArray(result) && result.length > 0 && typeof result[0].insertId === 'number') {
      insertId = result[0].insertId;
    }
    
    console.log('📝 Created active draft with ID:', insertId);
    
    if (!insertId) {
      throw new Error('Failed to get insert ID from database. Result: ' + JSON.stringify(result));
    }
    
    // Fetch the created draft
    const [draft] = await db.select().from(emails).where(eq(emails.id, insertId));
    if (!draft) throw new Error('Failed to create draft');
    
    return this.decryptEmailForUser(draft, userId);
  }

  async getActiveDraft(userId: number): Promise<Email | undefined> {
    const [draft] = await db.select().from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.isActiveDraft, 1)));
    
    if (!draft) return undefined;
    return this.decryptEmailForUser(draft, userId);
  }

  async clearActiveDraft(userId: number): Promise<void> {
    await db.update(emails)
      .set({ isActiveDraft: 0 })
      .where(and(eq(emails.userId, userId), eq(emails.isActiveDraft, 1)));
  }

  // Cleanup empty drafts for a user
  async cleanupEmptyDrafts(userId: number): Promise<void> {
    console.log(`🧹 Cleaning up empty drafts for user ${userId}`);
    
    // Delete drafts that are empty (empty subject and body)
    const deletedCount = await db.delete(emails)
      .where(and(
        eq(emails.userId, userId),
        eq(emails.isDraft, 1),
        eq(emails.isActiveDraft, 0), // Don't delete active drafts
        or(
          eq(emails.subject, encryptEmail('', userId)),
          eq(emails.body, encryptEmail('', userId))
        )
      ));
    
    console.log(`🧹 Cleaned up ${deletedCount} empty drafts`);
  }

  // Convert a draft to a sent email
  async convertDraftToSentEmail(draftId: number, emailData: InsertEmail): Promise<Email> {
    console.log(`📧 Converting draft ${draftId} to sent email`);
    
    // Get the draft email
    const [draft] = await db.select().from(emails).where(eq(emails.id, draftId));
    if (!draft) {
      throw new Error('Draft not found');
    }

    // Add signature if user has one
    //const user = await this.getUser(emailData.userId);
    let body = emailData.body || '';
    //if (user?.signature && body) {
    //  body += `\n\n${user.signature}`;
    //}

    // Update the draft to become a sent email
    const updateData = {
      folderId: 3, // Move to sent folder (3 = sent)
      subject: encryptEmail(emailData.subject || '', emailData.userId),
      body: encryptEmail(body, emailData.userId),
      fromAddress: emailData.fromAddress || '',
      toAddress: encryptEmail(emailData.toAddress || '', emailData.userId),
      ccAddress: emailData.ccAddress ? encryptEmail(emailData.ccAddress, emailData.userId) : null,
      bccAddress: emailData.bccAddress ? encryptEmail(emailData.bccAddress, emailData.userId) : null,
      isDraft: 0, // No longer a draft
      isActiveDraft: 0, // No longer an active draft
      sentAt: new Date(),
      updatedAt: new Date()
    };

    // Update the existing draft
    await db.update(emails)
      .set(updateData)
      .where(eq(emails.id, draftId));

    // Fetch the updated email
    const [sentEmail] = await db.select().from(emails).where(eq(emails.id, draftId));
    if (!sentEmail) {
      throw new Error('Failed to convert draft to sent email');
    }

    console.log(`✅ Draft ${draftId} converted to sent email successfully`);
    
    const decryptedEmail = this.decryptEmailForUser(sentEmail, sentEmail.userId);
    return await this.enrichEmailWithTags(decryptedEmail);
  }

  // Email operations with encryption
  private encryptEmailForStorage(email: InsertEmail | UpdateEmail, userId: number): any {
    const encrypted = { ...email };
    
    if (email.toAddress) encrypted.toAddress = encryptEmail(email.toAddress, userId);
    if (email.ccAddress) encrypted.ccAddress = encryptEmail(email.ccAddress, userId);
    if (email.bccAddress) encrypted.bccAddress = encryptEmail(email.bccAddress, userId);
    if (email.subject) encrypted.subject = encryptEmail(email.subject, userId);
    if (email.body) encrypted.body = encryptEmail(email.body, userId);
    
    // Handle attachments - NEVER encrypt attachments, just save them as-is
    if (email.attachments !== undefined) {
      // If attachments is a string (JSON), parse it to object for database
      if (typeof email.attachments === 'string') {
        try {
          encrypted.attachments = JSON.parse(email.attachments);
        } catch (error) {
          console.error('Error parsing attachments JSON in encryption:', error);
          encrypted.attachments = null;
        }
      } else {
        // If attachments is already an object/array, use it directly
        encrypted.attachments = email.attachments;
      }
      
      // Ensure hasAttachments is correctly set based on actual attachments
      encrypted.hasAttachments = encrypted.attachments && Array.isArray(encrypted.attachments) && encrypted.attachments.length > 0 ? 1 : 0;
      
      console.log('📎 ATTACHMENTS DEBUG - Processing attachments in encryption:', {
        originalAttachments: email.attachments,
        originalType: typeof email.attachments,
        encryptedAttachments: encrypted.attachments,
        encryptedType: typeof encrypted.attachments,
        hasAttachments: encrypted.hasAttachments,
        attachmentsCount: Array.isArray(encrypted.attachments) ? encrypted.attachments.length : 0
      });
    }
    
    // Handle hasAttachments flag - calculate based on attachments if not explicitly provided
    if (email.hasAttachments !== undefined) {
      encrypted.hasAttachments = email.hasAttachments ? 1 : 0;
    } else if (encrypted.attachments && Array.isArray(encrypted.attachments)) {
      // Calculate hasAttachments based on the processed attachments
      encrypted.hasAttachments = encrypted.attachments.length > 0 ? 1 : 0;
    }
    
    console.log('📎 ATTACHMENTS DEBUG - Preserving hasAttachments flag:', {
      originalHasAttachments: email.hasAttachments,
      encryptedHasAttachments: encrypted.hasAttachments,
      attachmentsLength: Array.isArray(encrypted.attachments) ? encrypted.attachments.length : 0
    });
    
    return encrypted;
  }

  private decryptEmailForUser(email: Email, userId: number): Email {
    const decrypted = { ...email };
    
    try {
      if (email.toAddress) decrypted.toAddress = decryptEmail(email.toAddress, userId);
      if (email.ccAddress) decrypted.ccAddress = decryptEmail(email.ccAddress, userId);
      if (email.bccAddress) decrypted.bccAddress = decryptEmail(email.bccAddress, userId);
      if (email.subject) decrypted.subject = decryptEmail(email.subject, userId);
      if (email.body) decrypted.body = decryptEmail(email.body, userId);
      
      // Handle attachments - parse JSON string to array if needed
      if (email.attachments) {
        try {
          // If attachments is a string (from database), parse it to array
          if (typeof email.attachments === 'string') {
            decrypted.attachments = JSON.parse(email.attachments);
            console.log('📎 DECRYPT DEBUG - Parsed attachments from JSON string:', {
              originalAttachments: email.attachments.substring(0, 100) + '...',
              parsedAttachments: decrypted.attachments,
              attachmentsCount: Array.isArray(decrypted.attachments) ? decrypted.attachments.length : 0
            });
          } else {
            // If attachments is already an array, use it directly
            decrypted.attachments = email.attachments;
          }
        } catch (error) {
          console.error('Error parsing attachments during decryption:', error);
          decrypted.attachments = [];
        }
      }
    } catch (error) {
      console.error('Decryption error for email:', email.id, error);
    }
    
    return decrypted;
  }


  private async enrichEmailWithTags(email: Email): Promise<Email> {
    const emailTags = await this.getEmailTags(email.id);
    // Convert Tag objects to just tag names (strings) to match frontend expectations
    const tagNames = emailTags.map(tag => tag.name);
    return {
      ...email,
      tags: JSON.stringify(tagNames)
    };
  }

  async getEmails(userId: number, folderId?: number, search?: string, limit: number = 50, offset: number = 0): Promise<Email[]> {
    let query = db.select().from(emails).$dynamic();

    // Filter by user
    query = query.where(eq(emails.userId, userId));

    // Filter by folder if specified
    if (folderId) {
      query = query.where(eq(emails.folderId, folderId));
    }

    // Add search functionality (searches decrypted content)
    if (search) {
      // Note: This is a simplified search. In production, you might want
      // to implement full-text search or search in decrypted content
      query = query.where(
        or(
          like(emails.fromAddress, `%${search}%`),
          like(emails.fromName, `%${search}%`)
        )
      );
    }

    const emailResults = await query
      .orderBy(desc(emails.receivedAt))
      .limit(limit)
      .offset(offset);

    // Decrypt and enrich emails
    return await Promise.all(
      emailResults.map(async (email) => {
        const decryptedEmail = this.decryptEmailForUser(email, userId);
        return await this.enrichEmailWithTags(decryptedEmail);
      })
    );
  }

  async getEmail(id: number): Promise<Email | undefined> {
    const [email] = await db.select().from(emails).where(eq(emails.id, id));
    if (!email) return undefined;

    const decryptedEmail = this.decryptEmailForUser(email, email.userId);
    return await this.enrichEmailWithTags(decryptedEmail);
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    console.log('📧 createEmail called with isDraft:', insertEmail.isDraft, 'messageId:', insertEmail.messageId);
    
    // If this is a sent email (not a draft), handle draft cleanup
    if (!insertEmail.isDraft) {
      // First, check if there's an active draft to convert
      const activeDraft = await this.getActiveDraft(insertEmail.userId);
      if (activeDraft) {
        // Convert the existing draft to a sent email instead of creating a new one
        console.log('📧 Converting existing active draft to sent email');
        const sentEmail = await this.convertDraftToSentEmail(activeDraft.id, insertEmail);
        return sentEmail;
      }
    }

    // If this is a draft and messageId suggests it's from the frontend compose modal,
    // check if there's already an active draft to prevent duplication
    if (insertEmail.isDraft && insertEmail.messageId?.startsWith('draft-')) {
      const existingActiveDraft = await this.getActiveDraft(insertEmail.userId);
      if (existingActiveDraft) {
        console.log('📧 Updating existing active draft instead of creating new one');
        // Update the existing draft instead of creating a new one
        // CRITICAL: Include ALL fields from insertEmail, including attachments
        const updateData = {
          subject: insertEmail.subject || '',
          body: insertEmail.body || '',
          toAddress: insertEmail.toAddress || '',
          ccAddress: insertEmail.ccAddress || null,
          bccAddress: insertEmail.bccAddress || null,
          // CRITICAL FIX: Include attachments in the update
          attachments: insertEmail.attachments,
          hasAttachments: insertEmail.hasAttachments,
          updatedAt: new Date()
        };
        
        console.log('📎 ATTACHMENTS DEBUG - Updating active draft with attachments:', {
          attachments: updateData.attachments,
          hasAttachments: updateData.hasAttachments,
          attachmentsType: typeof updateData.attachments
        });
        
        await this.updateEmail(existingActiveDraft.id, updateData);
        return await this.getEmail(existingActiveDraft.id) as Email;
      }
    }

    console.log('📧 Creating new email in database');
    console.log('📎 ATTACHMENTS DEBUG - Input email data:', {
      attachments: insertEmail.attachments,
      hasAttachments: insertEmail.hasAttachments,
      attachmentsType: typeof insertEmail.attachments,
      attachmentsContent: typeof insertEmail.attachments === 'string' ? insertEmail.attachments.substring(0, 100) + '...' : insertEmail.attachments
    });
    
    const encryptedEmail = this.encryptEmailForStorage(insertEmail, insertEmail.userId);
    
    console.log('📎 ATTACHMENTS DEBUG - Encrypted email data before DB insert:', {
      attachments: encryptedEmail.attachments,
      hasAttachments: encryptedEmail.hasAttachments,
      attachmentsType: typeof encryptedEmail.attachments
    });
    
    // Insert the email into the database
    const result = await db.insert(emails).values(encryptedEmail);
    const insertId = result.insertId || result[0]?.insertId;
    
    if (!insertId) {
      throw new Error('Failed to create email');
    }

    console.log('📧 New email created with ID:', insertId);

    // Fetch the created email
    const [email] = await db.select().from(emails).where(eq(emails.id, Number(insertId)));
    if (!email) {
      throw new Error('Failed to retrieve created email');
    }

    const decryptedEmail = this.decryptEmailForUser(email, email.userId);
    return await this.enrichEmailWithTags(decryptedEmail);
  }

  async updateEmail(id: number, updateEmail: UpdateEmail): Promise<Email | undefined> {
    // Get raw database record to access original attachment data
    const [rawEmail] = await db.select().from(emails).where(eq(emails.id, id));
    if (!rawEmail) return undefined;
    
    // Also get decrypted version for user ID and other data
    const existingEmail = await this.getEmail(id);
    if (!existingEmail) return undefined;

    console.log(`📝 Updating email ${id} - Original data:`, {
      subject: updateEmail.subject?.substring(0, 20) + '...',
      body: updateEmail.body?.substring(0, 30) + '...'
    });

    console.log('📎 ATTACHMENTS DEBUG - Update email input data:', {
      attachments: updateEmail.attachments,
      hasAttachments: updateEmail.hasAttachments,
      attachmentsType: typeof updateEmail.attachments
    });

    console.log('📎 ATTACHMENTS DEBUG - Raw database email data:', {
      rawAttachments: rawEmail.attachments,
      rawHasAttachments: rawEmail.hasAttachments,
      rawAttachmentsType: typeof rawEmail.attachments
    });

    // CRITICAL FIX: Preserve existing attachments if not provided in update
    const updateWithPreservedAttachments = { ...updateEmail };
    
    // If attachments are not provided in the update, preserve existing ones from raw database record
    if (updateEmail.attachments === undefined && rawEmail.attachments) {
      updateWithPreservedAttachments.attachments = rawEmail.attachments;
      updateWithPreservedAttachments.hasAttachments = rawEmail.hasAttachments;
      console.log('📎 PRESERVING existing attachments from database:', {
        preservedAttachments: rawEmail.attachments,
        preservedHasAttachments: rawEmail.hasAttachments
      });
    }

    const encryptedUpdate = this.encryptEmailForStorage(updateWithPreservedAttachments, existingEmail.userId);
    
    console.log(`🔐 Encrypted update data:`, {
      subject: encryptedUpdate.subject?.substring(0, 20) + '...',
      body: encryptedUpdate.body?.substring(0, 30) + '...'
    });

    await db.update(emails)
      .set(encryptedUpdate)
      .where(eq(emails.id, id));

    // Fetch the updated email
    const [updatedEmail] = await db.select().from(emails).where(eq(emails.id, id));
    if (!updatedEmail) return undefined;

    const decryptedEmail = this.decryptEmailForUser(updatedEmail, updatedEmail.userId);
    
    console.log(`🔓 Decrypted response data:`, {
      subject: decryptedEmail.subject?.substring(0, 20) + '...',
      body: decryptedEmail.body?.substring(0, 30) + '...'
    });

    const enrichedEmail = await this.enrichEmailWithTags(decryptedEmail);
    
    // Security validation: ensure no encrypted data leaks to frontend
    if (enrichedEmail.subject?.includes('U2FsdGVkX1') || 
        enrichedEmail.body?.includes('U2FsdGVkX1') ||
        enrichedEmail.toAddress?.includes('U2FsdGVkX1')) {
      console.error('⚠️ SECURITY WARNING: Encrypted data detected in response, re-decrypting...');
      
      // Force re-decryption if encrypted data detected
      const reDecrypted = this.decryptEmailForUser(enrichedEmail, existingEmail.userId);
      return await this.enrichEmailWithTags(reDecrypted);
    }

    return enrichedEmail;
  }

  async deleteEmail(id: number): Promise<boolean> {
    const email = await this.getEmail(id);
    if (!email) return false;

    // Clean up attachments
    if (email.attachments) {
      try {
        const attachmentPaths = JSON.parse(email.attachments);
        await this.cleanupEmailAttachments(email.userId, attachmentPaths);
      } catch (error) {
        console.error('Error cleaning up attachments:', error);
      }
    }

    // Remove email tags
    await db.delete(emailTags).where(eq(emailTags.emailId, id));
    
    // Delete email
    const result = await db.delete(emails).where(eq(emails.id, id));
    return result.length > 0;
  }

  async moveEmail(id: number, folderId: number): Promise<Email | undefined> {
    const [email] = await db.update(emails)
      .set({ folderId })
      .where(eq(emails.id, id))

    if (!email) return undefined;
    const decryptedEmail = this.decryptEmailForUser(email, email.userId);
    return await this.enrichEmailWithTags(decryptedEmail);
  }

  async toggleEmailStar(id: number): Promise<Email | undefined> {
    const existingEmail = await this.getEmail(id);
    if (!existingEmail) return undefined;

    await db.update(emails)
      .set({ isStarred: existingEmail.isStarred ? 0 : 1 })
      .where(eq(emails.id, id));

    // Fetch the updated email
    const [updatedEmail] = await db.select().from(emails).where(eq(emails.id, id));
    if (!updatedEmail) return undefined;

    const decryptedEmail = this.decryptEmailForUser(updatedEmail, updatedEmail.userId);
    return await this.enrichEmailWithTags(decryptedEmail);
  }

  async markEmailAsRead(id: number, isRead: boolean): Promise<Email | undefined> {
    await db.update(emails)
      .set({ isRead: isRead ? 1 : 0 })
      .where(eq(emails.id, id));

    // Fetch the updated email
    const [updatedEmail] = await db.select().from(emails).where(eq(emails.id, id));
    if (!updatedEmail) return undefined;

    const decryptedEmail = this.decryptEmailForUser(updatedEmail, updatedEmail.userId);
    return await this.enrichEmailWithTags(decryptedEmail);
  }

  async getEmailsByFolder(userId: number, folderIdentifier: string): Promise<Email[]> {
    let folder: Folder | undefined;

    // Try to find system folder first
    folder = await this.getSystemFolder(userId, folderIdentifier);

    // If not found, try to find custom folder by name
    if (!folder) {
      const [customFolder] = await db.select().from(folders)
        .where(and(
          eq(folders.userId, userId),
          eq(folders.name, folderIdentifier)
        ));
      folder = customFolder;
    }

    if (!folder) return [];

    return await this.getEmails(userId, folder.id);
  }

  async getEmailsByFolderPaginated(userId: number, folderIdentifier: string, limit: number = 20, offset: number = 0, filters?: { filterBy?: string, sortBy?: string, tagFilter?: number | null }): Promise<{ emails: Email[], totalCount: number }> {
    let folder: Folder | undefined;

    // Try to find system folder first
    folder = await this.getSystemFolder(userId, folderIdentifier);
    console.log(folder)
    // If not found, try to find custom folder by name
    if (!folder) {
      const [customFolder] = await db.select().from(folders)
        .where(and(
          eq(folders.userId, userId),
          eq(folders.name, folderIdentifier)
        ));
                console.log('not folder')
      folder = customFolder;
    }

    if (!folder) return { emails: [], totalCount: 0 };

    // Handle special case for starred emails
    if (folderIdentifier === 'starred') {
      const [countResult] = await db.select({ count: count() })
        .from(emails)
        .where(and(eq(emails.userId, userId), eq(emails.isStarred, 1)));
      
      const totalCount = countResult.count;
      
      const starredEmails = await db.select().from(emails)
        .where(and(eq(emails.userId, userId), eq(emails.isStarred, 1)))
        .orderBy(desc(emails.receivedAt))
        .limit(limit)
        .offset(offset);
      
      const emailsResult = await Promise.all(
        starredEmails.map(async (email) => {
          const decryptedEmail = this.decryptEmailForUser(email, userId);
          return await this.enrichEmailWithTags(decryptedEmail);
        })
      );
      
      return { emails: emailsResult, totalCount };
    }

    // Get total count for the folder
    const [countResult] = await db.select({ count: count() })
      .from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.folderId, folder.id)));
    
    const totalCount = countResult.count;

    // Get ALL emails for the folder first (without pagination) to apply filters
    let allEmailsQuery;
    if (folderIdentifier === 'drafts') {
      // For drafts, order by updatedAt since receivedAt is null
      allEmailsQuery = await db.select().from(emails)
        .where(and(eq(emails.userId, userId), eq(emails.folderId, folder.id)))
        .orderBy(desc(emails.updatedAt));
    } else if (folderIdentifier === 'sent') {
      // For sent emails, order by sentAt
      allEmailsQuery = await db.select().from(emails)
        .where(and(eq(emails.userId, userId), eq(emails.folderId, folder.id)))
        .orderBy(desc(emails.sentAt));
    } else {
      // For other folders, order by receivedAt
      allEmailsQuery = await db.select().from(emails)
        .where(and(eq(emails.userId, userId), eq(emails.folderId, folder.id)))
        .orderBy(desc(emails.receivedAt));
    }

    // Decrypt and enrich all emails first
    const allEmailsDecrypted = await Promise.all(
      allEmailsQuery.map(async (email) => {
        const decryptedEmail = this.decryptEmailForUser(email, userId);
        return await this.enrichEmailWithTags(decryptedEmail);
      })
    );

    // Apply filters on the decrypted emails
    console.log('🔍 FILTER DEBUG (Production):', {
      userId,
      folderType: folderIdentifier,
      filterBy: filters?.filterBy || 'all',
      sortBy: filters?.sortBy || 'date',
      tagFilter: filters?.tagFilter || null,
      totalEmails: allEmailsDecrypted.length
    });

    const filteredEmails = await this.applyEmailFilters(allEmailsDecrypted, filters, userId);
    
    // Update total count to reflect filtered results
    const filteredTotalCount = filteredEmails.length;
    
    console.log('📊 FILTER RESULT (Production):', { 
      totalFound: filteredTotalCount, 
      emailsReturned: Math.min(limit, filteredTotalCount - offset),
      starredEmails: filteredEmails.filter(e => e.isStarred).length 
    });

    // Apply pagination to filtered results
    const paginatedEmails = filteredEmails.slice(offset, offset + limit);

    return { emails: paginatedEmails, totalCount: filteredTotalCount };
  }

  async getEmailCount(userId: number, folderIdentifier: string): Promise<number> {
    let folder: Folder | undefined;

    // Try to find system folder first
    folder = await this.getSystemFolder(userId, folderIdentifier);
    
    // If not found, try to find custom folder by name
    if (!folder) {
      const [customFolder] = await db.select().from(folders)
        .where(and(
          eq(folders.userId, userId),
          eq(folders.name, folderIdentifier)
        ));
      folder = customFolder;
    }

    if (!folder) return 0;

    // Handle special case for starred emails
    if (folderIdentifier === 'starred') {
      const [countResult] = await db.select({ count: count() })
        .from(emails)
        .where(and(eq(emails.userId, userId), eq(emails.isStarred, 1)));
      
      return countResult.count;
    }

    // Get count for the folder
    const [countResult] = await db.select({ count: count() })
      .from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.folderId, folder.id)));
    
    return countResult.count;
  }

  async getEmailCountByFolder(userId: number, folderIdentifier: string): Promise<number> {
    return await this.getEmailCount(userId, folderIdentifier);
  }

  async searchEmails(userId: number, query: string): Promise<Email[]> {
    return await this.getEmails(userId, undefined, query);
  }

  async getEmailCounts(userId: number): Promise<{ [key: string]: number }> {
    const userFolders = await this.getFolders(userId);
    const counts: { [key: string]: number } = {};

    for (const folder of userFolders) {
      const [result] = await db.select({ count: count() })
        .from(emails)
        .where(and(eq(emails.userId, userId), eq(emails.folderId, folder.id)));
      
      const folderKey = folder.systemType || folder.name.toLowerCase();
      counts[folderKey] = result.count;
    }

    // Add starred count
    const [starredResult] = await db.select({ count: count() })
      .from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.isStarred, true)));
    counts.starred = starredResult.count;

    return counts;
  }

  // Alias operations
  async getAliases(userId: number): Promise<Alias[]> {
    return await db.select().from(aliases)
      .where(eq(aliases.userId, userId))
      .orderBy(aliases.aliasName);
  }

  async getAlias(id: number): Promise<Alias | undefined> {
    const [alias] = await db.select().from(aliases).where(eq(aliases.id, id));
    return alias;
  }

  async createAlias(insertAlias: InsertAlias): Promise<Alias> {
    console.log('🔍 DEBUG STORAGE - Creating alias with data:', insertAlias);
    
    // Insert alias into database
    const result = await db.insert(aliases).values(insertAlias);
    console.log('🔍 DEBUG STORAGE - Insert result:', result);
    
    // Get the inserted alias using MySQL-compatible pattern
    const insertId = (result as any).insertId || result[0]?.insertId;
    console.log('🔍 DEBUG STORAGE - Insert ID:', insertId);
    
    if (!insertId) {
      throw new Error('Failed to get insert ID for alias');
    }
    
    // Fetch the created alias
    const [alias] = await db.select().from(aliases).where(eq(aliases.id, insertId));
    console.log('🔍 DEBUG STORAGE - Created alias:', alias);
    
    if (!alias) {
      throw new Error('Failed to fetch created alias');
    }
    
    return alias;
  }

  async updateAlias(id: number, updateAlias: UpdateAlias): Promise<Alias | undefined> {
    const [alias] = await db.update(aliases)
      .set(updateAlias)
      .where(eq(aliases.id, id))
    return alias;
  }

  async deleteAlias(id: number): Promise<boolean> {
    const result = await db.delete(aliases).where(eq(aliases.id, id));
    return result.length > 0;
  }

  async toggleAliasStatus(id: number): Promise<Alias | undefined> {
    const existingAlias = await this.getAlias(id);
    if (!existingAlias) return undefined;

    const newStatus = existingAlias.isActive ? 0 : 1;
    await db.update(aliases)
      .set({ isActive: newStatus })
      .where(eq(aliases.id, id));
    
    // Fetch and return updated alias
    return await this.getAlias(id);
  }

  // Storage operations
  async getUserStorageInfo(userId: number): Promise<{ used: number; quota: number }> {
    const user = await this.getUser(userId);
    if (!user) return { used: 0, quota: 104857600 }; // 100MB default

    const actualUsed = await fileStorageService.calculateUserStorageUsage(userId);
    
    // Update user's storage usage
    await this.updateUserStorageUsed(userId, actualUsed);
    
    return {
      used: actualUsed,
      quota: user.storageQuota || 104857600
    };
  }

  async updateUserStorageUsed(userId: number, bytesUsed: number): Promise<boolean> {
    const result = await db.update(users)
      .set({ storageUsed: bytesUsed })
      .where(eq(users.id, userId));
    return result.length > 0;
  }

  async canUserReceiveEmails(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    return await fileStorageService.canUserReceiveEmails(userId, user.storageQuota || 104857600);
  }

  async processEmailAttachments(userId: number, attachmentFiles: any[]): Promise<string[]> {
    const attachmentPaths: string[] = [];

    for (const file of attachmentFiles) {
      try {
        const fileName = `${Date.now()}_${file.originalname}`;
        const path = await fileStorageService.saveFile(userId, fileName, file.buffer);
        attachmentPaths.push(path);
      } catch (error) {
        console.error('Error saving attachment:', error);
      }
    }

    return attachmentPaths;
  }

  async cleanupEmailAttachments(userId: number, attachmentPaths: string[]): Promise<void> {
    await fileStorageService.cleanupUserFiles(userId, attachmentPaths);
  }

  async deleteAttachment(userId: number, filename: string): Promise<boolean> {
    try {
      return await fileStorageService.deleteFile(userId, filename);
    } catch (error) {
      console.error(`Failed to delete attachment ${filename} for user ${userId}:`, error);
      return false;
    }
  }

  // Apply email filters similar to development storage
  private async applyEmailFilters(emails: Email[], filters?: { filterBy?: string, sortBy?: string, tagFilter?: number | null }, userId?: number): Promise<Email[]> {
    if (!filters) return emails;
    
    let filtered = emails;
    
    console.log('🔍 APPLY FILTERS DEBUG (Production):', {
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
        console.log('📧 Unread filter applied (Production):', filtered.length);
        break;
      case 'starred':
        filtered = filtered.filter(email => email.isStarred);
        console.log('⭐ Starred filter applied (Production):', filtered.length);
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
        console.log('📎 Attachments filter applied (Production):', filtered.length);
        break;
      case 'tags':
        if (filters.tagFilter) {
          // Filter by specific tag ID in production - need to check email_tags table
          // Get emails that have this specific tag using email_tags relationship
          const emailsWithSpecificTag = await this.getEmailsByTag(userId || 1, filters.tagFilter);
          const emailIdsWithTag = emailsWithSpecificTag.map(email => email.id);
          filtered = filtered.filter(email => emailIdsWithTag.includes(email.id));
          console.log('🏷️ Tags filter applied (Production) for tag ID', filters.tagFilter, ':', filtered.length, 'emails');
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
          console.log('🏷️ Tags filter applied (Production) (any tags):', filtered.length);
        }
        break;
      case 'all':
      default:
        console.log('✅ No filtering applied (all) (Production)');
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
      console.log('🔤 Sorting applied (Production):', filters.sortBy);
    }
    
    return filtered;
  }
}

// Export production storage instance
export const productionStorage = new DatabaseStorage();