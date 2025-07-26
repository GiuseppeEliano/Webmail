-- SQL script to create blocked_senders table
-- Execute this script in your MySQL database

CREATE TABLE IF NOT EXISTS blocked_senders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  blockedEmail VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for better performance
  INDEX idx_user_id (userId),
  INDEX idx_blocked_email (blockedEmail),
  
  -- Prevent duplicate entries
  UNIQUE KEY unique_user_blocked_email (userId, blockedEmail)
);

-- Example of inserting a blocked sender (for testing)
-- INSERT INTO blocked_senders (userId, blockedEmail) VALUES (1, 'spam@example.com');

-- Query to check blocked senders for a user
-- SELECT * FROM blocked_senders WHERE userId = 1 ORDER BY createdAt DESC;

-- Query to remove a blocked sender
-- DELETE FROM blocked_senders WHERE id = ?;