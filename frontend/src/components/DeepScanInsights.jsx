import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  Sparkles,
  X,
} from 'lucide-react';

export default function DeepScanInsights({ analysis, priceChanges, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!analysis) return null;

  const { summary, breakdown, insights, recommendations } = analysis;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-8 h-8" />
                <h2 className="text-3xl font-bold">365-Day Deep Analysis</h2>
              </div>
              <p className="text-sm text-white/90 mt-2">
                Comprehensive insights from your entire year of subscriptions
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex gap-1 p-2">
            {['overview', 'breakdown', 'insights', 'recommendations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Summary</h3>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<BarChart3 className="w-6 h-6 text-blue-600" />}
                  label="Total Subscriptions"
                  value={summary.totalSubscriptionsFound}
                  subtitle="emails analyzed"
                  color="blue"
                />
                <StatCard
                  icon={<PieChart className="w-6 h-6 text-green-600" />}
                  label="Unique Services"
                  value={summary.uniqueServices}
                  subtitle="different subscriptions"
                  color="green"
                />
                <StatCard
                  icon={<DollarSign className="w-6 h-6 text-purple-600" />}
                  label="Annual Cost"
                  value={`₹${summary.estimatedAnnualCost.toLocaleString()}`}
                  subtitle="estimated spending"
                  color="purple"
                />
                <StatCard
                  icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
                  label="Price Changes"
                  value={summary.priceChangesDetected}
                  subtitle="detected this year"
                  color="orange"
                />
              </div>

              {/* Confidence Score */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Detection Confidence</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                      {summary.averageConfidence}%
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Average AI confidence score
                    </div>
                  </div>
                  <div className="w-24 h-24">
                    <CircularProgress value={summary.averageConfidence} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Breakdown Tab */}
          {activeTab === 'breakdown' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Detailed Breakdown</h3>

              {/* By Category */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-600" />
                  By Category
                </h4>
                <div className="space-y-2">
                  {Object.entries(breakdown.byCategory).map(([category, count]) => (
                    <BreakdownBar key={category} label={category} value={count} total={summary.totalSubscriptionsFound} />
                  ))}
                </div>
              </div>

              {/* By Billing Cycle */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  By Billing Cycle
                </h4>
                <div className="space-y-2">
                  {Object.entries(breakdown.byBillingCycle).map(([cycle, count]) => (
                    <BreakdownBar key={cycle} label={cycle} value={count} total={summary.totalSubscriptionsFound} />
                  ))}
                </div>
              </div>

              {/* By Month */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Activity by Month
                </h4>
                <div className="space-y-2">
                  {Object.entries(breakdown.byMonth).map(([month, count]) => (
                    <BreakdownBar key={month} label={month} value={count} total={Math.max(...Object.values(breakdown.byMonth))} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Key Insights</h3>

              {/* Top Services */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="font-semibold text-lg mb-4">📊 Most Active Services</h4>
                <div className="space-y-3">
                  {insights.topServices.slice(0, 10).map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {service.detectionCount} email{service.detectionCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Changes */}
              {priceChanges && priceChanges.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="font-semibold text-lg mb-4">💰 Price Changes Detected</h4>
                  <div className="space-y-3">
                    {priceChanges.map((change, index) => (
                      <div key={index} className={`p-4 rounded-lg border-2 ${
                        change.trend === 'increase' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{change.serviceName}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {change.currency}{change.oldPrice} → {change.currency}{change.newPrice}
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 font-bold ${
                            change.trend === 'increase' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {change.trend === 'increase' ? (
                              <TrendingUp className="w-5 h-5" />
                            ) : (
                              <TrendingDown className="w-5 h-5" />
                            )}
                            {change.changePercentage > 0 ? '+' : ''}{change.changePercentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancel Suggestions */}
              {insights.cancelSuggestions && insights.cancelSuggestions.length > 0 && (
                <div className="bg-white border border-orange-200 rounded-xl p-6">
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Consider Canceling
                  </h4>
                  <div className="space-y-3">
                    {insights.cancelSuggestions.map((suggestion, index) => (
                      <div key={index} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{suggestion.service}</div>
                            <div className="text-sm text-gray-600 mt-1">{suggestion.reason}</div>
                            <div className="text-sm text-orange-700 font-medium mt-2">
                              Potential savings: ₹{suggestion.annualSavings.toLocaleString()}/year
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              ₹{suggestion.monthlyAmount}/mo
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Recommendations</h3>

              {recommendations && recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={`p-6 rounded-xl border-2 ${
                        rec.priority === 'high'
                          ? 'border-red-200 bg-red-50'
                          : rec.priority === 'medium'
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${
                          rec.priority === 'high'
                            ? 'bg-red-100'
                            : rec.priority === 'medium'
                            ? 'bg-yellow-100'
                            : 'bg-blue-100'
                        }`}>
                          {rec.priority === 'high' ? (
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                          ) : (
                            <CheckCircle2 className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-gray-900">{rec.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              rec.priority === 'high'
                                ? 'bg-red-200 text-red-800'
                                : rec.priority === 'medium'
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-blue-200 text-blue-800'
                            }`}>
                              {rec.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-3">{rec.description}</p>
                          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
                            <div className="text-sm font-medium text-gray-600">Action:</div>
                            <div className="text-sm text-gray-900 mt-1">{rec.action}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">All Good!</p>
                  <p className="text-sm mt-2">No urgent recommendations at this time.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, subtitle, color }) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    green: 'from-green-50 to-green-100 border-green-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    orange: 'from-orange-50 to-orange-100 border-orange-200',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
      </div>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}

// Breakdown Bar Component
function BreakdownBar({ label, value, total }) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 capitalize">{label}</span>
        <span className="text-gray-600">{value} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Circular Progress Component
function CircularProgress({ value }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg className="w-full h-full -rotate-90">
      <circle
        cx="48"
        cy="48"
        r="36"
        stroke="#e5e7eb"
        strokeWidth="8"
        fill="none"
      />
      <circle
        cx="48"
        cy="48"
        r="36"
        stroke="url(#gradient)"
        strokeWidth="8"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}
