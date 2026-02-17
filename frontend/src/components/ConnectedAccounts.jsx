import { useEffect, useState } from 'react';
import { api } from '../api';
import IndianBankSelector from './IndianBankSelector';
import {
  Building2,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export default function ConnectedAccounts() {
  const [connections, setConnections] = useState([]);
  const [detectedSubscriptions, setDetectedSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBankSelector, setShowBankSelector] = useState(false);
  const [syncing, setSyncing] = useState({});

  useEffect(() => {
    loadConnections();
    loadDetectedSubscriptions();
  }, []);

  const loadConnections = async () => {
    try {
      const data = await api.getBankConnections();
      setConnections(data.connections || data || []);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetectedSubscriptions = async () => {
    try {
      const data = await api.getDetectionResults('pending');
      const results = data.results || data || [];
      setDetectedSubscriptions(results.filter(r => r.source === 'bank'));
    } catch (error) {
      console.error('Failed to load detected subscriptions:', error);
    }
  };

  const handleConnectBank = () => {
    setShowBankSelector(true);
  };

  const handleBankSelect = async (bankId) => {
    try {
      await api.connectBank(bankId);
      alert('Bank account connected successfully!');
      setShowBankSelector(false);
      await loadConnections();
      await loadDetectedSubscriptions();
    } catch (error) {
      console.error('Failed to connect bank:', error);
      alert('Failed to connect account: ' + error.message);
    }
  };

  const handleSync = async (connectionId) => {
    setSyncing({ ...syncing, [connectionId]: true });
    try {
      await api.syncBankConnection(connectionId);
      await loadConnections();
      await loadDetectedSubscriptions();
      alert('Transactions synced!');
    } catch (error) {
      console.error('Failed to sync:', error);
      alert('Failed to sync transactions');
    } finally {
      setSyncing({ ...syncing, [connectionId]: false });
    }
  };

  const handleRemoveConnection = async (connectionId, bankName) => {
    if (!confirm(`Remove ${bankName}? This will disconnect the account.`)) return;

    try {
      await api.disconnectBank(connectionId);
      await loadConnections();
      alert('Account removed');
    } catch (error) {
      console.error('Failed to remove account:', error);
      alert('Failed to remove account');
    }
  };

  const handleImport = async (detectedId) => {
    try {
      await api.importDetection(detectedId);
      await loadDetectedSubscriptions();
      window.dispatchEvent(new CustomEvent('subscriptions-updated'));
      alert('Subscription imported!');
    } catch (error) {
      console.error('Failed to import:', error);
      alert('Failed to import subscription');
    }
  };

  const handleDismiss = async (detectedId) => {
    try {
      await api.rejectDetection(detectedId);
      await loadDetectedSubscriptions();
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0969da]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#d0d7de]">
        <div>
          <h1 className="text-2xl font-semibold text-[#24292f]">Bank Integration</h1>
          <p className="text-sm text-gray-600 mt-1">
            Connect accounts and auto-detect subscriptions
          </p>
        </div>
        <button
          onClick={handleConnectBank}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white text-sm font-medium rounded-md hover:bg-[#2c974b] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Connect Bank Account
        </button>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white border border-[#d0d7de] rounded-md p-6">
        <h2 className="text-base font-semibold text-[#24292f] mb-4">Connected Accounts</h2>
        {connections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="border border-[#d0d7de] rounded-md p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#0969da] rounded-md flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#24292f] truncate">{conn.bankName || conn.institutionName}</div>
                    <div className="text-sm text-gray-600">
                      {conn.accountIdentifier || 'Connected'}
                    </div>
                  </div>
                </div>
                {(conn.lastSyncedAt || conn.lastSync) && (
                  <div className="text-xs text-gray-600 mb-3">
                    Last synced: {new Date(conn.lastSyncedAt || conn.lastSync).toLocaleString()}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(conn.id)}
                    disabled={syncing[conn.id]}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing[conn.id] ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  <button
                    onClick={() => handleRemoveConnection(conn.id, conn.bankName || conn.institutionName)}
                    className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-300 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-3">No accounts connected yet</p>
            <button
              onClick={handleConnectBank}
              className="text-sm text-[#0969da] font-medium hover:underline"
            >
              Connect your first account
            </button>
          </div>
        )}
      </div>

      {/* Detected Subscriptions */}
      <div className="bg-green-50 border border-green-200 rounded-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-green-600" />
          <h2 className="text-base font-semibold text-[#24292f]">Detected Subscriptions from Bank</h2>
        </div>
        {detectedSubscriptions.length > 0 ? (
          <div className="space-y-3">
            {detectedSubscriptions.map((sub) => {
              const confidence = sub.confidence_score ?? sub.confidence ?? 0;
              const displayConfidence = confidence > 1 ? confidence : confidence * 100;

              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 bg-white border border-green-200 rounded-md"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold text-[#24292f]">{sub.name || sub.merchant}</div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${
                        displayConfidence >= 85
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {displayConfidence.toFixed(0)}% confident
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="font-semibold text-base text-[#24292f]">
                        {sub.amount != null ? `₹${parseFloat(sub.amount).toFixed(2)}` : '—'}
                      </span>
                      <span className="capitalize">/{sub.billing_cycle || sub.billingCycle}</span>
                      {sub.transactionCount && <span>{sub.transactionCount} transactions detected</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleImport(sub.id)}
                      className="px-4 py-2 bg-[#2da44e] text-white text-sm font-medium rounded-md hover:bg-[#2c974b] transition-colors"
                    >
                      Import
                    </button>
                    <button
                      onClick={() => handleDismiss(sub.id)}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-md border border-green-200">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              {connections.length > 0
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
