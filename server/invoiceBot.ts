/**
 * Invoice Bot API Endpoint
 * Handles invoice fetching from Ooredoo via web scraping
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface InvoiceBotResponse {
  success: boolean;
  phoneNumber: string;
  amount?: number;
  dueDate?: string;
  accountName?: string;
  status?: string;
  error?: string;
  errorMessage?: string;
}

const OOREDOO_URL = 'https://www.ooredoo.com.kw/myooredoo/#/guestpay';
const TIMEOUT = 30000;

/**
 * Validate Ooredoo phone number
 */
export function isValidOoredooNumber(phoneNumber: string): boolean {
  const ooredooPrefixes = ['50', '51', '55', '56', '60', '65', '66', '67', '69', '90', '94', '96', '97', '98', '99'];
  return phoneNumber.length === 8 && ooredooPrefixes.some((p) => phoneNumber.startsWith(p));
}

/**
 * Fetch invoice from Ooredoo using Puppeteer
 */
export async function fetchOoredooInvoice(phoneNumber: string): Promise<InvoiceBotResponse> {
  let browser: Browser | null = null;

  try {
    // Validate phone number
    if (!isValidOoredooNumber(phoneNumber)) {
      return {
        success: false,
        phoneNumber,
        error: 'Invalid phone number',
        errorMessage: 'Please enter a valid Ooredoo number.',
      };
    }

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Navigate to Ooredoo guest pay page
    console.log(`[Bot] Navigating to ${OOREDOO_URL}`);
    await page.goto(OOREDOO_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });

    // Wait for phone input
    console.log('[Bot] Waiting for phone input field...');
    try {
      await page.waitForSelector('input[type="tel"], input[name="phone"], input[placeholder*="phone"]', {
        timeout: TIMEOUT,
      });
    } catch (e) {
      throw new Error('Phone input field not found');
    }

    // Enter phone number
    console.log(`[Bot] Entering phone number: ${phoneNumber}`);
    await page.type('input[type="tel"], input[name="phone"], input[placeholder*="phone"]', phoneNumber, {
      delay: 100,
    });

    // Click search button
    console.log('[Bot] Clicking search button...');
    await page.click('button[type="submit"], button:contains("Search"), button:contains("Check")');

    // Wait for result
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract data from page
    console.log('[Bot] Extracting invoice data...');
    const result = await page.evaluate(() => {
      const pageContent = document.body.innerText;
      const htmlContent = document.body.innerHTML;

      // Look for amount (KWD or د.ك)
      const amountMatch = pageContent.match(/(\d+\.?\d*)\s*(KWD|د\.ك)/i);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

      // Look for error messages
      const errorPatterns = [
        /invalid.*number/i,
        /not.*found/i,
        /does.*not.*exist/i,
        /please.*enter.*valid/i,
        /رقم.*غير.*صحيح/,
        /لم.*يتم.*العثور/,
      ];

      const errorMessage = Array.from(document.querySelectorAll('div, span, p')).find((el) => {
        const text = el.textContent || '';
        return errorPatterns.some((pattern) => pattern.test(text));
      })?.textContent;

      // Look for account name
      const nameMatch = pageContent.match(/(?:Account|Customer|Name):\s*(.+?)(?:\n|$)/i);
      const accountName = nameMatch ? nameMatch[1].trim() : null;

      return {
        amount,
        errorMessage: errorMessage?.trim() || null,
        accountName,
        pageContent,
      };
    });

    await page.close();

    // Check for error
    if (result.errorMessage) {
      return {
        success: false,
        phoneNumber,
        error: 'Invalid phone number',
        errorMessage: result.errorMessage,
      };
    }

    // Check if amount was found
    if (result.amount) {
      return {
        success: true,
        phoneNumber,
        amount: result.amount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
        accountName: result.accountName || `Customer ${phoneNumber.slice(-4)}`,
        status: 'pending',
      };
    }

    // Default error
    return {
      success: false,
      phoneNumber,
      error: 'No invoice found',
      errorMessage: 'Please enter a valid Ooredoo number.',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Bot] Error:', errorMsg);

    return {
      success: false,
      phoneNumber,
      error: 'Bot error',
      errorMessage: 'Unable to fetch invoice. Please try again later.',
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Express route handler for invoice fetching
 */
export async function handleInvoiceRequest(req: any, res: any) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    const result = await fetchOoredooInvoice(phone);
    return res.json(result);
  } catch (error) {
    console.error('Invoice request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
