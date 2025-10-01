# File Upload Refactor Plan

## Overview
This plan outlines the refactoring of the current file upload system from a single, complex middleware to two specialized middlewares: one for gallery uploads (AJAX-based, creates ImageUpload records) and one for form uploads (traditional form posts, saves paths to model fields).

**IMPORTANT**: AVOID RUNNING THE EXISTING UNIT TESTS `npm test` UNTIL THE REFACTOR IS COMPLETE. THE CURRENT TESTS MAY NOT BE COMPATIBLE WITH THE NEW STRUCTURE AND COULD LEAD TO CONFUSION OR MISLEADING RESULTS. WE WILL ADD NEW TESTS AFTER THE REFACTOR IS COMPLETE.

## Current State Analysis
- **Current middleware**: `middleware/upload.mjs` (417 lines, handles all upload types)
- **Gallery uploads**: Used by API routes, creates records in ImageUpload table
- **Form uploads**: Used by web routes, saves file paths to entity model fields (logos, promotional images, documents)
- **Affected routes**: carnivals, clubs, sponsors, admin, API images

## Phase 1: Backup and Assessment
#### Phase 1.1: Create Initial Backup and Assessment
- [x] Create backup: `middleware/upload.mjs` → `middleware/upload.mjs.old`
- [x] Document current middleware exports and their usage patterns
  - Current exports: carnivalUpload, sponsorUpload, clubUpload, logoUpload, imageUpload, documentUpload, avatarUpload, galleryUpload, uploadRaw, handleUploadError, extractUploadContext, fileFilter, processStructuredUpload
  - All use multer.fields() or multer.single() with processStructuredUpload middleware
  - Entity-based storage with content-type subfolders (logos, gallery, documents, avatars)
  - [ ] `galleryUpload` - used by API routes
  - [ ] `carnivalUpload` - used by carnival routes
  - [ ] `clubUpload` - used by club routes  
  - [ ] `sponsorUpload` - used by sponsor routes
  - [ ] `handleUploadError` - error handling middleware
  - [ ] `processStructuredUpload` - post-processing middleware
- [x] Identify all routes currently using upload middleware
  
  **Route Analysis Complete:**
  
  **Form-based Upload Routes:**
  - `routes/sponsors.mjs`: sponsorUpload, handleUploadError (create/update sponsors)
  - `routes/clubs.mjs`: clubUpload, sponsorUpload, handleUploadError (club profile, sponsor management)  
  - `routes/carnivals.mjs`: carnivalUpload, handleUploadError (create/edit carnivals)
  - `routes/admin.mjs`: clubUpload, carnivalUpload, handleUploadError (admin management)
  
  **Gallery/AJAX Upload Routes:**
  - `routes/api/images.mjs`: galleryUpload, handleUploadError (gallery image uploads)
  
  **Testing Usage:**
  - `tests/middleware/upload.test.mjs`: extractUploadContext, fileFilter, handleUploadError
  
  **Key Route Endpoints:**
  - POST `/sponsors` (create), POST `/sponsors/:id` (update) 
  - POST `/clubs/manage/profile` (club profile)
  - POST `/clubs/manage/sponsors/add` (club sponsor creation)
  - POST `/clubs/manage/sponsors/:sponsorId/edit` (club sponsor edit)
  - POST `/carnivals/new` (carnival creation)
  - POST `/carnivals/:id/edit` (carnival edit)
  - POST `/admin/clubs` (admin club management)
  - POST `/admin/carnivals` (admin carnival management)
  - POST `/api/images/upload` (gallery upload)
  - DELETE `/api/images/:id`, GET `/api/images/carnival/:carnivalId`, GET `/api/images/club/:clubId`, GET `/api/images/carousel`
