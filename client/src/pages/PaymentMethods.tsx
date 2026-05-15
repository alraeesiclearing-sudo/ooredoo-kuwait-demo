import { useState } from 'react';

interface PaymentMethodsProps {
  phoneNumber: string;
  amount: number;
  onSelectMethod: (method: string) => void;
  onBack: () => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export default function PaymentMethods({
  phoneNumber,
  amount,
  onSelectMethod,
  onBack,
}: PaymentMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'knet',
      name: 'Knet',
      icon: '💳',
      description: 'بطاقة Knet الكويتية',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    },
    {
      id: 'visa',
      name: 'Visa / Mastercard',
      icon: '💳',
      description: 'بطاقة ائتمان دولية',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    },
    {
      id: 'google-pay',
      name: 'Google Pay',
      icon: '🔵',
      description: 'الدفع عبر Google Pay',
      color: 'bg-red-50 border-red-200 hover:bg-red-100',
    },
    {
      id: 'google-wallet',
      name: 'Google Wallet',
      icon: '👛',
      description: 'محفظتك الرقمية',
      color: 'bg-green-50 border-green-200 hover:bg-green-100',
    },
    {
      id: 'apple-pay',
      name: 'Apple Pay',
      icon: '🍎',
      description: 'الدفع عبر Apple Pay',
      color: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
    },
  ];

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
    // Simulate processing
    setTimeout(() => {
      onSelectMethod(methodId);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            →
          </button>
          <h1 className="text-lg font-bold text-gray-800">ملخص</h1>
          <div className="w-6"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="p-4">
          {/* Title Section */}
          <div className="text-center mb-6 mt-4">
            <h2 className="text-2xl font-bold text-gray-800">دفع سريع وآمن</h2>
          </div>

          {/* Amount Display Card */}
          <div className="bg-gray-100 rounded-2xl p-6 mb-8">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-3">الإجمالي</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-5xl font-bold text-gray-800">{amount.toFixed(3)}</span>
                <span className="text-2xl font-semibold text-gray-600">د.ك</span>
              </div>
            </div>
          </div>

          {/* Payment Method Title */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800">طريقة الدفع</h3>
            <p className="text-gray-600 text-sm">يرجى اختيار طريقة الدفع</p>
          </div>

          {/* Payment Methods Grid */}
          <div className="space-y-4 mb-6">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => handleSelectMethod(method.id)}
                className={`w-full p-5 border-2 rounded-2xl transition-all ${
                  selectedMethod === method.id
                    ? 'border-red-600 bg-white'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-4xl">{method.icon}</span>
                    <div className="text-right">
                      <p className="font-bold text-gray-800 text-lg">{method.name}</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === method.id
                      ? 'border-red-600 bg-red-600'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {selectedMethod === method.id && (
                      <span className="text-white text-sm font-bold">✓</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>


        </div>
      </div>

      {/* Confirm Button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-200">
        <button
          onClick={() => {
            if (selectedMethod) {
              handleSelectMethod(selectedMethod);
            }
          }}
          disabled={!selectedMethod}
          className={`w-full py-4 rounded-full font-bold text-lg transition-colors ${
            selectedMethod
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          استمرار
        </button>
      </div>
    </div>
  );
}
