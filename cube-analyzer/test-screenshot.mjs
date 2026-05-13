import { chromium } from 'playwright';

async function captureP1P1() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2 // Higher resolution
  });

  // Navigate to the app
  await page.goto('http://localhost:5556');
  console.log('Page loaded');

  // Wait for the page to fully load
  await page.waitForTimeout(2000);

  // Click on Draft Simulator in the sidebar
  try {
    await page.click('text=Draft Simulator', { timeout: 5000 });
    console.log('Clicked Draft Simulator in sidebar');
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log('Draft Simulator might already be selected');
  }

  // Click Start Draft button
  await page.waitForTimeout(1000);
  const startDraftBtn = page.locator('button', { hasText: 'Start Draft' }).first();
  if (await startDraftBtn.isVisible({ timeout: 3000 })) {
    await startDraftBtn.click();
    console.log('Clicked Start Draft button');
  }

  // Wait for draft to start
  await page.waitForTimeout(3000);

  // Take the P1P1 screenshot
  await page.screenshot({ path: '/tmp/p1p1-screenshot.png', fullPage: false });
  console.log('P1P1 Screenshot saved to /tmp/p1p1-screenshot.png');

  // Also take a screenshot of just the card grid area
  const cardGrid = page.locator('.grid').first();
  if (await cardGrid.isVisible()) {
    await cardGrid.screenshot({ path: '/tmp/cards-screenshot.png' });
    console.log('Cards screenshot saved');
  }

  await browser.close();
}

captureP1P1().catch(console.error);
