import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface AmountConfirmationProps {
  phoneNumber: string;
  accountType: 'postpaid' | 'prepaid';
  dueAmount?: number;
  onConfirm: (amount: number) => void;
  onBack: () => void;
}

export default function AmountConfirmation({
  phoneNumber,
  accountType,
  dueAmount = 0,
  onConfirm,
  onBack,
}: AmountConfirmationProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState(dueAmount);

  useEffect(() => {
    if (accountType === 'postpaid') {
      setDisplayAmount(dueAmount);
    } else {
      setDisplayAmount(0);
    }
  }, [accountType, dueAmount]);

  const handleAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value) || 0;
    setDisplayAmount(numValue);
  };

  const handleConfirm = () => {
    if (displayAmount > 0) {
      onConfirm(displayAmount);
    }
  };

  const isAmountValid = displayAmount > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 text-xl"
          >
            ←
          </button>
          <h1 className="text-lg font-bold text-gray-800">تأكيد المبلغ</h1>
          <div className="w-6"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="p-4">
          {/* Phone Number Display */}
          <div className="bg-white rounded-2xl p-6 mb-6">
            <div className="text-center mb-6">
              <p className="text-gray-600 text-sm mb-2">رقم الهاتف</p>
              <p className="text-2xl font-bold text-gray-800">{phoneNumber}</p>
            </div>

            {/* Account Type Badge */}
            <div className="flex justify-center mb-6">
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  accountType === 'postpaid'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {accountType === 'postpaid' ? 'فاتورة' : 'مسبق الدفع'}
              </span>
            </div>

            {/* Divider */}
            <div className="border-b border-gray-200 mb-6"></div>

            {/* Amount Section */}
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-4">
                {accountType === 'postpaid' ? 'المبلغ المستحق' : 'أدخل المبلغ المراد شحنه'}
              </p>

              {accountType === 'postpaid' ? (
                // Display due amount for postpaid
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold text-red-600">{dueAmount.toFixed(3)}</span>
                    <span className="text-2xl font-semibold text-gray-600">د.ك</span>
                  </div>
                </div>
              ) : (
                // Input field for prepaid
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <input
                      type="number"
                      placeholder="0.000"
                      value={customAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="text-4xl font-bold text-red-600 w-32 text-center border-b-2 border-red-600 focus:outline-none focus:border-red-700"
                      step="0.001"
                      min="0"
                    />
                    <span className="text-2xl font-semibold text-gray-600">د.ك</span>
                  </div>
                </div>
              )}

              {/* Amount Summary */}
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <p className="text-gray-600 text-sm mb-2">الإجمالي</p>
                <p className="text-3xl font-bold text-gray-800">
                  {displayAmount.toFixed(3)} د.ك
                </p>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm text-center">
              {accountType === 'postpaid'
                ? 'سيتم دفع المبلغ المستحق من فاتورتك'
                : 'سيتم شحن رصيدك بالمبلغ المحدد'}
            </p>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-200">
        <button
          onClick={handleConfirm}
          disabled={!isAmountValid}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            isAmountValid
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          متابعة إلى الدفع
        </button>
      </div>
    </div>
  );
}
