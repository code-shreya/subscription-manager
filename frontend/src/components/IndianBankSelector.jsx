import { useState } from 'react';
import { Building2, X, CheckCircle2 } from 'lucide-react';

const INDIAN_BANKS = [
  { id: 'hdfc', name: 'HDFC Bank', logo: '🏦', color: '#004C8F' },
  { id: 'icici', name: 'ICICI Bank', logo: '🏦', color: '#F37021' },
  { id: 'sbi', name: 'State Bank of India', logo: '🏦', color: '#22408F' },
  { id: 'axis', name: 'Axis Bank', logo: '🏦', color: '#97144D' },
  { id: 'kotak', name: 'Kotak Mahindra Bank', logo: '🏦', color: '#ED232A' },
];

export default function IndianBankSelector({ onSelect, onClose }) {
  const [selectedBank, setSelectedBank] = useState(null);
  const [connecting, setConnecting] = useState(false);

  console.log('🏦 IndianBankSelector rendered, selectedBank:', selectedBank);

  const handleConnect = async () => {
    console.log('🔗 Connect button clicked, selectedBank:', selectedBank);
    if (!selectedBank) {
      console.warn('⚠️ No bank selected');
      return;
    }

    setConnecting(true);
    console.log('📡 Calling onSelect with bankId:', selectedBank.id);
    try {
      await onSelect(selectedBank.id);
      console.log('✅ Bank connected successfully');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      alert('Failed to connect bank: ' + error.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl relative z-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Connect Your Bank</h2>
              <p className="text-sm text-white/80 mt-1">Select your bank to connect</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Bank List */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {INDIAN_BANKS.map((bank) => (
              <button
                type="button"
                key={bank.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🏦 Bank clicked:', bank.name, bank.id);
                  setSelectedBank(bank);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.02] ${
                  selectedBank?.id === bank.id
                    ? 'border-purple-600 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-sm"
                  style={{ backgroundColor: `${bank.color}20` }}
                >
                  {bank.logo}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 text-lg">{bank.name}</div>
                  <div className="text-sm text-gray-500">Savings • Credit Card</div>
                </div>
                {selectedBank?.id === bank.id && (
                  <CheckCircle2 className="w-6 h-6 text-purple-600" />
                )}
              </button>
            ))}
          </div>

          {/* Demo Notice */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex gap-3">
              <div className="text-2xl">ℹ️</div>
              <div>
                <div className="font-semibold text-blue-900 text-sm">Demo Mode</div>
                <div className="text-xs text-blue-700 mt-1">
                  This is a demo with mock data. In production, you'll connect to real bank accounts
                  securely via Account Aggregator framework.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              style={{ pointerEvents: 'auto' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleConnect();
              }}
              disabled={!selectedBank || connecting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ pointerEvents: 'auto' }}
            >
              {connecting ? 'Connecting...' : selectedBank ? `Connect ${selectedBank.name}` : 'Select a Bank'}
            </button>
          </div>
        </div>

        {/* Secure Notice */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>🔒</span>
            <span>Secure connection • RBI Regulated • Your data is safe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
