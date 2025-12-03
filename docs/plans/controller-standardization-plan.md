# Controller Standardization Plan: Migrating to wrapControllers Pattern

This plan systematically standardizes all controllers to use the `wrapControllers()` utility instead of the current mix of `asyncHandler`, manual `try/catch`, and direct exports.

## Project Overview

**Objective**: Standardize all controllers to use `wrapControllers()` for consistent async error handling
**Pattern**: Move from individual function exports to object-based controllers wrapped with `wrapControllers()`
**Benefits**: Centralized error handling, consistent patterns, reduced boilerplate code

## Pattern Standards

### Target Pattern (Standard)
```javascript
const rawControllers = {
  functionName: async (req, res) => {
    // Controller logic without try/catch
  }
};

export const { functionName } = wrapControllers(rawControllers);
```

### Current Patterns to Replace
1. **Direct asyncHandler**: `export const func = asyncHandler(async (req, res) => {})`
2. **Manual try/catch**: `export const func = async (req, res) => { try {} catch {} }`
3. **Direct exports**: `export const func = (req, res) => {}`

## Stage 1: carnival.controller.mjs
**Current Pattern**: Direct asyncHandler exports
**File Size**: 1,918 lines
**Priority**: High (large file with many async functions)

### Steps:
1. [ ] Add `wrapControllers` import at top of file
2. [ ] Create `rawControllers` object
3. [ ] Move `listCarnivalsHandler` function into `rawControllers.list`
4. [ ] Remove `asyncHandler` wrapper from `listCarnivalsHandler`
5. [ ] Move `showCarnivalHandler` function into `rawControllers.show`
6. [ ] Remove `asyncHandler` wrapper from `showCarnivalHandler`
7. [ ] Move `addCarnivalHandler` function into `rawControllers.add`
8. [ ] Remove `asyncHandler` wrapper from `addCarnivalHandler`
9. [ ] Move `editCarnivalHandler` function into `rawControllers.edit`
10. [ ] Remove `asyncHandler` wrapper from `editCarnivalHandler`
11. [ ] Move `disableCarnivalHandler` function into `rawControllers.delete`
12. [ ] Remove `asyncHandler` wrapper from `disableCarnivalHandler`
13. [ ] Move `claimCarnivalHandler` function into `rawControllers.claim`
14. [ ] Remove `asyncHandler` wrapper from `claimCarnivalHandler`
15. [ ] Move `approveCarnivalHandler` function into `rawControllers.approve`
16. [ ] Remove `asyncHandler` wrapper from `approveCarnivalHandler`
17. [ ] Move `emailAttendeesHandler` function into `rawControllers.emailAttendees`
18. [ ] Remove `asyncHandler` wrapper from `emailAttendeesHandler`
19. [ ] Add `wrapControllers(rawControllers)` export destructuring
20. [ ] Remove individual `asyncHandler` import if no longer used
21. [ ] Test all carnival routes functionality
22. [ ] Verify error handling works correctly

## Stage 2: main.controller.mjs
**Current Pattern**: Direct asyncHandler exports
**File Size**: 761 lines
**Priority**: High (homepage and core functionality)

### Steps:
1. [ ] Add `wrapControllers` import at top of file
2. [ ] Create `rawControllers` object
3. [ ] Move `getIndex` function into `rawControllers.getIndex`
4. [ ] Remove `asyncHandler` wrapper from `getIndex`
5. [ ] Move `getDashboard` function into `rawControllers.getDashboard`
6. [ ] Remove `asyncHandler` wrapper from `getDashboard`
7. [ ] Keep `getAbout` as direct export (synchronous function)
8. [ ] Move `postSubscribe` function into `rawControllers.postSubscribe`
9. [ ] Add proper async error handling to `postSubscribe` (currently missing)
10. [ ] Move `getUnsubscribe` function into `rawControllers.getUnsubscribe`
11. [ ] Remove `asyncHandler` wrapper from `getUnsubscribe`
12. [ ] Move `postUnsubscribe` function into `rawControllers.postUnsubscribe`
13. [ ] Remove `asyncHandler` wrapper from `postUnsubscribe`
14. [ ] Move `getStats` function into `rawControllers.getStats`
15. [ ] Remove `asyncHandler` wrapper from `getStats`
16. [ ] Move `sendNewsletter` function into `rawControllers.sendNewsletter`
17. [ ] Remove `asyncHandler` wrapper from `sendNewsletter`
18. [ ] Move `getContact` function into `rawControllers.getContact`
19. [ ] Remove `asyncHandler` wrapper from `getContact`
20. [ ] Move `postContact` function into `rawControllers.postContact`
21. [ ] Remove `asyncHandler` wrapper from `postContact`
22. [ ] Add `wrapControllers(rawControllers)` export destructuring
23. [ ] Keep synchronous exports separate (getAbout)
24. [ ] Test homepage and dashboard functionality
25. [ ] Verify contact form and subscription features work

