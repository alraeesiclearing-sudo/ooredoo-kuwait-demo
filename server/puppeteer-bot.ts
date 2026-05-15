import puppeteer from 'puppeteer';

export async function fetchInvoiceFromOoredoo(phoneNumber: string): Promise<any> {
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Navigate to Ooredoo guest pay page
    console.log('Navigating to Ooredoo...');
    await page.goto('https://www.ooredoo.com.kw/myooredoo/#/guestpay', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for the phone number input field
    console.log('Waiting for phone number input...');
    await page.waitForSelector('input[placeholder*="رقم"]', { timeout: 10000 });

    // Enter the phone number
    console.log(`Entering phone number: ${phoneNumber}`);
    await page.type('input[placeholder*="رقم"]', phoneNumber);

    // Wait a bit for the page to process
    await page.waitForTimeout(2000);

    // Check if there's an error message
    const errorElement = await page.$('.error, [class*="error"], [class*="خطأ"]');
    if (errorElement) {
      const errorText = await page.evaluate(el => el?.textContent, errorElement);
      console.log('Error found:', errorText);
      return {
        success: false,
        error: errorText || 'رقم غير صحيح',
        message: 'الرقم المدخل غير صحيح أو لا توجد فاتورة'
      };
    }

    // Try to find invoice amount
    const invoiceAmount = await page.evaluate(() => {
      const amountElements = document.querySelectorAll('[class*="amount"], [class*="المبلغ"], input[type="text"]');
      for (let el of amountElements) {
        const text = el.textContent || (el as HTMLInputElement).value;
        if (text && /\d+/.test(text)) {
          return text.trim();
        }
      }
      return null;
    });

    if (invoiceAmount && invoiceAmount !== '0' && invoiceAmount !== '0.000') {
      console.log('Invoice found:', invoiceAmount);
      return {
        success: true,
        phoneNumber: phoneNumber,
        amount: invoiceAmount,
        message: 'تم جلب الفاتورة بنجاح'
      };
    } else {
      // Check if it's a prepaid number (no invoice)
      const isPrepaid = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('مسبق الدفع') || text.includes('prepaid');
      });

      if (isPrepaid) {
        return {
          success: true,
          phoneNumber: phoneNumber,
          isPrepaid: true,
          message: 'هذا الرقم مسبق الدفع - يمكنك اختيار المبلغ'
        };
      }

      return {
        success: false,
        error: 'لم يتم العثور على فاتورة',
        message: 'الرقم صحيح لكن لا توجد فاتورة معلقة'
      };
    }

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ',
      message: 'فشل في جلب الفاتورة'
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
