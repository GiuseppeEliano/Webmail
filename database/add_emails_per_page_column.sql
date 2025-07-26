-- SQL command to add emailsPerPage column to users table
-- This will add the column with default value of 20 emails per page

ALTER TABLE users ADD COLUMN emailsPerPage INT DEFAULT 20;

-- Update existing users to have the default value
UPDATE users SET emailsPerPage = 20 WHERE emailsPerPage IS NULL;