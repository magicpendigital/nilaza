import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const artifactsDir = 'C:/Users/Admin/.gemini/antigravity/brain/2823fcb5-3820-4d50-b8c9-863fbf0b5a66';
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function inspect() {
  console.log('Launching headless Edge via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=390,844'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  console.log('Navigating to http://localhost:8081...');
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 1. Capture splash animation (initial 500ms - 800ms)
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactsDir, 'inspect_01_splash.png') });
  console.log('Captured inspect_01_splash.png');

  // Wait for app load
  await new Promise(r => setTimeout(r, 2200));
  await page.screenshot({ path: path.join(artifactsDir, 'inspect_02_landing.png') });
  console.log('Captured inspect_02_landing.png');

  // Check DOM info
  const pageTitle = await page.title();
  console.log('Page Title:', pageTitle);

  // Evaluate current visible text & buttons
  const uiSummary = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4'))
      .map(el => el.innerText?.trim())
      .filter(t => t && t.length > 0 && t.length < 100);
    const buttons = Array.from(document.querySelectorAll('[role="button"], button, [aria-role="button"]'))
      .map(b => ({
        text: b.innerText?.trim(),
        ariaLabel: b.getAttribute('aria-label'),
        rect: {
          width: b.getBoundingClientRect().width,
          height: b.getBoundingClientRect().height,
          top: b.getBoundingClientRect().top,
          left: b.getBoundingClientRect().left
        }
      }));

    const hasHorizontalOverflow = document.documentElement.scrollWidth > window.innerWidth;

    return {
      uniqueTexts: Array.from(new Set(texts)).slice(0, 30),
      buttons,
      hasHorizontalOverflow,
      scrollWidth: document.documentElement.scrollWidth,
      windowWidth: window.innerWidth
    };
  });

  console.log('UI Summary texts count:', uiSummary.uniqueTexts.length);
  console.log('UI Buttons count:', uiSummary.buttons.length);
  console.log('Has horizontal overflow:', uiSummary.hasHorizontalOverflow);

  // 3. Test Desktop view (1280x800)
  console.log('Testing Desktop view (1280x800)...');
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(artifactsDir, 'inspect_03_desktop.png') });
  console.log('Captured inspect_03_desktop.png');

  // Save report raw data
  fs.writeFileSync(
    path.join(artifactsDir, 'inspect_raw.json'),
    JSON.stringify({ consoleLogs, pageErrors, uiSummary }, null, 2)
  );

  await browser.close();
  console.log('Inspection complete!');
}

inspect().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});
