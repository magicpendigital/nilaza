import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const artifactDir = 'C:/Users/Admin/.gemini/antigravity/brain/2823fcb5-3820-4d50-b8c9-863fbf0b5a66';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function clickByText(page, text) {
  const box = await page.evaluate((target) => {
    const elements = Array.from(document.querySelectorAll('*'));
    // Find matching elements
    const matched = elements.filter(e => {
      const t = e.innerText ? e.innerText.trim() : '';
      return t === target || t.includes(target);
    });
    // Pick the most specific one (smallest area)
    if (matched.length === 0) return null;
    matched.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return (ra.width * ra.height) - (rb.width * rb.height);
    });
    const rect = matched[0].getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width, height: rect.height };
  }, text);

  if (box && box.width > 0 && box.height > 0) {
    await page.mouse.click(box.x, box.y);
    return true;
  }
  return false;
}

async function runAudit() {
  console.log('Launching Edge browser...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: { width: 390, height: 844 },
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const logs = [];
  const networkEvents = [];

  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('auth/v1') || url.includes('54321')) {
      let body = '';
      try { body = await resp.text(); } catch (e) {}
      networkEvents.push({ url, status: resp.status(), body });
      console.log(`[NET] ${resp.status()} ${url}`);
    }
  });

  console.log('1. Loading Nilaza Web App...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  
  // Capture Splash if possible, or wait for splash to finish
  await sleep(1000);
  await page.screenshot({ path: path.join(artifactDir, 'audit_01_welcome.png') });
  console.log('Saved audit_01_welcome.png');

  // Verify env
  const env = await page.evaluate(() => typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_SUPABASE_URL : '');
  console.log('Connected Supabase URL in client:', env);

  // 2. Click "Tôi đã từng ở đây"
  console.log('2. Clicking Sign In...');
  await clickByText(page, 'TÔI ĐÃ TỪNG Ở ĐÂY');
  await sleep(1000);
  await page.screenshot({ path: path.join(artifactDir, 'audit_02_signin_screen.png') });
  console.log('Saved audit_02_signin_screen.png');

  // 3. Test Forgot Password
  console.log('3. Testing Forgot Password flow...');
  let inputs = await page.$$('input');
  if (inputs.length >= 1) {
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type('magicpendigital@gmail.com');
  }
  await clickByText(page, 'Quên mật khẩu?');
  await sleep(2000);
  await page.screenshot({ path: path.join(artifactDir, 'audit_03_forgot_password_result.png') });
  console.log('Saved audit_03_forgot_password_result.png');

  // Check Mailpit
  try {
    const mailpitResp = await fetch('http://127.0.0.1:54324/api/v1/messages');
    const mailpitData = await mailpitResp.json();
    console.log(`Mailpit messages count: ${mailpitData.total}`);
    if (mailpitData.messages && mailpitData.messages.length > 0) {
      console.log('Latest Mailpit subject:', mailpitData.messages[0].Subject, 'To:', mailpitData.messages[0].To);
    }
  } catch (e) {
    console.log('Mailpit check note:', e.message);
  }

  // 4. Fill password and Sign In
  console.log('4. Entering password and logging in...');
  inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[1].click({ clickCount: 3 });
    await inputs[1].type('Password123!');
  }
  await clickByText(page, 'Tiếp tục');
  await sleep(4000);
  await page.screenshot({ path: path.join(artifactDir, 'audit_04_after_login.png') });
  console.log('Saved audit_04_after_login.png');

  // Check current view: is it onboarding or home?
  const isBắtĐầu = await page.evaluate(() => document.body.innerText.includes('Bắt đầu'));
  console.log('In onboarding flow?', isBắtĐầu);

  if (isBắtĐầu) {
    // Click "Bỏ qua" / Skip if available
    const skipped = await clickByText(page, 'Bỏ qua');
    console.log('Skipped onboarding step 1:', skipped);
    await sleep(2000);
    await page.screenshot({ path: path.join(artifactDir, 'audit_05_onboarding_step.png') });
  }

  // Check if we reached Home tab
  await sleep(2000);
  await page.screenshot({ path: path.join(artifactDir, 'audit_05_home_tab.png') });
  console.log('Saved audit_05_home_tab.png');

  // Helper for clicking tab
  async function clickTab(name, filename) {
    console.log(`Clicking tab ${name}...`);
    const clicked = await page.evaluate((t) => {
      // Find element with text matching t located in bottom navigation area (y > 600)
      const matches = Array.from(document.querySelectorAll('*')).filter(el => {
        return el.innerText && el.innerText.trim() === t && el.getBoundingClientRect().top > 500;
      });
      if (matches.length > 0) {
        matches[0].click();
        return true;
      }
      return false;
    }, name);
    await sleep(2000);
    await page.screenshot({ path: path.join(artifactDir, filename) });
    console.log(`Saved ${filename} (clicked: ${clicked})`);
  }

  // 5. Explore Tab
  await clickTab('Khám phá', 'audit_06_explore_tab.png');

  // 6. Chat Tab
  await clickTab('Trò chuyện', 'audit_07_chat_tab.png');

  // 7. Tarot Tab
  await clickTab('Tarot', 'audit_08_tarot_tab.png');

  // 8. Journal Tab
  await clickTab('Nhật ký', 'audit_09_journal_tab.png');

  // 9. Profile Tab
  await clickTab('Hồ sơ', 'audit_10_profile_tab.png');

  // 10. Test Desktop View (1280x800)
  console.log('10. Testing Desktop responsive layout...');
  await page.setViewport({ width: 1280, height: 800 });
  await sleep(1500);
  await page.screenshot({ path: path.join(artifactDir, 'audit_11_desktop_layout.png') });
  console.log('Saved audit_11_desktop_layout.png');

  // Write comprehensive report json
  fs.writeFileSync(path.join(artifactDir, 'audit_run_summary.json'), JSON.stringify({
    supabaseEnv: env,
    networkEvents,
    warningsAndErrors: logs.filter(l => l.type === 'warn' || l.type === 'error'),
    completedAt: new Date().toISOString()
  }, null, 2));

  await browser.close();
  console.log('Audit completed successfully!');
}

runAudit().catch(err => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
