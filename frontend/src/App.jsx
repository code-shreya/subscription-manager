import { useState } from 'react';
import { LayoutDashboard, List, Calendar, Mail, Settings as SettingsIcon, Building2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import SubscriptionList from './components/SubscriptionList';
import CalendarView from './components/CalendarView';
import EmailScanner from './components/EmailScanner';
import Settings from './components/Settings';
import ConnectedAccounts from './components/ConnectedAccounts';
import NotificationBell from './components/NotificationBell';
import { LogoStacked } from './components/Logo';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'Subscriptions', icon: List },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'bank', label: 'Bank Integration', icon: Building2 },
    { id: 'scanner', label: 'Email Scanner', icon: Mail },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Clean & Professional */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <LogoStacked size="default" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">SubManager</h1>
                <p className="text-xs text-gray-500">Subscription tracking</p>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              <NotificationBell />

              {/* User Avatar Placeholder */}
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-sm font-medium text-purple-700">U</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex gap-1 overflow-x-auto pb-px -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                    ${isActive
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard key="dashboard" />}
        {activeTab === 'subscriptions' && <SubscriptionList key="subscriptions" />}
        {activeTab === 'calendar' && <CalendarView key="calendar" />}
        {activeTab === 'bank' && <ConnectedAccounts key="bank" />}
        {activeTab === 'scanner' && <EmailScanner key="scanner" />}
        {activeTab === 'settings' && <Settings key="settings" />}
      </main>

      {/* Footer - Minimal */}
      <footer className="border-t border-gray-200 mt-12 py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            SubManager · Track and manage your subscriptions
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
