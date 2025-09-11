# Comprehensive End-to-End Test Plan: Self-Sufficient Sequential Testing

## Executive Summary

This E2E test plan creates a **completely self-sufficient** testing sequence that builds all necessary data through UI interactions. **No pre-seeded database entries are required.** The plan follows strict **logical sequence** where each test builds upon the state created by previous steps.

## Test Environment Requirements

### Prerequisites
- **Clean test database** (completely empty - no seed data)
- **E2E environment** configured (`NODE_ENV=e2e`)
- **All migrations run** (database structure only)
- **No test data dependencies**

### Database Reset Requirement
🗃️ **BEFORE EACH FULL E2E RUN:** Delete the entire E2E database file. The application will automatically recreate it via migrations on startup, ensuring a completely clean slate.

### Critical Testing Principle
🔥 **ZERO DATABASE SEEDING** - Every piece of test data must be created through UI interactions in the logical sequence below.

---

## Logical Test Sequence

### **Phase 1: Public User Foundation** 
*No dependencies - can run on completely clean database*

#### 1.1 Homepage & Public Content Access
```markdown
- [ ] **Homepage loads correctly** 
  - Verify layout, navigation, stats counters (should show zeros)
  - Test newsletter signup (with email validation)
  - Confirm carousel section is hidden when no images exist
  - Confirm upcoming carnivals section is empty/hidden when none exist
  - Test responsive design elements

- [ ] **Public navigation works**
  - Access `/carnivals` page (should show empty state gracefully)
  - Access `/clubs` page (should show empty state gracefully) 
  - Access `/sponsors` page (should show empty state gracefully)
  - Access `/contact` page and test form submission
```

#### 1.2 Authentication Foundation
```markdown
- [ ] **First user registration (becomes admin)**
  - Register: `admin@example.com` / `SecurePass123!`
  - **Verify auto-admin promotion** (first user becomes admin)
  - Test login/logout cycle
  - Access admin dashboard (confirm admin features visible)
```

---

### **Phase 2: Admin System Setup**
*Depends on: Phase 1.2 (admin user exists)*

#### 2.1 Club Management Foundation
```markdown
- [ ] **Admin creates first club**
  - Create club: "Aussie Masters FC" (NSW, Sydney)
  - Upload club logo (test image upload functionality)
  - Verify club appears in public clubs list
  - Test club edit functionality

- [ ] **Admin creates second club** 
  - Create club: "Brisbane Old Boys" (QLD, Brisbane)  
  - **Purpose:** Needed for multi-club carnival testing later
  - Test duplicate name validation (should prevent exact duplicates)
```

#### 2.2 User Management System
```markdown
- [ ] **Admin sends delegation invitations**
  - Send invitation to `delegate1@example.com` for "Aussie Masters FC"
  - Send invitation to `delegate2@example.com` for "Brisbane Old Boys"  
  - **Purpose:** Creates primary delegates needed for club operations
```

#### 2.3 MySideline Integration Setup
```markdown
- [ ] **Test MySideline sync (if available)**
  - Access admin dashboard → MySideline sync
  - **Either:** Trigger manual sync OR create manual carnival
  - **Purpose:** Ensures carnivals exist for registration testing
```

---

### **Phase 3: Delegate User Workflows**
*Depends on: Phase 2.2 (invitations sent)*

#### 3.1 Delegate Account Setup  
```markdown
- [ ] **Delegate 1 accepts invitation**
  - Check email for invitation (or use invitation link)
  - Register: `delegate1@example.com` / `SecurePass123!`
  - **Verify:** Auto-assigned to "Aussie Masters FC" as primary delegate
  - Access delegate dashboard (confirm club management options)

- [ ] **Delegate 2 accepts invitation**
  - Register: `delegate2@example.com` / `SecurePass123!` 
  - **Verify:** Auto-assigned to "Brisbane Old Boys" as primary delegate
```

#### 3.2 Club Data Population
```markdown
- [ ] **Delegate 1: Populate "Aussie Masters FC"**
  - Add 5+ players (diverse names, positions, ages)
  - Add 2+ sponsors (test logo upload, different sponsorship levels)
  - Update club description and contact details
  - **Purpose:** Creates rich club data for carnival participation

- [ ] **Delegate 2: Populate "Brisbane Old Boys"** 
  - Add 3+ players (minimum viable team)
  - Add 1+ sponsor 
  - **Purpose:** Second club needed for multi-club carnivals
```

---

### **Phase 4: Carnival Management**
*Depends on: Phase 3.2 (clubs with players exist)*

#### 4.1 Carnival Creation & Management
```markdown
- [ ] **Admin creates comprehensive carnival**
  - Create: "Masters Championship 2024" (NSW, future date)
  - Set registration deadline, max teams, contact details
  - Make publicly visible and active
  - **Purpose:** Main carnival for registration testing

- [ ] **Alternative: Delegate creates carnival**  
  - Delegate 1 creates: "Aussie Masters Cup" (NSW, future date)
  - **Purpose:** Tests delegate carnival creation rights
```

#### 4.2 Carnival Registration Workflow
```markdown
- [ ] **Delegate 1: Register "Aussie Masters FC"**
  - Register club for "Masters Championship 2024" 
  - Fill complete registration form (contact info, special requirements)
  - **Verify:** Registration appears as "pending" (needs host approval)

- [ ] **Delegate 2: Register "Brisbane Old Boys"**
  - Register club for same carnival
  - **Purpose:** Multiple clubs needed for approval/management testing
```

#### 4.3 Carnival Host Management
```markdown
- [ ] **Admin/Host manages registrations**
  - Login as carnival creator
  - **Approve** "Aussie Masters FC" registration
  - **Approve** "Brisbane Old Boys" registration 
  - View attendees list (should show both clubs)
```

