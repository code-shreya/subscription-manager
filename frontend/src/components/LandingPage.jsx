import { ArrowRight, Mail, Building2, Calendar, BarChart3, Bell, Sparkles, Check } from 'lucide-react';

export default function LandingPage({ onGetStarted, onLogin }) {
  const features = [
    {
      icon: Mail,
      title: 'Email Scanner',
      description: 'Automatically scan your Gmail inbox for subscription receipts and renewals. AI-powered detection finds subscriptions you might have forgotten.',
    },
    {
      icon: Building2,
      title: 'Bank Integration',
      description: 'Connect your Indian bank accounts to automatically track subscription payments. Supports HDFC, ICICI, SBI, Axis, and more.',
    },
    {
      icon: Calendar,
      title: 'Smart Calendar',
      description: 'Visual calendar showing all upcoming renewals. Never get surprised by unexpected charges again.',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'See your spending breakdown by category. Understand where your money goes each month with beautiful charts.',
    },
    {
      icon: Bell,
      title: 'Smart Reminders',
      description: 'Get notified before renewals. 7-day, 3-day, and 1-day reminders so you can cancel unwanted subscriptions in time.',
    },
    {
      icon: Sparkles,
      title: 'AI Insights',
      description: 'Deep scan analyzes your subscription patterns and provides personalized recommendations to save money.',
    },
  ];

  const stats = [
    { value: '365-Day', label: 'Email Scanning' },
    { value: 'INR', label: 'Indian Currency' },
    { value: 'Real-time', label: 'Bank Sync' },
    { value: 'AI-Powered', label: 'Detection' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">SubManager</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Log in
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full mb-6 border border-indigo-100">
            <Sparkles className="w-3.5 h-3.5" />
            Built for India
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight tracking-tight">
            Track all your subscriptions
            <br />
            <span className="text-indigo-600">in one place</span>
          </h1>

          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            Smart subscription management with INR support. Connect your bank accounts,
            scan your emails, and never miss a payment again.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-12">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="https://github.com/code-shreya/subscription-manager"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Everything you need to manage subscriptions
            </h2>
            <p className="text-base text-gray-500 max-w-2xl mx-auto">
              Powerful features designed specifically for Indian users and their subscription needs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all"
                >
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 border-y border-gray-200 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Get started in minutes</h2>
            <p className="text-base text-gray-500">Simple setup to start tracking your subscriptions.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create Your Account', description: 'Sign up in seconds. Then link your Gmail and bank accounts securely with OAuth 2.0.' },
              { step: '2', title: 'Scan & Import', description: 'Our AI scans your emails and transactions to find all your subscriptions automatically.' },
              { step: '3', title: 'Track & Save', description: 'View insights, get reminders, and optimize your spending. Cancel unwanted subscriptions easily.' },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-indigo-600 rounded-2xl p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Built specifically for India
            </h2>
            <p className="text-indigo-100 mb-6 max-w-xl mx-auto">
              Native support for Indian banks, INR currency, and popular Indian subscription services.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra', 'Gmail'].map((name, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/15 text-white text-sm rounded-lg">
                  <Check className="w-3.5 h-3.5" />
                  {name}
                </span>
              ))}
            </div>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-medium rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-gray-400">
          <span>&copy; 2026 SubManager</span>
          <a href="https://github.com/code-shreya/subscription-manager" className="hover:text-gray-600 transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
