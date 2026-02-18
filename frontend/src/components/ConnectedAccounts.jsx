import { useEffect, useState } from 'react';
import { api } from '../api';
import IndianBankSelector from './IndianBankSelector';
import { Building2, RefreshCw, Trash2, Plus, CheckCircle2, Sparkles } from 'lucide-react';

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

  const handleBankSelect = async (bankId) => {
    try {
      await api.connectBank(bankId);
      alert('Bank account connected successfully!');
      setShowBankSelector(false);
      await loadConnections();
      await loadDetectedSubscriptions();
    } catch (error) {
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
    } catch (error) {
      alert('Failed to remove account');
    }
  };

  const handleImport = async (detectedId) => {
    try {
      await api.importDetection(detectedId);
      await loadDetectedSubscriptions();
      window.dispatchEvent(new CustomEvent('subscriptions-updated'));
    } catch (error) {
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bank Integration</h1>
          <p className="text-sm text-gray-500 mt-1">Connect accounts and auto-detect subscriptions</p>
        </div>
        <button
          onClick={() => setShowBankSelector(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Connect Bank
        </button>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Connected Accounts</h2>
        {connections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {connections.map((conn) => (
              <div key={conn.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{conn.bankName || conn.institutionName}</div>
                    <div className="text-xs text-gray-500">{conn.accountIdentifier || 'Connected'}</div>
                  </div>
                </div>
                {(conn.lastSyncedAt || conn.lastSync) && (
                  <div className="text-xs text-gray-400 mb-3">
                    Synced: {new Date(conn.lastSyncedAt || conn.lastSync).toLocaleString()}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(conn.id)}
                    disabled={syncing[conn.id]}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing[conn.id] ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  <button
                    onClick={() => handleRemoveConnection(conn.id, conn.bankName || conn.institutionName)}
                    className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 border border-gray-200 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-2">No accounts connected yet</p>
            <button onClick={() => setShowBankSelector(true)} className="text-sm text-indigo-600 font-medium hover:text-indigo-700">
              Connect your first account
            </button>
          </div>
        )}
      </div>

      {/* Detected Subscriptions */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-900">Detected from Bank</h2>
        </div>
        {detectedSubscriptions.length > 0 ? (
          <div className="space-y-2">
            {detectedSubscriptions.map((sub) => {
              const confidence = sub.confidence_score ?? sub.confidence ?? 0;
              const display = confidence > 1 ? confidence : confidence * 100;
              return (
                <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white border border-emerald-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{sub.name || sub.merchant}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${display >= 85 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {display.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {sub.amount != null && <span className="font-medium text-gray-900">₹{parseFloat(sub.amount).toFixed(2)}</span>}
                      <span className="capitalize">/{sub.billing_cycle || sub.billingCycle}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleImport(sub.id)} className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700">Import</button>
                    <button onClick={() => handleDismiss(sub.id)} className="px-3 py-2 bg-white text-gray-600 border border-gray-300 text-xs font-medium rounded-lg hover:bg-gray-50">Dismiss</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 bg-white rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">
              {connections.length > 0 ? 'No new subscriptions detected.' : 'Connect a bank account to auto-detect subscriptions.'}
            </p>
          </div>
        )}
      </div>

      {showBankSelector && <IndianBankSelector onSelect={handleBankSelect} onClose={() => setShowBankSelector(false)} />}
    </div>
  );
}
