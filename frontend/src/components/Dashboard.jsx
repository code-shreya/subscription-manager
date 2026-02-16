import { useEffect, useState } from 'react';
import { api } from '../api';
import { TrendingUp, CreditCard, Calendar, AlertCircle, ArrowUpRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Label } from 'recharts';

// Category color mapping
const categoryColorMap = {
  'Streaming': '#f43f5e',
  'Music': '#a855f7',
  'Productivity': '#3b82f6',
  'Cloud Storage': '#14b8a6',
  'Gaming': '#f97316',
  'News & Media': '#f59e0b',
  'Fitness': '#22c55e',
  'Software': '#8b5cf6',
  'Rentals': '#d97706',
  'Investment': '#4f46e5',
  'Other': '#6b7280',
};

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();

    const handleUpdate = () => {
      loadAnalytics();
    };

    window.addEventListener('subscriptions-updated', handleUpdate);
    return () => window.removeEventListener('subscriptions-updated', handleUpdate);
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">No data available</div>
      </div>
    );
  }

  // Prepare pie data - include ALL categories
  const pieData = analytics.categoryBreakdown.map(cat => ({
    name: cat.category,
    value: parseFloat(cat.monthly_amount),
    count: cat.count,
    color: categoryColorMap[cat.category] || categoryColorMap['Other'],
  }));

  const totalSpending = pieData.reduce((sum, item) => sum + item.value, 0);

  // Custom label renderer for pie chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Don't show label if less than 5%
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-semibold text-xs"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your subscription spending</p>
      </div>

      {/* Spending by Category - Hero Section */}
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-2xl border-2 border-purple-200 p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Spending by Category</h2>
          <p className="text-sm text-gray-600">Monthly subscription distribution across all categories</p>
        </div>

        {pieData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pie Chart */}
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={450}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={160}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${value.toFixed(2)}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with Details */}
            <div className="space-y-3">
              <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">Total Monthly</div>
                <div className="text-3xl font-bold text-gray-900">₹{totalSpending.toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">Across {analytics.totalSubscriptions} subscriptions</div>
              </div>

              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-2">
                {pieData.map((item, index) => {
                  const percentage = totalSpending > 0 ? (item.value / totalSpending * 100) : 0;
                  return (
                    <div
                      key={item.name}
                      className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                        </div>
                        <span className="text-xs font-medium text-gray-500">{item.count} subs</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-bold text-gray-900">₹{item.value.toFixed(2)}</span>
                        <span className="text-sm font-semibold text-purple-600">{percentage.toFixed(1)}%</span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <p className="text-sm">No spending data yet</p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Monthly Spending"
          value={`₹${analytics.totalMonthly}`}
          change="+12% from last month"
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          title="Active Subscriptions"
          value={analytics.totalSubscriptions}
          subtitle={`${analytics.subscriptionsWithAmount} with amounts`}
          icon={CreditCard}
        />
        <StatCard
          title="Next 30 Days"
          value={`₹${analytics.upcomingRenewals.reduce((sum, sub) => sum + (sub.amount || 0), 0).toFixed(2)}`}
          subtitle={`${analytics.upcomingRenewals.length} renewals`}
          icon={Calendar}
        />
        <StatCard
          title="Needs Attention"
          value={analytics.subscriptionsWithoutAmount}
          subtitle="Missing amount info"
          icon={AlertCircle}
          variant="warning"
        />
      </div>

      {/* Upcoming Renewals */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Renewals</h3>
          <span className="text-xs text-gray-500 bg-purple-100 px-3 py-1 rounded-full font-medium">Next 30 days</span>
        </div>
        {analytics.upcomingRenewals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.upcomingRenewals.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-purple-200 hover:shadow-md transition-all bg-gradient-to-br from-white to-gray-50"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">{sub.name}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(sub.next_billing_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="text-xl font-bold text-gray-900">₹{sub.amount}</div>
                  <div className="text-xs text-gray-500 capitalize">{sub.billing_cycle}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <p className="text-sm">No upcoming renewals</p>
          </div>
        )}
      </div>

      {/* Category Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Category Breakdown</h3>
        </div>
        {analytics.categoryBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase">Monthly</th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase">Yearly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.categoryBreakdown.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-6 text-sm font-medium text-gray-900">{cat.category}</td>
                    <td className="py-3 px-6 text-sm text-gray-600 text-right">{cat.count}</td>
                    <td className="py-3 px-6 text-sm font-medium text-gray-900 text-right">
                      ₹{cat.monthly_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600 text-right">
                      ₹{(cat.monthly_amount * 12).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-400">
            <p className="text-sm">No categories yet</p>
          </div>
        )}
      </div>

      {/* Info Alert */}
      {analytics.subscriptionsWithoutAmount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900">
                {analytics.subscriptionsWithoutAmount} subscriptions need attention
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                These subscriptions don't have amount information and aren't included in your spending calculations.
                Edit them to add amounts for accurate tracking.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, change, icon: Icon, trend, variant }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {change && (
            <p className={`text-xs mt-2 font-medium ${trend === 'up' ? 'text-green-600' : 'text-gray-600'}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${
          variant === 'warning'
            ? 'bg-amber-100'
            : 'bg-purple-100'
        }`}>
          <Icon className={`w-5 h-5 ${
            variant === 'warning'
              ? 'text-amber-600'
              : 'text-purple-600'
          }`} />
        </div>
      </div>
    </div>
  );
}
