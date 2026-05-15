/**
 * Ooredoo Invoice Fetcher - Final Optimized Puppeteer Implementation
 * Lightweight browser automation with connection pooling and retry logic
 */

import puppeteer, { Browser, Page } from 'puppeteer';

interface InvoiceData {
  success: boolean;
  amount?: number;
  type?: 'postpaid' | 'prepaid';
  phoneNumber?: string;
  message?: string;
  accountName?: string;
  error?: string;
}

let browser: Browser | null = null;
let browserInitPromise: Promise<Browser | null> | null = null;

/**
 * Initialize browser once and reuse it
 */
async function getBrowser(): Promise<Browser | null> {
  // If already initializing, wait for it
  if (browserInitPromise) {
    return browserInitPromise;
  }

  // If already initialized, return it
  if (browser) {
    return browser;
  }

  // Start initialization
  browserInitPromise = (async () => {
    try {
      console.log('🚀 Launching Puppeteer browser...');
      
      // Try to find Chromium executable
      let executablePath: string | undefined;
      try {
        executablePath = await puppeteer.executablePath();
        console.log('📍 Using Chromium at:', executablePath);
      } catch (e) {
        console.log('⚠️  Puppeteer executable not found, will use default');
      }
      
      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-web-resources',
          '--disable-sync',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-preconnect',
          '--disable-blink-features=AutomationControlled',
        ],
      });
      console.log('✅ Puppeteer browser launched');
      return browser;
    } catch (error) {
      console.error('❌ Failed to launch browser:', error);
      browser = null;
      browserInitPromise = null;
      return null;
    }
  })();

  return browserInitPromise;
}

/**
 * Fetch invoice from Ooredoo using Puppeteer
 */
export async function fetchInvoiceFromOoredoo(phoneNumber: string): Promise<InvoiceData> {
  let page: Page | null = null;

  try {
    console.log(`📱 Fetching invoice for: ${phoneNumber}`);

    const b = await getBrowser();
    if (!b) {
      throw new Error('Browser not available');
    }

    // Create a new page
    page = await b.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to Ooredoo guest pay page
    console.log('🌐 Navigating to Ooredoo guest pay portal...');
    try {
      await page.goto('https://www.ooredoo.com.kw/myooredoo/#/guestpay', {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
    } catch (error) {
      console.warn('⚠️ Navigation warning, continuing anyway:', error instanceof Error ? error.message : String(error));
    }

    // Wait for phone input field with retry logic
    console.log('🔍 Waiting for phone input field...');
    let phoneInputFound = false;
    
    for (let i = 0; i < 3; i++) {
      try {
        await page.waitForSelector('input[placeholder="Mobile Number"]', {
          timeout: 5000,
        });
        phoneInputFound = true;
        console.log('✅ Phone input field found');
        break;
      } catch (error) {
        console.warn(`⚠️ Attempt ${i + 1} failed, retrying...`);
        if (i < 2) {
          try {
            await page.reload({ waitUntil: 'domcontentloaded' });
          } catch (e) {
            console.warn('Reload failed, continuing...');
          }
          await page.waitForTimeout(1000);
        }
      }
    }

    if (!phoneInputFound) {
      throw new Error('Phone input field not found after retries');
    }

    // Clear and enter phone number
    console.log('✍️ Entering phone number...');
    await page.evaluate(() => {
      const input = document.querySelector(
        'input[placeholder="Mobile Number"]'
      ) as HTMLInputElement;
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Type phone number slowly
    await page.type('input[placeholder="Mobile Number"]', phoneNumber, {
      delay: 30,
    });

    // Wait for amount field to be populated
    console.log('⏳ Waiting for invoice data to load...');
    
    let amountFound = false;
    let attempts = 0;
    const maxAttempts = 15; // 15 * 500ms = 7.5 seconds

    while (!amountFound && attempts < maxAttempts) {
      await page.waitForTimeout(500);

      const amount = await page.evaluate(() => {
        const input = document.querySelector(
          'input[placeholder="0.000"]'
        ) as HTMLInputElement;
        return input?.value || '0';
      });

      if (amount && amount !== '0.000' && amount !== '0') {
        console.log(`✅ Amount found: ${amount}`);
        amountFound = true;
        break;
      }

      attempts++;
    }

    // Extract data from page
    console.log('📊 Extracting invoice data...');
    const result = await page.evaluate(() => {
      const phoneInput = document.querySelector(
        'input[placeholder="Mobile Number"]'
      ) as HTMLInputElement;
      const amountInput = document.querySelector(
        'input[placeholder="0.000"]'
      ) as HTMLInputElement;

      const phone = phoneInput?.value || '';
      const amountStr = amountInput?.value || '0';
      const amount = parseFloat(amountStr) || 0;

      // Look for account type and other info
      const pageText = document.body.innerText;
      const isPostpaid = pageText.includes('POSTPAID') || amount > 0;
      const hasPostpaidText = pageText.includes('POSTPAID');
      const hasError = pageText.includes('not available') || pageText.includes('Amount is required');

      return {
        phone,
        amount,
        isPostpaid,
        hasPostpaidText,
        hasError,
      };
    });

    console.log('📋 Extracted data:', result);

    // Check if we got valid data
    if (result.amount > 0 && result.hasPostpaidText) {
      console.log(`✅ Found invoice amount: ${result.amount}`);
      return {
        success: true,
        amount: result.amount,
        type: 'postpaid',
        phoneNumber,
        message: 'تم الحصول على الفاتورة بنجاح',
        accountName: `Customer ${phoneNumber.slice(-4)}`,
      };
    }

    // Check if postpaid but no amount (no due bills)
    if (result.hasPostpaidText && result.amount === 0 && !result.hasError) {
      console.log('✅ Postpaid account with no due amount');
      return {
        success: true,
        amount: 0,
        type: 'postpaid',
        phoneNumber,
        message: 'لا توجد فواتير مستحقة',
        accountName: `Customer ${phoneNumber.slice(-4)}`,
      };
    }

    // Check for error
    if (result.hasError) {
      throw new Error('Number not available or invalid');
    }

    throw new Error('No invoice data found');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error fetching invoice:', errorMsg);

    return {
      success: false,
      error: errorMsg,
    };
  } finally {
    // Close page but keep browser alive
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('Error closing page:', e);
      }
    }
  }
}

/**
 * Close browser on shutdown
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    try {
      await browser.close();
      console.log('✅ Browser closed');
      browser = null;
    } catch (e) {
      console.error('Error closing browser:', e);
    }
  }
}

/**
 * Validate Ooredoo phone number
 */
export function isValidOoredooNumber(phoneNumber: string): boolean {
  const ooredooPrefixes = ['50', '51', '55', '56', '60', '65', '66', '67', '68', '69', '90', '94', '96', '97', '98', '99'];
  return phoneNumber.length === 8 && ooredooPrefixes.some((p) => phoneNumber.startsWith(p));
}
