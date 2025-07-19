-- Eliano Webmail - Production MySQL Schema
-- Generated: July 05, 2025
-- Compatible with: MySQL 8.0+

SET foreign_key_checks = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- Drop existing tables if they exist
DROP TABLE IF EXISTS `email_tags`;
DROP TABLE IF EXISTS `emails`;
DROP TABLE IF EXISTS `aliases`;
DROP TABLE IF EXISTS `tags`;
DROP TABLE IF EXISTS `folders`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `users`;

-- Users table - Authentication and profile data
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL UNIQUE,
  `email` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `firstName` varchar(100) DEFAULT NULL,
  `lastName` varchar(100) DEFAULT NULL,
  `profileImageUrl` varchar(500) DEFAULT NULL,
  `signature` text DEFAULT NULL,
  `storageUsed` bigint DEFAULT 0,
  `storageQuota` bigint DEFAULT 104857600, -- 100MB default
  `language` varchar(10) DEFAULT 'pt',
  `theme` varchar(20) DEFAULT 'dark',
  `avatarShape` varchar(20) DEFAULT 'rounded',
  `sidebarView` varchar(20) DEFAULT 'expanded',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table - User authentication sessions
CREATE TABLE `sessions` (
  `sid` varchar(36) NOT NULL,
  `sess` json NOT NULL,
  `expire` timestamp NOT NULL,
  PRIMARY KEY (`sid`),
  KEY `idx_sessions_expire` (`expire`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Folders table - Email organization
CREATE TABLE `folders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('system','custom') DEFAULT 'custom',
  `systemType` varchar(50) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `color` varchar(7) DEFAULT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_folders_user` (`userId`),
  KEY `idx_folders_type` (`type`, `systemType`),
  CONSTRAINT `fk_folders_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tags table - Email categorization
CREATE TABLE `tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `color` varchar(7) DEFAULT '#3b82f6',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_tag` (`userId`, `name`),
  KEY `idx_tags_user` (`userId`),
  CONSTRAINT `fk_tags_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Emails table - Email storage with encryption
CREATE TABLE `emails` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `folderId` int NOT NULL,
  `messageId` varchar(255) UNIQUE DEFAULT NULL,
  `threadId` varchar(255) DEFAULT NULL,
  `fromAddress` varchar(255) NOT NULL,
  `fromName` varchar(255) DEFAULT NULL,
  `toAddress` text NOT NULL, -- Encrypted
  `ccAddress` text DEFAULT NULL, -- Encrypted
  `bccAddress` text DEFAULT NULL, -- Encrypted
  `subject` varchar(255) NOT NULL, -- Encrypted
  `body` longtext NOT NULL, -- Encrypted
  `attachments` json DEFAULT NULL,
  `isRead` boolean DEFAULT false,
  `isStarred` boolean DEFAULT false,
  `isDraft` boolean DEFAULT false,
  `isActiveDraft` boolean DEFAULT false,
  `priority` enum('low','normal','high') DEFAULT 'normal',
  `sentAt` timestamp NULL DEFAULT NULL,
  `receivedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_emails_user` (`userId`),
  KEY `idx_emails_folder` (`folderId`),
  KEY `idx_emails_message_id` (`messageId`),
  KEY `idx_emails_thread` (`threadId`),
  KEY `idx_emails_from` (`fromAddress`),
  KEY `idx_emails_read` (`isRead`),
  KEY `idx_emails_starred` (`isStarred`),
  KEY `idx_emails_draft` (`isDraft`),
  KEY `idx_emails_active_draft` (`userId`, `isActiveDraft`),
  KEY `idx_emails_received` (`receivedAt`),
  CONSTRAINT `fk_emails_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_emails_folder` FOREIGN KEY (`folderId`) REFERENCES `folders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Tags junction table
CREATE TABLE `email_tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emailId` int NOT NULL,
  `tagId` int NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email_tag` (`emailId`, `tagId`),
  KEY `idx_email_tags_email` (`emailId`),
  KEY `idx_email_tags_tag` (`tagId`),
  CONSTRAINT `fk_email_tags_email` FOREIGN KEY (`emailId`) REFERENCES `emails` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_email_tags_tag` FOREIGN KEY (`tagId`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Aliases table - Email aliases management
CREATE TABLE `aliases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `aliasName` varchar(100) NOT NULL UNIQUE,
  `forwardTo` varchar(255) NOT NULL,
  `isActive` boolean DEFAULT true,
  `description` text DEFAULT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_aliases_user` (`userId`),
  KEY `idx_aliases_name` (`aliasName`),
  KEY `idx_aliases_active` (`isActive`),
  CONSTRAINT `fk_aliases_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default system folders for new users (trigger)
DELIMITER $$
CREATE TRIGGER `create_default_folders` AFTER INSERT ON `users`
FOR EACH ROW
BEGIN
  INSERT INTO `folders` (`userId`, `name`, `type`, `systemType`, `icon`) VALUES
    (NEW.id, 'Inbox', 'system', 'inbox', 'inbox'),
    (NEW.id, 'Sent', 'system', 'sent', 'send'),
    (NEW.id, 'Drafts', 'system', 'drafts', 'file-text'),
    (NEW.id, 'Spam', 'system', 'spam', 'alert-triangle'),
    (NEW.id, 'Trash', 'system', 'trash', 'trash-2'),
    (NEW.id, 'Archive', 'system', 'archive', 'archive');
END$$
DELIMITER ;

-- Create indexes for performance
CREATE INDEX `idx_emails_user_folder_received` ON `emails` (`userId`, `folderId`, `receivedAt` DESC);
CREATE INDEX `idx_emails_user_read_received` ON `emails` (`userId`, `isRead`, `receivedAt` DESC);
CREATE INDEX `idx_emails_user_starred_received` ON `emails` (`userId`, `isStarred`, `receivedAt` DESC);

-- Enable foreign key checks
SET foreign_key_checks = 1;

-- Insert sample admin user (password: admin123)
INSERT INTO `users` (`username`, `email`, `password`, `firstName`, `lastName`, `signature`, `language`) VALUES
('admin', 'admin@eliano.dev', '$2b$10$rQZ1vQ5k6m8FjKvTqHuX7uOWlGvfVJ9YX3LQ5Zl7KjMvA8uF2sN4e', 'Administrador', 'Sistema', '<p>--<br>Administrador do Sistema<br>eliano.dev</p>', 'pt');

-- Display success message
SELECT 'Eliano Webmail Database Schema Created Successfully!' as Status;
SELECT 'Default admin user created: admin@eliano.dev (password: admin123)' as Info;
SELECT 'Remember to change the admin password after first login!' as Warning;