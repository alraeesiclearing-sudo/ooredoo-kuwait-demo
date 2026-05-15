/**
 * Ooredoo Invoice Fetcher - Puppeteer Implementation
 * Optimized for Railway deployment with browser pooling
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

// Global browser instance for reuse
let browserInstance: Browser | null = null;

/**
 * Get or create browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  console.log('🚀 Launching browser...');

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-web-resources',
    '--disable-default-apps',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-service-autorun',
    '--disable-blink-features=AutomationControlled',
  ];

  try {
    browserInstance = await puppeteer.launch({
      args,
      headless: true,
      timeout: 30000,
    });

    console.log('✅ Browser launched');
    return browserInstance;
  } catch (error) {
    console.error('❌ Failed to launch browser:', error);
    throw error;
  }
}

/**
 * Validate Ooredoo phone number
 */
function isValidOoredooNumber(phone: string): boolean {
  const prefixes = ['50', '51', '55', '56', '68', '69', '97', '98'];
  const cleanPhone = phone.replace(/\D/g, '');
  return prefixes.some(prefix => cleanPhone.startsWith(prefix)) && cleanPhone.length === 8;
}

/**
 * Fetch invoice from Ooredoo using Puppeteer
 */
export async function fetchInvoiceFromOoredoo(phoneNumber: string): Promise<InvoiceData> {
  let page: Page | null = null;

  try {
    console.log(`📱 Fetching invoice for: ${phoneNumber}`);

    // Validate phone number
    if (!isValidOoredooNumber(phoneNumber)) {
      return {
        success: false,
        error: `Invalid Ooredoo phone number: ${phoneNumber}`,
      };
    }

    // Get browser instance
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log('🌐 Navigating to Ooredoo portal...');

    // Navigate to Ooredoo guest pay portal
    await page.goto('https://www.ooredoo.com.kw/myooredoo/#/guestpay', {
      waitUntil: 'networkidle2',
      timeout: 25000,
    });

    console.log('✅ Page loaded');

    // Wait for input field
    const inputSelector = 'input[placeholder="Mobile Number"]';
    await page.waitForSelector(inputSelector, { timeout: 10000 });

    // Enter phone number
    await page.type(inputSelector, phoneNumber);
    console.log('📝 Phone number entered');

    // Wait for amount field to be populated
    await page.waitForFunction(
      () => {
        const amountInput = document.querySelector('input[placeholder="0.000"]') as HTMLInputElement;
        if (amountInput) {
          const value = amountInput.value;
          return value && value !== '0.000' && value !== '0';
        }
        return false;
      },
      { timeout: 20000 }
    );

    console.log('✅ Data loaded');

    // Extract invoice data
    const data = await page.evaluate(() => {
      // Get amount from input field
      const amountInput = document.querySelector('input[placeholder="0.000"]') as HTMLInputElement;
      const amount = amountInput ? parseFloat(amountInput.value) : null;

      // Get account type from visible text
      const bodyText = document.body.innerText;
      const type = bodyText.includes('POSTPAID')
        ? 'postpaid'
        : bodyText.includes('PREPAID')
        ? 'prepaid'
        : null;

      // Get account name if available
      const nameMatch = bodyText.match(/Account Name[:\s]+([^\n]+)/i);
      const accountName = nameMatch ? nameMatch[1].trim() : null;

      return {
        amount,
        type,
        accountName,
        success: amount !== null && amount > 0,
      };
    });

    // Close page but keep browser alive for reuse
    if (page) {
      await page.close();
    }

    if (data.success) {
      console.log('✅ Invoice fetched successfully');
      return {
        success: true,
        amount: data.amount,
        type: data.type as 'postpaid' | 'prepaid',
        phoneNumber,
        accountName: data.accountName,
        message: `Invoice for ${phoneNumber}: ${data.amount} KD`,
      };
    } else {
      console.error('❌ Failed to extract invoice data');
      return {
        success: false,
        error: 'Failed to extract invoice data from page',
      };
    }
  } catch (error) {
    console.error('❌ Error fetching invoice:', error);

    // Close page on error
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('Error closing page:', e);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Close browser on shutdown
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    try {
      await browserInstance.close();
      browserInstance = null;
      console.log('✅ Browser closed');
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}
