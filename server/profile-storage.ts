import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ProfileStorageService {
  saveProfilePicture(userId: number, imageData: string): Promise<string>;
  saveProfilePictureFromBuffer(userId: number, buffer: Buffer, mimetype: string): Promise<string>;
  deleteProfilePicture(userId: number, filename: string): Promise<boolean>;
  getProfilePictureUrl(userId: number, filename: string): string;
}

class LocalProfileStorageService implements ProfileStorageService {
  private readonly basePath: string;

  constructor() {
    this.basePath = path.join(process.cwd(), 'user_storage', 'profiles');
    this.ensureBaseDirectory();
  }

  private async ensureBaseDirectory(): Promise<void> {
    try {
      if (!fs.existsSync(this.basePath)) {
        fs.mkdirSync(this.basePath, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating base directory:', error);
      throw new Error('Failed to create storage directory');
    }
  }

  private getUserProfilePath(userId: number): string {
    try {
      const userPath = path.join(this.basePath, `user_${userId}`);
      if (!fs.existsSync(userPath)) {
        fs.mkdirSync(userPath, { recursive: true });
      }
      return userPath;
    } catch (error) {
      console.error('Error creating user profile directory:', error);
      throw new Error('Failed to create user profile directory');
    }
  }

  async saveProfilePictureFromBuffer(userId: number, buffer: Buffer, mimetype: string): Promise<string> {
    try {
      console.log('Starting profile picture save from buffer for user:', userId);
      
      // Ensure base directory exists
      await this.ensureBaseDirectory();
      
      // Extract format from mimetype
      const formatMap: { [key: string]: string } = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg', 
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp'
      };
      
      const imageFormat = formatMap[mimetype];
      if (!imageFormat) {
        console.error('Invalid image format:', mimetype);
        throw new Error(`Invalid image format: ${mimetype}`);
      }

      // Security: Check file size (limit to 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (buffer.length > maxSize) {
        console.error('Image too large:', buffer.length, 'bytes');
        throw new Error('Image too large. Maximum size is 5MB');
      }

      console.log('Image validation passed. Buffer size:', buffer.length);

      // Delete old profile pictures for this user BEFORE saving new one
      await this.deleteOldProfilePictures(userId);

      // Generate filename: user_id + timestamp (as requested)
      const timestamp = Date.now();
      const filename = `${userId}_${timestamp}.${imageFormat}`;

      console.log('Generated filename:', filename);

      // Save directly to profiles directory (not in user subdirectory)
      const filePath = path.join(this.basePath, filename);
      
      console.log('Saving to path:', filePath);
      
      fs.writeFileSync(filePath, buffer);
      
      console.log('Profile picture saved successfully');
      
      return filename;
    } catch (error) {
      console.error('Error saving profile picture from buffer:', error);
      throw error; // Re-throw the original error instead of generic message
    }
  }

  async saveProfilePicture(userId: number, imageData: string): Promise<string> {
    try {
      console.log('Starting profile picture save for user:', userId);
      
      // Ensure base directory exists
      await this.ensureBaseDirectory();
      
      // Extract base64 data and format
      const matches = imageData.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
      if (!matches) {
        console.error('Invalid image data format - no matches found');
        throw new Error('Invalid image data format');
      }

      const imageFormat = matches[1];
      const base64Data = matches[2];
      
      console.log('Image format:', imageFormat, 'Data length:', base64Data.length);
      
      const buffer = Buffer.from(base64Data, 'base64');

      // Security: Validate image format
      const allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      if (!allowedFormats.includes(imageFormat.toLowerCase())) {
        console.error('Invalid image format:', imageFormat);
        throw new Error(`Invalid image format: ${imageFormat}. Allowed: JPG, PNG, GIF, WebP`);
      }

      // Security: Check file size (limit to 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (buffer.length > maxSize) {
        console.error('Image too large:', buffer.length, 'bytes');
        throw new Error('Image too large. Maximum size is 5MB');
      }

      console.log('Image validation passed. Buffer size:', buffer.length);

      // Delete old profile pictures for this user
      await this.deleteOldProfilePictures(userId);

      // Generate secure filename with user ID embedded
      const timestamp = Date.now();
      const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
      const filename = `profile_${userId}_${timestamp}_${hash}.${imageFormat}`;

      console.log('Generated filename:', filename);

      // Save to user's profile directory
      const userProfilePath = this.getUserProfilePath(userId);
      const filePath = path.join(userProfilePath, filename);
      
      console.log('Saving to path:', filePath);
      
      fs.writeFileSync(filePath, buffer);
      
      console.log('Profile picture saved successfully');
      
      return filename;
    } catch (error) {
      console.error('Error saving profile picture:', error);
      throw error; // Re-throw the original error instead of generic message
    }
  }

  private async deleteOldProfilePictures(userId: number): Promise<void> {
    try {
      // Check if profiles directory exists
      if (!fs.existsSync(this.basePath)) {
        return;
      }
      
      const files = fs.readdirSync(this.basePath);
      
      // Delete all existing profile pictures for this user (format: userId_timestamp.ext)
      for (const file of files) {
        if (file.startsWith(`${userId}_`) && file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          const filePath = path.join(this.basePath, file);
          fs.unlinkSync(filePath);
          console.log('Deleted old profile picture:', file);
        }
      }
    } catch (error) {
      console.error('Error deleting old profile pictures:', error);
      // Don't throw error here - just log it and continue
    }
  }

  async deleteProfilePicture(userId: number, filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      return false;
    }
  }

  getProfilePictureUrl(userId: number, filename: string): string {
    return `/api/profile-picture/${userId}/${filename}`;
  }
}

export const profileStorageService = new LocalProfileStorageService();