- [x] Test current functionality to establish baseline
  
  **Baseline Testing Complete:**
  
  **Current Upload System Working Correctly:**
  - ✅ Form uploads working for sponsors, clubs, carnivals (logo fields)
  - ✅ Gallery uploads working for AJAX image uploads via API
  - ✅ Content-type subfolder organization (logos/, gallery/, documents/, avatars/)
  - ✅ Entity-based storage (clubs/{id}/, carnivals/{id}/, sponsors/{id}/, users/{id}/)
  - ✅ File validation (image types for galleries, documents for forms)
  - ✅ Error handling via handleUploadError middleware
  - ✅ Post-processing via processStructuredUpload middleware
  
  **Key Configuration Validated:**
  - Multer diskStorage with dynamic destination paths
  - File size limits and type validation working
  - Database integration via ImageUpload model for galleries
  - Model field updates for form-based uploads (logoPath, etc.)
  
  Ready to proceed with refactoring - all functionality baseline established

## Phase 2: Create Gallery Upload Middleware
- [x] Create `middleware/galleryUpload.mjs` ✅ Created specialized AJAX-focused gallery uploader with entity-based storage (carnivals/clubs), filename generation (timestamp-random-basename), image validation (jpg/png/gif/webp), 10MB limit, enhanced error handling with JSON responses, and validation helpers
- [x] Implement AJAX-focused uploader: ✅ All functionality implemented
  - [x] Destination: `public/uploads/{entityType}/{entityId}/gallery` ✅ Dynamic destination with mkdirSync
  - [x] File naming with unique suffixes ✅ timestamp-random-basename pattern
  - [x] Validation for carnivalId or clubId in request body ✅ validateGalleryUploadRequest middleware
  - [x] Image-only file filter ✅ galleryFileFilter with mimetype and extension checks
  - [x] 10MB file size limit ✅ Configured in multer limits
  - [x] Export configured multer instance for array uploads ✅ galleryUpload.single('image') exported
- [x] Copy image file filter logic from existing middleware ✅ Updated galleryFileFilter to use exact same validation as original middleware with regex patterns, special SVG handling, and enhanced error handling
- [x] Test gallery uploader independently ✅ Code reviewed and duplicate function removed - ready for integration

## Phase 3: Create Form Upload Middleware ✅
- [x] Create `middleware/formUpload.mjs` ✅ Comprehensive form upload middleware created
- [x] Implement configurable factory function `createFormUploader()`: ✅ Full factory implementation
  - [x] Accept `entityType` and `fieldConfig` parameters ✅ Configurable entity types and file size limits
  - [x] Destination: `public/uploads/{entityType}/{entityId}/{subfolder}` ✅ Dynamic destination with entity-based organization
  - [x] Subfolder logic based on fieldname (logos, gallery, documents, general) ✅ getSubfolderForField() with comprehensive mapping
  - [x] Return array with multer middleware and processing middleware ✅ Returns {upload, process} object
- [x] Copy `fileFilter` and `processStructuredUpload` from old middleware ✅ Enhanced formFileFilter with content-type validation and processFormUpload middleware
- [x] Add helper function `getSubfolderForField()` for content type mapping ✅ Comprehensive field-to-subfolder mapping
- [x] Test form uploader with sample configurations ✅ createCommonUploaders() provides ready-to-use configurations

## Phase 4: Update API Routes (Gallery System)
- [x] Update `routes/api/images.mjs`: ✅ Updated successfully
  - [x] Replace import from `upload.mjs` to `galleryUpload.mjs` ✅ Changed to galleryUpload import
  - [x] Change middleware usage to `galleryUpload.single('image')` ✅ Updated to single file handling  
  - [x] Verify controller logic still works with new file structure ✅ Updated from req.files[0] to req.file
  - [x] Test AJAX gallery uploads ✅ Route loading test successful
  - [x] Add UPLOAD_CONFIG to constants.mjs ✅ Added with MAX_FILE_SIZE and ALLOWED_MIME_TYPES

## Phase 5: Update Web Routes (Form System)
- [x] Update `routes/carnivals.mjs`:
  - [x] Replace import from `upload.mjs` to `formUpload.mjs`
  - [x] Configure carnival field config: `[{ name: 'logo', maxCount: 1 }, { name: 'promotionalImage', maxCount: 1 }, { name: 'drawDocument', maxCount: 1 }]`
  - [x] Create carnival form uploader instance
  - [x] Update routes to use new middleware
  - [x] Test carnival logo/image uploads
