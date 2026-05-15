/**
 * Ooredoo Invoice Fetcher - Browserless API Implementation
 * Uses Browserless.io cloud browser service for reliable automation
 */

import axios from 'axios';

interface InvoiceData {
  success: boolean;
  amount?: number;
  type?: 'postpaid' | 'prepaid';
  phoneNumber?: string;
  message?: string;
  accountName?: string;
  error?: string;
}

// Browserless configuration - Free tier (1000 requests/month)
const BROWSERLESS_URL = 'https://chrome.browserless.io';

/**
 * Validate Ooredoo phone number
 */
function isValidOoredooNumber(phone: string): boolean {
  const prefixes = ['50', '51', '55', '56', '68', '69', '97', '98'];
  const cleanPhone = phone.replace(/\D/g, '');
  return prefixes.some(prefix => cleanPhone.startsWith(prefix)) && cleanPhone.length === 8;
}

/**
 * Fetch invoice from Ooredoo using Browserless
 */
export async function fetchInvoiceFromOoredoo(phoneNumber: string): Promise<InvoiceData> {
  try {
    console.log(`📱 Fetching invoice for: ${phoneNumber}`);

    // Validate phone number
    if (!isValidOoredooNumber(phoneNumber)) {
      return {
        success: false,
        error: `Invalid Ooredoo phone number: ${phoneNumber}`,
      };
    }

    // Prepare the script to run in the browser
    const script = `
      (async () => {
        try {
          // Navigate to Ooredoo guest pay portal
          await page.goto('https://www.ooredoo.com.kw/myooredoo/#/guestpay', {
            waitUntil: 'networkidle2',
            timeout: 25000
          });

          console.log('✅ Page loaded');

          // Wait for input field and enter phone number
          const inputSelector = 'input[type="text"], input[placeholder*="phone"], input[placeholder*="رقم"]';
          await page.waitForSelector(inputSelector, { timeout: 10000 });
          
          const inputs = await page.$$('input[type="text"]');
          if (inputs.length > 0) {
            await inputs[0].type('${phoneNumber}');
          }
          
          console.log('📝 Phone number entered');

          // Wait a bit for the page to process
          await page.waitForTimeout(2000);

          // Wait for data to load (look for amount display)
          await page.waitForFunction(() => {
            const text = document.body.innerText;
            return text.includes('KD') || text.includes('د.ك') || text.includes('212');
          }, { timeout: 20000 });

          console.log('✅ Data loaded');

          // Extract invoice data
          const data = await page.evaluate(() => {
            const text = document.body.innerText;
            
            // Try multiple patterns for amount extraction
            let amount = null;
            
            // Pattern 1: Look for amount with KD or د.ك
            let amountMatch = text.match(/([0-9]+\\.[0-9]{3})\\s*(KD|د\\.ك)/);
            if (amountMatch) {
              amount = parseFloat(amountMatch[1]);
            } else {
              // Pattern 2: Look for any number followed by KD
              amountMatch = text.match(/([0-9]+(?:\\.[0-9]+)?)\\s*KD/);
              if (amountMatch) {
                amount = parseFloat(amountMatch[1]);
              }
            }
            
            // Look for account type
            const type = text.includes('POSTPAID') ? 'postpaid' : 
                        text.includes('PREPAID') ? 'prepaid' : null;
            
            // Look for account name
            const nameMatch = text.match(/Account Name[:\\s]+([^\\n]+)/i);
            const accountName = nameMatch ? nameMatch[1].trim() : null;
            
            return {
              amount,
              type,
              accountName,
              success: amount !== null,
              debug: {
                textLength: text.length,
                hasKD: text.includes('KD'),
                hasArabic: text.includes('د.ك')
              }
            };
          });

          return data;
        } catch (error) {
          console.error('Error:', error.message);
          return {
            success: false,
            error: error.message
          };
        }
      })();
    `;

    // Call Browserless API (free tier)
    const url = `${BROWSERLESS_URL}/function`;

    console.log('🌐 Calling Browserless API...');

    const response = await axios.post(url, {
      code: script,
    }, {
      timeout: 35000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = response.data;

    if (result.success) {
      console.log('✅ Invoice fetched successfully');
      return {
        success: true,
        amount: result.amount,
        type: result.type as 'postpaid' | 'prepaid',
        phoneNumber,
        accountName: result.accountName,
        message: `Invoice for ${phoneNumber}: ${result.amount} KD`,
      };
    } else {
      console.error('❌ Failed to fetch invoice:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to extract invoice data',
      };
    }
  } catch (error) {
    console.error('❌ Error fetching invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
