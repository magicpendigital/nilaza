import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const artifactsDir = 'C:/Users/Admin/.gemini/antigravity/brain/2823fcb5-3820-4d50-b8c9-863fbf0b5a66';
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function clickByText(page, text) {
  return page.evaluate((searchText) => {
    const elements = Array.from(document.querySelectorAll('*'));
    for (const el of elements) {
      if (el.children.length === 0 && el.innerText && el.innerText.trim().toLowerCase() === searchText.toLowerCase()) {
        const btn = el.closest('[role="button"], button') || el;
        btn.click();
        return true;
      }
    }
    for (const el of elements) {
      if (el.innerText && el.innerText.trim().toLowerCase().includes(searchText.toLowerCase())) {
        const btn = el.closest('[role="button"], button') || el;
        btn.click();
        return true;
      }
    }
    return false;
  }, text);
}

async function run() {
  console.log('Launching browser for full app audit...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=390,844']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
  await sleep(2500);

  // Click Sign In
  console.log('Navigating to Sign In...');
  await clickByText(page, 'TÔI ĐÃ TỪNG Ở ĐÂY');
  await sleep(1000);

  // Type Email and Password with focus and clear
  console.log('Typing credentials...');
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await inputs[0].type('magicpendigital@gmail.com', { delay: 15 });

    await sleep(200);
    await inputs[1].click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await inputs[1].type('Password123!', { delay: 15 });
  }

  await sleep(400);
  console.log('Submitting login...');
  await clickByText(page, 'Tiếp tục');
  await sleep(4000);

  // Capture Home
  await page.screenshot({ path: path.join(artifactsDir, 'inspect_07_home.png') });
  console.log('Captured inspect_07_home.png');

  // Navigate Tabs: Explore, Chat, Tarot, Journal, Profile
  const tabNames = [
    { name: 'Khám phá', label: 'Explore', file: 'inspect_08_explore.png' },
    { name: 'Trò chuyện', label: 'Chat', file: 'inspect_09_chat.png' },
    { name: 'Tarot', label: 'Tarot', file: 'inspect_10_tarot.png' },
    { name: 'Nhật ký', label: 'Journal', file: 'inspect_11_journal.png' },
    { name: 'Hồ sơ', label: 'Profile', file: 'inspect_12_profile.png' }
  ];

  for (const tab of tabNames) {
    console.log(`Navigating to tab ${tab.label} (${tab.name})...`);
    const clicked = await clickByText(page, tab.name);
    if (!clicked) await clickByText(page, tab.label);
    await sleep(1200);
    await page.screenshot({ path: path.join(artifactsDir, tab.file) });
    console.log(`Captured ${tab.file}`);
  }

  // Click into Owner hub if present on profile
  const ownerClicked = await clickByText(page, 'Trung tâm quản trị') || await clickByText(page, 'Owner Hub') || await clickByText(page, 'Quản trị');
  if (ownerClicked) {
    await sleep(1500);
    await page.screenshot({ path: path.join(artifactsDir, 'inspect_13_owner_hub.png') });
    console.log('Captured inspect_13_owner_hub.png');
  }

  await browser.close();
  console.log('Full app audit completed successfully!');
}

run().catch(e => { console.error('Audit failed:', e); process.exit(1); });