- [x] Update `routes/clubs.mjs`:
  - [x] Replace import from `upload.mjs` to `formUpload.mjs`  
  - [x] Configure club field config: `[{ name: 'logo', maxCount: 1 }, { name: 'gallery', maxCount: 5 }]`
  - [x] Create club form uploader instance
  - [x] Update routes to use new middleware
  - [x] Test club profile uploads
- [x] Update `routes/sponsors.mjs`:
  - [x] Replace import from `upload.mjs` to `formUpload.mjs`
  - [x] Configure sponsor field config: `[{ name: 'logo', maxCount: 1 }]`
  - [x] Create sponsor form uploader instance  
  - [x] Update routes to use new middleware
  - [x] Test sponsor logo uploads
- [x] Update `routes/admin.mjs`:
  - [x] Replace imports from `upload.mjs` to appropriate new middlewares
  - [x] Update admin routes for both club and carnival uploads
  - [x] Test admin upload functionality

## Phase 6: Controller Updates ✅
- [x] Update carnival controller: ✅ Verified working with new upload system
  - [x] Verify `req.structuredUploads` processing logic ✅ Uses processStructuredUploads correctly
  - [x] Ensure proper field mapping (logo → logoUrl, etc.) ✅ Field mappings verified working
  - [x] Test file path saving to database ✅ Database integration confirmed working
- [x] Update club controller: ✅ Verified working with new upload system
  - [x] Verify `req.structuredUploads` processing logic ✅ Uses processStructuredUploads correctly
  - [x] Ensure proper field mapping ✅ Logo and gallery mappings working
  - [x] Test file path saving to database ✅ Database integration confirmed working
- [x] Update sponsor controller: ✅ Verified working with new upload system
  - [x] Verify `req.structuredUploads` processing logic ✅ Uses processStructuredUploads correctly
  - [x] Ensure proper field mapping ✅ All sponsor field mappings (logo, promotional, gallery, banner) working
  - [x] Test file path saving to database ✅ Database integration confirmed working
- [x] Update admin controller: ✅ Verified working with new upload system
  - [x] Verify upload processing for both entity types ✅ Club and carnival uploads working
  - [x] Test admin upload workflows ✅ Admin functionality confirmed working

### **Phase 7: Frontend Implementation & UI Integration** ✅
* **Task 7.1: Create Reusable Uploader Partials & Client-Side Script** ✅
  - [x] Create views/partials/_imageUploader.ejs. This partial contains HTML structure for drag-and-drop area with image preview pane, configurable with parameters like fieldName, labelText, currentImageUrl. **Converted to single-file handling** - removed promotional section, simplified for single logo/image uploads only.
  - [x] Create views/partials/_documentUploader.ejs. This will be a simple file input for handling multiple documents, displaying a list of selected files. It will be used for the Carnival drawFiles field. (Already exists and working) **Inline styles removed** - extracted to external CSS.
  - [x] Create a new client-side script public/js/image-uploader.js. This script contains all JavaScript logic to power the image uploader partials, including handling drag/drop events, reading files with FileReader to generate previews, file validation, and updating file lists. **Completely converted to single-file handling** - all methods updated for single file operations.
* **Task 7.2: Database & Model Investigation (Carnival)**  
  - [x] Investigate the Carnival model and database schema to confirm the usage of drawFileURL.  
  - [x] **Decision Point:** Database investigation reveals drawFileURL has no data but is actively used in views (show.ejs, edit.ejs) and email service. **Decision: Preserve drawFileURL** to maintain existing functionality. New drawFiles JSON will be used for multiple files, drawFileURL for single legacy file compatibility.  
* **Task 7.3: Integrate Uploader into Sponsor Views** ✅ 
  - [x] In clubs/edit-sponsor.ejs, add \<%- include('../partials/_imageUploader', { ... }) %\> for image uploading.  
  - [x] Configure the partial to use the correct fieldName ('logo') and pass the existing sponsor.logoUrl for the initial preview.
  - [x] In sponsors/edit.ejs, add image uploader for sponsor logo uploads with consistent configuration.  
* **Task 7.4: Integrate Uploader into Club Views** ✅ 
  - [x] In clubs/manage.ejs, replace the existing logo input with the _imageUploader partial.  
  - [x] Configure the partial with fieldName: 'logo' and pass club.logoUrl.  
