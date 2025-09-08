# Simplified E2E Database Reset

This document outlines the simplified approach to E2E database management that avoids the complex server startup issues we've been experiencing.

## Quick Start

### Reset Database and Run Tests

```bash
# Method 1: Reset and run in one command
npm run test:e2e:setup

# Method 2: Manual steps
npm run test:e2e:reset  # Reset the database
npm run dev             # Start server manually (in separate terminal)
npm run test:e2e        # Run tests
```

### Reset Database Only

```bash
npm run test:e2e:reset
```

## How It Works

### 1. Simple Reset Script (`scripts/simple-e2e-reset.mjs`)

The reset script:
- ✅ Kills any running Node.js processes that might lock the database
- ✅ Removes the existing E2E database file
- ✅ Runs migrations to recreate a clean database
- ✅ Uses proper environment variables (`NODE_ENV=e2e`)
- ✅ Handles common issues like locked database files

### 2. Manual Server Startup

Instead of trying to automatically start the server (which caused infinite loops), we now:
- ✅ Start the server manually: `npm run dev`
- ✅ Use a simple Playwright config that expects the server to be running
- ✅ Avoid all the complex server startup and process isolation issues

### 3. Simplified Playwright Configuration (`playwright-simple.config.mjs`)

The simple config:
- ✅ No webServer configuration (no automatic server startup)
- ✅ Basic global setup that just checks if server is accessible
- ✅ Uses standard Playwright features without complex workarounds

## Usage Examples

### Daily Development Workflow

```bash
# Start your development session
npm run test:e2e:reset    # Clean slate
npm run dev               # Start server (keep running)

# Run tests as needed
npm run test:e2e          # Full test suite
npm run test:e2e:headed   # With browser visible
npm run test:e2e:debug    # Debug mode
```

### CI/CD Pipeline

```bash
# In your CI pipeline
npm run test:e2e:reset    # Reset database
npm run dev &             # Start server in background
sleep 5                   # Wait for server
npm run test:e2e          # Run tests
```

### Troubleshooting

If tests fail:

1. **Server not running?**
   ```bash
   npm run dev  # Start the server
   ```

2. **Database issues?**
   ```bash
   npm run test:e2e:reset  # Reset the database
   ```

3. **Processes stuck?**
   ```bash
   # The reset script automatically kills Node processes
   npm run test:e2e:reset
   ```

## Configuration Files

- `scripts/simple-e2e-reset.mjs` - Database reset script
- `playwright-simple.config.mjs` - Simple Playwright config
- `tests/e2e/global-setup-simple.mjs` - Minimal global setup
- `package.json` - Updated npm scripts

## Benefits of This Approach

1. **Reliability**: No more infinite loops or server startup issues
2. **Simplicity**: Easy to understand and debug
3. **Flexibility**: Can easily start/stop server as needed
4. **Speed**: No complex startup orchestration
5. **Debugging**: Can easily inspect running server state

## Migration from Complex Setup

If you were using the complex server startup approach:

1. Switch to simple config:
   ```bash
   # Use the simple config
   npx playwright test --config=playwright-simple.config.mjs
   ```

2. Update your workflow:
   - Always reset database before testing
   - Start server manually
   - Run tests against running server

This approach prioritizes reliability and simplicity over automation, which has proven to be much more effective for this codebase.
