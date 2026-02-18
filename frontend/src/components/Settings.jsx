import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { User, Building2, Mail, Sliders, Save } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'connections', label: 'Connected Accounts', icon: Building2 },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
];

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [bankConnections, setBankConnections] = useState([]);
  const [emailConnections, setEmailConnections] = useState([]);

  useEffect(() => { loadProfile(); loadConnections(); }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      const u = data.user || data;
      setProfileName(u.name || '');
      setProfileEmail(u.email || '');
    } catch {
      setProfileName(user?.name || '');
      setProfileEmail(user?.email || '');
    } finally { setLoading(false); }
  };

  const loadConnections = async () => {
    try {
      const [bankData, emailData] = await Promise.all([
        api.getBankConnections().catch(() => ({ connections: [] })),
        api.getEmailConnections().catch(() => ({ connections: [] })),
      ]);
      setBankConnections(bankData.connections || bankData || []);
      setEmailConnections(emailData.connections || emailData || []);
    } catch {}
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try { await api.updateProfile({ name: profileName }); alert('Profile updated!'); }
    catch { alert('Failed to update profile'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div></div>;

  return (
    <div className="space-y-4">
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your SubManager experience</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-white text-indigo-700 border-b-2 border-indigo-600 -mb-px' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-5 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={profileEmail} disabled className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name"
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400" />
              </div>
              <button onClick={handleSaveProfile} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" /> Bank Accounts
                </h3>
                {bankConnections.length > 0 ? (
                  <div className="space-y-2">
                    {bankConnections.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{conn.bankName || conn.institutionName}</span>
                          {conn.accountIdentifier && <span className="ml-2 text-xs text-gray-400">{conn.accountIdentifier}</span>}
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">Connected</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400 py-3">No bank accounts connected. Visit the Accounts tab to connect one.</p>}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" /> Email Accounts
                </h3>
                {emailConnections.length > 0 ? (
                  <div className="space-y-2">
                    {emailConnections.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-gray-900 capitalize">{conn.provider || 'Gmail'}</span>
                          {conn.email && <span className="ml-2 text-xs text-gray-400">{conn.email}</span>}
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${conn.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {conn.status === 'active' ? 'Connected' : conn.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400 py-3">No email accounts connected. Visit the Email tab to connect Gmail.</p>}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="text-center py-10">
              <Sliders className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Coming Soon</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Automation settings, notification preferences, and scan scheduling will be available in a future update.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
