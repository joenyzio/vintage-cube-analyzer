import { chromium } from 'playwright';

async function captureMenu() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2
  });

  await page.goto('http://localhost:5556');
  console.log('Page loaded');

  await page.waitForTimeout(2000);

  // Click on Draft Simulator in the sidebar to go to its menu page
  try {
    await page.click('text=Draft Simulator', { timeout: 5000 });
    console.log('Clicked Draft Simulator in sidebar');
    await page.waitForTimeout(1500);
  } catch (e) {
    console.log('Draft Simulator might already be selected');
  }

  // Take screenshot of the menu/overview page (before clicking Start Draft)
  await page.screenshot({ path: '/tmp/draft-menu-screenshot.png', fullPage: false });
  console.log('Menu screenshot saved to /tmp/draft-menu-screenshot.png');

  await browser.close();
}

captureMenu().catch(console.error);
