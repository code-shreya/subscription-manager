import { useState, useEffect } from 'react';
import { LayoutDashboard, List, Calendar, Mail, Settings as SettingsIcon, Building2, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { api } from './api';
import Dashboard from './components/Dashboard';
import SubscriptionList from './components/SubscriptionList';
import CalendarView from './components/CalendarView';
import EmailScanner from './components/EmailScanner';
import Settings from './components/Settings';
import ConnectedAccounts from './components/ConnectedAccounts';
import NotificationBell from './components/NotificationBell';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authView, setAuthView] = useState('landing');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Handle OAuth callback (Gmail)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && isAuthenticated) {
      api.handleGmailCallback(code)
        .then(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => console.error('Gmail callback failed:', err));
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'login') {
      return <LoginPage onSwitchToRegister={() => setAuthView('register')} />;
    }
    if (authView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return (
      <LandingPage
        onGetStarted={() => setAuthView('register')}
        onLogin={() => setAuthView('login')}
      />
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'Subscriptions', icon: List },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'bank', label: 'Accounts', icon: Building2 },
    { id: 'scanner', label: 'Email', icon: Mail },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto px-4 max-w-[1280px]">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h1 className="text-base font-semibold text-gray-900">SubManager</h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                    {(user?.name || user?.email || '?')[0].toUpperCase()}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</div>
                        <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                      </div>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex px-4 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-8rem)]">
        <div className="mx-auto px-4 py-6 max-w-[1280px]">
          <ErrorBoundary key={activeTab}>
            {activeTab === 'dashboard' && <Dashboard key="dashboard" />}
            {activeTab === 'subscriptions' && <SubscriptionList key="subscriptions" />}
            {activeTab === 'calendar' && <CalendarView key="calendar" />}
            {activeTab === 'bank' && <ConnectedAccounts key="bank" />}
            {activeTab === 'scanner' && <EmailScanner key="scanner" />}
            {activeTab === 'settings' && <Settings key="settings" />}
          </ErrorBoundary>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 bg-white">
        <div className="mx-auto px-4 max-w-[1280px]">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>&copy; 2026 SubManager</span>
            <span>Subscription tracking made simple</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
