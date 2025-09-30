```markdown
# Todo List: System-Wide Upload & Form Standardization

## Phase 1: Upload Folder Structure Standardization
- [x] **Step 1: Update imageUploadService.mjs to use entity-folder structure**
- [x] **Step 2: Update config/constants.mjs to remove hierarchical UPLOAD_DIRECTORIES** ✅
- [x] **Step 3: Convert club.controller.mjs from ImageNamingService to entity-folder approach** ✅ COMPLETED
- [x] **Step 4: Update middleware/upload.mjs to create content-type subfolders**
- [x] **Step 5: Add document/drawFile upload support to middleware**
- [x] **Step 6: Update carnival controller to use standardized uploads for documents/draws**
- [-] **Step 7: Migrate existing files from old structure to new structure** SKIPPED, FILES DON'T NEED TO MOVE
- [x] **Step 8: Remove ImageNamingService.mjs completely** ✅ COMPLETED
- [x] **Step 9: Verify all entities use consistent folder structure** ✅ COMPLETED

## Phase 2: Form Submission Standardization (AJAX)
- [x] **Step 10: Convert sponsor-edit.js to AJAX form submission with staged files** ✅ Already implemented
- [x] **Step 11: Convert carnival-new.js to AJAX form submission with staged files** *(Completed - added handleFormSubmit with fetch API and updated proceedAnyway)*  
- [x] **Step 12: Convert carnival-edit.js to AJAX form submission with staged files** *(Completed - added stagedFile property, bindEvents method, handleFormSubmit with AJAX, and logoFileSelected event handling)*
- [x] **Step 13: Convert club-manage.js to AJAX form submission with staged files** *(Completed - already implemented with stagedFile property, handleFormSubmit with fetch API, FormData, logoFileSelected event handling, and complete AJAX pattern matching other forms)*
- [ ] **Step 14: Forms using logo-uploader.ejs should populate `<%= logoInputId %>-preview-container` when image is selected for upload as a preview before submission**
- [ ] **Step 14: Update admin forms to use AJAX submission patterns**
- [ ] **Step 15: Update unit and js tests to cover AJAX form submissions and staged file handling, as well as to expect entity-folder structure, and removal of imageNamingService**
```

## Problem Analysis

You're absolutely right - we have "different methods for different things" which is poor design. Currently we have:

### 🔍 **Current Inconsistent State:**

**✅ Entity-Folder System (GOOD - MySideline, Upload Middleware):**
```
public/uploads/carnivals/123/logos/mysideline-logo.png
public/uploads/clubs/456/logos/
public/uploads/sponsors/789/logos/
```

**❌ Constants-Based System (BAD - imageUploadService):**
```
public/uploads/logos/carnival/
public/uploads/images/carnival/gallery/
public/uploads/logos/club/
public/uploads/images/club/gallery/
```

**❌ ImageNamingService System (BAD - club.controller.mjs):**
```
Uses structured naming with parseImageName() and getRelativePath()
Still imported and used in club.controller.mjs lines 19, 395, 425, etc.
```

### 🎯 **Target Standardized Structure:**

```
public/uploads/clubs/{id}/logos/
public/uploads/clubs/{id}/gallery/
public/uploads/sponsors/{id}/logos/
public/uploads/carnivals/{id}/logos/
public/uploads/carnivals/{id}/gallery/
public/uploads/carnivals/{id}/draws/
public/uploads/users/{id}/avatar/
```

Let me start implementing the standardization.
