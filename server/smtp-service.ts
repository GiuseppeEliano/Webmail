import nodemailer from 'nodemailer';
import * as path from 'path';

export interface EmailAttachment {
  filename: string;
  content: string | Buffer; // Base64 encoded string or Buffer
  contentType: string;
  size: number;
}

export interface SMTPEmailData {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  htmlBody: string; // Rich HTML content with formatting
  textBody?: string; // Optional plain text fallback
  attachments?: EmailAttachment[];
}

export interface UserSMTPCredentials {
  email: string;
  password: string;
}

class SMTPService {
  /**
   * Create SMTP transporter for specific user credentials
   */
  private createUserTransporter(userCredentials: UserSMTPCredentials): nodemailer.Transporter {
    console.log('RAW SMTP_HOST:', JSON.stringify(process.env.SMTP_HOST));


	return nodemailer.createTransport({
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: userCredentials.email, // Use actual user email
        pass: userCredentials.password // Use actual user password
      },
      tls: {
        rejectUnauthorized: true,
		servername: process.env.SMTP_HOST
      }
    });
  }

  /**
   * Convert plain text to HTML while preserving formatting
   */
  private convertTextToHTML(text: string): string {
    if (!text) return '';
    
    // If it's already HTML (contains tags), return as-is
    if (text.includes('<') && text.includes('>')) {
      return text;
    }
    
    // Convert plain text formatting to HTML
    return text
      .replace(/\n/g, '<br>') // Line breaks
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/__(.*?)__/g, '<u>$1</u>') // Underline
      .replace(/~~(.*?)~~/g, '<del>$1</del>'); // Strikethrough
  }

  /**
   * Send an email via SMTP using user-specific credentials
   */
  async sendEmail(emailData: SMTPEmailData, userCredentials: UserSMTPCredentials): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Create transporter with user's specific credentials
    const transporter = this.createUserTransporter(userCredentials);

    try {
      console.log('📧 Preparing to send email:', {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        hasAttachments: !!emailData.attachments?.length
      });

      // Prepare attachments
      const attachments = emailData.attachments?.map(att => ({
        filename: att.filename,
        content: typeof att.content === 'string' ? 
          Buffer.from(att.content, 'base64') : att.content,
        contentType: att.contentType
      })) || [];

      // Convert body to HTML if needed
      const htmlBody = this.convertTextToHTML(emailData.htmlBody);
      
      // Generate plain text version if not provided
      const textBody = emailData.textBody || 
        htmlBody.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n').trim();

      // Configure sender to show the actual user's email while using SMTP auth
      // This uses the "From" header to show the real sender while using SMTP credentials for delivery
      const mailOptions = {
        from: `${emailData.from}`, // Shows the actual user's email as sender
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        text: textBody,
        html: htmlBody,
        attachments: attachments,
        // Use Reply-To to ensure replies go to the actual sender
        replyTo: emailData.from
      };

      console.log('📧 Sending email with user credentials:', {
        smtpUser: userCredentials.email,
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        attachments: attachments.map(a => ({ filename: a.filename, size: a.content.length }))
      });

      const info = await transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully:', info.messageId);
      
      return { 
        success: true, 
        messageId: info.messageId 
      };

    } catch (error) {
      console.error('❌ Error sending email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Test SMTP connection with user credentials
   */
  async testConnection(userCredentials: UserSMTPCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = this.createUserTransporter(userCredentials);
      await transporter.verify();
      console.log('✅ SMTP connection verified for user:', userCredentials.email);
      return { success: true };
    } catch (error) {
      console.error('❌ SMTP connection failed for user:', userCredentials.email, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }
}

// Export singleton instance
export const smtpService = new SMTPService();