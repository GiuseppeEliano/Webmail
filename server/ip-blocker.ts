import fs from 'fs/promises';
import path from 'path';

interface IPBlockData {
  attempts: number;
  blockedUntil?: Date;
}

class IPBlocker {
  private ipData = new Map<string, IPBlockData>();
  private filePath = path.join(process.cwd(), 'server', 'blocked-ips.json');

  constructor() {
    this.loadFromFile();
  }

  private async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const blockedIPs = JSON.parse(data);
      
      // Convert dates back from strings and clean expired blocks
      for (const [ip, blockData] of Object.entries(blockedIPs)) {
        const data = blockData as any;
        if (data.blockedUntil) {
          const blockedUntil = new Date(data.blockedUntil);
          if (blockedUntil > new Date()) {
            this.ipData.set(ip, {
              attempts: data.attempts,
              blockedUntil
            });
          }
          // Expired blocks are not loaded
        } else {
          this.ipData.set(ip, { attempts: data.attempts });
        }
      }
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      console.log('No blocked IPs file found, starting fresh');
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const dataToSave: Record<string, any> = {};
      
      Array.from(this.ipData.entries()).forEach(([ip, blockData]) => {
        // Only save if not expired
        if (!blockData.blockedUntil || blockData.blockedUntil > new Date()) {
          dataToSave[ip] = {
            attempts: blockData.attempts,
            blockedUntil: blockData.blockedUntil?.toISOString()
          };
        }
      });
      
      await fs.writeFile(this.filePath, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      console.error('Error saving blocked IPs:', error);
    }
  }

  isBlocked(ip: string): { blocked: boolean; timeLeft?: number } {
    const data = this.ipData.get(ip);
    
    if (data?.blockedUntil) {
      if (data.blockedUntil > new Date()) {
        const timeLeft = Math.ceil((data.blockedUntil.getTime() - Date.now()) / 1000);
        return { blocked: true, timeLeft };
      } else {
        // Block expired, remove it
        this.ipData.delete(ip);
        this.saveToFile();
      }
    }
    
    return { blocked: false };
  }

  recordFailedAttempt(ip: string): { attempts: number; blocked: boolean; blockedUntil?: Date } {
    const now = new Date();
    let data = this.ipData.get(ip) || { attempts: 0 };
    
    // If already blocked but expired, reset
    if (data.blockedUntil && data.blockedUntil <= now) {
      data = { attempts: 0 };
    }
    
    // Don't increment if currently blocked
    if (!data.blockedUntil || data.blockedUntil <= now) {
      data.attempts += 1;
    }
    
    if (data.attempts >= 4) {
      data.blockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      this.ipData.set(ip, data);
      this.saveToFile();
      
      return {
        attempts: data.attempts,
        blocked: true,
        blockedUntil: data.blockedUntil
      };
    } else {
      this.ipData.set(ip, data);
      this.saveToFile();
      
      return {
        attempts: data.attempts,
        blocked: false
      };
    }
  }

  clearAttempts(ip: string): void {
    this.ipData.delete(ip);
    this.saveToFile();
  }

  getAttempts(ip: string): number {
    return this.ipData.get(ip)?.attempts || 0;
  }

  // Clean up expired blocks (call periodically)
  cleanupExpired(): void {
    let hasChanges = false;
    
    Array.from(this.ipData.entries()).forEach(([ip, data]) => {
      if (data.blockedUntil && data.blockedUntil <= new Date()) {
        this.ipData.delete(ip);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.saveToFile();
    }
  }
}

export const ipBlocker = new IPBlocker();

// Clean up expired blocks every 5 minutes
setInterval(() => {
  ipBlocker.cleanupExpired();
}, 5 * 60 * 1000);