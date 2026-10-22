import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const artifactDir = 'C:/Users/Admin/.gemini/antigravity/brain/2823fcb5-3820-4d50-b8c9-863fbf0b5a66';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function clickTarget(page, text) {
  const box = await page.evaluate((target) => {
    const el = Array.from(document.querySelectorAll('*')).find(e => {
      const t = e.innerText ? e.innerText.trim() : '';
      return t === target || t.includes(target);
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, width: r.width, height: r.height };
  }, text);

  if (box && box.width > 0) {
    await page.mouse.click(box.x, box.y);
    return true;
  }
  return false;
}

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: { width: 390, height: 844 },
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  await sleep(1500);

  // Sign in if needed
  let text = await page.evaluate(() => document.body.innerText);
  if (text.includes('TÔI ĐÃ TỪNG Ở ĐÂY')) {
    console.log('Signing in...');
    await clickTarget(page, 'TÔI ĐÃ TỪNG Ở ĐÂY');
    await sleep(800);
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type('magicpendigital@gmail.com');
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type('Password123!');
      await clickTarget(page, 'Tiếp tục');
      await sleep(3500);
    }
  }

  // Skip onboarding if needed
  text = await page.evaluate(() => document.body.innerText);
  if (text.includes('Bỏ qua lúc này')) {
    console.log('Skipping onboarding...');
    await clickTarget(page, 'Bỏ qua lúc này');
    await sleep(1500);
  }

  // 1. Click "Rút nhanh"
  console.log('1. Clicking "Rút nhanh"...');
  await clickTarget(page, 'Rút nhanh');
  await sleep(2000);
  await page.screenshot({ path: path.join(artifactDir, 'flow_tarot_01_intro.png') });
  console.log('Captured flow_tarot_01_intro.png');

  // Let's see what buttons exist on Tarot screen
  const tarotButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter(e => e.getAttribute('role') === 'button' || e.tagName === 'BUTTON' || (e.innerText && e.innerText.length < 30))
      .map(e => e.innerText ? e.innerText.trim() : '')
      .filter(Boolean);
  });
  console.log('Tarot screen buttons/texts:', tarotButtons.slice(0, 20));

  // Click next button in tarot flow: e.g. "Tiếp tục" or "Bắt đầu rút" or "Chọn bài"
  let clicked = await clickTarget(page, 'Bắt đầu');
  if (!clicked) clicked = await clickTarget(page, 'Tiếp tục');
  if (!clicked) clicked = await clickTarget(page, 'Rút bài');
  await sleep(2000);
  await page.screenshot({ path: path.join(artifactDir, 'flow_tarot_02_spread.png') });
  console.log('Captured flow_tarot_02_spread.png');

  // 2. Chat Persona Flow
  console.log('2. Navigating to Chat tab...');
  // Click bottom tab "Trò chuyện"
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('*')).filter(e => e.innerText && e.innerText.trim() === 'Trò chuyện' && e.getBoundingClientRect().top > 700);
    if (tabs.length > 0) tabs[0].click();
  });
  await sleep(1500);

  // Click on "MỞ AI COUNCIL"
  console.log('Opening AI Council...');
  await clickTarget(page, 'MỞ AI COUNCIL');
  await sleep(2000);
  await page.screenshot({ path: path.join(artifactDir, 'flow_chat_01_council.png') });
  console.log('Captured flow_chat_01_council.png');

  await browser.close();
  console.log('Tarot & Chat flow audit completed.');
}

run().catch(console.error);
