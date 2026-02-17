import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Settings as SettingsIcon, User, Building2, Mail, Sliders, Save } from 'lucide-react';

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

  // Profile
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Connections summary
  const [bankConnections, setBankConnections] = useState([]);
  const [emailConnections, setEmailConnections] = useState([]);

  useEffect(() => {
    loadProfile();
    loadConnections();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      const u = data.user || data;
      setProfileName(u.name || '');
      setProfileEmail(u.email || '');
    } catch (error) {
      // Fallback to auth context
      setProfileName(user?.name || '');
      setProfileEmail(user?.email || '');
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const [bankData, emailData] = await Promise.all([
        api.getBankConnections().catch(() => ({ connections: [] })),
        api.getEmailConnections().catch(() => ({ connections: [] })),
      ]);
      setBankConnections(bankData.connections || bankData || []);
      setEmailConnections(emailData.connections || emailData || []);
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ name: profileName });
      alert('Profile updated!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-semibold text-[#24292f]">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Configure your SubManager experience</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="flex border-b border-[#d0d7de]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-[#24292f] border-b-2 border-[#fb8500] -mb-px'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-lg">
              <div>
                <label className="block text-sm font-semibold text-[#24292f] mb-2">Email</label>
                <input
                  type="email"
                  value={profileEmail}
                  disabled
                  className="w-full px-3 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-sm text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#24292f] mb-2">Display Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 bg-white border border-[#d0d7de] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white text-sm font-medium rounded-md hover:bg-[#2c974b] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          )}

          {/* Connected Accounts Tab */}
          {activeTab === 'connections' && (
            <div className="space-y-6">
              {/* Bank Connections */}
              <div>
                <h3 className="text-base font-semibold text-[#24292f] mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-600" />
                  Bank Accounts
                </h3>
                {bankConnections.length > 0 ? (
                  <div className="space-y-2">
                    {bankConnections.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between p-3 bg-[#f6f8fa] border border-[#d0d7de] rounded-md">
                        <div>
                          <span className="font-medium text-[#24292f]">{conn.bankName || conn.institutionName}</span>
                          {conn.accountIdentifier && (
                            <span className="ml-2 text-sm text-gray-500">{conn.accountIdentifier}</span>
                          )}
                        </div>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 text-xs font-semibold rounded-md">
                          Connected
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4">No bank accounts connected. Visit the Accounts tab to connect one.</p>
                )}
              </div>

              {/* Email Connections */}
              <div>
                <h3 className="text-base font-semibold text-[#24292f] mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-600" />
                  Email Accounts
                </h3>
                {emailConnections.length > 0 ? (
                  <div className="space-y-2">
                    {emailConnections.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between p-3 bg-[#f6f8fa] border border-[#d0d7de] rounded-md">
                        <div>
                          <span className="font-medium text-[#24292f] capitalize">{conn.provider || 'Gmail'}</span>
                          {conn.email && <span className="ml-2 text-sm text-gray-500">{conn.email}</span>}
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${
                          conn.status === 'active'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                        }`}>
                          {conn.status === 'active' ? 'Connected' : conn.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4">No email accounts connected. Visit the Email tab to connect Gmail.</p>
                )}
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="bg-[#ddf4ff] border border-[#54aeff] rounded-md p-6 text-center">
                <Sliders className="w-10 h-10 text-[#0969da] mx-auto mb-3" />
                <h3 className="text-base font-semibold text-[#24292f] mb-2">Coming Soon</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  Automation settings, notification preferences, and scan scheduling will be available in a future update.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
