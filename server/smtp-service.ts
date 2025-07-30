import nodemailer from 'nodemailer';
import * as path from 'path';

export interface EmailAttachment {
  filename: string;
  content: string | Buffer; // Base64 encoded string or Buffer
  contentType: string;
  size: number;
}

export interface InlineImage {
  id: string;
  dataUrl: string;
  filename: string;
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
  inlineImages?: InlineImage[]; // Inline images for embedding
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
   * Extract inline images from HTML body if not explicitly provided
   */
  private extractInlineImagesFromHTML(htmlBody: string): InlineImage[] {
    const inlineImages: InlineImage[] = [];
    const imgRegex = /<img[^>]*src="(data:image\/[^"]*)"[^>]*>/g;
    let match;
    let index = 0;

    while ((match = imgRegex.exec(htmlBody)) !== null) {
      const dataUrl = match[1];
      const imgTag = match[0];
      
      // Try to extract data-inline-id if present
      const idMatch = imgTag.match(/data-inline-id="([^"]*)"/);
      const imageId = idMatch ? idMatch[1] : `extracted-img-${Date.now()}-${index}`;
      
      // Try to extract filename or generate one
      const altMatch = imgTag.match(/alt="([^"]*)"/);
      const mimeMatch = dataUrl.match(/data:image\/([^;]+)/);
      const extension = mimeMatch ? mimeMatch[1] : 'jpg';
      const filename = altMatch && altMatch[1] ? `${altMatch[1]}.${extension}` : `inline-image-${index}.${extension}`;

      inlineImages.push({
        id: imageId,
        dataUrl,
        filename
      });

      index++;
    }

    console.log('🖼️ Extracted inline images from HTML:', {
      found: inlineImages.length,
      images: inlineImages.map(img => ({ id: img.id, filename: img.filename, dataUrlLength: img.dataUrl.length }))
    });

    return inlineImages;
  }

  /**
   * Process inline images and convert data URLs to CID references
   */
  private processInlineImages(htmlBody: string, inlineImages: InlineImage[]): { processedHtml: string; cidAttachments: any[] } {
    let processedHtml = htmlBody;
    const cidAttachments: any[] = [];

    console.log('🖼️ Processing inline images:', {
      inlineImagesCount: inlineImages?.length || 0,
      htmlLength: htmlBody?.length || 0,
      htmlSample: htmlBody?.substring(0, 200) + '...'
    });

    if (inlineImages && inlineImages.length > 0) {
      inlineImages.forEach((image, index) => {
        const cid = `inline-image-${index}@webmail.local`;
        
        console.log(`🖼️ Processing image ${index}:`, {
          imageId: image.id,
          filename: image.filename,
          dataUrlStart: (image.dataUrl?.substring(0, 50) || '') + '...',
          dataUrlLength: image.dataUrl?.length || 0,
          cid: cid
        });

        // Replace data URL with CID reference in HTML - multiple strategies
        const cidRef = `cid:${cid}`;
        
        // Strategy 1: Replace by data-inline-id first
        const beforeReplace1 = processedHtml;
        processedHtml = processedHtml.replace(
          new RegExp(`(<img[^>]*data-inline-id="${image.id}"[^>]*)(src="[^"]*")([^>]*>)`, 'g'),
          `$1src="${cidRef}"$3`
        );
        
        console.log(`🖼️ Strategy 1 result for image ${index}:`, {
          changed: processedHtml !== beforeReplace1,
          beforeLength: beforeReplace1.length,
          afterLength: processedHtml.length
        });
        
        // Strategy 2: Replace by exact data URL match if strategy 1 didn't work
        if (processedHtml === beforeReplace1) {
          console.log('🖼️ Strategy 1 failed, trying direct URL replacement');
          try {
            const escapedDataUrl = image.dataUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            processedHtml = processedHtml.replace(
              new RegExp(`src="${escapedDataUrl}"`, 'g'),
              `src="${cidRef}"`
            );
            console.log(`🖼️ Strategy 2 result for image ${index}:`, {
              changed: processedHtml !== beforeReplace1,
              escapedUrlLength: escapedDataUrl.length
            });
          } catch (regexError) {
            console.error('🖼️ Strategy 2 regex error:', regexError);
          }
        }

        // Strategy 3: Replace any data:image URL with our CID (more aggressive)
        if (processedHtml === beforeReplace1) {
          console.log('🖼️ Strategy 2 failed, trying generic data URL replacement');
          const beforeReplace3 = processedHtml;
          processedHtml = processedHtml.replace(
            /src="data:image\/[^"]+"/g,
            `src="${cidRef}"`
          );
          console.log(`🖼️ Strategy 3 result for image ${index}:`, {
            changed: processedHtml !== beforeReplace3,
            replacements: processedHtml !== beforeReplace3 ? 'yes' : 'no'
          });
        }

        // Extract base64 content from data URL
        const base64Match = image.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          const [, mimeType, base64Content] = base64Match;
          
          const attachment = {
            filename: image.filename || `inline-image-${index}.jpg`,
            content: Buffer.from(base64Content, 'base64'),
            contentType: mimeType,
            cid: cid,
            disposition: 'inline'
          };

          cidAttachments.push(attachment);
          
          console.log('🖼️ Created CID attachment:', {
            filename: attachment.filename,
            contentType: attachment.contentType,
            contentSize: attachment.content.length,
            cid: attachment.cid,
            base64ContentLength: base64Content.length
          });
        } else {
          console.error('❌ Failed to parse data URL for image:', {
            imageId: image.id,
            dataUrlStart: image.dataUrl?.substring(0, 100) || 'undefined',
            matchResult: base64Match
          });
        }
      });

      console.log('🖼️ Final processed HTML sample:', processedHtml.substring(0, 500) + '...');
      console.log('🖼️ Total CID attachments created:', cidAttachments.length);
      
      // Additional debug: look for remaining data URLs in final HTML
      const remainingDataUrls = processedHtml.match(/src="data:image\/[^"]+"/g);
      if (remainingDataUrls) {
        console.warn('⚠️ Found remaining data URLs in processed HTML:', remainingDataUrls.length);
      } else {
        console.log('✅ No remaining data URLs found in processed HTML');
      }
    }

    return { processedHtml, cidAttachments };
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
        hasAttachments: !!emailData.attachments?.length,
        hasInlineImages: !!emailData.inlineImages?.length
      });

      // Prepare regular attachments
      const attachments = emailData.attachments?.map(att => ({
        filename: att.filename,
        content: typeof att.content === 'string' ? 
          Buffer.from(att.content, 'base64') : att.content,
        contentType: att.contentType
      })) || [];

      // Convert body to HTML if needed
      let htmlBody = this.convertTextToHTML(emailData.htmlBody);
      
      // Extract inline images from HTML if not provided explicitly
      let inlineImages = emailData.inlineImages || [];
      if (inlineImages.length === 0) {
        inlineImages = this.extractInlineImagesFromHTML(htmlBody);
      }
      
      // Process inline images and get CID attachments
      const { processedHtml, cidAttachments } = this.processInlineImages(htmlBody, inlineImages);
      htmlBody = processedHtml;
      
      // Generate plain text version if not provided
      const textBody = emailData.textBody || 
        htmlBody.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n').trim();

      // Combine regular attachments with inline image attachments
      const allAttachments = [...attachments, ...cidAttachments];

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
        attachments: allAttachments,
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