## Stage 3: carnivalSponsor.controller.mjs
**Current Pattern**: Direct exports without asyncHandler
**File Size**: 376 lines
**Priority**: Medium (smaller file, needs async wrapping)

### Steps:
1. [ ] Add `wrapControllers` import at top of file
2. [ ] Create `rawControllers` object
3. [ ] Move `listCarnivalSponsors` function into `rawControllers.list`
4. [ ] Move `showCarnivalSponsor` function into `rawControllers.show`
5. [ ] Move `addCarnivalSponsor` function into `rawControllers.add`
6. [ ] Move `editCarnivalSponsor` function into `rawControllers.edit`
7. [ ] Move `disableCarnivalSponsor` function into `rawControllers.delete`
8. [ ] Add `wrapControllers(rawControllers)` export destructuring
9. [ ] Test carnival sponsor management functionality
10. [ ] Verify CRUD operations work correctly

## Stage 4: clubPlayer.controller.mjs
**Current Pattern**: Direct export functions with manual try/catch
**File Size**: 965 lines
**Priority**: Medium (manual try/catch needs standardization)

### Steps:
1. [ ] Add `wrapControllers` import at top of file
2. [ ] Create `rawControllers` object
3. [ ] Move `listClubPlayers` function into `rawControllers.list`
4. [ ] Remove manual try/catch from `listClubPlayers`
5. [ ] Move `showClubPlayer` function into `rawControllers.show`
6. [ ] Remove manual try/catch from `showClubPlayer`
7. [ ] Move `addClubPlayer` function into `rawControllers.add`
8. [ ] Remove manual try/catch from `addClubPlayer`
9. [ ] Move `editClubPlayer` function into `rawControllers.edit`
10. [ ] Remove manual try/catch from `editClubPlayer`
11. [ ] Move `deleteClubPlayer` function into `rawControllers.delete`
12. [ ] Remove manual try/catch from `deleteClubPlayer`
13. [ ] Move any other exported functions into `rawControllers`
14. [ ] Remove all manual try/catch blocks
15. [ ] Add `wrapControllers(rawControllers)` export destructuring
16. [ ] Test club player management functionality
17. [ ] Verify error handling still works without try/catch

## Stage 5: subscription.controller.mjs
**Current Pattern**: Direct exports with manual try/catch
**File Size**: 382 lines
**Priority**: Medium (subscription management functionality)

### Steps:
1. [ ] Add `wrapControllers` import at top of file
2. [ ] Create `rawControllers` object
3. [ ] Move `createSubscription` function into `rawControllers.createSubscription`
4. [ ] Remove manual try/catch from `createSubscription`
5. [ ] Move `verifySubscription` function into `rawControllers.verifySubscription`
6. [ ] Remove manual try/catch from `verifySubscription`
7. [ ] Move `updateSubscription` function into `rawControllers.updateSubscription`
8. [ ] Remove manual try/catch from `updateSubscription`
9. [ ] Move `unsubscribe` function into `rawControllers.unsubscribe`
10. [ ] Remove manual try/catch from `unsubscribe`
11. [ ] Move `getSubscriptionStatus` function into `rawControllers.getSubscriptionStatus`
12. [ ] Remove manual try/catch from `getSubscriptionStatus`
13. [ ] Move `getNotificationTypes` function into `rawControllers.getNotificationTypes`
14. [ ] Remove manual try/catch from `getNotificationTypes`
15. [ ] Keep validation middleware exports separate (not controller functions)
16. [ ] Add `wrapControllers(rawControllers)` export destructuring
17. [ ] Test subscription creation and management
18. [ ] Verify email verification workflow works

