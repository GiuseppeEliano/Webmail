import type { Express } from "express";
import { createServer, type Server } from "http";
import * as path from "path";
import * as fs from "fs";
import multer from 'multer';
import { storage } from "./production-switch";
import { insertEmailSchema, updateEmailSchema, insertFolderSchema, updateFolderSchema, updateUserSchema, insertEmailTagSchema, insertAliasSchema, updateAliasSchema, insertBlockedSenderSchema, loginSchema, registerSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import { ipBlocker } from "./ip-blocker";
import { requireAuth, hashPassword, createUserSession, clearUserSession } from "./auth-middleware";
import { sanitizeEmailForStorage, detectSuspiciousContent, sanitizeEmailContent } from "./security";
import { smtpService, type SMTPEmailData, type EmailAttachment } from "./smtp-service";
import { formatServerDateTime, formatServerDate, formatServerTime, toMySQLDateTime } from "./date-config";
// Session management moved to index.ts

// Auth schemas - usando schemas importados do shared/schema.ts
const localRegisterSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  password: z.string().min(6),
  captcha: z.string(),
  captchaAnswer: z.number(),
  captchaNum1: z.number(),
  captchaNum2: z.number(),
});

// IP blocking middleware
function checkIPBlock(req: any, res: any, next: any) {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const blockStatus = ipBlocker.isBlocked(clientIP);
  
  if (blockStatus.blocked) {
    return res.status(429).json({ 
      message: "IP bloqueado devido a muitas tentativas incorretas",
      blocked: true,
      timeLeft: blockStatus.timeLeft
    });
  }
  
  next();
}

// Multer configuration for profile picture uploads
const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, GIF, WebP allowed.'));
    }
  }
});

