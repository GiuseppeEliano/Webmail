import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { storage } from './production-switch';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Session interface
interface UserSession {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

// Middleware to check if user is authenticated
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      console.log('🔓 Development mode: Skipping authentication');
      
      // Create a mock user for development
      const mockUser = {
        id: 1,
        username: 'dev',
        email: 'dev@eliano.dev',
        firstName: 'Development',
        lastName: 'User',
        emailsPerPage: 20,
        signature: '',
        profilePicture: null,
        avatarShape: 'rounded',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      req.user = mockUser;
      return next();
    }

    const sessionUser = (req.session as any)?.user;
    
    if (!sessionUser || !sessionUser.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Verify user still exists in database
    const user = await storage.getUser(sessionUser.id);
    if (!user) {
      // Clear invalid session
      (req.session as any).user = null;
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Hash password helper
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Verify password helper
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Create user session
export const createUserSession = (req: Request, user: any): UserSession => {
  const sessionUser: UserSession = {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
  
  (req.session as any).user = sessionUser;
  return sessionUser;
};

// Clear user session
export const clearUserSession = (req: Request): void => {
  (req.session as any).user = null;
};