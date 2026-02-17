import { useEffect, useState } from 'react';
import { api } from '../api';
import { Mail, RefreshCw, CheckCircle, Search, Sparkles, Check } from 'lucide-react';

export default function EmailScanner() {
  const [isConnected, setIsConnected] = useState(false);
  const [gmailConnectionId, setGmailConnectionId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [deepScanning, setDeepScanning] = useState(false);
  const [importing, setImporting] = useState({});
  const [detectedSubs, setDetectedSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, phase: '' });

  useEffect(() => {
    checkConnection();
    loadDetected();
  }, []);

  const checkConnection = async () => {
    try {
      const data = await api.getEmailConnections();
      const connections = data.connections || data || [];
      const gmail = connections.find(c => c.provider === 'gmail' && c.status === 'active');
      if (gmail) {
        setIsConnected(true);
        setGmailConnectionId(gmail.id);
      } else {
        setIsConnected(false);
        setGmailConnectionId(null);
      }
    } catch (error) {
      console.error('Failed to check connection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadDetected = async () => {
    try {
      const data = await api.getDetectionResults('pending');
      const results = data.results || data || [];
      setDetectedSubs(results.filter(r => r.source === 'email'));
    } catch (error) {
      console.error('Failed to load detected:', error);
      setDetectedSubs([]);
    }
  };

  const handleConnect = async () => {
    try {
      const data = await api.getGmailAuthUrl();
      const authUrl = data.authUrl || data.url;
      window.open(authUrl, '_blank', 'width=600,height=700');

      // Poll for connection
      const checkInterval = setInterval(async () => {
        try {
          const connData = await api.getEmailConnections();
          const connections = connData.connections || connData || [];
          const gmail = connections.find(c => c.provider === 'gmail' && c.status === 'active');
          if (gmail) {
            setIsConnected(true);
            setGmailConnectionId(gmail.id);
            clearInterval(checkInterval);
          }
        } catch {}
      }, 2000);

      setTimeout(() => clearInterval(checkInterval), 60000);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleScan = async () => {
    if (!gmailConnectionId) return;
    setScanning(true);
    setScanProgress({ current: 0, total: 100, phase: 'Searching emails...' });

    try {
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

      await api.scanEmails(gmailConnectionId, { maxResults: 100, daysBack: 365 });

      clearInterval(progressInterval);
      setScanProgress({ current: 100, total: 100, phase: 'Complete!' });

      await loadDetected();
      window.dispatchEvent(new CustomEvent('subscriptions-updated'));
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
    if (!confirm('Deep scan will analyze emails with advanced insights. This may take a minute. Continue?')) {
      return;
    }

    setDeepScanning(true);
    setScanProgress({ current: 0, total: 100, phase: 'Initializing deep scan...' });

    try {
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev.current < prev.total) {
            const increment = Math.random() * 8;
            const newCurrent = Math.min(prev.current + increment, prev.total - 10);
            return {
              ...prev,
              current: newCurrent,
              phase: newCurrent < 25 ? 'Starting email scan...'
                    : newCurrent < 60 ? 'Analyzing emails...'
                    : newCurrent < 85 ? 'Processing results...'
                    : 'Finalizing...'
            };
          }
          return prev;
        });
      }, 800);

      // Start async deep scan job
      const jobData = await api.startEmailDetectionScan();
      const jobId = jobData.jobId || jobData.id;

      if (jobId) {
        // Poll for job completion
        const poll = async () => {
          try {
            const status = await api.getEmailScanJob(jobId);
            if (status.status === 'completed' || status.status === 'done') {
              clearInterval(progressInterval);
              clearInterval(pollInterval);
              setScanProgress({ current: 100, total: 100, phase: 'Complete!' });
              await loadDetected();
              window.dispatchEvent(new CustomEvent('subscriptions-updated'));
            } else if (status.status === 'failed') {
              clearInterval(progressInterval);
              clearInterval(pollInterval);
              throw new Error('Scan job failed');
            }
          } catch (err) {
            if (err.message !== 'Scan job failed') return; // Ignore transient poll errors
            throw err;
          }
        };

        const pollInterval = setInterval(poll, 3000);
        // Safety timeout
        setTimeout(() => {
          clearInterval(pollInterval);
          clearInterval(progressInterval);
        }, 120000);
      } else {
        clearInterval(progressInterval);
        setScanProgress({ current: 100, total: 100, phase: 'Complete!' });
        await loadDetected();
        window.dispatchEvent(new CustomEvent('subscriptions-updated'));
      }
    } catch (error) {
      console.error('Deep scan error:', error);
      alert('Deep scan failed: ' + error.message);
      setScanProgress({ current: 0, total: 0, phase: 'Failed' });
    } finally {
      setTimeout(() => {
        setDeepScanning(false);
        setScanProgress({ current: 0, total: 0, phase: '' });
      }, 1500);
    }
  };

  const handleImport = async (id) => {
    setImporting(prev => ({ ...prev, [id]: true }));
    try {
      await api.importDetection(id);
      setDetectedSubs(prev => prev.filter(s => s.id !== id));
      window.dispatchEvent(new CustomEvent('subscriptions-updated'));
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import subscription');
    } finally {
      setImporting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDismiss = async (id) => {
    try {
      await api.rejectDetection(id);
      setDetectedSubs(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Dismiss failed:', error);
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
      <div className="pb-4 border-b border-[#d0d7de]">
        <h1 className="text-2xl font-semibold text-[#24292f]">Email Scanner</h1>
        <p className="text-sm text-gray-600 mt-1">Scan your inbox for subscription emails</p>
      </div>

      {/* Connection Card */}
      <div className={`border rounded-md p-4 ${
        isConnected ? 'bg-green-50 border-green-200' : 'bg-[#f6f8fa] border-[#d0d7de]'
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
                  {deepScanning ? 'Deep Scanning...' : 'Deep Scan'}
                </button>
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
          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#0969da] h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Detected Subscriptions */}
      {detectedSubs.length > 0 ? (
        <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
          <div className="bg-[#2da44e] px-6 py-3">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold text-base">Detected from Email</h3>
              </div>
              <span className="px-2.5 py-0.5 bg-white/20 rounded-md text-sm font-semibold">
                {detectedSubs.length}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {detectedSubs.map((sub) => {
              const confidence = sub.confidence_score != null
                ? (sub.confidence_score > 1 ? sub.confidence_score : sub.confidence_score * 100)
                : sub.confidence || 0;

              return (
                <div
                  key={sub.id}
                  className="flex items-start gap-3 p-3 bg-[#f6f8fa] border border-[#d0d7de] rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h4 className="font-semibold text-[#24292f]">{sub.name || sub.serviceName}</h4>
                        {sub.description && <p className="text-sm text-gray-600 mt-1">{sub.description}</p>}
                      </div>
                      {sub.amount != null && (
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold text-[#24292f]">₹{parseFloat(sub.amount).toFixed(2)}</div>
                          <div className="text-xs text-gray-600">{sub.billing_cycle || sub.billingCycle}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className={`px-2 py-0.5 rounded-md border font-medium ${
                        confidence >= 85
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {confidence.toFixed(0)}% confidence
                      </span>
                      {sub.category && <span>{sub.category}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleImport(sub.id)}
                      disabled={importing[sub.id]}
                      className="p-2 bg-[#2da44e] text-white rounded-md hover:bg-[#2c974b] transition-colors disabled:opacity-50"
                      title="Import"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDismiss(sub.id)}
                      className="p-2 bg-white text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : !scanning && (
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
    </div>
  );
}
