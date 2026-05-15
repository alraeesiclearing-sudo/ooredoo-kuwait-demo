import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set up request/response logging
  page.on('request', request => {
    if (request.url().includes('api') || request.url().includes('guest')) {
      console.log('📤 REQUEST:', request.method(), request.url());
    }
  });

  page.on('response', response => {
    if (response.url().includes('api') || response.url().includes('guest')) {
      console.log('📥 RESPONSE:', response.status(), response.url());
    }
  });

  console.log('🌐 Navigating to Ooredoo...');
  await page.goto('https://www.ooredoo.com.kw/myooredoo/#/guestpay', {
    waitUntil: 'domcontentloaded',
    timeout: 12000,
  });

  console.log('🔍 Waiting for phone input...');
  await page.waitForSelector('input[placeholder="Mobile Number"]', { timeout: 8000 });

  console.log('✍️ Entering phone number...');
  await page.fill('input[placeholder="Mobile Number"]', '68880413');

  console.log('⏳ Waiting for data to load...');
  await page.waitForTimeout(4000);

  const amount = await page.inputValue('input[placeholder="0.000"]');
  console.log('💰 Amount found:', amount);

  await browser.close();
}

test().catch(console.error);
