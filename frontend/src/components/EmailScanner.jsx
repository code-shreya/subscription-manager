import { useEffect, useState } from 'react';
import { api } from '../api';
import { Mail, RefreshCw, CheckCircle, Search, Sparkles, Check, X } from 'lucide-react';

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
      if (gmail) { setIsConnected(true); setGmailConnectionId(gmail.id); }
      else { setIsConnected(false); setGmailConnectionId(null); }
    } catch { setIsConnected(false); }
    finally { setLoading(false); }
  };

  const loadDetected = async () => {
    try {
      const data = await api.getDetectionResults('pending');
      const results = data.results || data || [];
      setDetectedSubs(results.filter(r => r.source === 'email'));
    } catch { setDetectedSubs([]); }
  };

  const handleConnect = async () => {
    try {
      const data = await api.getGmailAuthUrl();
      window.open(data.authUrl || data.url, '_blank', 'width=600,height=700');
      const checkInterval = setInterval(async () => {
        try {
          const connData = await api.getEmailConnections();
          const conns = connData.connections || connData || [];
          const gmail = conns.find(c => c.provider === 'gmail' && c.status === 'active');
          if (gmail) { setIsConnected(true); setGmailConnectionId(gmail.id); clearInterval(checkInterval); }
        } catch {}
      }, 2000);
      setTimeout(() => clearInterval(checkInterval), 60000);
    } catch (error) { console.error('Failed to connect:', error); }
  };

  const handleScan = async () => {
    if (!gmailConnectionId) return;
    setScanning(true);
    setScanProgress({ current: 0, total: 100, phase: 'Searching emails...' });
    try {
      const progressInterval = setInterval(() => {
        setScanProgress(prev => prev.current < prev.total ? { ...prev, current: Math.min(prev.current + Math.random() * 10, prev.total - 5), phase: prev.current < 30 ? 'Searching...' : prev.current < 60 ? 'Fetching details...' : 'Processing...' } : prev);
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
      setTimeout(() => { setScanning(false); setScanProgress({ current: 0, total: 0, phase: '' }); }, 1000);
    }
  };

  const handleDeepScan = async () => {
    if (!confirm('Deep scan will analyze emails with advanced insights. This may take a minute. Continue?')) return;
    setDeepScanning(true);
    setScanProgress({ current: 0, total: 100, phase: 'Starting deep scan...' });
    try {
      const progressInterval = setInterval(() => {
        setScanProgress(prev => prev.current < prev.total ? { ...prev, current: Math.min(prev.current + Math.random() * 8, prev.total - 10), phase: prev.current < 25 ? 'Starting...' : prev.current < 60 ? 'Analyzing...' : 'Processing...' } : prev);
      }, 800);
      const jobData = await api.startEmailDetectionScan();
      const jobId = jobData.jobId || jobData.id;
      if (jobId) {
        const pollInterval = setInterval(async () => {
          try {
            const status = await api.getEmailScanJob(jobId);
            if (status.status === 'completed' || status.status === 'done') {
              clearInterval(progressInterval); clearInterval(pollInterval);
              setScanProgress({ current: 100, total: 100, phase: 'Complete!' });
              await loadDetected(); window.dispatchEvent(new CustomEvent('subscriptions-updated'));
            }
          } catch {}
        }, 3000);
        setTimeout(() => { clearInterval(pollInterval); clearInterval(progressInterval); }, 120000);
      } else {
        clearInterval(progressInterval);
        setScanProgress({ current: 100, total: 100, phase: 'Complete!' });
        await loadDetected(); window.dispatchEvent(new CustomEvent('subscriptions-updated'));
      }
    } catch (error) {
      alert('Deep scan failed: ' + error.message);
      setScanProgress({ current: 0, total: 0, phase: 'Failed' });
    } finally {
      setTimeout(() => { setDeepScanning(false); setScanProgress({ current: 0, total: 0, phase: '' }); }, 1500);
    }
  };

  const handleImport = async (id) => {
    setImporting(prev => ({ ...prev, [id]: true }));
    try { await api.importDetection(id); setDetectedSubs(prev => prev.filter(s => s.id !== id)); window.dispatchEvent(new CustomEvent('subscriptions-updated')); }
    catch { alert('Failed to import'); }
    finally { setImporting(prev => ({ ...prev, [id]: false })); }
  };

  const handleDismiss = async (id) => {
    try { await api.rejectDetection(id); setDetectedSubs(prev => prev.filter(s => s.id !== id)); } catch {}
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div></div>;

  return (
    <div className="space-y-4">
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900">Email Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">Scan your inbox for subscription emails</p>
      </div>

      {/* Connection */}
      <div className={`border rounded-xl p-4 ${isConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isConnected ? 'bg-emerald-500' : 'bg-gray-400'}`}>
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900">Gmail</h3>
                {isConnected && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded">
                    <CheckCircle className="w-3 h-3 mr-0.5" /> Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{isConnected ? 'Ready to scan' : 'Connect to get started'}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {!isConnected ? (
              <button onClick={handleConnect} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                <Mail className="w-4 h-4" /> Connect Gmail
              </button>
            ) : (
              <>
                <button onClick={handleScan} disabled={scanning || deepScanning} className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} /> {scanning ? 'Scanning...' : 'Quick Scan'}
                </button>
                <button onClick={handleDeepScan} disabled={scanning || deepScanning} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-gray-700 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50">
                  <Search className={`w-3.5 h-3.5 ${deepScanning ? 'animate-pulse' : ''}`} /> {deepScanning ? 'Scanning...' : 'Deep Scan'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      {(scanning || deepScanning) && scanProgress.total > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent"></div>
              <span className="text-sm font-medium text-gray-900">{scanProgress.phase}</span>
            </div>
            <span className="text-xs font-medium text-gray-500">{Math.round((scanProgress.current / scanProgress.total) * 100)}%</span>
          </div>
          <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Detected */}
      {detectedSubs.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">Detected from Email</h3>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">{detectedSubs.length}</span>
          </div>
          <div className="p-4 space-y-2">
            {detectedSubs.map((sub) => {
              const confidence = sub.confidence_score != null ? (sub.confidence_score > 1 ? sub.confidence_score : sub.confidence_score * 100) : sub.confidence || 0;
              return (
                <div key={sub.id} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{sub.name || sub.serviceName}</h4>
                        {sub.description && <p className="text-xs text-gray-500 mt-0.5">{sub.description}</p>}
                      </div>
                      {sub.amount != null && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-gray-900">₹{parseFloat(sub.amount).toFixed(2)}</div>
                          <div className="text-[10px] text-gray-400">{sub.billing_cycle || sub.billingCycle}</div>
                        </div>
                      )}
                    </div>
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${confidence >= 85 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {confidence.toFixed(0)}% confidence
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => handleImport(sub.id)} disabled={importing[sub.id]} className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50" title="Import">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDismiss(sub.id)} className="p-2.5 bg-white text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50" title="Dismiss">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : !scanning && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <Mail className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No emails scanned yet</h3>
          <p className="text-xs text-gray-400">{isConnected ? 'Click "Quick Scan" to find subscriptions' : 'Connect Gmail to get started'}</p>
        </div>
      )}
    </div>
  );
}
