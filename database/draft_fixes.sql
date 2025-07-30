-- Draft System Fixes - Execute these commands in your MySQL database

-- 1. Remove duplicate active drafts (keep only the most recent one per user)
DELETE d1 FROM emails d1
INNER JOIN emails d2 
WHERE d1.userId = d2.userId 
  AND d1.isActiveDraft = 1 
  AND d2.isActiveDraft = 1 
  AND d1.id < d2.id;

-- 2. Remove empty drafts that are not active
DELETE FROM emails 
WHERE isDraft = 1 
  AND isActiveDraft = 0 
  AND (subject = '' OR subject IS NULL)
  AND (body = '' OR body IS NULL)
  AND (toAddress = '' OR toAddress IS NULL);

-- 3. Remove orphaned drafts (more than 7 days old and not active)
DELETE FROM emails 
WHERE isDraft = 1 
  AND isActiveDraft = 0 
  AND createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- 4. Add performance indexes for draft operations
ALTER TABLE emails ADD INDEX idx_user_active_draft (userId, isActiveDraft, isDraft);
ALTER TABLE emails ADD INDEX idx_user_draft (userId, isDraft);
ALTER TABLE emails ADD INDEX idx_folder_emails (folderId, isDraft);

-- 5. Check results - run these queries to verify the fixes
SELECT 
    userId, 
    COUNT(*) as total_drafts,
    SUM(CASE WHEN isActiveDraft = 1 THEN 1 ELSE 0 END) as active_drafts,
    SUM(CASE WHEN isActiveDraft = 0 THEN 1 ELSE 0 END) as inactive_drafts
FROM emails 
WHERE isDraft = 1 
GROUP BY userId;

-- 6. Verify no duplicate active drafts remain
SELECT userId, COUNT(*) as active_draft_count
FROM emails 
WHERE isActiveDraft = 1 
GROUP BY userId
HAVING COUNT(*) > 1;

-- If query #6 returns any results, there are still duplicate active drafts
-- If query #6 returns no results, the fix was successful

-- 7. Summary of emails by folder (to verify draft counts)
SELECT 
    f.id as folder_id,
    f.name as folder_name,
    COUNT(e.id) as email_count,
    SUM(CASE WHEN e.isDraft = 1 THEN 1 ELSE 0 END) as draft_count
FROM folders f
LEFT JOIN emails e ON f.id = e.folderId
GROUP BY f.id, f.name
ORDER BY f.id;

-- Note: After running these commands, the draft system should work correctly:
-- - Only one active draft per user at a time
-- - No duplicate or orphaned drafts
-- - Better performance with new indexes
-- - Clean database with no unnecessary records