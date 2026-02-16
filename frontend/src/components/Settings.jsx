import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Zap, Mail, Bell, Save, Send, Clock } from 'lucide-react';

const TABS = [
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'advanced', label: 'Advanced', icon: SettingsIcon },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('automation');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Scheduler Config
  const [config, setConfig] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);

  // Email Config
  const [emailConfig, setEmailConfig] = useState(null);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    loadSettings();
    loadEmailConfig();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/scheduler/status');
      const data = await response.json();
      setConfig(data.config);
      setActiveJobs(data.activeJobs);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmailConfig = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/notifications/email-config');
      const data = await response.json();
      setEmailConfig(data);
    } catch (error) {
      console.error('Failed to load email config:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('http://localhost:3001/api/scheduler/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        alert('Settings saved!');
        await loadSettings();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveEmailConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('http://localhost:3001/api/notifications/email-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig),
      });

      if (response.ok) {
        alert('Email settings saved!');
        await loadEmailConfig();
      }
    } catch (error) {
      console.error('Failed to save email settings:', error);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    setTestingEmail(true);
    try {
      const response = await fetch('http://localhost:3001/api/notifications/test-email', {
        method: 'POST',
      });

      if (response.ok) {
        alert('Test email sent! Check your inbox.');
      }
    } catch (error) {
      alert('Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  const updateConfig = (key, value) => {
    setConfig({ ...config, [key]: value });
  };

  const updateEmailConfig = (key, value) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setEmailConfig({
        ...emailConfig,
        [parent]: { ...emailConfig[parent], [child]: value },
      });
    } else {
      setEmailConfig({ ...emailConfig, [key]: value });
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
          {/* Automation Tab */}
          {activeTab === 'automation' && (
            <div className="space-y-6">
              {/* Status */}
              <div className="bg-[#f6f8fa] border border-[#d0d7de] rounded-md p-4">
                <h3 className="font-semibold text-[#24292f] mb-4">System Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-[#d0d7de] rounded-md p-4">
                    <div className="text-sm text-gray-600 mb-1">Active Jobs</div>
                    <div className="text-2xl font-semibold text-[#24292f]">{activeJobs.length}</div>
                  </div>
                  <div className="bg-white border border-[#d0d7de] rounded-md p-4">
                    <div className="text-sm text-gray-600 mb-1">Last Scan</div>
                    <div className="text-sm font-medium text-[#24292f]">
                      {config.lastScanTime ? new Date(config.lastScanTime).toLocaleString() : 'Never'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto Scan */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#f6f8fa] border border-[#d0d7de] rounded-md">
                  <div>
                    <div className="font-semibold text-[#24292f]">Auto-Scan Emails</div>
                    <div className="text-sm text-gray-600">Automatically scan for subscriptions</div>
                  </div>
                  <Toggle
                    checked={config.autoScanEnabled}
                    onChange={(checked) => updateConfig('autoScanEnabled', checked)}
                  />
                </div>

                {config.autoScanEnabled && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#24292f] mb-2">
                          Scan Schedule
                        </label>
                        <select
                          value={config.scanSchedule}
                          onChange={(e) => updateConfig('scanSchedule', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#d0d7de] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
                        >
                          <option value="0 8 * * *">Daily at 8:00 AM</option>
                          <option value="0 0 * * *">Daily at Midnight</option>
                          <option value="0 */12 * * *">Every 12 hours</option>
                          <option value="0 9 * * 1">Every Monday at 9:00 AM</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#24292f] mb-2">
                          Days to Scan
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={config.scanDaysBack}
                          onChange={(e) => updateConfig('scanDaysBack', parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-[#d0d7de] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Auto Import */}
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-md">
                <div>
                  <div className="font-semibold text-[#24292f]">Auto-Import Confirmed</div>
                  <div className="text-sm text-gray-600">Import high-confidence subscriptions (≥85%)</div>
                </div>
                <Toggle
                  checked={config.autoImportConfirmed}
                  onChange={(checked) => updateConfig('autoImportConfirmed', checked)}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#2da44e] text-white font-medium rounded-md hover:bg-[#2c974b] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Automation Settings'}
              </button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && emailConfig && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#fff8c5] border border-[#d4a72c] rounded-md">
                <div>
                  <div className="font-semibold text-[#24292f]">Email Reminders</div>
                  <div className="text-sm text-gray-600">Get notified before renewals</div>
                </div>
                <Toggle
                  checked={emailConfig.enabled}
                  onChange={(checked) => updateEmailConfig('enabled', checked)}
                />
              </div>

              {emailConfig.enabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#24292f] mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={emailConfig.auth.user}
                        onChange={(e) => updateEmailConfig('auth.user', e.target.value)}
                        placeholder="your-email@gmail.com"
                        className="w-full px-3 py-2 bg-white border border-[#d0d7de] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#24292f] mb-2">
                        App Password
                      </label>
                      <input
                        type="password"
                        value={emailConfig.auth.pass === '••••••••' ? '' : emailConfig.auth.pass}
                        onChange={(e) => updateEmailConfig('auth.pass', e.target.value)}
                        placeholder="16-character app password"
                        className="w-full px-3 py-2 bg-white border border-[#d0d7de] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#24292f] mb-3">
                      Reminder Days
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[1, 3, 7, 14].map((day) => (
                        <label
                          key={day}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#d0d7de] rounded-md hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={emailConfig.remindAt.includes(day)}
                            onChange={(e) => {
                              const newRemindAt = e.target.checked
                                ? [...emailConfig.remindAt, day].sort((a, b) => b - a)
                                : emailConfig.remindAt.filter((d) => d !== day);
                              updateEmailConfig('remindAt', newRemindAt);
                            }}
                            className="w-4 h-4 text-[#0969da] rounded border-gray-300 focus:ring-[#0969da]"
                          />
                          <span className="text-sm font-medium text-[#24292f]">{day} day{day > 1 ? 's' : ''}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#ddf4ff] border border-[#54aeff] rounded-md p-4">
                    <div className="text-sm font-semibold text-[#24292f] mb-2">Setup Guide</div>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>Visit <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-[#0969da] underline font-medium">Google App Passwords</a></li>
                      <li>Create app password for "Mail"</li>
                      <li>Copy and paste above</li>
                    </ol>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={saveEmailConfig}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2da44e] text-white font-medium rounded-md hover:bg-[#2c974b] transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Email Settings'}
                    </button>

                    <button
                      onClick={testEmail}
                      disabled={testingEmail}
                      className="px-4 py-2 bg-[#0969da] text-white font-medium rounded-md hover:bg-[#0860ca] transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="bg-[#f6f8fa] border border-[#d0d7de] rounded-md p-6">
                <h3 className="font-semibold text-[#24292f] mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  Active Scheduled Jobs
                </h3>
                <div className="space-y-2">
                  {activeJobs.map((job) => (
                    <div key={job.name} className="flex items-center justify-between p-3 bg-white border border-[#d0d7de] rounded-md">
                      <span className="font-medium text-[#24292f]">{job.name}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 text-xs font-semibold rounded-md">
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#fff8c5] border border-[#d4a72c] rounded-md p-4">
                <div className="text-sm font-semibold text-[#24292f] mb-2">Advanced Settings</div>
                <p className="text-sm text-gray-700">
                  These settings control core system behavior. Changes take effect immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#0969da] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all border border-gray-300"></div>
    </label>
  );
}
