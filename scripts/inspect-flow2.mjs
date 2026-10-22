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
      if (el.children.length === 0 && el.innerText && el.innerText.trim().includes(searchText)) {
        el.click();
        return true;
      }
    }
    // Try parent if not clicked
    for (const el of elements) {
      if (el.innerText && el.innerText.trim().includes(searchText)) {
        const btn = el.closest('[role="button"], button') || el;
        btn.click();
        return true;
      }
    }
    return false;
  }, text);
}

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=390,844']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
  await sleep(2500);

  // 1. Click "TÔI ĐÃ TỪNG Ở ĐÂY" -> Sign in
  console.log('Clicking Sign in button...');
  await clickByText(page, 'TÔI ĐÃ TỪNG Ở ĐÂY');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactsDir, 'inspect_04_signin.png') });
  console.log('Captured inspect_04_signin.png');

  // 2. Click Forgot password
  console.log('Clicking Forgot password...');
  await clickByText(page, 'Quên mật khẩu');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactsDir, 'inspect_05_forgot_password.png') });
  console.log('Captured inspect_05_forgot_password.png');

  // 3. Go back to Sign In
  await clickByText(page, 'Quay lại đăng nhập');
  await sleep(600);

  // 4. Test Sign Up
  await clickByText(page, 'Chưa có tài khoản?');
  await sleep(800);
  await page.screenshot({ path: path.join(artifactsDir, 'inspect_06_signup.png') });
  console.log('Captured inspect_06_signup.png');

  await browser.close();
  console.log('Phase 2 flow inspection complete!');
}

run().catch(e => { console.error(e); process.exit(1); });
