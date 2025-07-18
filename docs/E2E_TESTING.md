# Playwright E2E Testing Guide

## Overview

This project uses Playwright for end-to-end testing alongside Jest for unit testing. Playwright provides cross-browser testing capabilities with Chrome, Firefox, Safari, and mobile browsers.

## Quick Start

### 1. Install Playwright Browsers
```bash
npm run playwright:install
```

### 2. Run E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run with visible browser (headed mode)
npm run test:e2e:headed

# Run with interactive UI
npm run test:e2e:ui

# Debug tests step by step
npm run test:e2e:debug

# Run both unit and E2E tests
npm run test:all
```

## Test Structure

```
tests/
├── e2e/                          # Playwright E2E tests
│   ├── fixtures/                 # Test data and fixtures
│   ├── pages/                    # Page Object Model classes
│   │   ├── BasePage.js           # Base page with common functionality
│   │   ├── HomePage.js           # Homepage interactions
│   │   └── LoginPage.js          # Authentication interactions
│   ├── utils/                    # Test utilities and helpers
│   │   └── TestUtils.js          # Common utility functions
│   ├── global-setup.js           # Global test setup
│   ├── global-teardown.js        # Global test cleanup
│   ├── homepage.spec.js          # Homepage functionality tests
│   ├── authentication.spec.js    # Login/logout tests
│   └── carnival-management.spec.js # Carnival CRUD tests
├── setup.mjs                     # Jest unit test setup
└── *.test.mjs                    # Jest unit tests
```

## Test Types

### Unit Tests (Jest)
- Test individual functions and methods
- Mock external dependencies
- Fast execution
- High code coverage

### E2E Tests (Playwright)
- Test complete user workflows
- Real browser interactions
- Cross-browser compatibility
- Integration testing

## Page Object Model

E2E tests use the Page Object Model pattern for maintainability:

```javascript
// Example usage
import { HomePage } from '/pages/HomePage.js';

test('should subscribe to newsletter', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.visit();
  await homePage.subscribeToNewsletter('test@example.com');
  await homePage.verifySubscriptionSuccess();
});
```

## Test Data Management

- Global setup creates consistent test data
- Each test uses isolated data when possible
- Cleanup happens automatically after tests
- Use `TestUtils.generateTestEmail()` for unique emails

## Configuration

Playwright configuration is in `playwright.config.js`:

- **Browsers**: Chrome, Firefox, Safari, Mobile
- **Base URL**: http://localhost:3050 (configurable)
- **Test Database**: Uses separate test database
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Reports**: HTML and JSON formats

## Best Practices

### 1. Use Page Objects
```javascript
// Good
const homePage = new HomePage(page);
await homePage.goToCarnivals();

// Avoid
await page.click('a[href="/carnivals"]');
```

### 2. Wait for Elements
```javascript
// Good
await TestUtils.waitForInteractable(page, 'button[type="submit"]');

// Avoid
await page.click('button[type="submit"]'); // Might fail if not ready
```

### 3. Use Descriptive Selectors
```javascript
// Good
await page.click('button[data-testid="submit-carnival"]');

// Acceptable
await page.click('button[type="submit"]');

// Avoid
await page.click('button.btn.btn-primary');
```

### 4. Handle Asynchronous Operations
```javascript
// Wait for API calls
await TestUtils.waitForAPI(page, '/api/carnivals');

// Wait for navigation
await page.waitForLoadState('networkidle');
```

## Debugging Tests

### Visual Debugging
```bash
# Run with browser visible
npm run test:e2e:headed

# Interactive UI mode
npm run test:e2e:ui

# Step-by-step debugging
npm run test:e2e:debug
```

### Screenshots and Videos
- Automatically captured on test failure
- Stored in `test-results/` directory
- Use `TestUtils.takeTimestampedScreenshot()` for custom screenshots

### Console Debugging
```javascript
// Add console logs
console.log('Current URL:', page.url());

// Take screenshot at specific point
await TestUtils.takeTimestampedScreenshot(page, 'debug-point');
```

## Running Specific Tests

```bash
# Run specific test file
npx playwright test homepage.spec.js

# Run tests matching pattern
npx playwright test --grep "should login"

# Run tests in specific browser
npx playwright test --project=chromium

# Run tests with specific tag
npx playwright test --grep @smoke
```

## CI/CD Integration

Playwright tests are configured for CI environments:

- Retry failed tests automatically
- Generate reports in multiple formats
- Capture artifacts on failure
- Headless execution by default

## Security Considerations

- Test database is isolated from production
- Sensitive data is not hardcoded
- Authentication uses test-specific credentials
- HTTPS errors are ignored in test environment

## Troubleshooting

### Common Issues

1. **Test fails with timeout**
   - Increase timeout in test or config
   - Check if server is running
   - Verify network connectivity

2. **Element not found**
   - Use more specific selectors
   - Add explicit waits
   - Check if element exists conditionally

3. **Browser not launching**
   - Run `npm run playwright:install`
   - Check system dependencies

### Getting Help

- Check test output and screenshots
- Use debugging mode for step-by-step execution
- Review Playwright documentation
- Check browser console for JavaScript errors