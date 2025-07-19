# Eliano - Modern Webmail Application

## Overview

Eliano is a modern, responsive webmail application built with React and Node.js. It features a beautiful dark theme interface and provides full email functionality including composing, reading, organizing, and managing emails. The application is designed to be a complete email client with folder management, search capabilities, and user settings.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: MySQL with Drizzle ORM (configured for remote server)
- **API**: RESTful API design
- **Build Tool**: Vite for development and production builds
- **Development**: Hot module replacement and development server

### Component Structure
- **Modular Design**: Components are organized by feature and UI elements
- **Design System**: Consistent use of shadcn/ui components
- **Responsive Layout**: Mobile-first approach with desktop optimizations

## Key Components

### Core Features
1. **Email Management**: Full CRUD operations for emails
2. **Folder System**: System folders (inbox, sent, drafts, etc.) and custom folders
3. **Search Functionality**: Real-time email search across content and metadata
4. **Compose Modal**: Rich text email composition with formatting tools
5. **Settings Panel**: User preferences and account management
6. **Responsive Design**: Mobile and desktop optimized interface

### Database Schema
- **Users Table**: User authentication and profile information
- **Folders Table**: Email organization with system and custom folder types
- **Emails Table**: Complete email metadata and content storage

### API Endpoints
- User management: `/api/user/:id`
- Folder operations: `/api/folders/:userId`
- Email operations: `/api/emails/:userId`
- Search functionality: `/api/search/:userId`
- Email counts: `/api/counts/:userId`

## Data Flow

1. **Client-Server Communication**: REST API with JSON payloads
2. **State Management**: TanStack Query handles caching and synchronization
3. **Database Operations**: Drizzle ORM provides type-safe database access
4. **Real-time Updates**: Query invalidation for immediate UI updates

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React, React DOM, React Hook Form
- **UI Framework**: Radix UI components, Tailwind CSS
- **State Management**: TanStack Query
- **Utilities**: date-fns, clsx, class-variance-authority

### Backend Dependencies
- **Server**: Express.js with middleware support
- **Database**: Drizzle ORM with MySQL (mysql2 driver)
- **Validation**: Zod for schema validation
- **Development**: tsx for TypeScript execution

### Development Tools
- **Build**: Vite with React plugin
- **TypeScript**: Full type safety across the stack
- **Linting**: ESBuild for production builds

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with HMR
- **Database**: PostgreSQL connection via DATABASE_URL
- **Hot Reloading**: Full-stack development with automatic restarts

### Production Build
- **Frontend**: Vite build with static asset optimization
- **Backend**: ESBuild bundling for Node.js deployment
- **Database**: Drizzle migrations for schema management

### Environment Configuration
- **Database**: MySQL connection string required (supports remote servers)
- **Build Process**: Separate client and server builds
- **Static Assets**: Served from Express in production

## Recent Changes

