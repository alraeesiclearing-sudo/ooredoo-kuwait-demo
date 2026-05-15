import { useState } from 'react';
import { toast } from 'sonner';
import AmountConfirmation from './AmountConfirmation';
import PaymentMethods from './PaymentMethods';

type PageState = 'main' | 'amount' | 'payment';

interface InvoiceData {
  amount: number;
  type: 'postpaid' | 'prepaid';
}

export default function PaymentPage() {
  const [activeTab, setActiveTab] = useState('pay');
  const [mobileNumber, setMobileNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [checkedAllNumbers, setCheckedAllNumbers] = useState(false);
  const [checkedPhone, setCheckedPhone] = useState(false);
  const [additionalNumbers, setAdditionalNumbers] = useState<Array<{ number: string; amount: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [currentPage, setCurrentPage] = useState<PageState>('main');
  const [selectedAmount, setSelectedAmount] = useState(0);

  const navItems = [
    { id: 'more', label: 'المزيد', icon: '1000090324.svg' },
    { id: 'shop', label: 'المتجر', icon: '1000090323.svg' },
    { id: 'pay', label: 'دفع', icon: '1000090322.svg', isActive: true },
    { id: 'manage', label: 'إدارة', icon: '1000090321.svg' },
    { id: 'home', label: 'الرئيسية', icon: '1000090320.svg' },
  ];

  const handleAddNumber = () => {
    setAdditionalNumbers([...additionalNumbers, { number: '', amount: '' }]);
  };

  const handleRemoveNumber = (index: number) => {
    setAdditionalNumbers(additionalNumbers.filter((_, i) => i !== index));
  };

  const updateAdditionalNumber = (index: number, field: string, value: string) => {
    const updated = [...additionalNumbers];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalNumbers(updated);
  };

  const fetchInvoice = async () => {
    if (!mobileNumber || mobileNumber.length !== 8) {
      toast.error('يرجى إدخال رقم هاتف صحيح');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ooredoo/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: mobileNumber }),
      });

      const data = await response.json();

      if (data.success) {
        setInvoiceData({
          amount: data.data.amount,
          type: data.data.type,
        });
        setAmount(data.data.amount.toString());
        toast.success('تم جلب الفاتورة بنجاح');
      } else {
        toast.error(data.error || 'فشل جلب الفاتورة');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayClick = async () => {
    if (!mobileNumber) {
      toast.error('يرجى إدخال رقم الهاتف');
      return;
    }

    // If we don't have invoice data, fetch it first
    if (!invoiceData) {
      await fetchInvoice();
      // After fetching, move to amount confirmation
      setTimeout(() => {
        setCurrentPage('amount');
      }, 500);
    } else {
      // Already have invoice data, go to amount confirmation
      setCurrentPage('amount');
    }
  };

  const handleAmountConfirm = (confirmedAmount: number) => {
    setSelectedAmount(confirmedAmount);
    setCurrentPage('payment');
  };

  const handlePaymentMethodSelect = (method: string) => {
    toast.success(`تم اختيار: ${method}`);
    // Here you would integrate with actual payment gateway
    console.log(`Payment method selected: ${method}, Amount: ${selectedAmount}, Phone: ${mobileNumber}`);
    
    // Reset after successful payment
    setTimeout(() => {
      setCurrentPage('main');
      setMobileNumber('');
      setAmount('');
      setInvoiceData(null);
      setSelectedAmount(0);
    }, 1000);
  };

  // Render different pages based on currentPage state
  if (currentPage === 'amount' && invoiceData) {
    return (
      <AmountConfirmation
        phoneNumber={mobileNumber}
        accountType={invoiceData.type}
        dueAmount={invoiceData.amount}
        onConfirm={handleAmountConfirm}
        onBack={() => setCurrentPage('main')}
      />
    );
  }

  if (currentPage === 'payment') {
    return (
      <PaymentMethods
        phoneNumber={mobileNumber}
        amount={selectedAmount}
        onSelectMethod={handlePaymentMethodSelect}
        onBack={() => setCurrentPage('amount')}
      />
    );
  }

  // Main payment page
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/1000090325.svg" alt="headphones" className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-gray-800">دفع</h1>
          <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
            EN
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="p-4">
          {/* Payment Card */}
          <div className="bg-white rounded-2xl p-6 mb-6">
            {/* First Row: All Numbers and Add Number */}
            <div className="flex items-center justify-between gap-4 mb-6">
              {/* Add Number Button - Left Side */}
              <button
                onClick={handleAddNumber}
                className="px-6 py-2 border-2 border-black rounded-full text-sm font-semibold hover:bg-gray-50 whitespace-nowrap"
              >
                إضافة رقم
              </button>

              {/* All Numbers - Right Side */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedAllNumbers}
                    onChange={(e) => setCheckedAllNumbers(e.target.checked)}
                    className="w-5 h-5"
                  />
                </label>
                <span className="text-gray-700 font-medium">جميع الأرقام</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-gray-200 mb-6"></div>

            {/* Second Row: Phone Number and Amount */}
            <div className="flex items-end gap-4 mb-6">
              {/* Phone Number - Right Side */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-red-600 mb-2">
                  *رقم الهاتف
                </label>
                <input
                  type="text"
                  placeholder="رقم الهاتف"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  onBlur={fetchInvoice}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>

              {/* Amount - Left Side */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-red-600 mb-2">
                  *المبلغ
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="0.000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    readOnly={invoiceData?.type === 'postpaid'}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                  <span className="text-gray-600 font-medium whitespace-nowrap">د.ك</span>
                </div>
              </div>
            </div>

            {/* Checkboxes Row */}
            <div className="flex justify-between gap-4">
              {/* Checkbox for Amount - Left */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5"
                />
              </label>

              {/* Checkbox for Phone - Right */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedPhone}
                  onChange={(e) => setCheckedPhone(e.target.checked)}
                  className="w-5 h-5"
                />
              </label>
            </div>

            {/* Invoice Info Display */}
            {invoiceData && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-right">
                    <p className="text-gray-600 text-sm">نوع الحساب</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {invoiceData.type === 'postpaid' ? 'فاتورة' : 'مسبق الدفع'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600 text-sm">المبلغ المستحق</p>
                    <p className="text-lg font-semibold text-red-600">
                      {invoiceData.amount.toFixed(3)} د.ك
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Numbers */}
            {additionalNumbers.length > 0 && (
              <div className="mt-6 space-y-4">
                {additionalNumbers.map((item, index) => (
                  <div key={index} className="border-t border-gray-200 pt-4">
                    <div className="flex items-end gap-4 mb-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="رقم الهاتف"
                          value={item.number}
                          onChange={(e) => updateAdditionalNumber(index, 'number', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="0.000"
                            value={item.amount}
                            onChange={(e) => updateAdditionalNumber(index, 'amount', e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                          />
                          <span className="text-gray-600 font-medium whitespace-nowrap">د.ك</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveNumber(index)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Options Section */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">خيارات الدفع</h2>
            <p className="text-gray-600 text-sm">
              استمتع بمزايا التطبيق مع المزيد من خيارات الدفع
            </p>
          </div>

          {/* Empty Payment Options Area */}
          <div className="bg-white rounded-2xl p-8 mb-6 text-center text-gray-400 min-h-48">
            {/* Payment options will go here */}
          </div>
        </div>
      </div>

      {/* Pay Button */}
      <div className="fixed bottom-24 left-0 right-0 px-4 py-4 bg-gray-50">
        <button
          onClick={handlePayClick}
          disabled={isLoading || !mobileNumber}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            isLoading || !mobileNumber
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {isLoading ? 'جاري التحميل...' : `دفع (د.ك ${parseFloat(amount) || 0})`}
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 ${
              item.isActive ? 'text-red-600' : 'text-gray-600'
            }`}
          >
            <img
              src={`/${item.icon}`}
              alt={item.label}
              className="w-6 h-6"
              style={{ filter: item.isActive ? 'brightness(0) saturate(100%) invert(23%) sepia(95%) saturate(1352%) hue-rotate(358deg)' : 'none' }}
            />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
