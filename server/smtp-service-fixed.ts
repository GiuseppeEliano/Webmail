import nodemailer from 'nodemailer';

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
   * Replicates swaks behavior: --server 127.0.0.1:587 --auth LOGIN --tls
   */
  private createUserTransporter(userCredentials: UserSMTPCredentials): nodemailer.Transporter {
    // Try different approaches for STARTTLS
    const smtpConfig = {
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // Must be false for STARTTLS on port 587
      requireTLS: true, // Force STARTTLS after connection
      auth: {
        user: userCredentials.email,
        pass: userCredentials.password
      },
      tls: {
        rejectUnauthorized: false,
        servername: process.env.SMTP_HOST || '127.0.0.1' // Explicit servername for TLS
      },
      pool: false, // Disable connection pooling for debugging
      maxConnections: 1,
      debug: true,
      logger: console
    };

    console.log('🔧 Creating SMTP transporter (swaks-compatible):', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      requireTLS: smtpConfig.requireTLS,
      user: userCredentials.email
    });

    return nodemailer.createTransport(smtpConfig as any);
  }

  /**
   * Process HTML content and ensure it's properly formatted for email
   * Handles both plain text and rich HTML from the composer
   */
  private convertTextToHTML(text: string): string {
    if (!text) return '';
    
    // If it's already HTML (contains tags), process and enhance it
    if (text.includes('<') && text.includes('>')) {
      return this.enhanceHTMLForEmail(text);
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
   * Enhance HTML content for better email compatibility
   * Ensures all formatting from the composer works in email clients
   */
  private enhanceHTMLForEmail(html: string): string {
    // Wrap content in proper email structure with inline CSS for maximum compatibility
    const emailHTML = `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
        ${html}
      </div>
    `;

    return emailHTML
      // Ensure headings have proper styling
      .replace(/<h1([^>]*)>/g, '<h1$1 style="font-size: 24px; font-weight: bold; margin: 20px 0 10px 0; color: #333;">')
      .replace(/<h2([^>]*)>/g, '<h2$1 style="font-size: 20px; font-weight: bold; margin: 18px 0 9px 0; color: #333;">')
      .replace(/<h3([^>]*)>/g, '<h3$1 style="font-size: 16px; font-weight: bold; margin: 16px 0 8px 0; color: #333;">')
      
      // Ensure lists have proper spacing
      .replace(/<ul([^>]*)>/g, '<ul$1 style="margin: 15px 0; padding-left: 30px;">')
      .replace(/<ol([^>]*)>/g, '<ol$1 style="margin: 15px 0; padding-left: 30px;">')
      .replace(/<li([^>]*)>/g, '<li$1 style="margin: 5px 0;">')
      
      // Enhance blockquotes
      .replace(/<blockquote([^>]*)>/g, '<blockquote$1 style="border-left: 4px solid #ddd; margin: 15px 0; padding: 10px 15px; background: #f9f9f9; font-style: italic;">')
      
      // Enhance code blocks
      .replace(/<pre([^>]*)>/g, '<pre$1 style="background: #f4f4f4; border: 1px solid #ddd; border-radius: 4px; padding: 15px; margin: 15px 0; overflow-x: auto; font-family: Consolas, Monaco, monospace; font-size: 14px;">')
      .replace(/<code([^>]*)>/g, '<code$1 style="background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: Consolas, Monaco, monospace; font-size: 14px;">')
      
      // Ensure paragraphs have proper spacing
      .replace(/<p([^>]*)>/g, '<p$1 style="margin: 10px 0; line-height: 1.6;">')
      
      // Ensure links are styled
      .replace(/<a([^>]*)>/g, '<a$1 style="color: #007bff; text-decoration: underline;">')
      
      // Preserve text alignment
      .replace(/text-align:\s*center/g, 'text-align: center')
      .replace(/text-align:\s*right/g, 'text-align: right')
      .replace(/text-align:\s*justify/g, 'text-align: justify')
      .replace(/text-align:\s*left/g, 'text-align: left')
      
      // Preserve text colors and background colors
      .replace(/color:\s*([^;]+)/g, 'color: $1')
      .replace(/background-color:\s*([^;]+)/g, 'background-color: $1')
      
      // Preserve font sizes
      .replace(/font-size:\s*([^;]+)/g, 'font-size: $1')
      
      // Preserve other common formatting
      .replace(/font-weight:\s*bold/g, 'font-weight: bold')
      .replace(/font-style:\s*italic/g, 'font-style: italic')
      .replace(/text-decoration:\s*underline/g, 'text-decoration: underline')
      .replace(/text-decoration:\s*line-through/g, 'text-decoration: line-through');
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
        hasAttachments: emailData.attachments && emailData.attachments.length > 0
      });

      // Process attachments if they exist
      const attachments: any[] = [];
      if (emailData.attachments && emailData.attachments.length > 0) {
        for (const attachment of emailData.attachments) {
          try {
            const content = typeof attachment.content === 'string' 
              ? Buffer.from(attachment.content, 'base64')
              : attachment.content;

            attachments.push({
              filename: attachment.filename,
              content: content,
              contentType: attachment.contentType
            });
          } catch (error) {
            console.error('❌ Error processing attachment:', attachment.filename, error);
          }
        }
      }

      // Convert HTML to plain text if needed
      const htmlBody = this.convertTextToHTML(emailData.htmlBody || '');
      
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
      
      console.log('✅ Email sent successfully:', {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      });

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

export const smtpService = new SMTPService();