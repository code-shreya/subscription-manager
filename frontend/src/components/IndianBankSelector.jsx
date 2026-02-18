import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

const INDIAN_BANKS = [
  { id: 'hdfc', name: 'HDFC Bank', color: '#004C8F' },
  { id: 'icici', name: 'ICICI Bank', color: '#F37021' },
  { id: 'sbi', name: 'State Bank of India', color: '#22408F' },
  { id: 'axis', name: 'Axis Bank', color: '#97144D' },
  { id: 'kotak', name: 'Kotak Mahindra Bank', color: '#ED232A' },
];

export default function IndianBankSelector({ onSelect, onClose }) {
  const [selectedBank, setSelectedBank] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!selectedBank) return;
    setConnecting(true);
    try {
      await onSelect(selectedBank.id);
    } catch (error) {
      alert('Failed to connect bank: ' + error.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-xl border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Connect Your Bank</h2>
            <p className="text-sm text-gray-500 mt-0.5">Select your bank to connect</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Bank List */}
        <div className="p-5 overflow-y-auto max-h-[50vh] space-y-2">
          {INDIAN_BANKS.map((bank) => (
            <button
              type="button"
              key={bank.id}
              onClick={() => setSelectedBank(bank)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-lg border-2 transition-all ${
                selectedBank?.id === bank.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: bank.color }}
              >
                {bank.name.split(' ')[0][0]}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900">{bank.name}</div>
                <div className="text-xs text-gray-500">Savings / Credit Card</div>
              </div>
              {selectedBank?.id === bank.id && (
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              )}
            </button>
          ))}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs font-medium text-blue-800">Demo Mode</div>
            <div className="text-xs text-blue-600 mt-0.5">
              This is a demo with mock data. In production, connections use the Account Aggregator framework.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConnect}
            disabled={!selectedBank || connecting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connecting ? 'Connecting...' : selectedBank ? `Connect ${selectedBank.name}` : 'Select a Bank'}
          </button>
        </div>
      </div>
    </div>
  );
}