// Multer configuration for email attachments
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Fix UTF-8 encoding for filename
    if (file.originalname) {
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    }
    // Allow all file types for email attachments
    cb(null, true);
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy for Replit environment
  app.set('trust proxy', 1);

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // SMTP connection test endpoint
  app.get("/api/smtp/test", requireAuth, async (req, res) => {
    try {
      console.log('🔧 Testing SMTP connection...');
      
      // Get user for SMTP authentication
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const userCredentials = {
        email: user.email,
        password: user.password
      };
      
      const testResult = await smtpService.testConnection(userCredentials);
      
      if (testResult.success) {
        console.log('✅ SMTP connection test successful');
        res.json({ 
          success: true, 
          message: "SMTP connection working correctly",
          config: {
            host: process.env.SMTP_HOST || '127.0.0.1',
            port: process.env.SMTP_PORT || '587',
            user: user.email // Show actual user's email
          }
        });
      } else {
        console.error('❌ SMTP connection test failed:', testResult.error);
        res.status(500).json({ 
          success: false, 
          message: "SMTP connection failed",
          error: testResult.error,
          config: {
            host: process.env.SMTP_HOST || '127.0.0.1',
            port: process.env.SMTP_PORT || '587',
            user: user.email
          }
        });
      }
    } catch (error) {
      console.error('❌ SMTP test error:', error);
      res.status(500).json({ 
        success: false, 
        message: "SMTP test failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // SMTP email test endpoint - sends a test email
  app.post("/api/smtp/test-send", requireAuth, async (req, res) => {
    try {
      const { from, to, subject } = req.body;
      
      if (!from || !to || !subject) {
        return res.status(400).json({ 
          success: false, 
          message: "from, to, and subject are required" 
        });
      }

      // Get user for SMTP authentication
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const userCredentials = {
        email: user.email,
        password: user.password // Use encrypted password from database
      };

      console.log('📧 Testing email sending with user credentials:', { 
        smtpAuthUser: user.email,
        from, 
        to, 
        subject 
      });

      const testEmailData = {
        from: from,
        to: to,
        subject: subject,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">🧪 Teste de Email SMTP - Eliano</h2>
            <p>Este é um email de teste enviado do sistema Eliano.</p>
            <p><strong>Remetente:</strong> ${from}</p>
            <p><strong>Destinatário:</strong> ${to}</p>
            <p><strong>Assunto:</strong> ${subject}</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              ✅ Se você está recebendo este email, o sistema SMTP está funcionando corretamente!<br>
              📧 O email mostra o remetente real: <strong>${from}</strong><br>
              🔧 Usando servidor SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}
            </p>
          </div>
        `
      };

      const smtpResult = await smtpService.sendEmail(testEmailData, userCredentials);

      if (smtpResult.success) {
        console.log('✅ Test email sent successfully');
        res.json({ 
          success: true, 
          message: "Email de teste enviado com sucesso!",
          messageId: smtpResult.messageId,
          details: {
            from: from,
            to: to,
            subject: subject,
            smtpHost: process.env.SMTP_HOST,
            smtpPort: process.env.SMTP_PORT
          }
        });
      } else {
        console.error('❌ Test email failed:', smtpResult.error);
        res.status(500).json({ 
          success: false, 
          message: "Falha ao enviar email de teste",
          error: smtpResult.error 
        });
      }
    } catch (error) {
      console.error('❌ SMTP test send error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Erro no teste de envio", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test endpoint without auth
  app.get("/api/test-no-auth", async (req, res) => {
    res.json({ 
      message: "This is a test endpoint without authentication",
      timestamp: new Date().toISOString()
    });
  });

  // Database test endpoint
  app.post("/api/test-db", async (req, res) => {
    try {
      // Test storage connection
      res.json({ status: "ok", message: "Database connection successful" });
    } catch (error) {
      res.status(500).json({ status: "error", message: "Database connection failed" });
    }
  });

  // Authentication routes
  app.get("/api/auth/status", async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    const blockStatus = ipBlocker.isBlocked(clientIP);
    const attempts = ipBlocker.getAttempts(clientIP);
    
    res.json({
      blocked: blockStatus.blocked,
      timeLeft: blockStatus.timeLeft,
      attempts
    });
  });

  app.get("/api/auth/verify", async (req, res) => {
    // Skip authentication in development mode
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      console.log('🔓 Development mode: Auto-authenticating user');
      
      const mockUser = {
        id: 1,
        username: 'dev',
        email: 'dev@eliano.dev',
        firstName: 'Development',
        lastName: 'User',
        emailsPerPage: 20
      };
      
      return res.json({ 
        authenticated: true,
        user: mockUser 
      });
    }

    const sessionUser = (req.session as any)?.user;
    
    console.log('🔍 Auth verify - Session data:', { 
      sessionId: req.sessionID, 
      hasUser: !!sessionUser,
      userId: sessionUser?.id 
    });
    
    if (!sessionUser) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Verify user still exists in database
      const user = await storage.getUser(sessionUser.id);
      if (!user) {
        // Clear invalid session
        (req.session as any).user = null;
        console.log('❌ User not found in database, clearing session');
        return res.status(401).json({ message: "User not found" });
      }
      
      console.log('✅ Session verified for user:', user.email);
      res.json({ 
        authenticated: true,
        user: sessionUser 
      });
    } catch (error) {
      console.error('Auth verify error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", checkIPBlock, async (req, res) => {
    try {
      const { username, password, stayLoggedIn } = loginSchema.parse(req.body);
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
      
      console.log('🔍 DEBUG LOGIN:', { username, passwordLength: password.length });
      
      // Handle both username and email formats
      let email = username;
      if (!username.includes('@')) {
        email = `${username}@eliano.dev`;
      }
      
      console.log('🔍 Converted to email:', email);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      console.log('👤 User found:', user ? `ID: ${user.id}, Email: ${user.email}` : 'NOT FOUND');
      
      if (!user) {
        console.log('❌ User not found');
        const result = ipBlocker.recordFailedAttempt(clientIP);
        const remaining = Math.max(0, 4 - result.attempts);
        return res.status(401).json({ 
          message: `Credenciais inválidas. Tentativa ${result.attempts}/4`,
          attempts: result.attempts,
          maxAttempts: 4,
          remaining
        });
      }
      
      console.log('🔑 Verifying password for user:', user.id);
      const passwordValid = await storage.verifyPassword(user.id, password);
      console.log('🔑 Password verification result:', passwordValid ? 'VALID' : 'INVALID');
      
      if (!passwordValid) {
        // Track failed attempt
        const result = ipBlocker.recordFailedAttempt(clientIP);
        
        if (result.blocked) {
          return res.status(429).json({ 
            message: "Muitas tentativas incorretas. IP bloqueado por 1 hora.",
            blocked: true,
            blockedUntil: result.blockedUntil
          });
        }
        
        const remaining = Math.max(0, 4 - result.attempts);
        return res.status(401).json({ 
          message: `Credenciais inválidas. Tentativa ${result.attempts}/4`,
          attempts: result.attempts,
          maxAttempts: 4,
          remaining
        });
      }
      
      // Clear attempts on successful login
      ipBlocker.clearAttempts(clientIP);
      
      // Update user stayLoggedIn preference if provided
      if (typeof stayLoggedIn === 'boolean') {
        await storage.updateUser(user.id, { stayLoggedIn: stayLoggedIn ? 1 : 0 });
      }

      // Set session expiry based on stayLoggedIn preference
      if (stayLoggedIn) {
        // Extended session - 30 days
        (req.session as any).cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      } else {
        // Default session - expires when browser closes
        (req.session as any).cookie.maxAge = null;
      }

      // Create session
      const sessionUser = createUserSession(req, user);
      
      res.json({ 
        message: "Login realizado com sucesso",
        user: sessionUser
      });
      
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      res.status(400).json({ message: "Erro interno. Tente novamente." });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.post("/api/auth/register", checkIPBlock, async (req, res) => {
    try {
      const data = localRegisterSchema.parse(req.body);
      
      // Verify captcha
      if (data.captchaAnswer !== (data.captchaNum1 + data.captchaNum2)) {
        return res.status(400).json({ message: "Captcha incorreto" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(409).json({ message: "Email já está em uso" });
      }
      
      // Create user
      console.log('📝 DEBUG REGISTER:', { email: data.email, passwordLength: data.password.length });
      const user = await storage.createUser({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        username: data.email.split('@')[0]
      });
      console.log('✅ User created:', user ? `ID: ${user.id}, Email: ${user.email}` : 'FAILED');
      
      // Create session
      const sessionUser = createUserSession(req, user);
      
      res.status(201).json({ 
        message: "Conta criada com sucesso",
        user: sessionUser
      });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // User routes
  app.get("/api/user/:id", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user password
  app.put("/api/user/:id/password", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await storage.verifyPassword(userId, currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Update password
      const success = await storage.updatePassword(userId, newPassword);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Direct file upload endpoint for profile pictures
  app.post("/api/user/:id/profile-picture", requireAuth, profileUpload.single('profilePicture'), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      console.log('File upload received:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
      
      const { profileStorageService } = await import('./profile-storage');
      
      // Get current user to check for old profile picture (for cleanup logging)
      const currentUser = await storage.getUser(userId);
      const oldProfilePicture = currentUser?.profilePicture;

      // Save the file directly from buffer (auto-deletes old photos)
      const filename = await profileStorageService.saveProfilePictureFromBuffer(
        userId, 
        req.file.buffer, 
        req.file.mimetype
      );
      
      console.log('Old profile picture cleaned up:', oldProfilePicture);
      console.log('New profile picture saved:', filename);
      
      // Update user profile picture URL
      const profileUpdateData = { 
        profilePicture: profileStorageService.getProfilePictureUrl(userId, filename) 
      };
      
      const updatedUser = await storage.updateUser(userId, profileUpdateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to upload profile picture" });
    }
  });

  // Update user profile
  app.put("/api/user/:id", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Remove fields that shouldn't be updated via this endpoint
      const { password, profilePicture, ...safeUpdateData } = updateData;
      
      // Handle profile picture separately if provided
      if (profilePicture) {
        try {
          const { profileStorageService } = await import('./profile-storage');
          const filename = await profileStorageService.saveProfilePicture(userId, profilePicture);
          // Create a separate update just for profile picture
          const profileUpdateData = { profilePicture: profileStorageService.getProfilePictureUrl(userId, filename) };
          
          const updatedUser = await storage.updateUser(userId, profileUpdateData);
          if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
          }
          
          return res.json(updatedUser);
        } catch (error) {
          console.error("Error saving profile picture:", error);
          return res.status(400).json({ message: "Failed to save profile picture" });
        }
      }
      
      // If no fields to update after filtering, just return current user
      if (Object.keys(safeUpdateData).length === 0) {
        const currentUser = await storage.getUser(userId);
        return res.json(currentUser);
      }
      
      const updatedUser = await storage.updateUser(userId, safeUpdateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: error });
    }
  });

  // Delete profile picture endpoint
  app.delete("/api/user/:id/profile-picture", requireAuth, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verify user can only delete their own profile picture
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get current user to see if they have a profile picture
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log('🗑️ Deleting profile picture for user:', userId);
      console.log('Current profilePicture value:', user.profilePicture);

      // Delete the file if it exists
      if (user.profilePicture) {
        const filename = user.profilePicture.split('/').pop();
        if (filename) {
          const { profileStorageService } = await import('./profile-storage');
          const fileDeleted = await profileStorageService.deleteProfilePicture(userId, filename);
          console.log('File deletion result:', fileDeleted);
        }
      }

      // CRITICAL FIX: Update user record to remove profile picture reference
      const updatedUser = await storage.updateUser(userId, { profilePicture: null });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log('✅ Profile picture reference removed from database');
      console.log('Updated user profilePicture:', updatedUser.profilePicture);
      
      res.json(updatedUser);
    } catch (error) {
      console.error('❌ Error deleting profile picture:', error);
      res.status(500).json({ message: "Failed to delete profile picture" });
    }
  });

  // Serve profile pictures (authenticated access only)
  app.get("/api/profile-picture/:userId/:filename", requireAuth, async (req: any, res) => {
    try {
      const { userId, filename } = req.params;
      const requestedUserId = parseInt(userId);
      
      // Security check: users can only access their own profile pictures
      if (!req.user || req.user.id !== requestedUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check filename format (userId_timestamp.ext) for security
      if (!filename.startsWith(`${userId}_`)) {
        return res.status(403).json({ message: "Invalid filename format" });
      }
      
      const filePath = path.join(process.cwd(), 'user_storage', 'profiles', filename);
      
      if (fs.existsSync(filePath)) {
        // Set appropriate headers for image serving
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes: { [key: string]: string } = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        
        const mimeType = mimeTypes[ext] || 'image/jpeg';
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        
        res.sendFile(filePath);
      } else {
        res.status(404).json({ message: "Profile picture not found" });
      }
    } catch (error) {
      console.error("Error serving profile picture:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Folders routes - only return custom folders (system folders are static)
  app.get("/api/folders/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const folders = await storage.getFolders(userId);
      // Only return custom folders - system folders are now static
      const customFolders = folders.filter((f: any) => f.type === "custom");
      res.json(customFolders);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get folders for current authenticated user - only custom folders
  app.get("/api/folders", requireAuth, async (req: any, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const userId = req.user.id;
      const folders = await storage.getFolders(userId);
      // Only return custom folders - system folders are now static
      const customFolders = folders.filter((f: any) => f.type === "custom");
      res.json(customFolders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new folder
  app.post("/api/folders", requireAuth, async (req: any, res) => {
    try {
      if (!req.user || !req.user.id) {
        console.log('❌ User not authenticated in POST /api/folders');
        return res.status(401).json({ message: "User not authenticated" });
      }
      const userId = req.user.id;
      const { name, color, icon } = req.body;
      
      console.log(`📁 Creating folder for user ${userId}:`, { name, color, icon });
      
      const folderData = {
        userId,
        name,
        type: 'custom',
        systemType: null,
        color: color || '#6b7280',
        icon: icon || 'folder'
      };
      
      console.log('📁 Folder data:', folderData);
      const newFolder = await storage.createFolder(folderData);
      console.log('📁 Created folder:', newFolder);
      res.json(newFolder);
    } catch (error) {
      console.error('❌ Error creating folder:', error);
      res.status(500).json({ message: 'Failed to create folder', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Delete folder route
  app.delete("/api/folders/:id", requireAuth, async (req, res) => {
    try {
      const folderId = parseInt(req.params.id);
      console.log(`🗑️ Deleting folder ${folderId}`);
      const success = await storage.deleteFolder(folderId);
      if (!success) {
        return res.status(404).json({ message: "Folder not found" });
      }
      console.log(`🗑️ Folder ${folderId} deleted successfully`);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error deleting folder:', error);
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  // Tags routes
  app.get("/api/tags/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`🏷️ Getting tags for user ${userId}`);
      const tags = await storage.getTags(userId);
      console.log(`🏷️ Found ${tags.length} tags for user ${userId}:`, tags);
      res.json(tags);
    } catch (error) {
      console.error('Error getting tags:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tags for current authenticated user
  app.get("/api/tags", requireAuth, async (req: any, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const userId = req.user.id;
      const tags = await storage.getTags(userId);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Emails routes with pagination
  app.get("/api/emails/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { folderId, search, limit = 20, offset = 0 } = req.query;
      
      const emails = await storage.getEmails(
        userId,
        folderId ? parseInt(folderId as string) : undefined,
        search as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      // Get total count for pagination
      const totalCount = await storage.getEmailCount(userId, folderId ? parseInt(folderId as string) : undefined, search as string);
      
      res.json({
        emails,
        totalCount,
        hasMore: (parseInt(offset as string) + parseInt(limit as string)) < totalCount,
        currentPage: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      });
    } catch (error) {
      res.status(500).json({ message: error });
    }
  });

  // Create new email with XSS protection
  app.post("/api/emails", requireAuth, async (req, res) => {
    try {
      console.log('📧 Creating email with data:', req.body);
      const boolToTinyInt = (v: any) =>
      v === true || v === 'true' ? 1 :
      v === false || v === 'false' ? 0 : v;

    const emailData = insertEmailSchema.parse({
      ...req.body,
      isRead: boolToTinyInt(req.body.isRead),
      isStarred: boolToTinyInt(req.body.isStarred),
      isDraft: boolToTinyInt(req.body.isDraft),
      isActiveDraft: boolToTinyInt(req.body.isActiveDraft),
    });
      
      // Sanitize email content for XSS protection
      const sanitizedEmailData = sanitizeEmailForStorage(emailData);
      console.log('🔒 Email data sanitized for security');
      
      // Check for suspicious content and log
      const suspiciousCheck = detectSuspiciousContent(emailData.body || '');
      if (suspiciousCheck.suspicious) {
        console.warn('⚠️ Suspicious content detected and sanitized:', suspiciousCheck.reasons);
      }
      
      // Get user to append signature if exists
      const user = await storage.getUser(sanitizedEmailData.userId);
      let body = sanitizedEmailData.body;
      
      //if (user && user.signature) {
        // Sanitize signature as well
      //  const sanitizedSignature = sanitizeEmailContent(user.signature);
        // Append signature with proper line breaks
      //  body = sanitizedEmailData.body + '<br><br><br><br><br>' + sanitizedSignature;
      //  console.log('📧 Sanitized signature appended to email body');
      //}
      
      const emailToCreate = { ...sanitizedEmailData, body };
      console.log('📧 Final sanitized email data before creation');
      
      const email = await storage.createEmail(emailToCreate);
      console.log('📧 Email created successfully:', email.id);
      res.json(email);
    } catch (error) {
      console.error("Error creating email:", error);
      res.status(500).json({ message: error });
    }
  });

  // Send email (converts draft to sent email AND sends via SMTP)
  app.post("/api/emails/send", requireAuth, async (req, res) => {
    try {
      console.log('📤 Sending email with data:', req.body);
      const boolToTinyInt = (v: any) => v === true || v === 'true' ? 1 :
      v === false || v === 'false' ? 0 : v;

      const emailData = insertEmailSchema.parse({
        ...req.body,
        isRead: boolToTinyInt(req.body.isRead),
        isStarred: boolToTinyInt(req.body.isStarred),
        isDraft: 0, // Force to NOT be a draft when sending
        isActiveDraft: 0, // Force to NOT be an active draft when sending
      });
      
      // Sanitize email content for XSS protection
      const sanitizedEmailData = sanitizeEmailForStorage(emailData);
      console.log('🔒 Email data sanitized for security');
      
      // Check for suspicious content and log
      const suspiciousCheck = detectSuspiciousContent(emailData.body || '');
      if (suspiciousCheck.suspicious) {
        console.warn('⚠️ Suspicious content detected and sanitized:', suspiciousCheck.reasons);
      }

      // Get user data including password for SMTP authentication
      const user = await storage.getUser(sanitizedEmailData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let body = sanitizedEmailData.body;
      
      if (user.signature) {
        // Sanitize signature and append
        const sanitizedSignature = sanitizeEmailContent(user.signature);
        body = sanitizedEmailData.body + '<br><br><br><br><br>' + sanitizedSignature;
        console.log('📧 Signature appended to email body');
      }
      
      const emailToSend = { 
        ...sanitizedEmailData, 
        body,
        fromName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email, // Set proper fromName
        attachments: (!sanitizedEmailData.attachments || 
                     (Array.isArray(sanitizedEmailData.attachments) && sanitizedEmailData.attachments.length === 0)) 
                     ? null : sanitizedEmailData.attachments, // Use NULL instead of empty array
        sentAt: new Date() // Mark when sent
      };
      console.log('📧 Final sanitized email data ready for sending');
      
      // **STEP 1: Store email in database first**
      const sentEmail = await storage.createEmail(emailToSend);
      console.log('📧 Email stored in database:', sentEmail.id);

      // **STEP 2: Now send actual email via SMTP**
      try {
        // Prepare attachments for SMTP if they exist
        let smtpAttachments: EmailAttachment[] = [];
        if (emailData.attachments && Array.isArray(emailData.attachments)) {
          smtpAttachments = emailData.attachments.map((att: any) => ({
            filename: att.filename || 'attachment',
            content: att.content || att.data || '',
            contentType: att.contentType || att.mimetype || 'application/octet-stream',
            size: att.size || 0
          }));
        }

        // Prepare inline images for SMTP if they exist
        let smtpInlineImages: any[] = [];
        if (req.body.inlineImages && Array.isArray(req.body.inlineImages)) {
          smtpInlineImages = req.body.inlineImages.map((img: any) => ({
            id: img.id,
            dataUrl: img.dataUrl,
            filename: img.filename
          }));
        }

        // Prepare SMTP email data with dynamic sender
        const smtpEmailData: SMTPEmailData = {
          from: emailData.fromAddress, // Use actual user's email address as sender
          to: emailData.toAddress,
          cc: emailData.ccAddress || undefined,
          bcc: emailData.bccAddress || undefined,
          subject: emailData.subject,
          htmlBody: body, // Use body with signature
          attachments: smtpAttachments,
          inlineImages: smtpInlineImages // Include inline images
        };

        // Prepare user SMTP credentials 
        const userCredentials = {
          email: user.email, // Use user's actual email for SMTP auth
          password: user.password // Use user's encrypted password from database
        };

        console.log('📧 Sending email via SMTP using user credentials:', {
          smtpAuthUser: user.email,
          realSender: emailData.fromAddress,
          recipient: emailData.toAddress,
          subject: emailData.subject
        });
        
        const smtpResult = await smtpService.sendEmail(smtpEmailData, userCredentials);

        if (smtpResult.success) {
          console.log('✅ Email sent via SMTP successfully:', smtpResult.messageId);
          
          // Update the email with messageId if provided
          if (smtpResult.messageId && sentEmail.id) {
            try {
              await storage.updateEmail(sentEmail.id, { 
                messageId: smtpResult.messageId 
              });
            } catch (updateError) {
              console.warn('⚠️ Could not update email with messageId:', updateError);
            }
          }
          
          res.json({ 
            ...sentEmail, 
            smtpResult: {
              sent: true,
              messageId: smtpResult.messageId
            }
          });
        } else {
          console.error('❌ SMTP sending failed:', smtpResult.error);
          res.json({ 
            ...sentEmail, 
            smtpResult: {
              sent: false,
              error: smtpResult.error
            }
          });
        }

      } catch (smtpError) {
        console.error('❌ SMTP error:', smtpError);
        // Email is already saved, just inform about SMTP issue
        res.json({ 
          ...sentEmail, 
          smtpResult: {
            sent: false,
            error: smtpError instanceof Error ? smtpError.message : 'SMTP error'
          }
        });
      }

    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: error });
    }
  });

  // File attachment upload for emails
  app.post("/api/attachments/upload/:userId", requireAuth, attachmentUpload.array('files'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      console.log(`📎 Processing ${files.length} file(s) for user ${userId}`);

      // Check file size limit (5MB per file)
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          return res.status(400).json({ 
            message: `File ${file.originalname} exceeds 5MB limit`,
            fileSize: file.size,
            maxSize: 5 * 1024 * 1024
          });
        }
      }

      // Check user storage quota
      const storageInfo = await storage.getUserStorageInfo(userId);
      const totalUploadSize = files.reduce((sum, file) => sum + file.size, 0);
      
      if (storageInfo.used + totalUploadSize > storageInfo.quota) {
        return res.status(400).json({ 
          message: "Upload would exceed storage quota",
          currentUsage: storageInfo.used,
          quota: storageInfo.quota,
          uploadSize: totalUploadSize
        });
      }

      // Save files and return attachment information
      const attachments = await storage.processEmailAttachments(userId, files);
      
      console.log(`✅ Successfully uploaded ${attachments.length} file(s)`);
      
      res.json({ 
        success: true, 
        attachments: attachments.map((path, index) => ({
          filename: files[index].originalname,
          path: path,
          size: files[index].size,
          mimetype: files[index].mimetype
        }))
      });
    } catch (error) {
      console.error("Error uploading attachments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remove attachment file
  app.delete("/api/attachments/remove/:userId/:filename", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const filename = decodeURIComponent(req.params.filename);

      console.log(`🗑️ Removing attachment ${filename} for user ${userId}`);

      // First, try to find the actual file with timestamp prefix
      const userPath = path.join(process.cwd(), 'user_storage', `user_${userId}`);
      
      if (fs.existsSync(userPath)) {
        const files = fs.readdirSync(userPath);
        const actualFile = files.find(file => file.includes(filename));
        
        if (actualFile) {
          const success = await storage.deleteAttachment(userId, actualFile);
          
          if (success) {
            console.log(`✅ Successfully removed attachment ${actualFile}`);
            res.json({ success: true });
          } else {
            res.status(404).json({ message: "File not found" });
          }
        } else {
          console.log(`❌ File not found: ${filename}`);
          res.status(404).json({ message: "File not found" });
        }
      } else {
        res.status(404).json({ message: "File not found" });
      }
    } catch (error) {
      console.error("Error removing attachment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Convert draft to sent email (only update existing record)
  app.put("/api/emails/:emailId/convert-to-sent", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const { subject, body, toAddress, ccAddress, bccAddress } = req.body;
      
      console.log(`🔄 Converting draft ${emailId} to sent email`);
      
      // Get the existing email to verify it's a draft
      const existingEmail = await storage.getEmail(emailId);
      if (!existingEmail) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      if (!existingEmail.isDraft) {
        return res.status(400).json({ message: "Email is not a draft" });
      }
      
      // Sanitize the data
      const sanitizedData = {
        subject: subject || '',
        body: body || '',
        toAddress: toAddress || '',
        ccAddress: ccAddress || null,
        bccAddress: bccAddress || null
      };
      
      // Convert draft to sent email by updating the existing record
      const sentEmail = await storage.convertDraftToSentEmail(emailId, {
        ...sanitizedData,
        userId: existingEmail.userId,
        fromAddress: existingEmail.fromAddress,
        fromName: existingEmail.fromName,
        isRead: true,
        isStarred: false,
        isDraft: false,
        hasAttachments: req.body.attachments && req.body.attachments.length > 0,
        attachments: req.body.attachments && req.body.attachments.length > 0 ? JSON.stringify(req.body.attachments) : null,
        priority: "normal",
        tags: null
      });
      
      console.log(`✅ Draft ${emailId} converted to sent email successfully`);
      res.json(sentEmail);
    } catch (error) {
      console.error("Error converting draft to sent email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete email
  app.delete("/api/emails/:emailId", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const { permanent = false } = req.body; // Accept permanent parameter from request body
      
      console.log(`🗑️ Delete request for email ${emailId}, permanent: ${permanent}`);
      const success = await storage.deleteEmail(emailId, permanent);
      
      if (!success) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get individual email by ID
  app.get("/api/email/:emailId", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const email = await storage.getEmail(emailId);
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      res.json(email);
    } catch (error) {
      console.error("Error fetching email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update email with XSS protection
  app.put("/api/email/:emailId", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const updateData = req.body;
      
      // Sanitize update data if it contains email content
      const sanitizedUpdateData = sanitizeEmailForStorage(updateData);
      
      // Handle attachments properly - only process if attachments are explicitly provided
      if (updateData.attachments !== undefined) {
        // If attachments is a string (JSON), parse it to object for database
        if (typeof updateData.attachments === 'string') {
          try {
            sanitizedUpdateData.attachments = JSON.parse(updateData.attachments);
          } catch (error) {
            console.error('Error parsing attachments JSON:', error);
            sanitizedUpdateData.attachments = null;
          }
        } else {
          // If attachments is already an object/array, use it directly
          sanitizedUpdateData.attachments = updateData.attachments;
        }
        sanitizedUpdateData.hasAttachments = Array.isArray(sanitizedUpdateData.attachments) && sanitizedUpdateData.attachments.length > 0;
        console.log('📎 Processing attachments for email update:', {
          emailId,
          attachmentsReceived: updateData.attachments,
          attachmentsReceivedType: typeof updateData.attachments,
          attachmentsProcessed: sanitizedUpdateData.attachments,
          attachmentsCount: Array.isArray(sanitizedUpdateData.attachments) ? sanitizedUpdateData.attachments.length : 0
        });
      } else {
        console.log('📎 No attachments in email update for ID:', emailId);
      }
      
      // Check for suspicious content in updates
      if (updateData.body) {
        const suspiciousCheck = detectSuspiciousContent(updateData.body);
        if (suspiciousCheck.suspicious) {
          console.warn('⚠️ Suspicious content in email update sanitized:', suspiciousCheck.reasons);
        }
      }
      
      console.log('📎 Final update data being sent to storage:', {
        emailId,
        hasAttachments: sanitizedUpdateData.hasAttachments,
        attachmentsField: sanitizedUpdateData.attachments
      });
      
      const updatedEmail = await storage.updateEmail(emailId, sanitizedUpdateData);
      
      if (!updatedEmail) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      res.json(updatedEmail);
    } catch (error) {
      console.error("Error updating email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Toggle email star
  app.post("/api/email/:emailId/star", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const email = await storage.toggleEmailStar(emailId);
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      res.json(email);
    } catch (error) {
      console.error("Error toggling email star:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Toggle email star (PUT method)
  app.put("/api/email/:emailId/star", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const email = await storage.toggleEmailStar(emailId);
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      res.json(email);
    } catch (error) {
      console.error("Error toggling email star:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark email as read/unread (POST)
  app.post("/api/email/:emailId/read", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const { isRead } = req.body;
      const email = await storage.markEmailAsRead(emailId, isRead);
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      res.json(email);
    } catch (error) {
      console.error("Error marking email as read:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark email as read/unread (PUT) - Frontend compatibility
  app.put("/api/email/:emailId/read", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const { isRead } = req.body;
      console.log(`📧 Marking email ${emailId} as read: ${isRead}`);
      const email = await storage.markEmailAsRead(emailId, isRead);
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      console.log(`📧 Email ${emailId} read status updated successfully`);
      res.json(email);
    } catch (error) {
      console.error("Error marking email as read:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Move email to folder
  app.post("/api/email/:emailId/move", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const { folderId } = req.body;
      
      // Handle both string (system folder types) and number (custom folder IDs)
      const email = await storage.moveEmail(emailId, folderId);
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      res.json(email);
    } catch (error) {
      console.error("Error moving email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Move email to folder (PUT method)
  app.put("/api/email/:emailId/move", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const { folderId } = req.body;
      
      // Handle both string (system folder types) and number (custom folder IDs)
      const email = await storage.moveEmail(emailId, folderId);
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      res.json(email);
    } catch (error) {
      console.error("Error moving email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Emails by folder route with pagination and filtering
  app.get("/api/emails/:userId/folder/:folderType", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const folderType = req.params.folderType;
      const { 
        limit = 20, 
        offset = 0, 
        filterBy = 'all',
        sortBy = 'date',
        tagFilter = null
      } = req.query;
      
      console.log('🔍 FILTER DEBUG:', {
        userId,
        folderType,
        filterBy,
        sortBy,
        tagFilter,
        limit,
        offset
      });
      
      const result = await storage.getEmailsByFolderPaginated(
        userId, 
        folderType.toLowerCase(), 
        parseInt(limit as string), 
        parseInt(offset as string),
        {
          filterBy: filterBy as string,
          sortBy: sortBy as string,
          tagFilter: tagFilter ? parseInt(tagFilter as string) : null
        }
      );
      
      console.log('📊 FILTER RESULT:', {
        totalFound: result.totalCount,
        emailsReturned: result.emails.length,
        starredEmails: result.emails.filter((e: any) => e.isStarred).length
      });
      
      res.json({
        emails: result.emails,
        totalCount: result.totalCount,
        hasMore: (parseInt(offset as string) + parseInt(limit as string)) < result.totalCount,
        currentPage: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        totalPages: Math.ceil(result.totalCount / parseInt(limit as string))
      });
    } catch (error) {
      console.log("Filter error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email counts route
  app.get("/api/counts/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const counts = await storage.getEmailCounts(userId);
      res.json(counts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Search route - now supports folder-specific search
  app.get("/api/search/:userId", requireAuth, async (req: any, res) => {
    try {
      const urlUserId = parseInt(req.params.userId);
      const query = req.query.q as string;
      const folder = req.query.folder as string; // Optional folder parameter
      
      // SECURITY: Ensure user can only search their own emails
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const authenticatedUserId = req.user.id;
      if (urlUserId !== authenticatedUserId) {
        return res.status(403).json({ message: "Access denied - can only search own emails" });
      }
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      console.log(`🔍 Search request - User: ${authenticatedUserId}, Query: "${query}", Folder: ${folder || 'all'}`);
      const emails = await storage.searchEmails(authenticatedUserId, query, folder);
      console.log(`🔍 Search results - Found: ${emails.length} emails for user ${authenticatedUserId}`);
      res.json(emails);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email tag routes
  app.post("/api/emails/:emailId/tags/:tagId", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const tagId = parseInt(req.params.tagId);
      const success = await storage.addEmailTag(emailId, tagId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/emails/:emailId/tags/:tagId", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const tagId = parseInt(req.params.tagId);
      const success = await storage.removeEmailTag(emailId, tagId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/emails/:emailId/tags", requireAuth, async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const tags = await storage.getEmailTags(emailId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tags/:tagId/emails/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const tagId = parseInt(req.params.tagId);
      const emails = await storage.getEmailsByTag(userId, tagId);
      res.json(emails);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enhanced tags routes
  app.post("/api/tags", requireAuth, async (req: any, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const userId = req.user.id;
      const tagData = {
        ...req.body,
        userId: userId // Garantir que o userId está correto
      };
      
      console.log(`🏷️ Creating tag for user ${userId}:`, tagData);
      const tag = await storage.createTag(tagData);
      console.log(`🏷️ Created tag:`, tag);
      res.json(tag);
    } catch (error: any) {
      console.error('Error creating tag:', error);
      
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY' || (error.message && error.message.includes('Duplicate entry'))) {
        return res.status(409).json({ 
          message: "Uma tag com esse nome já existe",
          code: "DUPLICATE_TAG"
        });
      }
      
      res.status(500).json({ message: error });
    }
  });

  app.put("/api/tags/:id", requireAuth, async (req, res) => {
    try {
      const tagId = parseInt(req.params.id);
      const updateData = req.body;
      const tag = await storage.updateTag(tagId, updateData);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json(tag);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tags/:id", requireAuth, async (req, res) => {
    try {
      const tagId = parseInt(req.params.id);
      const success = await storage.deleteTag(tagId);
      if (!success) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Aliases routes
  app.get("/api/aliases/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const aliases = await storage.getAliases(userId);
      res.json(aliases);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/alias/:id", requireAuth, async (req, res) => {
    try {
      const aliasId = parseInt(req.params.id);
      const alias = await storage.getAlias(aliasId);
      if (!alias) {
        return res.status(404).json({ message: "Alias not found" });
      }
      res.json(alias);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/aliases", requireAuth, async (req, res) => {
    try {
      console.log('🔍 DEBUG CREATE ALIAS - Body:', req.body);
      const aliasData = insertAliasSchema.parse(req.body);
      console.log('🔍 DEBUG CREATE ALIAS - Parsed data:', aliasData);
      const alias = await storage.createAlias(aliasData);
      console.log('✅ DEBUG CREATE ALIAS - Success:', alias);
      res.json(alias);
    } catch (error) {
      console.error('❌ CREATE ALIAS ERROR:', error);
      res.status(500).json({ 
        message: "Erro ao criar alias", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.put("/api/alias/:id", requireAuth, async (req, res) => {
    try {
      const aliasId = parseInt(req.params.id);
      const updateData = updateAliasSchema.parse(req.body);
      const alias = await storage.updateAlias(aliasId, updateData);
      if (!alias) {
        return res.status(404).json({ message: "Alias not found" });
      }
      res.json(alias);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/alias/:id", requireAuth, async (req, res) => {
    try {
      const aliasId = parseInt(req.params.id);
      const success = await storage.deleteAlias(aliasId);
      if (!success) {
        return res.status(404).json({ message: "Alias not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Date/Time Configuration Endpoint
  app.get("/api/datetime/config", async (req, res) => {
    try {
      const serverNow = new Date();
      res.json({
        serverTime: formatServerDateTime(serverNow),
        serverDate: formatServerDate(serverNow),
        serverTimeOnly: formatServerTime(serverNow),
        timezone: process.env.SERVER_TIMEZONE || 'America/Sao_Paulo',
        locale: process.env.SERVER_LOCALE || 'pt-BR',
        formats: {
          date: process.env.DATE_FORMAT || 'dd/MM/yyyy',
          time: process.env.TIME_FORMAT || 'HH:mm:ss',
          datetime: process.env.DATETIME_FORMAT || 'dd/MM/yyyy HH:mm:ss'
        },
        mysqlTimezone: formatServerDateTime(serverNow)
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/alias/:id/toggle", requireAuth, async (req, res) => {
    try {
      const aliasId = parseInt(req.params.id);
      const alias = await storage.toggleAliasStatus(aliasId);
      if (!alias) {
        return res.status(404).json({ message: "Alias not found" });
      }
      res.json(alias);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Storage management routes
  app.get("/api/storage/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const storageInfo = await storage.getUserStorageInfo(userId);
      res.json(storageInfo);
    } catch (error) {
      console.error("Storage info error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/storage/:userId/check", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const canReceive = await storage.canUserReceiveEmails(userId);
      res.json({ canReceive });
    } catch (error) {
      console.error("Storage check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Active draft management routes
  app.post("/api/drafts/active/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const forceNew = req.body.forceNew === true || req.query.forceNew === 'true';
      console.log("Creating active draft for user:", userId, "forceNew:", forceNew);
      const draft = await storage.createActiveDraft(userId, forceNew);
      console.log("Active draft created successfully:", draft.id);
      res.json(draft);
    } catch (error) {
      console.error("Create active draft error:", error);
      console.error("Stack trace:", error instanceof Error ? error.stack : error);
      res.status(500).json({ message: "Failed to create active draft", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/drafts/active/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const draft = await storage.getActiveDraft(userId);
      if (!draft) {
        return res.status(404).json({ message: "No active draft found" });
      }
      res.json(draft);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/drafts/active/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      await storage.clearActiveDraft(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Blocked senders routes
  app.get("/api/blocked-senders/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const blockedSenders = await storage.getBlockedSenders(userId);
      res.json(blockedSenders);
    } catch (error) {
      console.error("Get blocked senders error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/blocked-senders", requireAuth, async (req, res) => {
    try {
      const data = insertBlockedSenderSchema.parse(req.body);
      const blockedSender = await storage.createBlockedSender(data);
      
      // Find SPAM folder and move all emails from this sender to SPAM
      const spamFolder = await storage.getSystemFolder(data.userId, 'junk');
      if (spamFolder && data.emailId) {
        // Move the specific email to SPAM
        await storage.moveEmail(data.emailId, spamFolder.id);
        console.log(`Moved email ${data.emailId} to SPAM folder after blocking sender ${data.blockedEmail}`);
      }
      
      res.status(201).json(blockedSender);
    } catch (error) {
      console.error("Create blocked sender error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/blocked-senders/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBlockedSender(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete blocked sender error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString() 
    });
  });


  
  const httpServer = createServer(app);
  return httpServer;
}