#### 4.4 Player Assignment to Carnivals
```markdown
- [ ] **Delegate 1: Assign players to carnival**
  - Access carnival → "Manage Players"
  - Select 3+ players from club roster
  - **Verify:** Players appear in carnival attendance list

- [ ] **Delegate 2: Assign players to carnival**
  - Assign 2+ players from "Brisbane Old Boys"
  - **Purpose:** Multiple clubs with players for comprehensive testing
```

---

### **Phase 5: Advanced Sponsor Management**
*Depends on: Phase 3.2 (basic sponsors exist)*

#### 5.1 Comprehensive Sponsor Operations
```markdown
- [ ] **Admin creates system-wide sponsors**
  - Create premium sponsor with full contact details
  - Upload high-quality logo, test multiple formats
  - **Test:** Sponsor visibility on public pages

- [ ] **Delegate manages club-specific sponsors**
  - Add existing sponsor to club (test linking functionality)  
  - Create new club-specific sponsor
  - **Test:** Sponsor display order management
  - **Test:** Remove sponsor from club (not deletion)
```

#### 5.2 Sponsor-Carnival Relationships  
```markdown
- [ ] **Link sponsors to carnivals**
  - Admin assigns sponsors to carnival
  - **Test:** Sponsor logos appear on carnival page
  - **Verify:** Sponsor recognition in public carnival view
```

---

### **Phase 6: Public User Experience**
*Depends on: Phase 5 (rich content exists)*

#### 6.1 Content Discovery (Logged Out)
```markdown
- [ ] **Public user browses populated platform**  
  - Browse `/carnivals` → should show rich carnival data
  - View individual carnival → attendees, sponsors, details
  - Browse `/clubs` → should show clubs with logos/descriptions  
  - Browse `/sponsors` → should show sponsor directory
  - **Verify:** All public content displays properly
```

#### 6.2 Registration Interest (Non-Authenticated)
```markdown
- [ ] **Anonymous user attempts registration**
  - Try to register for carnival (should redirect to login)
  - **Test:** "Login to register" workflow
  - **Verify:** Proper authentication gates
```

---

### **Phase 7: System Integrity & Edge Cases**
*Depends on: All previous phases (full system populated)*

#### 7.1 Authorization & Security Testing
```markdown
- [ ] **Cross-user authorization**
  - Delegate 1 tries to manage Delegate 2's club (should fail)
  - Non-admin tries to access admin functions (should fail)
  - **Test:** Proper role-based access control
```

#### 7.2 Data Relationships & Cascading
```markdown
- [ ] **Relationship integrity**
  - **Test:** Deactivate player → verify carnival assignments update
  - **Test:** Club status changes → verify carnival participation
  - **Test:** Sponsor removal → verify display updates
```

#### 7.3 Error Handling & Edge Cases
```markdown
- [ ] **Robust error scenarios**
  - Submit forms with invalid data
  - Access non-existent resources (404 handling)
  - **Test:** File upload limits and format validation
  - **Test:** Concurrent user operations
```

---

## Success Criteria

### ✅ **Primary Goals**
- [ ] **Complete user journey** from empty database to fully functional platform
- [ ] **All user roles** can accomplish their core tasks
- [ ] **Data integrity** maintained across all operations
- [ ] **Authorization** properly enforced at every level

### ✅ **Quality Gates**  
- [ ] **No broken workflows** that prevent task completion
- [ ] **Graceful error handling** for all invalid operations
- [ ] **Performance acceptable** (page loads < 3 seconds)
- [ ] **Mobile responsive** interface works correctly

### ✅ **Business Requirements**
- [ ] **Carnival management** complete workflow functional
- [ ] **Club delegation** system works end-to-end  
- [ ] **MySideline integration** (if available) operates correctly
- [ ] **Email notifications** send appropriately (testable in logs)

---

## Execution Notes

### **Test Data Philosophy**
- **NEVER** rely on seeded data
- **BUILD** all test data through UI interactions
- **FOLLOW** logical sequence strictly (later tests depend on earlier ones)
- **VERIFY** each step creates expected state for next phase
- **TEST EMPTY STATES** first - carousel hidden, no carnivals shown, zero stats counters

### **Environment Requirements**
- Clean E2E database (migrations only, no seeds)
- Email service configured (or mocked for notifications)
- File upload directory writable
- All environment variables set appropriately

### **Failure Handling**
- If any Phase fails, **STOP** - subsequent phases depend on it
- Each test should verify the **expected state** before proceeding
- Log detailed information about **data created** for debugging

### **Implementation Strategy**
This plan can be implemented as:
1. **Single comprehensive test file** (sequential execution)
2. **Multiple test files** with careful dependency management
3. **Setup/teardown hooks** to manage state between phases

This plan ensures **complete platform validation** through realistic user workflows while maintaining **zero dependencies** on pre-seeded data.

---

## Appendix: Key User Stories Covered

### **Admin User Stories**
- "As an admin, I can set up the platform from scratch"
- "As an admin, I can invite delegates to manage clubs"  
- "As an admin, I can create and manage carnivals"
- "As an admin, I can manage all sponsors and system settings"

### **Delegate User Stories**
- "As a delegate, I can accept an invitation and manage my club"
- "As a delegate, I can add players and sponsors to my club"
- "As a delegate, I can register my club for carnivals"
- "As a delegate, I can assign players to specific carnivals"

### **Public User Stories**  
- "As a visitor, I can browse carnivals, clubs, and sponsors"
- "As a visitor, I can contact the organization"
- "As a visitor, I can subscribe to updates"
- "As a visitor, I must register to participate in carnivals"

Each user story is tested **end-to-end** through authentic UI interactions, ensuring the platform works as designed for real users.
