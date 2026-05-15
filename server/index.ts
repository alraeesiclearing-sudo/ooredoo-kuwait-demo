import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer, { Browser } from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let browser: Browser | null = null;

async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browser;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.post('/api/ooredoo/invoice', async (req, res) => {
    try {
      const { phone } = req.body;

      // Validate phone number
      if (!phone || phone.length !== 8) {
        return res.status(400).json({
          success: false,
          error: 'يرجى إدخال رقم Ooredoo صحيح (8 أرقام)',
        });
      }

      // Validate Ooredoo prefixes
      const ooredooPrefixes = ['50', '51', '55', '56', '60', '65', '66', '67', '69', '90', '94', '96', '97', '98', '99'];
      const isValidOoredoo = ooredooPrefixes.some((p) => phone.startsWith(p));

      if (!isValidOoredoo) {
        return res.status(400).json({
          success: false,
          error: 'يرجى إدخال رقم Ooredoo.',
        });
      }

      // Fetch invoice from Ooredoo using Puppeteer
      const invoiceData = await fetchInvoiceFromOoredooWithPuppeteer(phone);

      if (invoiceData.success) {
        return res.json({
          success: true,
          data: invoiceData.data,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: invoiceData.error || 'لم يتم العثور على فاتورة لهذا الرقم',
        });
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return res.status(500).json({
        success: false,
        error: 'حدث خطأ أثناء جلب الفاتورة',
      });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

/**
 * Fetch invoice from Ooredoo website using Puppeteer
 */
async function fetchInvoiceFromOoredooWithPuppeteer(phoneNumber: string) {
  let page = null;
  try {
    const browser = await initBrowser();
    page = await browser.createPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Navigate to Ooredoo guest pay page
    console.log('Navigating to Ooredoo guest pay page...');
    await page.goto('https://www.ooredoo.com.kw/myooredoo/#/guestpay', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for phone input field
    console.log('Waiting for phone input field...');
    await page.waitForSelector('input[type="tel"], input[placeholder*="رقم"], input[name*="phone"]', {
      timeout: 10000,
    });

    // Find and fill the phone input
    const phoneInputs = await page.$$('input[type="tel"], input[placeholder*="رقم"], input[name*="phone"]');
    if (phoneInputs.length > 0) {
      await phoneInputs[0].type(phoneNumber);
      console.log(`Entered phone number: ${phoneNumber}`);
    }

    // Wait for the form to process
    await page.waitForTimeout(3000);

    // Check for error messages
    const errorSelectors = [
      '.error',
      '.alert-danger',
      '[role="alert"]',
      '.text-danger',
      '.error-message',
      'span.error',
    ];

    for (const selector of errorSelectors) {
      const errorElement = await page.$(selector);
      if (errorElement) {
        const errorText = await page.evaluate(
          (el) => el?.textContent?.trim(),
          errorElement
        );
        if (errorText && errorText.length > 0) {
          console.log(`Error found: ${errorText}`);
          await page.close();
          return {
            success: false,
            error: errorText,
          };
        }
      }
    }

    // Try to find invoice amount
    const amountSelectors = [
      '.amount',
      '.total',
      '.invoice-amount',
      '[data-amount]',
      '.bill-amount',
      '.due-amount',
    ];

    let amount = null;
    for (const selector of amountSelectors) {
      const element = await page.$(selector);
      if (element) {
        amount = await page.evaluate(
          (el) => el?.textContent?.trim(),
          element
        );
        if (amount) break;
      }
    }

    // If no invoice found, return prepaid message
    if (!amount) {
      console.log('No invoice found - likely prepaid account');
      await page.close();
      return {
        success: true,
        data: {
          amount: null,
          type: 'prepaid',
          phoneNumber,
          message: 'هذا الرقم مسبق الدفع. يرجى اختيار المبلغ المطلوب.',
          accountName: `Customer ${phoneNumber.slice(-4)}`,
        },
      };
    }

    // Parse amount
    const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;

    await page.close();

    return {
      success: true,
      data: {
        amount: parsedAmount,
        type: 'postpaid',
        phoneNumber,
        message: 'تم الحصول على الفاتورة بنجاح',
        accountName: `Customer ${phoneNumber.slice(-4)}`,
      },
    };
  } catch (error) {
    console.error('Error fetching invoice with Puppeteer:', error);
    if (page) {
      await page.close();
    }
    return {
      success: false,
      error: `خطأ في الاتصال: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing browser...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

startServer().catch(console.error);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
