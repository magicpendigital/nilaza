import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const artifactDir = 'C:/Users/Admin/.gemini/antigravity/brain/2823fcb5-3820-4d50-b8c9-863fbf0b5a66';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function clickText(page, text) {
  const clicked = await page.evaluate((target) => {
    const candidates = Array.from(document.querySelectorAll('*')).filter(e => {
      const t = e.innerText ? e.innerText.trim() : '';
      return t === target || t.toLowerCase() === target.toLowerCase();
    });
    if (candidates.length === 0) return null;
    // Sort by smallest area
    candidates.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return (ra.width * ra.height) - (rb.width * rb.height);
    });
    const rect = candidates[0].getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, text);

  if (clicked) {
    await page.mouse.click(clicked.x, clicked.y);
    return true;
  }
  return false;
}

async function captureTabs() {
  console.log('Connecting to Edge browser...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: { width: 390, height: 844 },
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await sleep(2500);

  // Check where we are:
  let pageText = await page.evaluate(() => document.body.innerText);

  // If on welcome, click sign in
  if (pageText.includes('TÔI ĐÃ TỪNG Ở ĐÂY')) {
    console.log('On Welcome screen, clicking Sign In...');
    await clickText(page, 'TÔI ĐÃ TỪNG Ở ĐÂY');
    await sleep(1000);
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type('magicpendigital@gmail.com');
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type('Password123!');
      await clickText(page, 'Tiếp tục');
      await sleep(3500);
    }
  }

  // Check if on onboarding
  pageText = await page.evaluate(() => document.body.innerText);
  if (pageText.includes('Bỏ qua lúc này') || pageText.includes('Hôm nay bạn đang tìm điều gì?')) {
    console.log('On Onboarding screen, skipping...');
    await clickText(page, 'Bỏ qua lúc này');
    await sleep(2000);
  }

  // Now we should be on the main Home screen!
  console.log('1. Capturing Home tab (Full Scroll)...');
  await page.screenshot({ path: path.join(artifactDir, 'screen_01_home_top.png') });
  
  // Scroll down Home tab to inspect lower widgets
  await page.evaluate(() => window.scrollBy(0, 500));
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'screen_01_home_scroll1.png') });

  await page.evaluate(() => window.scrollBy(0, 600));
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'screen_01_home_scroll2.png') });

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);

  // Function to click bottom tab bar items
  async function tapBottomTab(tabLabel, filenamePrefix) {
    console.log(`Tapping tab: ${tabLabel}`);
    const res = await page.evaluate((label) => {
      // Find elements near bottom of viewport (y > 750)
      const tabs = Array.from(document.querySelectorAll('*')).filter(el => {
        const t = el.innerText ? el.innerText.trim() : '';
        const rect = el.getBoundingClientRect();
        return t === label && rect.top > 700;
      });
      if (tabs.length > 0) {
        const rect = tabs[0].getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }
      return null;
    }, tabLabel);

    if (res) {
      await page.mouse.click(res.x, res.y);
      await sleep(1500);
      await page.screenshot({ path: path.join(artifactDir, `${filenamePrefix}_top.png`) });
      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 500));
      await sleep(800);
      await page.screenshot({ path: path.join(artifactDir, `${filenamePrefix}_scroll.png`) });
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(400);
      console.log(`Successfully captured ${filenamePrefix}`);
    } else {
      console.log(`Could not find bottom tab ${tabLabel}`);
    }
  }

  // 2. Explore Tab
  await tapBottomTab('Khám phá', 'screen_02_explore');

  // 3. Chat Tab
  await tapBottomTab('Trò chuyện', 'screen_03_chat');

  // 4. Tarot Tab
  await tapBottomTab('Tarot', 'screen_04_tarot');

  // 5. Journal Tab
  await tapBottomTab('Nhật ký', 'screen_05_journal');

  // 6. Profile Tab
  await tapBottomTab('Hồ sơ', 'screen_06_profile');

  // 7. Desktop Responsive View (1280x800)
  console.log('7. Capturing Desktop layout (1280x800)...');
  await page.setViewport({ width: 1280, height: 800 });
  await sleep(1500);
  await page.screenshot({ path: path.join(artifactDir, 'screen_07_desktop_profile.png') });

  // Switch back to Home on desktop
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('*')).filter(el => el.innerText && el.innerText.trim() === 'Trang chủ');
    if (tabs.length > 0) tabs[0].click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(artifactDir, 'screen_08_desktop_home.png') });

  console.log('All tabs captured!');
  await browser.close();
}

captureTabs().catch(console.error);
