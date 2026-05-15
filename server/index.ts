import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer, { Browser } from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let browser: Browser | null = null;
let browserInitPromise: Promise<Browser | null> | null = null;

/**
 * Initialize browser once and reuse it
 */
async function initBrowser(): Promise<Browser | null> {
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
      console.log("🚀 Launching Puppeteer browser...");
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-extensions",
          "--disable-web-resources",
          "--disable-sync",
          "--disable-plugins",
          "--disable-default-apps",
          "--disable-preconnect",
          "--single-process", // Use single process to save memory
        ],
      });
      console.log("✅ Browser launched successfully");
      return browser;
    } catch (error) {
      console.error("❌ Failed to launch browser:", error);
      browser = null;
      browserInitPromise = null;
      return null;
    }
  })();

  return browserInitPromise;
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

      // Try to fetch invoice from Ooredoo using Puppeteer with timeout
      const invoiceData = await Promise.race([
        fetchInvoiceFromOoredooWithPuppeteer(phone),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 12000)
        ),
      ]).catch((error) => {
        console.error('Invoice fetch error:', error);
        return null;
      });

      if (invoiceData && invoiceData.success) {
        return res.json({
          success: true,
          data: invoiceData.data,
        });
      } else {
        // If Puppeteer fails, return error
        return res.status(500).json({
          success: false,
          error: invoiceData?.error || 'Unable to fetch invoice',
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

  // Serve static files
  const clientPath = path.join(__dirname, "../client/dist");
  app.use(express.static(clientPath));

  // SPA fallback
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });

  // Start listening
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}/`);
    console.log(`📱 API endpoint: POST http://localhost:${PORT}/api/ooredoo/invoice`);
  });

  return { app, server };
}

/**
 * Fetch invoice from Ooredoo with optimized Puppeteer
 */
async function fetchInvoiceFromOoredooWithPuppeteer(
  phoneNumber: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  let page: Page | null = null;

  try {
    const b = await initBrowser();
    if (!b) {
      throw new Error('Browser not available');
    }

    console.log(`📱 Fetching invoice for: ${phoneNumber}`);

    // Create a new page (reuse browser)
    page = await b.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set timeout for navigation
    const navigationTimeout = 15000;

    // Navigate to Ooredoo guest pay page
    console.log('🌐 Navigating to Ooredoo...');
    try {
      await page.goto('https://www.ooredoo.com.kw/myooredoo/#/guestpay', {
        waitUntil: 'networkidle2',
        timeout: navigationTimeout,
      });
    } catch (error) {
      console.warn('⚠️ Navigation timeout, continuing anyway...');
    }

    // Wait for phone input field
    console.log('🔍 Waiting for phone input field...');
    try {
      await page.waitForSelector('input[placeholder="Mobile Number"]', {
        timeout: 5000,
      });
    } catch (error) {
      throw new Error('Phone input field not found');
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
      delay: 50,
    });

    // Wait for amount field to be populated
    console.log('⏳ Waiting for invoice data...');
    await page.waitForTimeout(2000);

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

      return {
        phone,
        amount,
        isPostpaid,
        hasError: amount === 0 && !isPostpaid,
      };
    });

    console.log('📋 Extracted data:', result);

    // Check if we got valid data
    if (result.hasError || (result.amount === 0 && !result.isPostpaid)) {
      return {
        success: false,
        error: 'No invoice found for this number',
      };
    }

    // Return success
    return {
      success: true,
      data: {
        amount: result.amount,
        type: result.isPostpaid ? 'postpaid' : 'prepaid',
        phoneNumber,
        message: 'تم الحصول على الفاتورة بنجاح',
        accountName: `Customer ${phoneNumber.slice(-4)}`,
      },
    };
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
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  if (browser) {
    try {
      await browser.close();
      console.log('✅ Browser closed');
    } catch (e) {
      console.error('Error closing browser:', e);
    }
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  if (browser) {
    try {
      await browser.close();
      console.log('✅ Browser closed');
    } catch (e) {
      console.error('Error closing browser:', e);
    }
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
startServer().catch(console.error);
