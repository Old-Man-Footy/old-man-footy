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
- [ ] Create backup of current `middleware/upload.mjs` → `middleware/upload.mjs.old`
- [ ] Document current upload middleware exports:
  - [ ] `galleryUpload` - used by API routes
  - [ ] `carnivalUpload` - used by carnival routes
  - [ ] `clubUpload` - used by club routes  
  - [ ] `sponsorUpload` - used by sponsor routes
  - [ ] `handleUploadError` - error handling middleware
  - [ ] `processStructuredUpload` - post-processing middleware
- [ ] Identify all routes currently using upload middleware
- [ ] Test current functionality to establish baseline

## Phase 2: Create Gallery Upload Middleware
- [ ] Create `middleware/galleryUpload.mjs`
- [ ] Implement AJAX-focused uploader:
  - [ ] Destination: `public/uploads/{entityType}/{entityId}/gallery`
  - [ ] File naming with unique suffixes
  - [ ] Validation for carnivalId or clubId in request body
  - [ ] Image-only file filter
  - [ ] 10MB file size limit
  - [ ] Export configured multer instance for array uploads
- [ ] Copy image file filter logic from existing middleware
- [ ] Test gallery uploader independently

## Phase 3: Create Form Upload Middleware  
- [ ] Create `middleware/formUpload.mjs`
- [ ] Implement configurable factory function `createFormUploader()`:
  - [ ] Accept `entityType` and `fieldConfig` parameters
  - [ ] Destination: `public/uploads/{entityType}/{entityId}/{subfolder}`
  - [ ] Subfolder logic based on fieldname (logos, gallery, documents, general)
  - [ ] Return array with multer middleware and processing middleware
- [ ] Copy `fileFilter` and `processStructuredUpload` from old middleware
- [ ] Add helper function `getSubfolderForField()` for content type mapping
- [ ] Test form uploader with sample configurations

## Phase 4: Update API Routes (Gallery System)
- [ ] Update `routes/api/images.mjs`:
  - [ ] Replace import from `upload.mjs` to `galleryUpload.mjs`
  - [ ] Change middleware usage to `galleryUploader.array('images', 10)`
  - [ ] Verify controller logic still works with new file structure
  - [ ] Test AJAX gallery uploads
  - [ ] Verify ImageUpload record creation

## Phase 5: Update Web Routes (Form System)
- [ ] Update `routes/carnivals.mjs`:
  - [ ] Replace import from `upload.mjs` to `formUpload.mjs`
  - [ ] Configure carnival field config: `[{ name: 'logo', maxCount: 1 }, { name: 'promotionalImage', maxCount: 1 }, { name: 'drawDocument', maxCount: 1 }]`
  - [ ] Create carnival form uploader instance
  - [ ] Update routes to use new middleware
  - [ ] Test carnival logo/image uploads
- [ ] Update `routes/clubs.mjs`:
  - [ ] Replace import from `upload.mjs` to `formUpload.mjs`  
  - [ ] Configure club field config: `[{ name: 'logo', maxCount: 1 }, { name: 'gallery', maxCount: 5 }]`
  - [ ] Create club form uploader instance
  - [ ] Update routes to use new middleware
  - [ ] Test club profile uploads
- [ ] Update `routes/sponsors.mjs`:
  - [ ] Replace import from `upload.mjs` to `formUpload.mjs`
  - [ ] Configure sponsor field config: `[{ name: 'logo', maxCount: 1 }]`
  - [ ] Create sponsor form uploader instance  
  - [ ] Update routes to use new middleware
  - [ ] Test sponsor logo uploads
- [ ] Update `routes/admin.mjs`:
  - [ ] Replace imports from `upload.mjs` to appropriate new middlewares
  - [ ] Update admin routes for both club and carnival uploads
  - [ ] Test admin upload functionality

## Phase 6: Controller Updates
- [ ] Update carnival controller:
  - [ ] Verify `req.structuredUploads` processing logic
  - [ ] Ensure proper field mapping (logo → logoUrl, etc.)
  - [ ] Test file path saving to database
- [ ] Update club controller:
  - [ ] Verify `req.structuredUploads` processing logic  
  - [ ] Ensure proper field mapping
  - [ ] Test file path saving to database
- [ ] Update sponsor controller:
  - [ ] Verify `req.structuredUploads` processing logic
  - [ ] Ensure proper field mapping 
  - [ ] Test file path saving to database
- [ ] Update admin controller:
  - [ ] Verify upload processing for both entity types
  - [ ] Test admin upload workflows

## Phase 7: Testing and Validation
- [ ] Test gallery uploads (AJAX):
  - [ ] Club gallery uploads
  - [ ] Carnival gallery uploads  
  - [ ] Verify ImageUpload records are created
  - [ ] Test file organization in correct folders
- [ ] Test form uploads:
  - [ ] Carnival logo/promotional/document uploads
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

## Phase 8: Cleanup and Documentation
- [ ] Remove old middleware: Delete `middleware/upload.mjs.old`
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

## Risk Mitigation
- [ ] Backup strategy: Keep `upload.mjs.old` until all testing complete
- [ ] Rollback plan: Document exact steps to restore original middleware
- [ ] Monitoring: Log all uploads during transition period  
- [ ] Gradual deployment: Test in staging environment first
- [ ] User communication: Notify users of any temporary upload restrictions

## Success Criteria
- [ ] All existing upload functionality preserved
- [ ] Cleaner separation between gallery and form uploads
- [ ] Improved maintainability with focused middleware
- [ ] No regression in upload performance
- [ ] Consistent file organization structure
- [ ] Enhanced error handling and logging
- [ ] Complete test coverage for both upload types

## Dependencies
- [ ] Multer package (already installed)
- [ ] File system permissions for upload directories  
- [ ] Database access for ImageUpload model
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
