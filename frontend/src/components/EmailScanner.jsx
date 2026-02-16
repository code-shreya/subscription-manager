import { useEffect, useState } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, Sparkles, AlertTriangle, Download, Zap, Check, Search } from 'lucide-react';
import DeepScanInsights from './DeepScanInsights';

const API_BASE = 'http://localhost:3001/api';

const categoryColors = {
  confirmed_subscription: { bg: 'bg-emerald-500', border: 'border-emerald-300', text: 'text-emerald-700', gradient: 'from-emerald-500 to-teal-600' },
  one_time_payment: { bg: 'bg-blue-500', border: 'border-blue-300', text: 'text-blue-700', gradient: 'from-blue-500 to-cyan-600' },
  failed_payment: { bg: 'bg-rose-500', border: 'border-rose-300', text: 'text-rose-700', gradient: 'from-rose-500 to-pink-600' },
  other: { bg: 'bg-gray-500', border: 'border-gray-300', text: 'text-gray-700', gradient: 'from-gray-500 to-slate-600' },
};

export default function EmailScanner() {
  const [isConnected, setIsConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [deepScanning, setDeepScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [detectedSubs, setDetectedSubs] = useState([]);
  const [selectedSubs, setSelectedSubs] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showInsights, setShowInsights] = useState(false);
  const [deepScanResults, setDeepScanResults] = useState(null);

  useEffect(() => {
    checkConnection();
    loadDetected();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/gmail/status`);
      const data = await response.json();
      setIsConnected(data.connected);
    } catch (error) {
      console.error('Failed to check connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetected = async () => {
    try {
      const response = await fetch(`${API_BASE}/gmail/detected`);
      const data = await response.json();
      setDetectedSubs(data.detected || []);
    } catch (error) {
      console.error('Failed to load detected:', error);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await fetch(`${API_BASE}/gmail/auth-url`);
      const data = await response.json();
      window.open(data.authUrl, '_blank', 'width=600,height=700');

      const checkInterval = setInterval(async () => {
        await checkConnection();
        const statusResponse = await fetch(`${API_BASE}/gmail/status`);
        const statusData = await statusResponse.json();
        if (statusData.connected) {
          setIsConnected(true);
          clearInterval(checkInterval);
        }
      }, 2000);

      setTimeout(() => clearInterval(checkInterval), 60000);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const response = await fetch(`${API_BASE}/gmail/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxResults: 100, daysBack: 365 }),
      });

      if (response.ok) {
        await loadDetected();
        window.dispatchEvent(new CustomEvent('subscriptions-updated'));
      }
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const handleDeepScan = async () => {
    if (!confirm('🔍 Deep scan will analyze all emails from the past 365 days with advanced insights. This may take 5-10 minutes. Continue?')) {
      return;
    }

    setDeepScanning(true);
    try {
      const response = await fetch(`${API_BASE}/gmail/deep-scan`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Deep scan failed');
      }

      const data = await response.json();
      setDetectedSubs(data.detected || []);
      setDeepScanResults({
        analysis: data.analysis,
        priceChanges: data.priceChanges || [],
      });
      setShowInsights(true);

      window.dispatchEvent(new CustomEvent('subscriptions-updated'));
    } catch (error) {
      console.error('Deep scan error:', error);
      alert('❌ Deep scan failed: ' + error.message);
    } finally {
      setDeepScanning(false);
    }
  };

  const handleImport = async (subscription) => {
    setImporting(true);
    try {
      await fetch(`${API_BASE}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subscription.serviceName,
          amount: subscription.amount,
          currency: subscription.currency || 'INR',
          billing_cycle: subscription.billingCycle || 'monthly',
          next_billing_date: subscription.nextBillingDate,
          category: subscription.category || 'Other',
          status: 'active',
          description: subscription.description,
        }),
      });

      setDetectedSubs(prev => prev.filter(s => s.emailId !== subscription.emailId));
      window.dispatchEvent(new CustomEvent('subscriptions-updated'));
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleBulkImport = async () => {
    setImporting(true);
    const selected = detectedSubs.filter(sub => selectedSubs.has(sub.emailId));

    for (const sub of selected) {
      await handleImport(sub);
    }

    setSelectedSubs(new Set());
    setImporting(false);
  };

  const toggleSelect = (emailId) => {
    setSelectedSubs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const categorizedSubs = {
    confirmed: detectedSubs.filter(s => s.emailType === 'confirmed_subscription' || s.isConfirmationEmail),
    oneTime: detectedSubs.filter(s => s.emailType === 'one_time_payment'),
    failed: detectedSubs.filter(s => s.emailType === 'failed_payment'),
    other: detectedSubs.filter(s => !s.emailType || s.emailType === 'other'),
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Email Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">Scan your inbox for subscription emails</p>
      </div>

      {/* Connection Card */}
      <div className={`rounded-2xl border-2 p-6 ${
        isConnected
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300'
          : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
              isConnected ? 'from-emerald-500 to-teal-600' : 'from-purple-600 to-pink-600'
            } flex items-center justify-center shadow-lg`}>
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Gmail Connection</h3>
                {isConnected && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {isConnected ? 'Ready to scan your emails' : 'Connect your Gmail to get started'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
              >
                <Mail className="w-4 h-4" />
                Connect Gmail
              </button>
            ) : (
              <>
                <button
                  onClick={handleScan}
                  disabled={scanning || deepScanning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                  {scanning ? 'Scanning...' : 'Quick Scan'}
                </button>
                <button
                  onClick={handleDeepScan}
                  disabled={scanning || deepScanning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50"
                >
                  <Search className={`w-4 h-4 ${deepScanning ? 'animate-pulse' : ''}`} />
                  {deepScanning ? 'Deep Scanning...' : '365-Day Deep Scan'}
                </button>
                {deepScanResults && (
                  <button
                    onClick={() => setShowInsights(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    View Insights
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedSubs.size > 0 && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-white">
            <span className="font-semibold">{selectedSubs.size} selected</span>
            <button
              onClick={handleBulkImport}
              disabled={importing}
              className="px-4 py-2 bg-white text-purple-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              {importing ? 'Importing...' : 'Import Selected'}
            </button>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-6">
        {/* Confirmed Subscriptions */}
        {categorizedSubs.confirmed.length > 0 && (
          <CategorySection
            title="Confirmed Subscriptions"
            icon={<Sparkles className="w-5 h-5" />}
            count={categorizedSubs.confirmed.length}
            color="emerald"
            subscriptions={categorizedSubs.confirmed}
            selectedSubs={selectedSubs}
            onToggleSelect={toggleSelect}
            onImport={handleImport}
            importing={importing}
          />
        )}

        {/* One-Time Payments */}
        {categorizedSubs.oneTime.length > 0 && (
          <CategorySection
            title="One-Time Payments"
            icon={<Download className="w-5 h-5" />}
            count={categorizedSubs.oneTime.length}
            color="blue"
            subscriptions={categorizedSubs.oneTime}
            selectedSubs={selectedSubs}
            onToggleSelect={toggleSelect}
            onImport={handleImport}
            importing={importing}
          />
        )}

        {/* Failed/Other */}
        {(categorizedSubs.failed.length > 0 || categorizedSubs.other.length > 0) && (
          <CategorySection
            title="Other Emails"
            icon={<AlertTriangle className="w-5 h-5" />}
            count={categorizedSubs.failed.length + categorizedSubs.other.length}
            color="gray"
            subscriptions={[...categorizedSubs.failed, ...categorizedSubs.other]}
            selectedSubs={selectedSubs}
            onToggleSelect={toggleSelect}
            onImport={handleImport}
            importing={importing}
          />
        )}
      </div>

      {/* Empty State */}
      {detectedSubs.length === 0 && !scanning && (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No emails scanned yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            {isConnected ? 'Click "Scan Emails" to find subscriptions' : 'Connect Gmail to get started'}
          </p>
        </div>
      )}
    </div>
  );
}

function CategorySection({ title, icon, count, color, subscriptions, selectedSubs, onToggleSelect, onImport, importing }) {
  const colors = {
    emerald: { bg: 'from-emerald-500 to-teal-600', border: 'border-emerald-300', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },
    blue: { bg: 'from-blue-500 to-cyan-600', border: 'border-blue-300', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700' },
    gray: { bg: 'from-gray-500 to-slate-600', border: 'border-gray-300', badgeBg: 'bg-gray-100', badgeText: 'text-gray-700' },
  };

  const colorScheme = colors[color];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className={`bg-gradient-to-r ${colorScheme.bg} px-6 py-4`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
            {count}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {subscriptions.map((sub) => (
          <div
            key={sub.emailId}
            className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
          >
            <input
              type="checkbox"
              checked={selectedSubs.has(sub.emailId)}
              onChange={() => onToggleSelect(sub.emailId)}
              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{sub.serviceName}</h4>
                  <p className="text-sm text-gray-500 mt-1">{sub.description}</p>
                </div>
                {sub.amount && (
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-gray-900">₹{sub.amount}</div>
                    <div className="text-xs text-gray-500">{sub.billingCycle}</div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className={`px-2 py-1 ${colorScheme.badgeBg} ${colorScheme.badgeText} rounded font-medium`}>
                  {sub.confidence}% confidence
                </span>
                <span>{sub.category}</span>
              </div>
            </div>
            <button
              onClick={() => onImport(sub)}
              disabled={importing}
              className="flex-shrink-0 p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
              title="Import"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Deep Scan Insights Modal */}
      {showInsights && deepScanResults && (
        <DeepScanInsights
          analysis={deepScanResults.analysis}
          priceChanges={deepScanResults.priceChanges}
          onClose={() => setShowInsights(false)}
        />
      )}
    </div>
  );
}
