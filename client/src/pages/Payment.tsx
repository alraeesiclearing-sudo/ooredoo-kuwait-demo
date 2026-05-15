import React, { useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface PaymentRow {
  id: string;
  phone: string;
  amount: string;
  invoice?: InvoiceData;
  loading?: boolean;
}

interface InvoiceData {
  amount: number;
  dueDate: string;
  status: string;
  services: string[];
}

const Payment: React.FC = () => {
  // Get language from URL or localStorage, default to 'en'
  const [language, setLanguage] = useState<Language>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang') as Language;
    if (urlLang && ['en', 'ar'].includes(urlLang)) {
      return urlLang;
    }
    return localStorage.getItem('language') as Language || 'en';
  });
  const [rows, setRows] = useState<PaymentRow[]>([
    { id: '1', phone: '', amount: '' }
  ]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [total, setTotal] = useState(0);
  const [allValid, setAllValid] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState<{ [key: string]: boolean }>({});

  // Save language preference
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const ooredooPrefixes = ['50', '51', '55', '56', '60', '65', '66', '67', '69', '90', '94', '96', '97', '98', '99'];

  const isRTL = language === 'ar';
  const isLTR = language === 'en';

  const translations = {
    en: {
      pay: 'Pay',
      allNumbers: 'All Numbers',
      addNumber: 'Add Number',
      phoneNumber: 'Phone Number',
      amount: 'Amount',
      required: '*',
      paymentOptions: 'Payment Options',
      paymentOptionsDesc: 'Enjoy app features with more payment options',
      payButton: 'Pay',
      currency: 'KWD',
      errorOoredoo: 'Please enter an Ooredoo number.',
      errorLength: 'Phone number must be exactly 8 digits.',
      home: 'Home',
      manage: 'Manage',
      shop: 'Shop',
      more: 'More',
      arabic: 'العربية',
    },
    ar: {
      pay: 'دفع',
      allNumbers: 'جميع الأرقام',
      addNumber: 'إضافة رقم',
      phoneNumber: 'رقم الهاتف',
      amount: 'المبلغ',
      required: '*',
      paymentOptions: 'خيارات الدفع',
      paymentOptionsDesc: 'استمتع بمميزات التطبيق مع المزيد من خيارات الدفع',
      payButton: 'دفع',
      currency: 'د.ك',
      errorOoredoo: 'يرجى إدخال رقم Ooredoo.',
      errorLength: 'يجب أن يكون رقم الهاتف 8 أرقام بالضبط',
      home: 'الرئيسية',
      manage: 'إدارة',
      shop: 'المتجر',
      more: 'المزيد',
      english: 'EN',
    },
  };

  const t = translations[language];

  useEffect(() => {
    calculateTotal();
  }, [rows]);

  const calculateTotal = () => {
    let sum = 0;
    let valid = true;
    const newErrors: { [key: string]: string } = {};

    rows.forEach((row) => {
      const phoneVal = row.phone;
      const amountVal = parseFloat(row.amount) || 0;
      sum += amountVal;

      const isOoredoo = ooredooPrefixes.some((p) => phoneVal.startsWith(p));

      if (phoneVal.length > 0) {
        if (!isOoredoo) {
          newErrors[row.id] = t.errorOoredoo;
          valid = false;
        } else if (phoneVal.length < 8) {
          newErrors[row.id] = t.errorLength;
          valid = false;
        }
      } else {
        valid = false;
      }
    });

    setErrors(newErrors);
    setTotal(sum);
    setAllValid(valid && sum > 0);
  };

  const addRow = () => {
    if (rows.length < 10) {
      const newId = (Math.max(...rows.map((r) => parseInt(r.id))) + 1).toString();
      setRows([...rows, { id: newId, phone: '', amount: '' }]);
    }
  };

  const deleteRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const updateRow = (id: string, field: 'phone' | 'amount', value: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleLanguageSwitch = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    // Update URL with language parameter
    const params = new URLSearchParams(window.location.search);
    params.set('lang', newLang);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  // Fetch invoice data from Ooredoo API
  const fetchInvoice = async (phoneNumber: string, rowId: string) => {
    if (phoneNumber.length !== 8) return;

    setInvoiceLoading((prev) => ({ ...prev, [rowId]: true }));

    try {
      // Mock API call - replace with actual Ooredoo API endpoint
      const response = await fetch('/api/ooredoo/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      if (response.ok) {
        const invoiceData = await response.json();
        // Update the row with invoice data
        setRows((prevRows) =>
          prevRows.map((r) =>
            r.id === rowId
              ? { ...r, invoice: invoiceData, amount: invoiceData.amount.toString() }
              : r
          )
        );
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      // Fallback: Use mock data
      const mockInvoice: InvoiceData = {
        amount: Math.floor(Math.random() * 50) + 10,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: 'pending',
        services: ['Mobile Service', 'Data Plan'],
      };
      setRows((prevRows) =>
        prevRows.map((r) =>
          r.id === rowId
            ? { ...r, invoice: mockInvoice, amount: mockInvoice.amount.toString() }
            : r
        )
      );
    } finally {
      setInvoiceLoading((prev) => ({ ...prev, [rowId]: false }));
    }
  };

  const handlePhoneChange = (id: string, value: string) => {
    updateRow(id, 'phone', value);
    // Fetch invoice when phone number is complete
    if (value.length === 8) {
      fetchInvoice(value, id);
    }
  };

  const handlePayClick = () => {
    window.location.href = 'Payment_Methods.php';
  };

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <style>{`
        :root {
          --ooredoo-red: #ed1c24;
          --ooredoo-bg: #f8f9fb;
          --alert-bg: #fdeaea;
          --alert-text: #b12a2e;
          --text-main: #000;
          --text-sub: #757575;
          --border-light: #ececec;
        }

        body {
          font-family: 'Segoe UI', Tahoma, sans-serif;
          margin: 0;
          padding: 0;
          background-color: var(--ooredoo-bg);
          color: var(--text-main);
          padding-bottom: 240px;
        }

        .payment-header {
          background: #fff;
          padding: 10px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 55px;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 2px 5px rgba(0,0,0,0.03);
          margin-bottom: 15px;
        }

        .lang-switch {
          font-size: 16px;
          font-weight: bold;
          color: var(--ooredoo-red);
          width: 40px;
          cursor: pointer;
          text-decoration: none;
          background: none;
          border: none;
          padding: 0;
        }

        .payment-header h1 {
          font-size: 18px;
          margin: 0;
          font-weight: bold;
          flex-grow: 1;
          text-align: center;
        }

        .support-icon {
          width: 40px;
          text-align: ${isRTL ? 'left' : 'right'};
        }

        .support-icon img {
          width: 22px;
          height: 22px;
          opacity: 0.6;
        }

        .promo-banner {
          background-color: #fff;
          width: 100%;
          display: flex;
          justify-content: center;
          margin-bottom: 10px;
        }

        .promo-banner img {
          width: 100%;
          height: auto;
          display: block;
        }

        .payment-card {
          background: #fff;
          margin: 15px;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          margin-bottom: 10px;
        }

        .top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-direction: ${isRTL ? 'row-reverse' : 'row'};
        }

        .checkbox-group input {
          width: 18px;
          height: 18px;
          accent-color: var(--ooredoo-red);
        }

        .checkbox-group span {
          font-size: 14px;
          font-weight: bold;
        }

        .btn-add-number {
          border: 1.5px solid var(--ooredoo-red);
          background: #fff;
          color: var(--ooredoo-red);
          padding: 6px 20px;
          border-radius: 25px;
          font-weight: bold;
          font-size: 13px;
          cursor: pointer;
        }

        .dynamic-fields-container {
          border-top: 1px solid var(--border-light);
          padding-top: 15px;
        }

        .row-group {
          margin-bottom: 15px;
        }

        .inputs-row-item {
          display: flex;
          gap: 15px;
          margin-bottom: 10px;
          align-items: flex-end;
          justify-content: space-between;
          position: relative;
          flex-direction: ${isRTL ? 'row-reverse' : 'row'};
        }

        .field-box {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .field-box label {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 8px;
          text-align: ${isRTL ? 'right' : 'left'};
        }

        .field-box label span {
          color: var(--ooredoo-red);
        }

        .input-container {
          background: #fff;
          border: 1px solid var(--border-light);
          border-radius: 12px;
          height: 52px;
          width: 100%;
          display: flex;
          align-items: center;
          padding: 0 10px;
          box-sizing: border-box;
          flex-direction: ${isRTL ? 'row-reverse' : 'row'};
        }

        .input-container input {
          width: 100%;
          border: none;
          outline: none;
          font-size: 15px;
          text-align: ${isRTL ? 'right' : 'left'};
          background: transparent;
        }

        .amount-box {
          flex: 0.8 !important;
        }

        .currency-tag {
          font-weight: bold;
          font-size: 12px;
          margin: ${isRTL ? '0 5px 0 0' : '0 0 0 5px'};
          color: #000;
        }

        .error-message {
          background-color: var(--alert-bg);
          color: var(--alert-text);
          padding: 10px 15px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: bold;
          display: none;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          margin-top: 5px;
          animation: fadeIn 0.3s ease-in;
          flex-direction: ${isRTL ? 'row-reverse' : 'row'};
        }

        .error-message.show {
          display: flex;
        }

        .error-message img {
          width: 16px;
          height: 16px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .payment-options-section {
          padding: 0 20px;
          margin-top: 5px;
          text-align: ${isRTL ? 'right' : 'left'};
        }

        .options-title {
          font-size: 18px;
          font-weight: 900;
          color: #000;
          margin-bottom: 5px;
          display: block;
        }

        .options-subtitle {
          font-size: 13px;
          color: #000;
          font-weight: 500;
          line-height: 1.4;
        }

        .footer-action {
          position: fixed;
          bottom: 115px;
          left: 0;
          right: 0;
          padding: 0 20px;
          z-index: 999;
        }

        .main-pay-btn {
          width: 100%;
          background-color: #f1f1f1;
          color: #b5b5b5;
          border: none;
          padding: 14px;
          border-radius: 30px;
          font-size: 17px;
          font-weight: bold;
          cursor: pointer;
          transition: 0.3s;
        }

        .main-pay-btn:not(:disabled) {
          background-color: var(--ooredoo-red);
          color: #fff;
          cursor: pointer;
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          width: 100%;
          background: #fff;
          display: flex;
          justify-content: space-around;
          padding: 10px 0;
          border-top: 1px solid var(--border-light);
          z-index: 1000;
        }

        .nav-item {
          text-align: center;
          color: var(--text-sub);
          font-size: 11px;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .nav-item img {
          width: 24px;
          height: 24px;
        }

        .nav-item.active .active-indicator {
          background-color: #fff1f1;
          padding: 6px 16px;
          border-radius: 12px;
        }

        .btn-delete {
          background: none;
          border: none;
          cursor: pointer;
          margin-bottom: 12px;
          padding: 0;
        }

        .btn-delete img {
          width: 20px;
          height: 20px;
        }
      `}</style>

      <div className="payment-header">
        <button
          className="lang-switch"
          onClick={handleLanguageSwitch}
        >
          {language === 'en' ? 'العربية' : 'EN'}
        </button>
        <h1>{t.pay}</h1>
        <div className="support-icon">
          <img src="https://img.icons8.com/ios/50/000000/headset.png" alt="Support" />
        </div>
      </div>

      <div className="promo-banner">
        <img src="https://i.ibb.co/XZrzk5gJ/IMG-20260513-WA0119.jpg" alt="Promotion" />
      </div>

      <div className="payment-card">
        <div className="top-row">
          <div className="checkbox-group">
            <input type="checkbox" />
            <span>{t.allNumbers}</span>
          </div>
          <button className="btn-add-number" onClick={addRow}>
            {t.addNumber}
          </button>
        </div>

        <div className="dynamic-fields-container">
          {rows.map((row) => (
            <div key={row.id} className="row-group">
              <div className="inputs-row-item">
                <div className="field-box" style={{ flex: 2 }}>
                  <label>
                    {t.phoneNumber}
                    <span>{t.required}</span>
                  </label>
                  <div className="input-container">
                    <input
                      type="tel"
                      placeholder={t.phoneNumber}
                      maxLength={8}
                      value={row.phone}
                      onChange={(e) => handlePhoneChange(row.id, e.target.value)}
                    />
                    {invoiceLoading[row.id] && (
                      <span style={{ marginLeft: '10px', fontSize: '12px', color: '#999' }}>Loading...</span>
                    )}
                  </div>
                </div>
                <div className="field-box amount-box">
                  <label>
                    {t.amount}
                    <span>{t.required}</span>
                  </label>
                  <div className="input-container">
                    {isRTL && <span className="currency-tag">{t.currency}</span>}
                    <input
                      type="text"
                      placeholder="0.000"
                      value={row.amount}
                      onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                    />
                    {!isRTL && <span className="currency-tag">{t.currency}</span>}
                  </div>
                </div>
                {rows.length > 1 && (
                  <button
                    className="btn-delete"
                    onClick={() => deleteRow(row.id)}
                  >
                    <img src="https://img.icons8.com/material-rounded/48/ed1c24/trash.png" alt="Delete" />
                  </button>
                )}
              </div>
              {errors[row.id] && (
                <div className="error-message show">
                  <img src="https://img.icons8.com/material-rounded/24/b12a2e/cancel.png" alt="Error" />
                  <span className="error-text">{errors[row.id]}</span>
                </div>
              )}
              {row.invoice && (
                <div style={{
                  background: '#f0f8ff',
                  border: '1px solid #d0e8ff',
                  borderRadius: '10px',
                  padding: '10px 15px',
                  marginTop: '10px',
                  fontSize: '13px',
                  color: '#333',
                  direction: isRTL ? 'rtl' : 'ltr',
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {isRTL ? 'بيانات الفاتورة' : 'Invoice Details'}
                  </div>
                  <div>{isRTL ? 'المبلغ' : 'Amount'}: {t.currency} {row.invoice.amount}</div>
                  <div>{isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}: {row.invoice.dueDate}</div>
                  <div>{isRTL ? 'الحالة' : 'Status'}: {row.invoice.status}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="payment-options-section">
        <span className="options-title">{t.paymentOptions}</span>
        <div className="options-subtitle">{t.paymentOptionsDesc}</div>
      </div>

      <div className="footer-action">
        <button
          className="main-pay-btn"
          disabled={!allValid}
          onClick={handlePayClick}
        >
          {t.payButton} ({t.currency} {total.toFixed(3)})
        </button>
      </div>

      <nav className="bottom-nav">
        <a href="#" className="nav-item">
          <img src="https://img.icons8.com/material-outlined/48/757575/home--v1.png" alt="Home" />
          <span>{t.home}</span>
        </a>
        <a href="#" className="nav-item">
          <img src="https://img.icons8.com/material-outlined/48/757575/dashboard-layout.png" alt="Manage" />
          <span>{t.manage}</span>
        </a>
        <a href="#" className="nav-item active">
          <div className="active-indicator">
            <img src="https://img.icons8.com/material-rounded/48/ed1c24/wallet.png" alt="Pay" />
          </div>
          <span style={{ color: 'var(--ooredoo-red)', fontWeight: 'bold' }}>
            {t.payButton}
          </span>
        </a>
        <a href="#" className="nav-item">
          <img src="https://img.icons8.com/material-outlined/48/757575/shopping-cart.png" alt="Shop" />
          <span>{t.shop}</span>
        </a>
        <a href="#" className="nav-item">
          <img src="https://img.icons8.com/material-outlined/48/757575/menu--v1.png" alt="More" />
          <span>{t.more}</span>
        </a>
      </nav>
    </div>
  );
};

export default Payment;
