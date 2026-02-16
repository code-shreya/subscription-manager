import { useEffect, useState } from 'react';
import { api } from '../api';
import IndianBankSelector from './IndianBankSelector';
import {
  Building2,
  CreditCard,
  RefreshCw,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function ConnectedAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [detectedSubscriptions, setDetectedSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBankSelector, setShowBankSelector] = useState(false);
  const [syncing, setSyncing] = useState({});

  useEffect(() => {
    loadAccounts();
    loadDetectedSubscriptions();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await api.getConnectedAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetectedSubscriptions = async () => {
    try {
      const data = await api.getDetectedFromBank();
      setDetectedSubscriptions(data);
    } catch (error) {
      console.error('Failed to load detected subscriptions:', error);
    }
  };

  const handleConnectBank = () => {
    console.log('🔘 Connect Bank Account button clicked');
    setShowBankSelector(true);
  };

  const handleBankSelect = async (bankId) => {
    console.log('🏦 handleBankSelect called with bankId:', bankId);
    try {
      console.log('📡 Calling API to exchange token...');
      const result = await api.exchangePublicToken(null, { bankId });
      console.log('✅ API call successful:', result);
      alert('✅ Bank account connected successfully!');
      setShowBankSelector(false);
      await loadAccounts();
      await loadDetectedSubscriptions();
    } catch (error) {
      console.error('❌ Failed to connect bank:', error);
      alert('❌ Failed to connect account: ' + error.message);
    }
  };

  const handleSync = async (accountId) => {
    setSyncing({ ...syncing, [accountId]: true });
    try {
      await api.syncAccount(accountId);
      await loadAccounts();
      await loadDetectedSubscriptions();
      alert('✅ Transactions synced!');
    } catch (error) {
      console.error('Failed to sync:', error);
      alert('❌ Failed to sync transactions');
    } finally {
      setSyncing({ ...syncing, [accountId]: false });
    }
  };

  const handleRemoveAccount = async (accountId, institutionName) => {
    if (!confirm(`Remove ${institutionName}? This will disconnect the account.`)) return;

    try {
      await api.removeConnectedAccount(accountId);
      await loadAccounts();
      alert('✅ Account removed');
    } catch (error) {
      console.error('Failed to remove account:', error);
      alert('❌ Failed to remove account');
    }
  };

  const handleImport = async (detectedId) => {
    try {
      await api.importFromBank(detectedId);
      await loadDetectedSubscriptions();
      window.dispatchEvent(new CustomEvent('subscriptions-updated'));
      alert('✅ Subscription imported!');
    } catch (error) {
      console.error('Failed to import:', error);
      alert('❌ Failed to import subscription');
    }
  };

  const handleDismiss = async (detectedId) => {
    try {
      await api.dismissDetectedBank(detectedId);
      await loadDetectedSubscriptions();
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bank Integration</h1>
          <p className="text-sm text-gray-500 mt-1">
            Connect accounts and auto-detect subscriptions
          </p>
        </div>
        <button
          onClick={handleConnectBank}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30"
        >
          <Plus className="w-4 h-4" />
          Connect Bank Account
        </button>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Accounts</h2>
        {accounts.length > 0 ? (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-purple-200 transition-all bg-gradient-to-r from-white to-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{account.institutionName}</div>
                    <div className="text-sm text-gray-500">
                      {account.accounts.length} account{account.accounts.length !== 1 ? 's' : ''} connected
                    </div>
                    {account.lastSync && (
                      <div className="text-xs text-gray-400 mt-1">
                        Last synced: {new Date(account.lastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={syncing[account.id]}
                    className="p-2 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 text-purple-600 ${syncing[account.id] ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleRemoveAccount(account.id, account.institutionName)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No accounts connected yet</p>
            <button
              onClick={handleConnectBank}
              className="mt-4 text-sm text-purple-600 font-medium hover:text-purple-700"
            >
              Connect your first account
            </button>
          </div>
        )}
      </div>

      {/* Detected Subscriptions */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-900">Detected Subscriptions from Bank</h2>
        </div>
        {detectedSubscriptions.length > 0 ? (
          <div className="space-y-3">
            {detectedSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-emerald-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-semibold text-gray-900">{sub.merchant}</div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      sub.confidence >= 0.85
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {(sub.confidence * 100).toFixed(0)}% confident
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-medium text-lg text-gray-900">₹{sub.amount.toFixed(2)}</span>
                    <span className="capitalize">/{sub.billingCycle}</span>
                    <span>• {sub.transactionCount} transactions detected</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImport(sub.id)}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Import
                  </button>
                  <button
                    onClick={() => handleDismiss(sub.id)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-xl">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {accounts.length > 0
                ? 'No new subscriptions detected. Connect more accounts or sync existing ones.'
                : 'Connect a bank account to automatically detect subscriptions from your transactions.'}
            </p>
          </div>
        )}
      </div>

      {/* Indian Bank Selector Modal */}
      {showBankSelector && (
        <IndianBankSelector
          onSelect={handleBankSelect}
          onClose={() => setShowBankSelector(false)}
        />
      )}
    </div>
  );
}
