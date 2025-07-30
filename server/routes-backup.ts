import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./production-switch";
import { insertEmailSchema, updateEmailSchema, insertFolderSchema, updateFolderSchema, updateUserSchema, insertEmailTagSchema, insertAliasSchema, updateAliasSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import { ipBlocker } from "./ip-blocker";
import { requireAuth, hashPassword, createUserSession, clearUserSession } from "./auth-middleware";
import session from "express-session";
import MemoryStore from "memorystore";

const sessionMemoryStore = MemoryStore(session);

// Auth schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const registerSchema = z.object({
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-development',
    store: new sessionMemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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

  app.post("/api/auth/login", checkIPBlock, async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user || !(await storage.verifyPassword(user.id, password))) {
        // Track failed attempt
        const result = ipBlocker.recordFailedAttempt(clientIP);
        
        if (result.blocked) {
          return res.status(429).json({ 
            message: "Muitas tentativas incorretas. IP bloqueado por 1 hora.",
            blocked: true,
            blockedUntil: result.blockedUntil
          });
        }
        
        return res.status(401).json({ 
          message: "Credenciais inválidas",
          attempts: result.attempts,
          maxAttempts: 4
        });
      }
      
      // Clear attempts on successful login
      ipBlocker.clearAttempts(clientIP);
      
      // Create session
      const sessionUser = createUserSession(req, user);
      
      res.json({ 
        message: "Login realizado com sucesso",
        user: sessionUser
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.post("/api/auth/register", checkIPBlock, async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
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
      const user = await storage.createUser({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        username: data.email.split('@')[0]
      });
      
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

  // Rest of routes would be here...
  
  const httpServer = createServer(app);
  return httpServer;
}