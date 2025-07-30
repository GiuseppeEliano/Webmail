import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);

export interface FileStorageService {
  // User storage folder management
  createUserStorageFolder(userId: number): Promise<void>;
  getUserStoragePath(userId: number): string;
  calculateUserStorageUsage(userId: number): Promise<number>;
  
  // File operations
  saveFile(userId: number, fileName: string, fileData: Buffer): Promise<string>;
  deleteFile(userId: number, fileName: string): Promise<boolean>;
  fileExists(userId: number, fileName: string): Promise<boolean>;
  
  // Storage management
  canUserReceiveEmails(userId: number, storageQuota: number): Promise<boolean>;
  cleanupUserFiles(userId: number, attachmentPaths: string[]): Promise<void>;
}

class LocalFileStorageService implements FileStorageService {
  private readonly basePath: string;
  
  constructor() {
    // Store files in a 'user_storage' directory at the project root
    this.basePath = path.join(process.cwd(), 'user_storage');
    this.ensureBaseDirectory();
  }
  
  private async ensureBaseDirectory(): Promise<void> {
    try {
      await mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create base storage directory:', error);
    }
  }
  
  getUserStoragePath(userId: number): string {
    return path.join(this.basePath, `user_${userId}`);
  }
  
  async createUserStorageFolder(userId: number): Promise<void> {
    const userPath = this.getUserStoragePath(userId);
    try {
      await mkdir(userPath, { recursive: true });
    } catch (error) {
      console.error(`Failed to create storage folder for user ${userId}:`, error);
      throw error;
    }
  }
  
  async calculateUserStorageUsage(userId: number): Promise<number> {
    const userPath = this.getUserStoragePath(userId);
    
    try {
      // Check if directory exists
      if (!fs.existsSync(userPath)) {
        return 0;
      }
      
      const files = await readdir(userPath);
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = path.join(userPath, file);
        try {
          const stats = await stat(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
          }
        } catch (error) {
          console.warn(`Could not stat file ${filePath}:`, error);
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error(`Failed to calculate storage usage for user ${userId}:`, error);
      return 0;
    }
  }
  
  async saveFile(userId: number, fileName: string, fileData: Buffer): Promise<string> {
    await this.createUserStorageFolder(userId);
    
    const userPath = this.getUserStoragePath(userId);
    const filePath = path.join(userPath, fileName);
    
    try {
      await writeFile(filePath, fileData);
      return fileName;
    } catch (error) {
      console.error(`Failed to save file ${fileName} for user ${userId}:`, error);
      throw error;
    }
  }
  
  async deleteFile(userId: number, fileName: string): Promise<boolean> {
    const userPath = this.getUserStoragePath(userId);
    const filePath = path.join(userPath, fileName);
    
    try {
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete file ${fileName} for user ${userId}:`, error);
      return false;
    }
  }
  
  async fileExists(userId: number, fileName: string): Promise<boolean> {
    const userPath = this.getUserStoragePath(userId);
    const filePath = path.join(userPath, fileName);
    return fs.existsSync(filePath);
  }
  
  async canUserReceiveEmails(userId: number, storageQuota: number): Promise<boolean> {
    const currentUsage = await this.calculateUserStorageUsage(userId);
    return currentUsage < storageQuota;
  }
  
  async cleanupUserFiles(userId: number, attachmentPaths: string[]): Promise<void> {
    for (const fileName of attachmentPaths) {
      try {
        await this.deleteFile(userId, fileName);
      } catch (error) {
        console.warn(`Failed to cleanup file ${fileName} for user ${userId}:`, error);
      }
    }
  }
}

export const fileStorageService = new LocalFileStorageService();