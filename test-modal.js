const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000/login');
  
  // Login with default credentials
  console.log('Logging in...');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'changeme');
  await page.click('button[type="submit"]');
  
  // Wait for redirect after login
  await page.waitForTimeout(1000);
  
  console.log('Navigating to firearms list...');
  await page.goto('http://localhost:3000/firearms');
  await page.waitForTimeout(500);
  
  // Check if there are any firearms
  const hasFirearms = await page.locator('a[href^="/firearms/"][href$="/details"]').count();
  console.log(`Found ${hasFirearms} firearms`);
  
  if (hasFirearms === 0) {
    console.log('No firearms found. Creating a test firearm...');
    await page.goto('http://localhost:3000/firearms/new');
    await page.fill('input[name="make"]', 'Test Maker');
    await page.fill('input[name="model"]', 'Test Model');
    await page.fill('input[name="serial"]', 'TEST123');
    await page.selectOption('select[name="firearm_type"]', 'Pistol');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
  }
  
  // Go to first firearm details
  console.log('Going to firearm details page...');
  await page.goto('http://localhost:3000/firearms');
  const firstFirearmLink = page.locator('a[href^="/firearms/"][href$="/details"]').first();
  await firstFirearmLink.click();
  await page.waitForTimeout(500);
  
  console.log('Taking screenshot before opening modal...');
  await page.screenshot({ path: '/tmp/before-modal.png', fullPage: true });
  
  // Check if modal is visible initially (it should NOT be)
  const modalBeforeClick = await page.locator('#delete-modal');
  const isVisibleBefore = await modalBeforeClick.isVisible();
  console.log(`Modal visible before click: ${isVisibleBefore}`);
  
  // Get modal position and display before clicking
  const modalStylesBefore = await modalBeforeClick.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      display: styles.display,
      position: styles.position,
      top: styles.top,
      left: styles.left,
      zIndex: styles.zIndex
    };
  });
  console.log('Modal styles before click:', modalStylesBefore);
  
  // Click the delete button
  console.log('Clicking Delete button...');
  await page.click('button:has-text("Delete")');
  await page.waitForTimeout(500);
  
  console.log('Taking screenshot after opening modal...');
  await page.screenshot({ path: '/tmp/after-modal-open.png', fullPage: true });
  
  // Check modal visibility after clicking
  const isVisibleAfter = await modalBeforeClick.isVisible();
  console.log(`Modal visible after click: ${isVisibleAfter}`);
  
  // Get modal position and display after clicking
  const modalStylesAfter = await modalBeforeClick.evaluate(el => {
    const styles = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      display: styles.display,
      position: styles.position,
      top: styles.top,
      left: styles.left,
      zIndex: styles.zIndex,
      hasModalActive: el.classList.contains('modal-active'),
      boundingRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    };
  });
  console.log('Modal styles after click:', modalStylesAfter);
  
  // Check if modal dialog is centered
  const dialogElement = await page.locator('.modal-dialog');
  const dialogRect = await dialogElement.boundingBox();
  console.log('Dialog position:', dialogRect);
  
  const viewportSize = page.viewportSize();
  const isCentered = dialogRect && 
    Math.abs(dialogRect.x + dialogRect.width / 2 - viewportSize.width / 2) < 50 &&
    Math.abs(dialogRect.y + dialogRect.height / 2 - viewportSize.height / 2) < 100;
  
  console.log(`Dialog appears centered: ${isCentered}`);
  
  // Test closing the modal
  console.log('Clicking Cancel button...');
  await page.click('button:has-text("Cancel")');
  await page.waitForTimeout(500);
  
  const isVisibleAfterClose = await modalBeforeClick.isVisible();
  console.log(`Modal visible after closing: ${isVisibleAfterClose}`);
  
  console.log('Taking screenshot after closing modal...');
  await page.screenshot({ path: '/tmp/after-modal-close.png', fullPage: true });
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`✓ Modal hidden initially: ${!isVisibleBefore}`);
  console.log(`✓ Modal shows when Delete clicked: ${isVisibleAfter}`);
  console.log(`✓ Modal has correct position (fixed): ${modalStylesAfter.position === 'fixed'}`);
  console.log(`✓ Modal has modal-active class: ${modalStylesAfter.hasModalActive}`);
  console.log(`✓ Modal dialog is centered: ${isCentered}`);
  console.log(`✓ Modal closes on Cancel: ${!isVisibleAfterClose}`);
  
  const allPassed = !isVisibleBefore && isVisibleAfter && 
    modalStylesAfter.position === 'fixed' && 
    modalStylesAfter.hasModalActive && 
    isCentered && 
    !isVisibleAfterClose;
  
  console.log(`\n${allPassed ? '✅ ALL CHECKS PASSED - Modal is working correctly!' : '❌ SOME CHECKS FAILED - Modal has issues'}`);
  
  await browser.close();
  process.exit(allPassed ? 0 : 1);
})();