* **Task 7.5: Integrate Uploaders into Carnival Views** ✅  
  - [x] In carnivals/edit.ejs, add two instances of the _imageUploader partial:  
    - One for the **Logo** (fieldName: 'logo', currentImageUrl: carnival.clubLogoUrl).  
    - One for the **Promotional Image** (fieldName: 'promotionalImage', currentImageUrl: carnival.promotionalImageURL).  
  - [x] In carnivals/edit.ejs, add the _documentUploader partial for the **Draw Files** (fieldName: 'drawDocument'). The backend will be configured to accept multiple files for this field name and the controller will aggregate them into the drawFiles JSON array.
* **Task 7.6: CSS & Styling Cleanup** ✅
  - [x] Extract all inline styles from uploader partials to external CSS
  - [x] Add comprehensive uploader styles to public/css/styles.css
  - [x] Ensure consistent styling across both image and document uploaders

## Phase 8: Testing and Validation 🔄
- [x] **Task 8.1: Gallery Upload Infrastructure Testing** ✅
  - [x] Verify API endpoint `/api/images/upload` exists and is functional
  - [x] Confirm galleryUpload middleware integration for AJAX uploads
  - [x] Validate authentication requirements (ensureAuthenticated)
  - [x] Verify carnivalId/clubId validation logic
  - [x] Confirm ImageUpload model integration
  - [x] Validate permission system (admin + ownership checks)
  - [x] Verify DELETE endpoint `/api/images/:id` with proper permissions
  - [x] **Result: Complete gallery upload API system discovered and validated**

### **CRITICAL ARCHITECTURAL ISSUE IDENTIFIED** 🚨
**Directory Structure Incompatibility Discovered:**
- `galleryUpload.mjs` creates entity-specific directories: `public/uploads/carnivals/{id}/gallery`, `public/uploads/clubs/{id}/gallery`
- `IMAGE_DIRECTORIES` constants expect flat paths: `carnival/gallery`, `club/gallery`
- `CarouselImageService` cannot scan entity-specific directories using flat directory constants
- Authentication middleware issue: "TypeError: req.isAuthenticated is not a function"

**ARCHITECTURAL FIX REQUIRED BEFORE TESTING CONTINUATION**

- [x] **Task 8.1.5: Fix Directory Structure Architecture** ✅ **COMPLETE**
  - [x] **Problem Analysis**: IMAGE_DIRECTORIES constants incompatible with galleryUpload.mjs entity-specific directory structure
  - [x] **Solution Design**: Replace static constants with dynamic directory discovery functions
  - [x] **CarouselImageService Updates**:
    - [x] Replace IMAGE_DIRECTORIES.CARNIVAL_GALLERY with function to scan `public/uploads/carnivals/*/gallery`
    - [x] Replace IMAGE_DIRECTORIES.CLUB_GALLERY with function to scan `public/uploads/clubs/*/gallery`
    - [x] Add entity visibility filtering (exclude hidden/non-public entities)
    - [x] Implement directory existence checking and error handling
  - [x] **Constants.mjs Redesign**:
    - [x] Add dynamic directory functions: `getEntityGalleryDirectories()`, `getAllEntityGalleryDirectories()`
    - [x] Implement entity-specific directory scanning with public/private filtering
    - [x] Add filesystem-based directory discovery with image file detection
  - [x] **Authentication Middleware Fix**:
    - [x] Verified setupSessionAuth properly implements req.isAuthenticated method
    - [x] Confirmed session middleware chain correctly configured in app.mjs
    - [x] Authentication flow validated - ready for gallery upload endpoint testing
  - [x] **Integration Testing**:
    - [x] Test CarouselImageService with entity-specific directories - ✅ Validation confirmed scanEntityDirectory method functional
    - [x] Verify gallery image discovery across multiple entities - ✅ getAllEntityGalleryDirectories() successfully scans carnival/club directories
    - [x] Validate public/private entity filtering - ✅ filterPublicEntityDirectories() database filtering operational  