## Stage 6: help.controller.mjs
**Current Pattern**: Manual try/catch with export function
**File Size**: 39 lines (small)
**Priority**: Low (small file, simple functionality)

### Steps:
1. [ ] Add `wrapControllers` import at top of file
2. [ ] Create `rawControllers` object
3. [ ] Move the main help function into `rawControllers.getHelp`
4. [ ] Remove manual try/catch from help function
5. [ ] Add `wrapControllers(rawControllers)` export destructuring
6. [ ] Test help page functionality
7. [ ] Verify help content display works

## Stage 7: controllers/api/subscription.controller.mjs
**Current Pattern**: Direct exports with manual try/catch
**File Size**: 224 lines
**Priority**: Low (API endpoints, smaller impact)

### Steps:
1. [ ] Add `wrapControllers` import at top of file
2. [ ] Create `rawControllers` object
3. [ ] Move `getUserSubscription` function into `rawControllers.getUserSubscription`
4. [ ] Remove manual try/catch from `getUserSubscription`
5. [ ] Move `updateUserSubscription` function into `rawControllers.updateUserSubscription`
6. [ ] Remove manual try/catch from `updateUserSubscription`
7. [ ] Move `unsubscribeUser` function into `rawControllers.unsubscribeUser`
8. [ ] Remove manual try/catch from `unsubscribeUser`
9. [ ] Add `wrapControllers(rawControllers)` export destructuring
10. [ ] Test AJAX subscription API endpoints
11. [ ] Verify dashboard subscription management works

## Controllers Already Using wrapControllers (No Changes Needed)

### ✅ admin.controller.mjs
- **Status**: Already standardized ✅
- **Pattern**: Uses `wrapControllers(rawControllers)` correctly
- **File Size**: 1,867 lines
- **No action required**

### ✅ auth.controller.mjs
- **Status**: Already standardized ✅
- **Pattern**: Uses `wrapControllers(rawControllers)` correctly
- **File Size**: 1,153 lines
- **No action required**

### ✅ carnivalClub.controller.mjs
- **Status**: Already standardized ✅
- **Pattern**: Uses `wrapControllers(rawControllers)` correctly
- **File Size**: 1,762 lines
- **No action required**

### ✅ club.controller.mjs
- **Status**: Already standardized ✅
- **Pattern**: Uses `wrapControllers(rawControllers)` correctly
- **File Size**: 2,061 lines
- **No action required**

## Controllers with No Changes Needed (Synchronous)

### ✅ comingSoon.controller.mjs
- **Status**: Synchronous functions only ✅
- **Pattern**: Direct exports (appropriate for sync functions)
- **Reason**: Simple synchronous functions don't need async error handling
- **No action required**

### ✅ maintenance.controller.mjs
- **Status**: Synchronous functions only ✅
- **Pattern**: Direct exports (appropriate for sync functions)
- **Reason**: Simple synchronous functions don't need async error handling
- **No action required**

## Testing Strategy

After each stage completion:

1. **Unit Tests**: Run existing controller tests to ensure functionality
2. **Integration Tests**: Verify routes work end-to-end
3. **Error Handling Tests**: Confirm errors are properly caught and formatted
4. **Manual Testing**: Test key user workflows for affected functionality

## Completion Criteria

- [ ] All async controllers use `wrapControllers()` pattern
- [ ] No manual try/catch blocks in controller functions
- [ ] No direct `asyncHandler` usage in controllers
- [ ] All existing functionality continues to work
- [ ] Error handling remains consistent across controllers
- [ ] Code follows established patterns from existing standardized controllers

## Notes

- Synchronous functions (comingSoon, maintenance, main.getAbout) should remain as direct exports
- Validation middleware exports should not be moved into `rawControllers`
- Maintain existing function names in exports for route compatibility
- Follow the exact pattern used in admin.controller.mjs as the reference implementation
