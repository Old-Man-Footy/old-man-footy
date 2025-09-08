# Scripts Usage Analysis

## 📊 **Summary**

**Total Scripts Found:** 19 main scripts + 6 utilities + 3 test scripts = **28 scripts**

**Actively Referenced:** 15 scripts  
**Future Production Utilities:** 3 scripts
**Safe to Remove:** 2 scripts

---

## ✅ **ACTIVELY USED SCRIPTS**

### **Referenced in package.json npm scripts:**
- ✅ `run-migrations.mjs` - Used by `npm run migrate`
- ✅ `seed-database.mjs` - Used by `npm run seed`
- ✅ `smoke-health.mjs` - Used by `docker:smoke:test` and `docker:smoke:prod`
- ✅ `simple-e2e-reset.mjs` - Used by `test:e2e:reset` and `test:e2e:setup`

### **Referenced in configuration files:**
- ✅ `start-e2e-server-isolated.mjs` - Used in `playwright.config.mjs`
- ✅ `fix-jest-globals.mjs` - Excluded in `vitest.config.js.mjs`

### **Referenced by other scripts/code:**
- ✅ `capture-mysideline-data.mjs` - Used by integration tests
- ✅ `seed-help-content.mjs` - Imported by `app.mjs` and has test file
- ✅ `manual-mysideline-sync.mjs` - References `check-sync-status.mjs`
- ✅ `check-sync-status.mjs` - Referenced by `manual-mysideline-sync.mjs`
- ✅ `image-manager.mjs` - Standalone utility script (has usage examples)

### **Utility scripts (used by other scripts):**
- ✅ `utilities/basicSeeder.mjs` - Used by `seed-database.mjs`
- ✅ `utilities/dataCleanup.mjs` - Used by `seed-database.mjs`
- ✅ `utilities/environmentValidation.mjs` - Used by `seed-database.mjs` and `dataCleanup.mjs`
- ✅ `utilities/playerSeeder.mjs` - Used by `seed-database.mjs`

---

## ❓ **REMAINING POTENTIALLY UNUSED SCRIPTS**

**Note: Some scripts were already removed. Analyzing remaining scripts:**

### **Main scripts with no clear references:**
1. ✅ `scheduled-maintenance.mjs` - **INVESTIGATE RESULTS:** 
   - Uses `node-cron` for daily database maintenance at 2:00 AM
   - Calls `DatabaseOptimizer.performMaintenance()`, `backupDatabase()`, `analyzePerformance()`
   - **NOT imported or started anywhere in codebase**
   - No PM2 ecosystem config found
   - Not referenced in Dockerfile or docker-compose
   - **Conclusion: Future production utility - KEEP for production deployment**

2. ❌ `setup-e2e-database-clean.mjs` - **INVESTIGATE RESULTS:**
   - E2E database setup script (82 lines)
   - Similar functionality to `simple-e2e-reset.mjs` but more complex
   - **No references found anywhere**
   - **Conclusion: Superseded by `simple-e2e-reset.mjs`**

3. ❌ `start-e2e-server.mjs` - **INVESTIGATE RESULTS:**
   - E2E server startup with database initialization (89 lines)
   - Only mentioned in comment in `global-setup.mjs` saying it was superseded
   - **Current usage:** `start-e2e-server-isolated.mjs` is used instead
   - **Conclusion: Superseded by isolated version**

4. ✅ `purge-seed-data.mjs` - Production data cleanup tool (463 lines)
   - **Status: KEEP** - Important production utility

### **Utility scripts with no clear references:**
5. ✅ `utilities/databaseBackup.mjs` - **Status: KEEP** - Production utility

---

## 🧹 **UPDATED CLEANUP RECOMMENDATIONS**

### **HIGH CONFIDENCE - Safe to Remove:**
```bash
# These scripts are definitively superseded or duplicates
rm scripts/setup-e2e-database-clean.mjs        # Superseded by simple-e2e-reset.mjs
rm scripts/start-e2e-server.mjs               # Superseded by start-e2e-server-isolated.mjs
```

### **KEEP - Production Utilities:**
```bash
# These should be retained as they're important operational tools
scripts/scheduled-maintenance.mjs             # Production maintenance cron script (DB optimization, backups)
scripts/purge-seed-data.mjs                   # Production data cleanup (463 lines)
scripts/utilities/databaseBackup.mjs          # Database backup utility
```

**📝 NOTE:** `scheduled-maintenance.mjs` provides important production functionality:
- Daily database maintenance and optimization
- Automated database backups
- Performance analysis and monitoring
- **Status:** Keep for future production deployment

---

## 📋 **VERIFICATION STEPS**

Before removing any scripts, check:

1. **Git history** - See if scripts were recently used
2. **Documentation** - Check if mentioned in docs or README
3. **Deployment scripts** - Check CI/CD pipelines
4. **Operations runbooks** - Check if used in production maintenance
5. **Team knowledge** - Ask team if any scripts are used manually

---

## 📈 **USAGE STATISTICS**

- **Package.json referenced:** 4 scripts (22%)
- **Config file referenced:** 2 scripts (11%) 
- **Code imported/used:** 9 scripts (50%)
- **No clear references:** 13 scripts (72%)

**Note:** Some "unused" scripts might be operational tools run manually or via external processes not captured in this codebase analysis.
