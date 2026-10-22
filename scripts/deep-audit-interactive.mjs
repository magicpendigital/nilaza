import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const artifactDir = 'C:/Users/Admin/.gemini/antigravity/brain/2823fcb5-3820-4d50-b8c9-863fbf0b5a66';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function clickText(page, text) {
  return await page.evaluate((target) => {
    const el = Array.from(document.querySelectorAll('*')).find(e => {
      const t = e.innerText ? e.innerText.trim() : '';
      return t === target || t.toLowerCase() === target.toLowerCase();
    });
    if (el) {
      el.click();
      return true;
    }
    return false;
  }, text);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: { width: 390, height: 844 },
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await sleep(1500);

  // 1. Sign In
  console.log('1. Signing in...');
  await clickText(page, 'TÔI ĐÃ TỪNG Ở ĐÂY');
  await sleep(800);
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type('magicpendigital@gmail.com');
    await inputs[1].click({ clickCount: 3 });
    await inputs[1].type('Password123!');
    await clickText(page, 'Tiếp tục');
    await sleep(3000);
  }

  // Skip onboarding if present
  let bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes('Bỏ qua lúc này')) {
    console.log('Skipping onboarding...');
    await clickText(page, 'Bỏ qua lúc này');
    await sleep(1500);
  }

  // 2. Test Tarot Flow from Home: Click "Rút nhanh"
  console.log('2. Opening Tarot (Rút nhanh)...');
  await clickText(page, 'Rút nhanh');
  await sleep(2000);
  await page.screenshot({ path: path.join(artifactDir, 'feature_tarot_01_deck.png') });
  console.log('Captured feature_tarot_01_deck.png');

  // Draw card / interact
  const drawAction = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('*')).find(e => {
      const t = e.innerText ? e.innerText.trim() : '';
      return t.includes('Rút bài') || t.includes('Chọn lá') || t.includes('Xáo') || t.includes('Bốc bài') || t.includes('Lật bài');
    });
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log('Draw action clicked:', drawAction);
  await sleep(2500);
  await page.screenshot({ path: path.join(artifactDir, 'feature_tarot_02_result.png') });
  console.log('Captured feature_tarot_02_result.png');

  // Go back to Home or click Explore
  console.log('3. Navigating to Explore Tab and scrolling...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('*')).filter(e => e.innerText && e.innerText.trim() === 'Khám phá' && e.getBoundingClientRect().top > 700);
    if (tabs.length > 0) tabs[0].click();
  });
  await sleep(1500);

  // Scroll Explore down
  await page.evaluate(() => {
    const scroller = Array.from(document.querySelectorAll('div')).find(d => d.scrollHeight > d.clientHeight && d.clientHeight > 400);
    if (scroller) scroller.scrollTop = scroller.scrollHeight / 2;
  });
  await sleep(800);
  await page.screenshot({ path: path.join(artifactDir, 'feature_explore_scroll.png') });
  console.log('Captured feature_explore_scroll.png');

  // 4. Test Chat Room: Click Trò chuyện tab
  console.log('4. Navigating to Chat Tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('*')).filter(e => e.innerText && e.innerText.trim() === 'Trò chuyện' && e.getBoundingClientRect().top > 700);
    if (tabs.length > 0) tabs[0].click();
  });
  await sleep(1500);

  // Click on a guide card
  const clickedGuide = await page.evaluate(() => {
    const guide = Array.from(document.querySelectorAll('*')).find(e => {
      const t = e.innerText ? e.innerText.trim() : '';
      return t.includes('Hypatia') || t.includes('Laozi') || t.includes('Marcus') || t.includes('Oracle') || t.includes('Nilaza Oracle');
    });
    if (guide) {
      guide.click();
      return true;
    }
    return false;
  });
  console.log('Clicked guide:', clickedGuide);
  await sleep(2000);
  await page.screenshot({ path: path.join(artifactDir, 'feature_chat_01_room.png') });
  console.log('Captured feature_chat_01_room.png');

  // 5. Test Profile settings scroll
  console.log('5. Navigating to Profile Tab and scrolling to bottom...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('*')).filter(e => e.innerText && e.innerText.trim() === 'Hồ sơ' && e.getBoundingClientRect().top > 700);
    if (tabs.length > 0) tabs[0].click();
  });
  await sleep(1500);

  await page.evaluate(() => {
    const scroller = Array.from(document.querySelectorAll('div')).find(d => d.scrollHeight > d.clientHeight && d.clientHeight > 400);
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });
  await sleep(1000);
  await page.screenshot({ path: path.join(artifactDir, 'feature_profile_bottom.png') });
  console.log('Captured feature_profile_bottom.png');

  await browser.close();
  console.log('Done deep interactive audit!');
}

run().catch(console.error);
