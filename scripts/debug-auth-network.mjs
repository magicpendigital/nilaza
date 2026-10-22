import puppeteer from 'puppeteer-core';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function testAuthNetwork() {
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('auth/v1')) {
      console.log('AUTH RESPONSE URL:', url, 'STATUS:', resp.status());
      try {
        const body = await resp.text();
        console.log('AUTH RESPONSE BODY:', body);
      } catch (e) {}
    }
  });

  page.on('request', req => {
    if (req.url().includes('auth/v1')) {
      console.log('AUTH REQUEST:', req.method(), req.url(), req.postData());
    }
  });

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // Click sign in
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => e.innerText && e.innerText.includes('TÔI ĐÃ TỪNG Ở ĐÂY'));
    if (el) el.click();
  });
  
  await page.waitForSelector('input[type="password"]', { timeout: 5000 });
  const inputs = await page.$$('input');
  console.log('Found inputs count:', inputs.length);
  await inputs[0].click();
  await inputs[0].type('magicpendigital@gmail.com');
  await inputs[1].click();
  await inputs[1].type('Password123!');

  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => e.innerText && e.innerText.trim() === 'Tiếp tục');
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 4000));

  await browser.close();
}

testAuthNetwork().catch(console.error);
