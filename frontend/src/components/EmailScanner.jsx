import { useEffect, useState } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, Sparkles, AlertTriangle, Download, Search, Check } from 'lucide-react';
import DeepScanInsights from './DeepScanInsights';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const categoryColors = {
  confirmed_subscription: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' },
  one_time_payment: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' },
  failed_payment: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' },
  other: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100' },
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
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, phase: '' });

  useEffect(() => {
    checkConnection();
    loadDetected();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/gmail/status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setIsConnected(!!data.connected);
    } catch (error) {
      console.error('Failed to check connection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadDetected = async () => {
    try {
      const response = await fetch(`${API_BASE}/gmail/detected`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setDetectedSubs(data.detected || []);
    } catch (error) {
      console.error('Failed to load detected:', error);
      setDetectedSubs([]);
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
    setScanProgress({ current: 0, total: 100, phase: 'Searching emails...' });

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev.current < prev.total) {
            return {
              ...prev,
              current: Math.min(prev.current + Math.random() * 10, prev.total - 5),
              phase: prev.current < 30 ? 'Searching emails...'
                    : prev.current < 60 ? 'Fetching email details...'
                    : 'Processing with AI...'
            };
          }
          return prev;
        });
      }, 500);

      const response = await fetch(`${API_BASE}/gmail/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxResults: 100, daysBack: 365 }),
      });

      clearInterval(progressInterval);
      setScanProgress({ current: 100, total: 100, phase: 'Complete!' });

      if (response.ok) {
        const data = await response.json();
        await loadDetected();
        window.dispatchEvent(new CustomEvent('subscriptions-updated'));

        // Show completion message
        setTimeout(() => {
          alert(`✅ Scan complete! Found ${data.count} subscriptions from ${data.scannedEmails} emails.`);
        }, 300);
      }
    } catch (error) {
      console.error('Scan failed:', error);
      setScanProgress({ current: 0, total: 0, phase: 'Failed' });
    } finally {
      setTimeout(() => {
        setScanning(false);
        setScanProgress({ current: 0, total: 0, phase: '' });
      }, 1000);
    }
  };

  const handleDeepScan = async () => {
    if (!confirm('🔍 Deep scan will analyze all emails from the past 365 days with advanced insights. This may take 5-10 minutes. Continue?')) {
      return;
    }

    setDeepScanning(true);
    setScanProgress({ current: 0, total: 365, phase: 'Initializing deep scan...' });

    try {
      // Simulate progress for deep scan
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev.current < prev.total) {
            const increment = Math.random() * 15;
            const newCurrent = Math.min(prev.current + increment, prev.total - 10);
            return {
              ...prev,
              current: newCurrent,
              phase: newCurrent < 50 ? 'Searching emails (365 days)...'
                    : newCurrent < 150 ? 'Fetching email details...'
                    : newCurrent < 250 ? 'Processing with AI...'
                    : newCurrent < 320 ? 'Analyzing patterns...'
                    : 'Generating insights...'
            };
          }
          return prev;
        });
      }, 800);

      const response = await fetch(`${API_BASE}/gmail/deep-scan`, {
        method: 'POST',
      });

      clearInterval(progressInterval);
      setScanProgress({ current: 365, total: 365, phase: 'Complete!' });

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
      setScanProgress({ current: 0, total: 0, phase: 'Failed' });
    } finally {
      setTimeout(() => {
        setDeepScanning(false);
        setScanProgress({ current: 0, total: 0, phase: '' });
      }, 1500);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0969da]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-4 border-b border-[#d0d7de]">
        <h1 className="text-2xl font-semibold text-[#24292f]">Email Scanner</h1>
        <p className="text-sm text-gray-600 mt-1">Scan your inbox for subscription emails</p>
      </div>

      {/* Connection Card */}
      <div className={`border rounded-md p-4 ${
        isConnected
          ? 'bg-green-50 border-green-200'
          : 'bg-[#f6f8fa] border-[#d0d7de]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              isConnected ? 'bg-green-600' : 'bg-gray-600'
            }`}>
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#24292f]">Gmail Connection</h3>
                {isConnected && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 border border-green-200 rounded-md">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {isConnected ? 'Ready to scan your emails' : 'Connect your Gmail to get started'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white text-sm font-medium rounded-md hover:bg-[#2c974b] transition-colors"
              >
                <Mail className="w-4 h-4" />
                Connect Gmail
              </button>
            ) : (
              <>
                <button
                  onClick={handleScan}
                  disabled={scanning || deepScanning}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white text-sm font-medium rounded-md hover:bg-[#2c974b] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                  {scanning ? 'Scanning...' : 'Quick Scan'}
                </button>
                <button
                  onClick={handleDeepScan}
                  disabled={scanning || deepScanning}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0969da] text-white text-sm font-medium rounded-md hover:bg-[#0860ca] transition-colors disabled:opacity-50"
                >
                  <Search className={`w-4 h-4 ${deepScanning ? 'animate-pulse' : ''}`} />
                  {deepScanning ? 'Deep Scanning...' : '365-Day Deep Scan'}
                </button>
                {deepScanResults && (
                  <button
                    onClick={() => setShowInsights(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
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

      {/* Scan Progress Indicator */}
      {(scanning || deepScanning) && scanProgress.total > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-sm font-semibold text-[#24292f]">{scanProgress.phase}</span>
            </div>
            <span className="text-sm font-medium text-gray-600">
              {Math.round((scanProgress.current / scanProgress.total) * 100)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#0969da] h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
            <span>{deepScanning ? 'Deep scanning may take 5-10 minutes' : 'Analyzing emails...'}</span>
            <span>{Math.round(scanProgress.current)}/{scanProgress.total} emails</span>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedSubs.size > 0 && (
        <div className="bg-[#0969da] rounded-md p-4">
          <div className="flex items-center justify-between text-white">
            <span className="font-semibold">{selectedSubs.size} selected</span>
            <button
              onClick={handleBulkImport}
              disabled={importing}
              className="px-4 py-2 bg-white text-[#0969da] font-medium rounded-md hover:bg-gray-100 transition-colors"
            >
              {importing ? 'Importing...' : 'Import Selected'}
            </button>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        {/* Confirmed Subscriptions */}
        {categorizedSubs.confirmed.length > 0 && (
          <CategorySection
            title="Confirmed Subscriptions"
            icon={<Sparkles className="w-5 h-5" />}
            count={categorizedSubs.confirmed.length}
            color="green"
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
        <div className="bg-white border border-[#d0d7de] rounded-md p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-[#24292f] mb-2">No emails scanned yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            {isConnected ? 'Click "Quick Scan" to find subscriptions' : 'Connect Gmail to get started'}
          </p>
        </div>
      )}

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

function CategorySection({ title, icon, count, color, subscriptions, selectedSubs, onToggleSelect, onImport, importing }) {
  const colors = {
    green: { bg: 'bg-[#2da44e]', badge: 'bg-green-100 text-green-700 border-green-200' },
    blue: { bg: 'bg-[#0969da]', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
    gray: { bg: 'bg-gray-600', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
  };

  const colorScheme = colors[color];

  return (
    <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
      <div className={`${colorScheme.bg} px-6 py-3`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold text-base">{title}</h3>
          </div>
          <span className="px-2.5 py-0.5 bg-white/20 rounded-md text-sm font-semibold">
            {count}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {subscriptions.map((sub) => (
          <div
            key={sub.emailId}
            className="flex items-start gap-3 p-3 bg-[#f6f8fa] border border-[#d0d7de] rounded-md hover:bg-gray-50 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedSubs.has(sub.emailId)}
              onChange={() => onToggleSelect(sub.emailId)}
              className="w-4 h-4 rounded border-gray-300 text-[#0969da] focus:ring-[#0969da] mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h4 className="font-semibold text-[#24292f]">{sub.serviceName}</h4>
                  <p className="text-sm text-gray-600 mt-1">{sub.description}</p>
                </div>
                {sub.amount && (
                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold text-[#24292f]">₹{sub.amount}</div>
                    <div className="text-xs text-gray-600">{sub.billingCycle}</div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span className={`px-2 py-0.5 rounded-md border font-medium ${colorScheme.badge}`}>
                  {sub.confidence}% confidence
                </span>
                <span>{sub.category}</span>
              </div>
            </div>
            <button
              onClick={() => onImport(sub)}
              disabled={importing}
              className="flex-shrink-0 p-2 bg-[#2da44e] text-white rounded-md hover:bg-[#2c974b] transition-colors disabled:opacity-50"
              title="Import"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
