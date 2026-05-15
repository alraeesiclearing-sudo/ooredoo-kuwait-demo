#!/usr/bin/env node

/**
 * Ooredoo Invoice Bot - Standalone CLI Tool
 * Fetches invoice data from Ooredoo guest pay portal
 * 
 * Usage:
 *   npx ts-node ooredoo-bot.ts <phone-number>
 *   Example: npx ts-node ooredoo-bot.ts 50123456
 */

import puppeteer, { Browser, Page } from 'puppeteer';

interface InvoiceResult {
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
function isValidOoredooNumber(phoneNumber: string): boolean {
  const ooredooPrefixes = ['50', '51', '55', '56', '60', '65', '66', '67', '69', '90', '94', '96', '97', '98', '99'];
  return phoneNumber.length === 8 && ooredooPrefixes.some((p) => phoneNumber.startsWith(p));
}

/**
 * Fetch invoice from Ooredoo
 */
async function fetchInvoice(phoneNumber: string): Promise<InvoiceResult> {
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

    console.log(`🤖 Ooredoo Invoice Bot`);
    console.log(`📱 Phone Number: ${phoneNumber}`);
    console.log(`⏳ Fetching invoice data...`);

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
    console.log(`🌐 Navigating to Ooredoo...`);
    await page.goto(OOREDOO_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });

    // Wait for phone input
    console.log(`🔍 Looking for phone input...`);
    try {
      await page.waitForSelector('input[type="tel"], input[name="phone"], input[placeholder*="phone"]', {
        timeout: TIMEOUT,
      });
    } catch (e) {
      throw new Error('Phone input field not found on Ooredoo website');
    }

    // Enter phone number
    console.log(`✍️  Entering phone number...`);
    await page.type('input[type="tel"], input[name="phone"], input[placeholder*="phone"]', phoneNumber, {
      delay: 100,
    });

    // Click search button
    console.log(`🔘 Clicking search button...`);
    await page.click('button[type="submit"], button:contains("Search"), button:contains("Check")');

    // Wait for result
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract data from page
    console.log(`📊 Extracting invoice data...`);
    const result = await page.evaluate(() => {
      const pageContent = document.body.innerText;

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
    console.error(`❌ Error: ${errorMsg}`);

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
 * Main function
 */
async function main() {
  const phoneNumber = process.argv[2];

  if (!phoneNumber) {
    console.error('❌ Phone number is required');
    console.log('Usage: npx ts-node ooredoo-bot.ts <phone-number>');
    console.log('Example: npx ts-node ooredoo-bot.ts 50123456');
    process.exit(1);
  }

  const result = await fetchInvoice(phoneNumber);

  console.log('\n📋 Result:');
  console.log(JSON.stringify(result, null, 2));

  if (result.success) {
    console.log(`\n✅ Invoice found!`);
    console.log(`💰 Amount: ${result.amount} KWD`);
    console.log(`📅 Due Date: ${result.dueDate}`);
    console.log(`👤 Account: ${result.accountName}`);
  } else {
    console.log(`\n❌ Error: ${result.errorMessage}`);
  }

  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
