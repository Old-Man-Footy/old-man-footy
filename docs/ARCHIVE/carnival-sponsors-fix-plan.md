# Carnival Sponsors Fix Plan

## Issues Identified

Based on diagnostic testing of carnival sponsors functionality, the following issues have been identified:

### 1. Sequelize Association Alias Mismatches
- **CarnivalSponsor**: Fixed - now using `as: 'sponsor'` correctly
- **Sponsor-Club**: Using incorrect alias `'clubs'` instead of `'club'`
- **Impact**: All sponsor queries fail due to association errors

### 2. Controller Method Issues
- `showCarnivalSponsors()`: Association alias errors prevent data loading
- `showAddSponsorForm()`: Cannot load available sponsors due to alias errors
- `addSponsorToCarnival()`: Association errors during sponsor addition
- `removeSponsorFromCarnival()`: Association errors during sponsor removal
- `showSponsorProfile()`: Cannot load sponsor with club data

### 3. Data Integrity Confirmed
- ✅ Carnival 32 exists and has 1 sponsor linked (ANZ Bank)
- ✅ 21 active sponsors available in system
- ✅ Sponsor data structure is correct
- ✅ Routes are properly configured

## Fix Implementation Plan

### Phase 1: Fix Association Aliases (HIGH PRIORITY)
- [ ] **Fix CarnivalSponsor queries** in `carnival.controller.mjs`
  - Update `showCarnivalSponsors()` method (line ~1157)
  - Update `showAddSponsorForm()` method (line ~1197)
  - Update `addSponsorToCarnival()` method (line ~1267)
  - Update `removeSponsorFromCarnival()` method (line ~1362)

- [ ] **Fix Sponsor-Club association** in diagnostic queries
  - Change `as: 'clubs'` to `as: 'club'` in sponsor queries
  - Update any controller methods that include club data

### Phase 2: Test Core Functionality (MEDIUM PRIORITY)
- [ ] **Test "View" button functionality**
  - Verify `/sponsors/:id` route works
  - Ensure sponsor profile page loads correctly
  
- [ ] **Test "Remove" button functionality**  
  - Verify confirmation dialog appears
  - Test actual sponsor removal from carnival

- [ ] **Test "Add Sponsor" button functionality**
  - Verify sponsor selection form loads
  - Test available sponsors list displays

- [ ] **Test "Add to Carnival" functionality**
  - Verify sponsor can be added to carnival
  - Test duplicate sponsor handling

### Phase 3: UI/UX Fixes (LOW PRIORITY)
- [ ] **Fix missing "View" buttons** on available sponsors
  - Add view buttons to add-sponsor.ejs template
  
- [ ] **Fix dark theme issues** on /sponsors page
  - Review CSS classes and Bootstrap theme compatibility

### Phase 4: Testing & Verification
- [ ] **Manual testing** of all 6 reported issues
- [ ] **Automated testing** if test files exist
- [ ] **Database integrity verification**

## Expected File Changes

### controllers/carnival.controller.mjs
```javascript
// Line ~1157 - showCarnivalSponsors method
include: [{
    model: Sponsor,
    as: 'sponsor',  // ✅ Already fixed
    where: { isActive: true, isPubliclyVisible: true },
    required: true,
    include: [{
        model: Club,
        as: 'club'  // ❌ Need to fix from 'clubs'
    }]
}]

// Line ~1197 - showAddSponsorForm method  
const availableSponsors = await Sponsor.findAll({
    where: { isActive: true, isPubliclyVisible: true },
    include: [{
        model: Club,
        as: 'club'  // ❌ Need to fix from 'clubs'
    }]
});
```

### controllers/sponsor.controller.mjs
```javascript
// showSponsorProfile method
include: [{
    model: Club,
    as: 'club'  // ❌ Need to fix from 'clubs'
}]
```

## Success Criteria

### All issues resolved when:
1. ✅ "View" buttons redirect to correct sponsor profiles
2. ✅ "Remove" buttons successfully remove sponsors after confirmation  
3. ✅ "Add Sponsor" button loads sponsor selection form
4. ✅ "Add to Carnival" buttons successfully add sponsors
5. ✅ "View" buttons appear on available sponsors list
6. ✅ Dark theme works correctly on all sponsor pages

## Testing Notes

- Carnival 32: "Shellharbour Stingrays Annual Masters Carnival Player Registrations"
- Has 1 sponsor: ANZ Bank (ID: 36)
- 21 total active sponsors available
- Test URL: http://localhost:3050/carnivals/32/sponsors