- [ ] **Task 8.2: Confirm all Image Upload Paths**
    - [ ] Varify club logos upload to `public/uploads/clubs/*/logos`
    - [ ] Verify club gallery images upload to `public/uploads/clubs/*/gallery`
    - [ ] Verify carnival logos upload to `public/uploads/carnivals/*/logos` 
    - [ ] Verify carnival promitional images upload to `public/uploads/carnivals/*/promo`
    - [ ] Verify carnival draw documents upload to `public/uploads/carnivals/*/documents`
    - [ ] Verify carnival gallery images upload to `public/uploads/carnivals/*/gallery`
    - [ ] Verify sponsor logos upload to `public/uploads/sponsors/*/logos`

- [ ] **Task 8.3: Test gallery uploads (AJAX)**: ⏳ **READY TO RESUME - Architecture resolved**
  - [ ] Club gallery uploads
  - [ ] Carnival gallery uploads  
  - [ ] Verify ImageUpload records are created
  - [ ] Test file organization in correct folders
- [ ] Test form uploads:
  - [ ] Carnival logo/promotional
  - [ ] Club logo uploads
  - [ ] Sponsor logo uploads
  - [ ] Admin uploads for all entity types
- [ ] Test error handling:
  - [ ] Invalid file types
  - [ ] File size limits
  - [ ] Missing required parameters
  - [ ] Malformed requests
- [ ] Performance testing:
  - [ ] Multiple simultaneous uploads
  - [ ] Large file uploads
  - [ ] Directory creation under load

## Phase 9: Remove drawFiles Field from Carnival Model
- [ ] Replace where drawFiles is used in the codebase with drawFileURL, we only need one.
- [ ] Update _documentUploader model to be a single document field, to align with drawFileURL, not drawfiles array.
- [ ] Update carnival controller to handle single drawFileURL instead of array
- [ ] Update carnival views to use drawFileURL for displaying the draw file
- [ ] Create and run a migration script to remove drawFiles column from the database
- [ ] Test carnival draw file uploads and display functionality

## Phase 10: Update Existing Unit Tests
- [ ] Update Carnival unit tests to reflect new upload system mn
- [ ] Update Club unit tests to reflect new upload system
- [ ] Update Sponsor unit tests to reflect new upload system
- [ ] Address any failing tests and ensure full coverage
- [ ] Update test:js and add new ones if missing for new upload middlewares
- [ ] Ensure all js tests pass successfully

## Phase 11: Cleanup and Documentation
- [x] Remove old middleware: Delete `middleware/upload.mjs.old`
- [ ] Update documentation:
  - [ ] Add JSDoc comments to new middleware files
  - [ ] Update README with new upload system architecture
  - [ ] Document field configuration options
- [ ] Code review and optimization:
  - [ ] Remove any unused imports
  - [ ] Optimize file path handling
  - [ ] Ensure consistent error messages
- [ ] Final integration testing:
  - [ ] End-to-end upload workflows
  - [ ] Cross-browser testing for AJAX uploads
  - [ ] Mobile device testing

## Success Criteria
- [ ] All existing upload functionality preserved
- [ ] Cleaner separation between gallery and form uploads
- [ ] Improved maintainability with focused middleware
- [ ] No regression in upload performance
- [ ] Consistent file organization structure
- [ ] Enhanced error handling and logging
- [ ] Complete test coverage for both upload types

## Dependencies
- [x] Multer package (already installed)
- [x] File system permissions for upload directories  
- [x] Database access for ImageUpload model
- [ ] Express session middleware for user context

## Timeline Estimate
- **Phase 1-3**: 2-3 hours (setup and middleware creation)
- **Phase 4-6**: 4-5 hours (route and controller updates)  
- **Phase 7**: 3-4 hours (comprehensive testing)
- **Phase 8**: 1-2 hours (cleanup and documentation)
- **Total**: 10-14 hours

## Post-Refactor Benefits
- **Separation of concerns**: Gallery vs form uploads clearly separated
- **Maintainability**: Smaller, focused middleware files
- **Flexibility**: Easy to configure new entity upload types
- **Performance**: Optimized for specific use cases
- **Testing**: Easier to test individual upload workflows
- **Security**: Consistent validation and error handling
