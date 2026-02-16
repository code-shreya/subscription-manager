import { useState } from 'react';
import { LayoutDashboard, List, Calendar, Mail, Settings as SettingsIcon, Building2, Bell } from 'lucide-react';
import Dashboard from './components/Dashboard';
import SubscriptionList from './components/SubscriptionList';
import CalendarView from './components/CalendarView';
import EmailScanner from './components/EmailScanner';
import Settings from './components/Settings';
import ConnectedAccounts from './components/ConnectedAccounts';
import NotificationBell from './components/NotificationBell';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'Subscriptions', icon: List },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'bank', label: 'Accounts', icon: Building2 },
    { id: 'scanner', label: 'Email', icon: Mail },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* GitHub-style Header */}
      <header className="bg-[#24292f] border-b border-[#30363d]">
        <div className="mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-white">SubManager</h1>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="w-6 h-6 rounded-full bg-[#30363d] border border-[#484f58]"></div>
            </div>
          </div>
        </div>
      </header>

      {/* GitHub-style Sub-navigation */}
      <div className="bg-[#f6f8fa] border-b border-[#d0d7de]">
        <div className="mx-auto px-4">
          <nav className="flex gap-2 -mb-px">
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
                      ? 'border-[#fd8c73] text-gray-900 bg-white'
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
      </div>

      {/* Main Content - GitHub style */}
      <main className="bg-[#f6f8fa] min-h-screen">
        <div className="mx-auto px-4 py-6 max-w-[1280px]">
          {activeTab === 'dashboard' && <Dashboard key="dashboard" />}
          {activeTab === 'subscriptions' && <SubscriptionList key="subscriptions" />}
          {activeTab === 'calendar' && <CalendarView key="calendar" />}
          {activeTab === 'bank' && <ConnectedAccounts key="bank" />}
          {activeTab === 'scanner' && <EmailScanner key="scanner" />}
          {activeTab === 'settings' && <Settings key="settings" />}
        </div>
      </main>

      {/* GitHub-style Footer */}
      <footer className="border-t border-[#d0d7de] py-8 bg-[#f6f8fa]">
        <div className="mx-auto px-4 max-w-[1280px]">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span>© 2026 SubManager</span>
              <a href="#" className="hover:text-blue-600 hover:underline">Terms</a>
              <a href="#" className="hover:text-blue-600 hover:underline">Privacy</a>
            </div>
            <div className="flex items-center gap-4">
              <span>Made with ❤️ for subscription tracking</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
