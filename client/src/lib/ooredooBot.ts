/**
 * Ooredoo Bot Service - Web Scraping Integration
 * Automatically fetches invoice data from Ooredoo's guest pay portal
 */

export interface BotInvoiceResult {
  success: boolean;
  phoneNumber: string;
  amount?: number;
  dueDate?: string;
  accountName?: string;
  status?: string;
  error?: string;
  errorMessage?: string;
}

/**
 * Validate if phone number is Ooredoo
 */
export function isValidOoredooNumber(phoneNumber: string): boolean {
  const ooredooPrefixes = ['50', '51', '55', '56', '60', '65', '66', '67', '69', '90', '94', '96', '97', '98', '99'];
  return phoneNumber.length === 8 && ooredooPrefixes.some((p) => phoneNumber.startsWith(p));
}

/**
 * Fetch invoice using the bot (client-side wrapper)
 * @param phoneNumber - The phone number to check
 * @returns Promise with invoice data
 */
export async function fetchInvoiceWithBot(phoneNumber: string): Promise<BotInvoiceResult> {
  if (!isValidOoredooNumber(phoneNumber)) {
    return {
      success: false,
      phoneNumber,
      error: 'Invalid phone number',
      errorMessage: 'Please enter a valid Ooredoo number.',
    };
  }

  try {
    // Call backend API which runs the bot
    const response = await fetch('/api/ooredoo/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumber }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data: BotInvoiceResult = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching invoice with bot:', error);
    return {
      success: false,
      phoneNumber,
      error: 'Bot error',
      errorMessage: 'Unable to fetch invoice. Please try again.',
    };
  }
}

/**
 * Cleanup bot resources
 */
export async function cleanupBot(): Promise<void> {
  // Cleanup handled by backend
}
