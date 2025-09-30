import puppeteer from 'playwright';

console.log('Starting comprehensive club-manage.js integration test...');

const browser = await puppeteer.chromium.launch({ 
    headless: false, // Show browser for debugging
    devtools: true   // Open devtools
});

const page = await browser.newPage();

// Enable console logging from the page
page.on('console', msg => {
    console.log(`[BROWSER]: ${msg.type()}: ${msg.text()}`);
});

// Enable network request/response logging
page.on('request', request => {
    if (request.url().includes('/manage')) {
        console.log(`[REQUEST]: ${request.method()} ${request.url()}`);
        if (request.postData()) {
            console.log('[POST DATA]:', request.postData().substring(0, 200) + '...');
        }
    }
});

page.on('response', response => {
    if (response.url().includes('/manage')) {
        console.log(`[RESPONSE]: ${response.status()} ${response.url()}`);
    }
});

try {
    console.log('1. Navigating to club management page...');
    await page.goto('http://localhost:3050/clubs/manage', { 
        waitUntil: 'networkidle' 
    });
    
    console.log('2. Checking if page loaded correctly...');
    const title = await page.title();
    console.log('Page title:', title);
    
    console.log('3. Checking for club-manage.js manager...');
    const managerExists = await page.evaluate(() => {
        return typeof window.clubManageManager !== 'undefined';
    });
    console.log('clubManageManager exists:', managerExists);
    
    console.log('4. Checking for logo-uploader integration...');
    const logoUploaderExists = await page.evaluate(() => {
        // Check if logo uploader is initialized
        const logoContainer = document.querySelector('.logo-uploader-container, [data-uploader-target="logo"]');
        return logoContainer !== null;
    });
    console.log('Logo uploader container exists:', logoUploaderExists);
    
    console.log('5. Testing form elements...');
    const formInfo = await page.evaluate(() => {
        const form = document.getElementById('club-profile-form');
        if (!form) return { found: false };
        
        const submitBtn = document.getElementById('save-club-profile-btn');
        const logoInput = document.querySelector('input[name="logo"]');
        
        return {
            found: true,
            action: form.action,
            method: form.method,
            hasSubmitButton: !!submitBtn,
            hasLogoInput: !!logoInput,
            logoInputType: logoInput ? logoInput.type : null
        };
    });
    console.log('Form info:', formInfo);
    
    console.log('6. Testing logoFileSelected event system...');
    const eventTestResult = await page.evaluate(() => {
        let eventReceived = false;
        let eventDetail = null;
        
        // Listen for the event
        document.addEventListener('logoFileSelected', (e) => {
            eventReceived = true;
            eventDetail = e.detail;
        });
        
        // Simulate the event that logo-uploader.js would dispatch
        const testFile = new File(['test'], 'test-logo.png', { type: 'image/png' });
        const event = new CustomEvent('logoFileSelected', {
            detail: { file: testFile, inputName: 'logo' }
        });
        
        document.dispatchEvent(event);
        
        // Check if club-manage.js received it
        return {
            eventReceived,
            hasDetail: !!eventDetail,
            fileName: eventDetail ? eventDetail.file?.name : null,
            inputName: eventDetail ? eventDetail.inputName : null,
            managerStagedFile: window.clubManageManager?.stagedFile?.name || null
        };
    });
    console.log('Event test result:', eventTestResult);
    
    console.log('7. Testing FormData construction...');
    const formDataTest = await page.evaluate(() => {
        const form = document.getElementById('club-profile-form');
        if (!form) return { error: 'Form not found' };
        
        // Create test FormData like club-manage.js does
        const formData = new FormData(form);
        const testFile = new File(['test'], 'test-logo.png', { type: 'image/png' });
        formData.append('logo', testFile);
        
        // Check FormData contents
        const entries = Array.from(formData.entries());
        return {
            entryCount: entries.length,
            hasLogo: formData.has('logo'),
            logoEntry: formData.get('logo')?.name || 'No logo file',
            allKeys: entries.map(([key]) => key)
        };
    });
    console.log('FormData test result:', formDataTest);
    
    // Wait a bit for debugging
    console.log('8. Test complete. Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
} catch (error) {
    console.error('Test failed:', error);
} finally {
    await browser.close();
    console.log('Test complete.');
}
