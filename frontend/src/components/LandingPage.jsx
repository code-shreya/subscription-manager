import { ArrowRight, Mail, Building2, Calendar, BarChart3, Bell, Sparkles, Check } from 'lucide-react';

export default function LandingPage({ onEnterDemo }) {
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
    { value: '₹ INR', label: 'Indian Currency' },
    { value: 'Real-time', label: 'Bank Sync' },
    { value: 'AI-Powered', label: 'Detection' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#24292f] via-[#1c2128] to-[#24292f]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <h1 className="text-3xl font-bold text-white">SubManager</h1>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Track All Your
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text"> Subscriptions </span>
              in One Place
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Smart subscription management for India. Connect your bank accounts, scan your emails,
              and never miss a payment. Built with ₹ INR support and Indian banking integration.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={onEnterDemo}
                className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-xl"
              >
                Try Live Demo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="https://github.com/code-shreya/subscription-manager"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white text-lg font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/20"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-[#f6f8fa] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-[#24292f] mb-4">
              Everything You Need to Manage Subscriptions
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed specifically for Indian users and their subscription needs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all hover:border-blue-300"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-[#24292f] mb-2">{feature.title}</h4>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-[#24292f] mb-4">
              Get Started in Minutes
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simple setup process to start tracking your subscriptions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                title: 'Connect Your Accounts',
                description: 'Link your Gmail and bank accounts securely. We use OAuth 2.0 for maximum security.',
              },
              {
                step: '2',
                title: 'Scan & Import',
                description: 'Our AI scans your emails and transactions to find all your subscriptions automatically.',
              },
              {
                step: '3',
                title: 'Track & Save',
                description: 'View insights, get reminders, and optimize your spending. Cancel unwanted subscriptions easily.',
              },
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h4 className="text-xl font-semibold text-[#24292f] mb-2">{step.title}</h4>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Built For India */}
      <div className="bg-[#f6f8fa] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built Specifically for India
            </h3>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Native support for Indian banks, ₹ INR currency, and popular Indian subscription services like Netflix, Prime Video, Zomato Gold, and more.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra', 'Gmail'].map((bank, idx) => (
                <div key={idx} className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-white font-medium">
                  <Check className="w-4 h-4 inline mr-2" />
                  {bank}
                </div>
              ))}
            </div>
            <button
              onClick={onEnterDemo}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
            >
              Try Demo Now
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#24292f] border-t border-[#30363d] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between text-gray-400 text-sm">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <span>© 2026 SubManager</span>
              <span>•</span>
              <a href="https://github.com/code-shreya/subscription-manager" className="hover:text-white transition-colors">
                GitHub
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span>Made with ❤️ for smarter subscription tracking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
