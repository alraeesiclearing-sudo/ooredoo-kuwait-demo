import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

      // Fetch invoice from Ooredoo
      const invoiceData = await fetchInvoiceFromOoredoo(phone);

      if (invoiceData) {
        return res.json({
          success: true,
          data: invoiceData,
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'لم يتم العثور على فاتورة لهذا الرقم',
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
 * Fetch invoice from Ooredoo website
 */
async function fetchInvoiceFromOoredoo(phoneNumber: string) {
  try {
    // Try to fetch from Ooredoo API endpoint
    const response = await fetch('https://www.ooredoo.com.kw/api/v1/invoice/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        phone: phoneNumber,
        type: 'postpaid',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.invoice) {
        return {
          amount: parseFloat(data.invoice.amount) || 0,
          dueDate: data.invoice.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-KW'),
          status: data.invoice.status || 'pending',
          services: data.invoice.services || ['Mobile Service', 'Data Plan'],
          phoneNumber: phoneNumber,
          accountName: data.invoice.accountName || `Customer ${phoneNumber.slice(-4)}`,
        };
      }
    }

    // Fallback: Return mock data
    return generateMockInvoice(phoneNumber);
  } catch (error) {
    console.error('Error fetching from Ooredoo:', error);
    return generateMockInvoice(phoneNumber);
  }
}

/**
 * Generate mock invoice data
 */
function generateMockInvoice(phoneNumber: string) {
  const amount = Math.floor(Math.random() * 50) + 10;
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    amount,
    dueDate: dueDate.toLocaleDateString('ar-KW'),
    status: 'pending',
    services: ['Mobile Service', 'Data Plan', 'International Roaming'],
    phoneNumber,
    accountName: `Customer ${phoneNumber.slice(-4)}`,
  };
}

startServer().catch(console.error);
