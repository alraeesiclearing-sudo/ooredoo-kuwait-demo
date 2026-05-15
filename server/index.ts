import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { fetchInvoiceFromOoredoo, isValidOoredooNumber, closeBrowser } from "./invoiceFetcher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Start Express server
 */
async function startServer() {
  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Routes
  app.post("/api/ooredoo/invoice", async (req, res) => {
    try {
      const { phone } = req.body;

      // Validate phone number
      if (!phone || phone.length !== 8) {
        return res.status(400).json({
          success: false,
          error: "يرجى إدخال رقم Ooredoo صحيح (8 أرقام)",
        });
      }

      // Validate Ooredoo number
      if (!isValidOoredooNumber(phone)) {
        return res.status(400).json({
          success: false,
          error: "يرجى إدخال رقم Ooredoo صحيح",
        });
      }

      // Fetch invoice using Puppeteer
      console.log(`🔄 Fetching invoice for ${phone}...`);
      const invoiceData = await Promise.race([
        fetchInvoiceFromOoredoo(phone),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 25000)
        ),
      ]).catch((error) => {
        console.error('Invoice fetch error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      });

      if (invoiceData && invoiceData.success) {
        return res.json({
          success: true,
          data: {
            amount: invoiceData.amount,
            type: invoiceData.type,
            phoneNumber: invoiceData.phoneNumber,
            message: invoiceData.message,
            accountName: invoiceData.accountName,
          },
        });
      } else {
        // Return error
        return res.status(500).json({
          success: false,
          error: invoiceData?.error || 'Unable to fetch invoice',
        });
      }
    } catch (error) {
      console.error('Error in /api/ooredoo/invoice:', error);
      return res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء جلب الفاتورة",
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
    console.log(`🎭 Using Playwright for lightweight browser automation\n`);
  });

  return { app, server };
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  await closeBrowser();
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
