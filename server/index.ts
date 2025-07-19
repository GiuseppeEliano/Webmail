// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' }); // Load local development overrides

// Log MySQL configuration status
if (process.env.DB_HOST) {
  console.log('🔧 MySQL configuration detected - using database storage');
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import mysql from 'mysql2/promise';
import session from 'express-session';
import MySQLStoreClass from 'express-mysql-session';
import MemoryStore from 'memorystore';
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session store based on environment
let sessionStore;
if (process.env.DB_HOST) {
  // Use MySQL session store 
  const MySQLStore = MySQLStoreClass(session);
  
  // Create sessions table manually first
  const sessionConnection = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Create sessions table with correct structure
  (async () => {
    try {
      await sessionConnection.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          session_id varchar(128) COLLATE utf8mb4_bin NOT NULL,
          expires int(11) unsigned NOT NULL,
          data mediumtext COLLATE utf8mb4_bin,
          PRIMARY KEY (session_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin
      `);
      console.log('✅ Sessions table verified/created');
    } catch (error) {
      console.log('⚠️ Error creating sessions table:', error.message);
    }
  })();

  sessionStore = new MySQLStore({
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000, // 15 minutes
    createDatabaseTable: false, // We created it manually above
  }, sessionConnection);
  console.log('🔐 Using MySQL session store for persistent sessions');
} else {
  // Use memory store for development
  const memoryStoreFactory = MemoryStore(session);
  sessionStore = new memoryStoreFactory({
    checkPeriod: 86400000 // 24 hours
  });
  console.log('🔐 Using memory session store');
}

// Configure session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-key-change-in-production',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: null, // Session cookies - expire when browser closes by default
    sameSite: 'lax' // Better compatibility
  },
  name: 'sessionId'
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
