# Ooredoo Integration Guide

## Overview

This application integrates with Ooredoo's payment and invoice system to provide customers with real-time billing information and payment processing capabilities.

## Features

### 1. Multi-Language Support
- **English (Default)**: Primary language for international users
- **Arabic**: Full RTL support for Arabic-speaking customers
- Language switching via header button
- Persistent language preference using localStorage

### 2. Invoice Bot
The invoice bot automatically fetches customer billing information when a valid Ooredoo phone number is entered:

- **Automatic Trigger**: Fetches invoice data when phone number reaches 8 digits
- **Real-time Display**: Shows invoice details including:
  - Outstanding amount due
  - Due date
  - Account status
  - Active services
- **Mock Data Fallback**: Provides demo data when API is unavailable

### 3. Payment Processing
- Validates Ooredoo phone numbers using official prefixes
- Supports multiple payment entries (up to 10 per session)
- Real-time total calculation
- Payment method integration with Ooredoo's payment gateway

## API Integration

### Ooredoo API Endpoints

#### 1. Invoice Endpoint
```
POST /api/ooredoo/invoice
Headers:
  - Content-Type: application/json
  - Authorization: Bearer {API_KEY}

Request Body:
{
  "phone": "50123456"
}

Response:
{
  "success": true,
  "data": {
    "amount": 25.500,
    "dueDate": "2026-05-22",
    "status": "pending",
    "services": ["Mobile Service", "Data Plan"],
    "phoneNumber": "50123456",
    "accountName": "Customer Name"
  }
}
```

#### 2. Payment Endpoint
```
POST /api/ooredoo/payment
Headers:
  - Content-Type: application/json
  - Authorization: Bearer {API_KEY}

Request Body:
{
  "phone": "50123456",
  "amount": 25.500,
  "timestamp": "2026-05-15T10:30:00Z"
}

Response:
{
  "success": true,
  "transactionId": "TXN123456789",
  "error": null
}
```

#### 3. Balance Endpoint
```
POST /api/ooredoo/balance
Headers:
  - Content-Type: application/json
  - Authorization: Bearer {API_KEY}

Request Body:
{
  "phone": "50123456"
}

Response:
{
  "success": true,
  "data": {
    "balance": 150.750
  }
}
```

## Environment Variables

Add these to your `.env` file:

```env
REACT_APP_OOREDOO_API_URL=https://api.ooredoo.com.kw
REACT_APP_OOREDOO_API_KEY=your_api_key_here
REACT_APP_DEFAULT_LANGUAGE=en
```

## Valid Ooredoo Phone Prefixes

The application validates phone numbers against these Ooredoo prefixes:
- 50, 51, 55, 56, 60, 65, 66, 67, 69, 90, 94, 96, 97, 98, 99

## Implementation Details

### Language Switching
- Click the language button in the header (EN/العربية)
- Language preference is saved to localStorage
- URL is updated with language parameter for sharing

### Invoice Fetching
- Triggered automatically when phone number reaches 8 digits
- Loading indicator shows during API call
- Falls back to mock data if API fails
- Invoice data is displayed in a blue info box below the input field

### Payment Validation
- Phone number must be 8 digits
- Must start with valid Ooredoo prefix
- Amount must be greater than 0
- Pay button is disabled until all validations pass

## Testing

### Mock Data Mode
When the API is unavailable, the application generates realistic mock data:
- Random amounts between 10-60 KWD
- Due date 7 days from today
- Sample services list
- Pending status

### Test Phone Numbers
Use any of these prefixes followed by 6 random digits:
- 50123456
- 51987654
- 55555555
- 60000000

## Security Considerations

1. **API Key Protection**: Never expose API keys in client-side code
2. **HTTPS Only**: All API calls should use HTTPS
3. **Rate Limiting**: Implement rate limiting on the backend
4. **Input Validation**: Phone numbers are validated on both client and server
5. **CORS**: Configure CORS properly on the Ooredoo API server

## Troubleshooting

### Invoice Not Loading
- Check if phone number has exactly 8 digits
- Verify phone number starts with valid Ooredoo prefix
- Check browser console for API errors
- Ensure API key is valid and has correct permissions

### Language Not Persisting
- Clear browser cache and localStorage
- Check if localStorage is enabled in browser
- Verify language parameter in URL

### Payment Processing Fails
- Verify amount is greater than 0
- Check if all phone numbers are valid
- Ensure API endpoint is accessible
- Check API key permissions

## Future Enhancements

- [ ] SMS notifications for payment confirmation
- [ ] Payment history tracking
- [ ] Recurring payment setup
- [ ] Multiple language support (French, Urdu, etc.)
- [ ] Biometric authentication
- [ ] Payment installment plans
- [ ] Invoice PDF export
- [ ] Customer support chat integration

## Support

For issues or questions regarding Ooredoo integration:
- Contact Ooredoo API Support: api-support@ooredoo.com.kw
- Technical Documentation: https://developer.ooredoo.com.kw
