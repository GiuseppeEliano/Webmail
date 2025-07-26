-- Add emailId column to blocked_senders table for automatic SPAM movement
-- Execute this script in your MySQL database

ALTER TABLE blocked_senders 
ADD COLUMN emailId INT DEFAULT NULL AFTER blockedEmail;

-- Add index for better performance
CREATE INDEX idx_blocked_email_id ON blocked_senders(emailId);

-- Example of blocking a sender with emailId
-- INSERT INTO blocked_senders (userId, blockedEmail, emailId) VALUES (1, 'spam@example.com', 123);