/**
 * Ooredoo Service - Integration with Ooredoo API
 * This service handles all communication with Ooredoo backend
 */

export interface InvoiceData {
  amount: number;
  dueDate: string;
  status: string;
  services: string[];
  phoneNumber?: string;
  accountName?: string;
}

export interface OoredooResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const OOREDOO_API_BASE = process.env.REACT_APP_OOREDOO_API_URL || 'https://api.ooredoo.com.kw';

/**
 * Fetch invoice data for a given phone number
 * @param phoneNumber - The Ooredoo phone number (8 digits)
 * @returns Promise with invoice data
 */
export async function fetchInvoiceByPhone(phoneNumber: string): Promise<InvoiceData | null> {
  try {
    const response = await fetch(`${OOREDOO_API_BASE}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OOREDOO_API_KEY || ''}`,
      },
      body: JSON.stringify({ phone: phoneNumber }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data: OoredooResponse<InvoiceData> = await response.json();

    if (data.success && data.data) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch invoice');
    }
  } catch (error) {
    console.error('Error fetching invoice from Ooredoo API:', error);
    // Return mock data for demo purposes
    return generateMockInvoice(phoneNumber);
  }
}

/**
 * Generate mock invoice data for testing
 * @param phoneNumber - The phone number
 * @returns Mock invoice data
 */
function generateMockInvoice(phoneNumber: string): InvoiceData {
  const amount = Math.floor(Math.random() * 50) + 10;
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    amount,
    dueDate: dueDate.toLocaleDateString('en-US'),
    status: 'pending',
    services: ['Mobile Service', 'Data Plan', 'International Roaming'],
    phoneNumber,
    accountName: `Customer ${phoneNumber.slice(-4)}`,
  };
}

/**
 * Validate if a phone number is a valid Ooredoo number
 * @param phoneNumber - The phone number to validate
 * @returns true if valid Ooredoo number
 */
export function isValidOoredooNumber(phoneNumber: string): boolean {
  const ooredooPrefixes = ['50', '51', '55', '56', '60', '65', '66', '67', '69', '90', '94', '96', '97', '98', '99'];
  return phoneNumber.length === 8 && ooredooPrefixes.some((p) => phoneNumber.startsWith(p));
}

/**
 * Process payment through Ooredoo
 * @param phoneNumber - The phone number to charge
 * @param amount - The amount to charge
 * @returns Promise with payment result
 */
export async function processPayment(phoneNumber: string, amount: number): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const response = await fetch(`${OOREDOO_API_BASE}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OOREDOO_API_KEY || ''}`,
      },
      body: JSON.stringify({
        phone: phoneNumber,
        amount,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Payment API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: data.success,
      transactionId: data.transactionId,
      error: data.error,
    };
  } catch (error) {
    console.error('Error processing payment:', error);
    return {
      success: false,
      error: 'Failed to process payment',
    };
  }
}

/**
 * Get account balance for a phone number
 * @param phoneNumber - The phone number
 * @returns Promise with account balance
 */
export async function getAccountBalance(phoneNumber: string): Promise<number | null> {
  try {
    const response = await fetch(`${OOREDOO_API_BASE}/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OOREDOO_API_KEY || ''}`,
      },
      body: JSON.stringify({ phone: phoneNumber }),
    });

    if (!response.ok) {
      throw new Error(`Balance API Error: ${response.statusText}`);
    }

    const data: OoredooResponse<{ balance: number }> = await response.json();
    return data.data?.balance || null;
  } catch (error) {
    console.error('Error fetching account balance:', error);
    return null;
  }
}