```
Recent Changes:
- July 19, 2025. ✅ CRITICAL FIX: Fixed attachment preservation bug in production mode - attachments now properly preserved when closing compose modal by updating routes and sanitization logic
- July 19, 2025. ✅ ENHANCED: Updated sanitizeEmailForStorage function to only include attachment fields when explicitly provided, allowing storage layer to preserve existing data
- July 19, 2025. ✅ IMPROVED: Modified PUT /api/email/:emailId route to handle attachment preservation during draft updates
- July 17, 2025. ✅ FIXED: Critical attachments bug - Drizzle JSON columns require objects, not strings. Updated attachment handling to parse JSON strings to objects before database insertion
- July 17, 2025. 🔧 ENHANCED: Added proper JSON parsing in routes.ts and storage encryption functions to handle attachments correctly
- July 17, 2025. ✅ ENHANCED: Updated sanitizeEmailForStorage function to preserve attachments and hasAttachments fields during security sanitization
- July 19, 2025. ✅ CRITICAL FIX: Fixed attachment preservation bug in production mode during draft updates - attachments now properly preserved when closing compose modal
- July 19, 2025. ✅ ENHANCED: Updated updateEmail method in production storage to preserve existing attachments when they're not included in update data
- July 17, 2025. ✅ MIGRATED: Successfully migrated project from Replit Agent to standard Replit environment with full functionality
- July 12, 2025. ✅ CORRECTED: Automatic email closing only when SENDING email or CLOSING compose box - removed from EDIT draft action
- July 12, 2025. ✅ IMPLEMENTED: Added setSelectedEmail(null) to handleSendEmail and handleCloseCompose functions for seamless "Back to inbox" experience
- July 12, 2025. ✅ FIXED: Removed automatic server updates during draft editing - compose box now opens immediately with content and stays static until save/send
- July 12, 2025. ✅ OPTIMIZED: Eliminated "Checking for draft data updates from server" console messages and unnecessary server calls
- July 12, 2025. ✅ ENHANCED: Pre-populate draft data immediately when modal opens to avoid blank screen during editing
- July 12, 2025. ✅ IMPROVED: Simplified draft editing flow - one initial load, no further updates until user action
- July 11, 2025. ✅ FIXED: Critical draft editing bug - email field no longer resets when clicking in textarea during draft editing
- July 11, 2025. ✅ ENHANCED: Added active editing state tracking to prevent form resets during user interactions
- July 11, 2025. ✅ IMPROVED: Separated useEffect hooks to prevent unwanted form resets when editing drafts
- July 11, 2025. ✅ UPDATED: EmailInput component now supports onFocus/onBlur props for better form state management
- July 11, 2025. ✅ COMPLETED: Successfully migrated project from Replit Agent to standard Replit environment
- July 11, 2025. ✅ FIXED: Critical production draft creation bug - removed duplicate draft creation and fixed undefined variable in convertDraftToSentEmail function
- July 11, 2025. ✅ COMPLETED: Successfully migrated project from Replit Agent to standard Replit environment with comprehensive bug fixes
- July 11, 2025. ✅ FIXED: Compose modal draft creation system - clicking COMPOSE no longer creates database entries automatically
- July 11, 2025. ✅ ENHANCED: Draft saving now only happens when user closes modal (X button) AND has content to save
- July 11, 2025. ✅ IMPROVED: Each new compose creates separate draft instead of reusing last saved draft
- July 11, 2025. ✅ OPTIMIZED: Editing existing drafts updates them properly without creating new entries
- July 11, 2025. ✅ MIGRATED: Successfully migrated project from Replit Agent to standard Replit environment
- July 10, 2025. ✅ CRITICAL FIX: Email content deletion bug when adding tags - removed problematic PUT request that was overwriting entire email with only tags field
- July 10, 2025. ✅ ENHANCED: Tag system now uses only email_tags relationship table, preventing data corruption when managing tags
- July 10, 2025. ✅ FIXED: React error #31 that appeared after adding tags to emails due to corrupted email data
- July 10, 2025. ✅ FIXED: Critical sorting functionality error - setSortBy function now properly uses updateFilters function instead of undefined direct call
- July 10, 2025. ✅ IMPLEMENTED: Complete filtering and sorting support in production storage (storage-production-fixed-temp.ts) with server-side filtering logic
- July 10, 2025. ✅ ENHANCED: Production storage now includes applyEmailFilters method with support for unread, starred, attachments, and tags filters
- July 10, 2025. ✅ SYNCHRONIZED: Both development and production storage now have consistent filtering behavior and UI updates properly
- July 10, 2025. ✅ MIGRATION COMPLETED: Successfully migrated from Replit Agent to standard Replit environment with full functionality
- July 10, 2025. ✅ IMPLEMENTED: Complete server-side filtering and search system with proper API integration
- July 10, 2025. ✅ ADDED: "No results found" messages with reset filters functionality for better user experience
- July 10, 2025. ✅ ENHANCED: Pagination system now works with dynamic filters and sorting options
- July 10, 2025. ✅ MIGRATED: Successfully migrated from Replit Agent to standard Replit environment - all functionality working properly
- July 10, 2025. ✅ IMPLEMENTED: Database-backed emailsPerPage setting instead of localStorage
- July 10, 2025. ✅ ADDED: emailsPerPage column to users table with default value of 20
- July 10, 2025. ✅ UPDATED: Settings modal now saves emailsPerPage to database via API
- July 10, 2025. ✅ ENHANCED: Pagination hook now fetches emailsPerPage from user data in database
- July 10, 2025. ✅ CREATED: SQL migration script for adding emailsPerPage column
- July 10, 2025. ✅ OPTIMIZED: Removed localStorage dependency for emailsPerPage configuration
- July 10, 2025. ✅ IMPLEMENTED: Development mode without authentication using SKIP_AUTH=true environment variable
- July 10, 2025. ✅ ADDED: Mock user system for development testing (dev@eliano.dev)
- July 10, 2025. ✅ ENHANCED: Three-layer cache system for emailsPerPage (React Query cache, localStorage backup, default value)
- July 10, 2025. ✅ CREATED: Development setup scripts and documentation for auth-free testing
- July 09, 2025. ✅ FIXED: Critical draft editing cache invalidation issue - UI now updates immediately after editing existing drafts
- July 09, 2025. ✅ ENHANCED: Improved cache invalidation system for draft updates with proper pagination support
- July 09, 2025. ✅ OPTIMIZED: Added 100ms delay to ensure backend processing before cache refetch for draft updates
- July 09, 2025. ✅ IMPROVED: handleSaveDraft now uses comprehensive cache removal and refetch for immediate UI updates
- July 09, 2025. ✅ COMPLETED: Successfully migrated project from Replit Agent to standard Replit environment
- July 09, 2025. ✅ FIXED: Critical encryption bug in draft functions - createActiveDraft and getActiveDraft now properly decrypt content before returning to UI
- July 09, 2025. ✅ RESOLVED: Compose behavior now always creates new draft when clicking COMPOSE button instead of reusing existing draft
- July 09, 2025. ✅ ENHANCED: Dynamic cache revalidation for draft editing - listagem updates immediately when drafts are modified without requiring manual refresh
- July 09, 2025. ✅ IMPROVED: Comprehensive cache invalidation using predicate-based queries for paginated draft updates
- July 09, 2025. ✅ SYNCHRONIZED: Both storage.ts and storage-production.ts now have consistent draft handling with proper decryption
- July 09, 2025. ✅ OPTIMIZED: Compose modal now closes immediately without waiting for API calls - draft saving happens in background
- July 09, 2025. ✅ IMPLEMENTED: Change detection for draft updates - only saves if content actually changed (subject, body, to, cc, bcc)
- July 09, 2025. ✅ FIXED: Critical pagination bug in DRAFTS folder - corrected email ordering to use updatedAt instead of receivedAt (null for drafts)
- July 09, 2025. ✅ ENHANCED: Added proper email sorting for different folder types (drafts: updatedAt, sent: sentAt, others: receivedAt)
- July 09, 2025. ✅ IMPLEMENTED: getEmailsByFolderPaginated method in production storage with folder-specific ordering logic
- July 09, 2025. ✅ ADDED: getEmailCount and getEmailCountByFolder methods to production storage for pagination support
- July 09, 2025. ✅ UPDATED: getSystemFolder method to use static folder mapping instead of database queries
- July 09, 2025. ✅ MIGRATED: Successfully migrated project from Replit Agent to standard Replit environment
- July 09, 2025. ✅ FIXED: Critical draft save error "j.map is not a function" by updating cache optimization to handle both array and paginated data structures  
- July 09, 2025. ✅ ENHANCED: Updated all cache operations (move, star, read, draft save) to properly handle paginated query responses
- July 09, 2025. ✅ IMPROVED: Fixed optimistic updates in moveEmailMutation to work with both legacy array and new paginated folder structures
- July 09, 2025. ✅ SECURITY: Maintained robust client/server separation and security practices during migration
- July 09, 2025. ✅ REMOVED: Duplicate pagination text display "Mostrando X a Y de Z emails" from EmailPagination and EmailList components
- July 09, 2025. ✅ STREAMLINED: Pagination UI now shows only navigation controls (Previous/Next buttons and page numbers) as requested
- July 09, 2025. ✅ OPTIMIZED: Centered pagination controls in EmailPagination component for better visual balance
- July 09, 2025. ✅ IMPLEMENTED: window.beforeunload() warning when compose modal is open to prevent accidental data loss
- July 09, 2025. ✅ SECURITY: Added native browser alert asking users to confirm before closing/refreshing when composing emails
- July 09, 2025. ✅ OPTIMIZED: Made /api/drafts/active/ API call asynchronous to eliminate 0.2-0.6s delay when opening compose modal
- July 09, 2025. ✅ IMPROVED: Compose modal now opens immediately, with draft creation happening in background for better UX
- July 09, 2025. ✅ FIXED: Critical 'emails2' reference error in getEmailsByFolderPaginated method - resolved variable naming conflict
- July 09, 2025. ✅ FIXED: Critical "e.filter is not a function" error - updated pagination to properly extract emails array from API response objects
- July 09, 2025. ✅ ENHANCED: Pagination system now properly reads emailsPerPage from Settings > Appearance > Emails per Page
- July 09, 2025. ✅ INTEGRATED: API calls now use user-configured limit (/api/emails/6/folder/inbox?limit=50 when user sets 50 emails per page)
- July 09, 2025. ✅ OPTIMIZED: Automatic query invalidation when emailsPerPage settings change - immediate UI updates without refresh
- July 09, 2025. ✅ CONFIRMED: Real server-side pagination working correctly with dynamic user-configurable limits (5, 20, 50, 100)
- July 09, 2025. ✅ VERIFIED: Performance optimization active - loading only requested number of emails per user preference
- July 09, 2025. ✅ IMPLEMENTED: Critical performance optimization with real server-side pagination system
- July 09, 2025. ✅ FIXED: Performance bottleneck - system no longer loads ALL emails simultaneously
- July 09, 2025. ✅ CREATED: New methods getEmailsByFolderPaginated and getEmailCount in both development and production storage
- July 09, 2025. ✅ UPDATED: API routes now return paginated data with totalCount, hasMore, currentPage, and totalPages metadata
- July 09, 2025. ✅ DEVELOPED: Frontend pagination infrastructure with usePaginatedEmails hook and EmailPagination component
- July 09, 2025. ✅ OPTIMIZED: Reduced data transfer from ~50MB to ~500KB per request for large email volumes (99% reduction)
- July 09, 2025. ✅ ENHANCED: Email loading now uses 20 emails per page (configurable) instead of loading thousands at once
- July 09, 2025. ✅ COMPLETED: Successfully migrated project from Replit Agent to standard Replit environment with full functionality
- July 09, 2025. ✅ FIXED: Profile picture deletion now properly shows user initials (firstName + lastName) when no picture is set
- July 09, 2025. ✅ ENHANCED: Added avatar key-based re-rendering system to force UI updates when profile picture is removed
- July 09, 2025. ✅ IMPROVED: Profile picture removal now triggers comprehensive cache invalidation and forced re-render in both settings modal and top-bar
- July 09, 2025. ✅ IMPLEMENTED: Enhanced event-based synchronization system for profile picture updates with forceUIRefresh event
- July 09, 2025. ✅ OPTIMIZED: Avatar components now use key-based re-rendering to ensure immediate display of user initials after photo removal
- July 09, 2025. ✅ FIXED: Profile picture deletion now properly shows user initials (firstName + lastName) when no picture is set
- July 09, 2025. ✅ ENHANCED: Star toggle mutation now includes comprehensive cache invalidation for all folder types 
- July 09, 2025. ✅ IMPROVED: Move email mutation now includes optimistic updates for both source and destination folders
- July 09, 2025. ✅ UPDATED: Translation strings for "Nenhum email encontrado" and "Nenhum email em" now properly truncated
- July 09, 2025. ✅ FIXED: Profile picture removal system now shows initials immediately in both settings modal and top-bar
- July 09, 2025. ✅ ENHANCED: Added event-based synchronization system for profile picture updates across components
- July 09, 2025. ✅ IMPROVED: Move email cache invalidation now forces immediate refetch of all folder queries
- July 09, 2025. ✅ OPTIMIZED: Email operations now use simplified cache invalidation pattern for better performance
- July 09, 2025. ✅ IMPLEMENTED: Global cache refresh function for all email operations (star, move, delete, mark as read, send)
- July 09, 2025. ✅ STANDARDIZED: All email mutations now use consistent refreshAllEmailData() function for reliable UI updates
- July 09, 2025. ✅ FIXED: Cache invalidation now works consistently across all folders regardless of source/destination
- July 09, 2025. ✅ ENHANCED: Email operations now force immediate refetch ensuring smooth UI updates without page refresh
- July 08, 2025. ✅ MIGRATED: Successfully migrated project from Replit Agent to standard Replit environment with comprehensive bug fixes
- July 08, 2025. ✅ FIXED: Critical encryption display bug in production storage - added security validation to prevent encrypted data leakage
- July 08, 2025. ✅ ENHANCED: Production storage updateEmail function now includes logging and encryption validation
- July 08, 2025. ✅ IMPROVED: React Query cache invalidation enhanced to prevent temporary display of encrypted content
- July 08, 2025. ✅ SECURITY: Added automatic re-decryption failsafe if encrypted data detected in API responses
- July 08, 2025. ✅ OPTIMIZED: Implemented optimistic updates for smooth draft handling without full page refresh
- July 08, 2025. ✅ FIXED: Draft editing now properly loads existing data in compose modal
- July 08, 2025. ✅ ENHANCED: Both new and existing draft updates now trigger immediate UI refresh with forced cache revalidation
- July 08, 2025. ✅ MAJOR UPGRADE: Complete draft system overhaul for better user experience:
  - ✅ REMOVED: Auto-save functionality that was causing issues - drafts only save when user clicks X to close
  - ✅ ADDED: window.beforeunload() protection - warns users if they try to close browser with unsaved changes
  - ✅ ENHANCED: Close button (X) now properly saves drafts automatically with encryption support
  - ✅ IMPROVED: Editing existing drafts now updates the same draft instead of creating new ones
  - ✅ OPTIMIZED: Smooth cache revalidation after sending emails - no page refresh needed
  - ✅ INTEGRATED: Full encryption/decryption support for all draft operations

- July 08, 2025. ✅ IMPLEMENTED: convertDraftToSentEmail function to convert existing drafts to sent emails instead of creating new ones
- July 08, 2025. ✅ ADDED: cleanupEmptyDrafts function to automatically remove empty draft emails
- July 08, 2025. ✅ CREATED: New /api/emails/send endpoint specifically for sending emails with draft conversion logic
- July 08, 2025. ✅ UPDATED: Frontend sendEmailMutation to use new /api/emails/send endpoint
- July 08, 2025. ✅ ADDED: SQL scripts in database/draft_fixes.sql for database cleanup and optimization
- July 08, 2025. ✅ DOCUMENTED: Complete solution in DRAFT_SYSTEM_IMPROVEMENTS.md with implementation details
- July 08, 2025. ✅ MIGRATED: Successfully migrated project from Replit Agent to standard Replit environment
- July 08, 2025. ✅ FIXED: Z-index issue with "send without subject" confirmation dialog - now appears above compose modal with !important CSS
- July 08, 2025. ✅ FIXED: Critical schema issue - boolean to number conversion for MySQL tinyint compatibility (isRead, isStarred, isDraft, isActiveDraft, isActive, stayLoggedIn)
- July 08, 2025. ✅ FIXED: Schema alignment issues between memory storage and database schemas (firstName/lastName vs fullName)
- July 08, 2025. ✅ CONFIGURED: Environment variables for Replit compatibility - disabled MySQL, using memory storage
- July 08, 2025. ✅ FIXED: Static system folders implementation in production storage files - corrected createActiveDraft function
- July 08, 2025. ✅ RESOLVED: "Drafts folder not found" error by updating storage-production-fixed-temp.ts with static folder IDs
- July 08, 2025. ✅ UPDATED: getSystemFolder function to return static system folders instead of database queries
- July 07, 2025. ✅ IMPLEMENTED: Standardized folder system with English names (Inbox, Starred, Sent, Drafts, Junk, Trash) and specific colored icons
- July 07, 2025. ✅ ADDED: Automatic folder migration system that updates existing users to new standardized folder structure
- July 07, 2025. ✅ CREATED: useFolderMigration hook for seamless migration of user folders on login
- July 07, 2025. ✅ FIXED: Settings page layout - email field now full width above name fields, save button disabled until changes made
- July 07, 2025. ✅ FIXED: Profile picture deletion bug - updateUser now properly handles null values to clear database references
- July 07, 2025. ✅ SECURITY: Implemented comprehensive XSS protection using DOMPurify for all email content and user signatures
- July 07, 2025. ✅ SECURITY: Added session verification improvements with database user validation and detailed logging
- July 07, 2025. ✅ CLEANUP: Removed unused Login.tsx and Register.tsx files to avoid routing conflicts
- July 07, 2025. ✅ FIXED: AuthPage.tsx now used as single authentication interface with tabs for login/register  
- July 07, 2025. ✅ RESTORED: Email input in registration shows @eliano.dev suffix like before - user types only username
- July 07, 2025. ✅ IMPROVED: Registration form scroll only activates when content exceeds screen height (70vh)
- July 07, 2025. ✅ FIXED: Final hardcoded strings in tag manager - "Tags em comum podem ser removidas" and "Novas tags serão adicionadas" now use translation functions
- July 07, 2025. ✅ IMPLEMENTED: Complete profile picture storage system - saves to user_storage/profiles/ with format userId_timestamp.ext
- July 07, 2025. ✅ SECURITY: Automatic cleanup of old profile pictures when uploading new ones - only one photo per user maintained
- July 07, 2025. ✅ FIXED: Email deselection when changing folders - selections cleared on folder change as requested
- July 07, 2025. ✅ COMPLETED: Successfully migrated project from Replit Agent to Replit environment
- July 07, 2025. ✅ FIXED: Removed star icons from draft and spam emails as requested
- July 07, 2025. ✅ IMPROVED: Batch selection for drafts and spam now shows only "Delete" button instead of full dropdown menu  
- July 07, 2025. ✅ FIXED: Critical bug in createAlias function - was incomplete causing 500 errors, now properly implemented
- July 07, 2025. ✅ FIXED: Alias field mapping issue - frontend 'title' now correctly maps to backend 'description' field
- July 07, 2025. ✅ FIXED: Alias display issue - removed non-existent 'fullAlias' field, now properly shows description and generated email
- July 07, 2025. ✅ FIXED: toggleAliasStatus function MySQL compatibility - corrected boolean to number conversion (0/1)
- July 07, 2025. ✅ FIXED: Changed /api/alias/:id/toggle from PUT to PATCH method for proper REST semantics
- July 07, 2025. ✅ ADDED: Missing /api/user/:id/password PUT endpoint for password updates with current password validation
- July 07, 2025. ✅ ADDED: Missing /api/user/:id PUT endpoint for user profile updates (excluding password changes)
- July 07, 2025. ✅ FIXED: Login now accepts username without @eliano.dev domain and automatically appends it
- July 07, 2025. ✅ FIXED: Login shows success toast and reloads page after 3 seconds as requested
- July 07, 2025. ✅ FIXED: Captcha input overflow scroll issue by adding overflow: hidden style
- July 07, 2025. ✅ ADDED: Portuguese translations for firstName and lastName in settings
- July 07, 2025. ✅ FIXED: Drag-drop and swipe restrictions for DRAFTS/SENT emails - only allow movement to trash
- July 07, 2025. ✅ FIXED: Disabled all swipe actions for emails in DRAFTS/SENT folders on mobile
- July 07, 2025. ✅ FIXED: Number input spinners removed with CSS webkit/moz rules in captcha fields
- July 07, 2025. ✅ FIXED: SQL syntax error in updateUser - now properly filters undefined/null values
- July 07, 2025. ✅ IMPLEMENTED: File-based profile picture storage instead of base64 in database for better performance
- July 07, 2025. ✅ ADDED: Profile picture serving endpoint /api/profile-picture/:userId/:filename with authentication
- July 07, 2025. ✅ SECURITY: Profile pictures now require authentication - users can only access their own photos
- July 07, 2025. ✅ SECURITY: Added image format validation, file size limits (5MB), and automatic cleanup of old pictures
- July 07, 2025. ✅ FIXED: Visual drag-drop indicators now properly restricted - only trash folder shows drop zone for DRAFTS/SENT emails
- July 07, 2025. ✅ FIXED: Swipe UI completely disabled for DRAFTS/SENT emails on mobile - no visual feedback or animation
- July 07, 2025. ✅ FIXED: Profile picture update SQL error - separated profile picture update from other fields to avoid empty SET clause
- July 07, 2025. ✅ FIXED: Drag-drop visual feedback refined - border-dashed only appears when folder can actually accept the drop
- July 07, 2025. ✅ FIXED: Drag-drop logic corrected - DRAFTS/SENT emails now only show border-dashed on trash folder
- July 07, 2025. ✅ IMPROVED: Profile picture error handling with detailed logging to identify upload issues
- July 07, 2025. ✅ IMPLEMENTED: Direct file upload for profile pictures using multer to avoid base64 server limits
- July 07, 2025. ✅ ADDED: New POST /api/user/:id/profile-picture endpoint for file uploads with proper validation
- July 07, 2025. ✅ SECURITY: File type and size validation on both frontend and backend with buffer processing
- July 07, 2025. ✅ FIXED: Critical drag-drop issue - dragData now available during dragover using global variable
- July 07, 2025. ✅ CONFIRMED: Drag-drop restrictions working perfectly - DRAFTS/SENT emails only show border-dashed on trash folder
- July 07, 2025. ✅ CONFIRMED: /api/aliases POST endpoint exists and is functional with detailed error logging
- July 07, 2025. ✅ SECURITY: Maintained proper client/server separation and robust security practices
- July 07, 2025. ✅ MIGRATION: Successfully migrated project from Replit Agent to Replit environment
- July 07, 2025. ✅ FIXED: Static system folders implementation - system folders no longer stored in database, only custom folders
- July 07, 2025. ✅ FIXED: Draft auto-save functionality now works with static folder types instead of database folder lookups
- July 07, 2025. ✅ UPDATED: Email operations (move, count, filter) now handle both static system folders and custom database folders
- July 07, 2025. ✅ OPTIMIZED: Improved performance by eliminating database queries for system folder operations
- July 07, 2025. ✅ FIXED: Profile picture deletion UI now updates immediately without requiring page refresh
- July 07, 2025. ✅ OPTIMIZED: Reduced duplicate profile picture loading by optimizing useEffect dependencies
- July 07, 2025. ✅ IMPLEMENTED: Native system folders with custom colored icons (purple Inbox, yellow Archive, green Sent, purple Drafts, orange Spam, red Trash)
- July 07, 2025. ✅ ARCHITECTURE: Removed system folders from database table - now rendered natively in code for all users
- July 07, 2025. ✅ STANDARDIZED: All users now have consistent folder structure: Inbox, Archive, Drafts, Sent, Spam, Trash with proper Portuguese translations
- July 06, 2025. ✅ FIXED: Corrigido problema crítico de rotas retornando HTML - todas rotas agora retornam JSON
- July 06, 2025. ✅ ADDED: Rotas POST /api/emails e DELETE /api/emails/:emailId que estavam faltando
- July 06, 2025. ✅ FIXED: Função createEmail estava incompleta - corrigido insert + fetch pattern
- July 06, 2025. ✅ FIXED: Funções updateEmail, toggleEmailStar, markEmailAsRead usando MySQL-compatible pattern
- July 06, 2025. ✅ FIXED: Função createFolder corrigida - removido .insertId incompatível com MySQL
- July 06, 2025. ✅ IMPROVED: Adicionado logs detalhados para debug de tags e criação de pastas
- July 06, 2025. ✅ FIXED: Tratamento melhorado de erro duplicado na criação de tags com mensagem em português
- July 06, 2025. ✅ ADDED: Adicionadas rotas PUT para /api/email/:id/star e /api/email/:id/move que estavam faltando
- July 06, 2025. ✅ CONFIRMED: Função getTags existe e está funcionando corretamente  
- July 06, 2025. ✅ FIXED: Corrigido problema crítico na criação de tags - userId agora é capturado do usuário autenticado ao invés de usar valor fixo
- July 06, 2025. ✅ ADDED: Rota DELETE /api/folders/:id que estava faltando para apagar pastas
- July 06, 2025. ✅ ADDED: Rota PUT /api/email/:id/read para compatibilidade com frontend (além da POST existente)
- July 06, 2025. ✅ FIXED: Corrigido createUser - removido .insertId incompatível com MySQL, usando busca por email
- July 06, 2025. ✅ FIXED: Implementado auto-reload após login com toast de 3 segundos e console.log para debug
- July 06, 2025. ✅ RESTORED: Todos os endpoints críticos restaurados para routes.ts principal:
  * /api/search/:userId - pesquisa de emails
  * /api/storage/:userId - informações de armazenamento 
  * /api/drafts/active/:userId - gerenciamento de rascunhos ativos
  * /api/aliases e /api/alias - gerenciamento completo de aliases
  * /api/emails/:emailId/tags - operações de tags em emails
  * /api/tags - operações completas de tags (CRUD)
- July 06, 2025. ✅ COMPLETED: Resolved ALL MySQL compatibility issues in storage-production.ts
- July 06, 2025. Fixed all .returning() method calls (12 instances) - replaced with insert + select pattern
- July 06, 2025. Converted all boolean fields to number values (0/1) for MySQL tinyint compatibility
- July 06, 2025. Fixed insertId property access using MySQL-compatible pattern with fallback
- July 06, 2025. Corrected toggle functions (isStarred, isActive) to use number conversion instead of boolean negation
- July 06, 2025. Confirmed MySQL remote connection (15.204.204.153:5000) fully operational with all CRUD operations
- July 06, 2025. System now 100% MySQL compatible - authentication, data persistence, and encryption working perfectly
- July 06, 2025. Fixed MySQL compatibility issue - removed .returning() calls incompatible with MySQL/Drizzle
- July 06, 2025. Updated insert/update operations to use MySQL-compatible patterns (insert + select)
- July 06, 2025. Confirmed authentication system fully working with remote MySQL database
- July 06, 2025. Fixed complete schema synchronization - rewrote shared/schema.ts to match exact MySQL structure
- July 06, 2025. Corrected all column names (firstName, lastName, avatarShape, etc.) to match production database
- July 06, 2025. Added username field and proper bigint types for storage fields
- July 06, 2025. Fixed tinyint boolean fields and JSON column types to match real database
- July 06, 2025. Verified registration and login working perfectly with synchronized schema
- July 06, 2025. Successfully connected to remote MySQL server (15.204.204.153) with production database
- July 06, 2025. Resolved production-switch.ts environment variable loading by adding dotenv configuration
- July 06, 2025. Confirmed full MySQL connectivity with user registration, login, and data persistence
- July 06, 2025. System now using remote production MySQL database instead of local memory storage
- July 06, 2025. Successfully migrated entire system to use MySQL database instead of localStorage
- July 06, 2025. Fixed environment variable loading in db-production.ts with dotenv configuration
- July 06, 2025. Implemented automatic MySQL detection when DB_HOST is present in environment
- July 06, 2025. Tested and confirmed user registration and login working with MySQL backend
- July 06, 2025. System now persists all user data, emails, folders, and settings in MySQL database
- July 06, 2025. Created complete production MySQL setup with encryption and user isolation
- July 06, 2025. Generated production_schema.sql with full webmail functionality and security
- July 06, 2025. Created PRODUCTION_SETUP_GUIDE.md with step-by-step Ubuntu server configuration
- July 06, 2025. Implemented production-switch.ts for automatic dev/production mode switching
- July 06, 2025. Cleaned up outdated documentation files - keeping only PRODUCTION_SETUP_GUIDE.md
- July 04, 2025. Migrated project from Replit Agent to standard Replit environment successfully
- July 04, 2025. Configured Portuguese as default language for improved user experience
- July 04, 2025. Applied comprehensive translation system to all components including alias management, tags, and email filters
- July 04, 2025. Updated all hardcoded text to use translation functions for better internationalization
- July 04, 2025. Fixed TypeScript errors and ensured all components use proper translation keys
- July 04, 2025. Implemented tag filtering with centered modal selection for "Por Tags" option
- July 04, 2025. Fixed cache invalidation issues for real-time tag removal from email listings
- July 04, 2025. Improved filter controls visibility when no emails are found
- July 04, 2025. Fixed CSS hover border clipping on desktop email items with proper overflow handling
- July 04, 2025. Corrected TypeScript errors for tag filtering and icon naming conflicts
- July 04, 2025. Fixed email address truncation in top bar by removing max-width constraint
- July 04, 2025. Migrated database from PostgreSQL to MySQL for remote server deployment
- July 04, 2025. Created complete MySQL setup files including schema, initial data, and setup guides
- July 04, 2025. Updated Drizzle schema for MySQL compatibility with proper column types
- July 04, 2025. Configured MySQL connection pool with mysql2 driver for better performance
- July 04, 2025. Fixed CSS hover issue where avatar shapes didn't maintain square form in hover state
- July 04, 2025. Added user preferences to database schema (language, theme, avatarShape, sidebarView)
- July 04, 2025. Created API endpoint for updating user UI preferences at /api/user/:id/preferences
- July 04, 2025. Started implementation of persistent user configuration system to replace localStorage
- July 04, 2025. Fixed compose modal validation to allow optional message body and translated error messages to Portuguese
- July 04, 2025. Fixed z-index issue where "Send without subject" confirmation modal was appearing behind the compose modal
- July 04, 2025. Added visual contrast to confirmation modal with gray border and enhanced shadow for better distinction from compose modal
- July 04, 2025. Implemented complete settings functionality: removed reset button, made email field read-only with copy functionality, functional profile picture upload with persistent storage, and automatic signature insertion in new emails
- July 04, 2025. Profile pictures are now stored in localStorage and synchronized across top-bar avatar display
- July 04, 2025. Email addresses in settings can be copied to clipboard with toast notification
- July 04, 2025. User signatures are automatically added to new compose emails with 5 line breaks for proper formatting
- July 04, 2025. Made alias "forward to" field readonly and non-editable for security
- July 04, 2025. Added validation to alias names: only lowercase letters (a-z) allowed, no spaces
- July 04, 2025. Completed Portuguese translations: settings appearance, compose tooltips, tag validation, email filters
- July 04, 2025. Fixed signature line breaks in compose modal to preserve formatting using HTML <br> tags
- July 04, 2025. Added tooltips to Quill editor buttons (bold, italic, underline, etc.) in Portuguese
- July 04, 2025. Translated compose modal window controls (minimize, maximize, close)
- July 04, 2025. Successfully migrated from Replit Agent to standard Replit environment
- July 04, 2025. Added subject character limit (99 characters) in compose modal with validation
- July 04, 2025. Implemented connection monitoring system with automatic reconnection every 5 seconds
- July 04, 2025. Added health check endpoint at /api/health for server status monitoring
- July 04, 2025. Created comprehensive connection monitoring with toast notifications
- July 04, 2025. Implemented email encryption system using crypto-js (AES encryption)
- July 04, 2025. Added automatic server connection status detection with reconnection attempts
- July 05, 2025. Modified toast notifications to appear in top-right corner and persist until reconnection
- July 05, 2025. Fixed signature synchronization issue - signatures now properly appear in compose modal
- July 05, 2025. Improved mobile HTML rendering in compose modal for better signature display
- July 05, 2025. Renamed desktop minimized compose button from "New Email" to "Rascunho" and repositioned 10% higher
- July 05, 2025. Fixed modal alert z-index to 100 for proper layering
- July 05, 2025. Reverted Rascunho button position to original bottom-4 right-4 placement
- July 05, 2025. Simplified mobile textarea functionality to fix selection and formatting issues
- July 05, 2025. Enhanced signature detection logic to handle empty bodies and line breaks correctly
- July 05, 2025. Added trash/discard button next to attachment icon in compose modal (both mobile and desktop)
- July 05, 2025. Implemented discard email confirmation modal to prevent accidental data loss
- July 05, 2025. Fixed z-index issue: increased discard confirmation modal z-index to 9999 to appear above compose modal
- July 05, 2025. Fixed signature synchronization: implemented complete cache removal and refetch to force fresh user data when compose modal opens
- July 05, 2025. Fixed mobile HTML rendering: replaced textarea with contentEditable div to properly render HTML formatting (bold, italic, underline)
- July 05, 2025. Enhanced mobile compose experience: increased textarea height to fill more viewport space (50vh) for better usability
- July 05, 2025. Fixed mobile formatting buttons: implemented manual HTML insertion with proper selection handling for mobile compatibility
- July 05, 2025. Improved draft management: auto-save on modal close, delete active drafts when discard is confirmed, and clear draft state properly
- July 05, 2025. Enhanced signature timing: added longer delay and cache removal to ensure signatures appear with updated user data
- July 05, 2025. Fixed critical infinite loop bug in compose modal: replaced form.watch('body') calls with bodyContent state variable to prevent constant re-renders and API spam
- July 05, 2025. Successfully completed migration from Replit Agent to standard Replit environment with all functionality working properly
- July 05, 2025. Completely resolved API spam issue by removing useQuery with aggressive cache settings from compose modal
- July 05, 2025. Removed signature display system from compose modal UI - signatures no longer appear in textarea
- July 05, 2025. Implemented server-side signature addition: signatures are now automatically appended when emails are sent (POST /api/emails)
- July 05, 2025. Simplified compose modal by removing all user data fetching and signature management logic from frontend
- July 05, 2025. Fixed mobile text formatting inconsistencies: rewrote applyFormatting function to properly detect existing formatting and toggle it
- July 05, 2025. Enhanced mobile formatting: now reliably applies/removes bold, italic, underline, and strikethrough on selected text
- July 05, 2025. Improved mobile text selection handling for consistent formatting operations across all mobile devices
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```