import { useEffect, useState } from 'react';
import { api } from '../api';
import { TrendingUp, CreditCard, Calendar, AlertCircle, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// GitHub-inspired color palette - more muted, professional
const categoryColorMap = {
  'Streaming': '#0969da', // GitHub blue
  'Music': '#8250df', // Purple
  'Productivity': '#1f883d', // Green
  'Cloud Storage': '#0969da', // Blue
  'Gaming': '#bf3989', // Magenta
  'News & Media': '#bf8700', // Amber
  'Fitness': '#2da44e', // Success green
  'Software': '#8250df', // Purple
  'Rentals': '#953800', // Orange
  'Investment': '#6639ba', // Deep purple
  'Other': '#57606a', // Gray
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
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  // Prepare pie data
  const pieData = analytics.categoryBreakdown.map(cat => ({
    name: cat.category,
    value: parseFloat(cat.monthly_amount),
    count: cat.count,
    color: categoryColorMap[cat.category] || categoryColorMap['Other'],
  }));

  const totalSpending = pieData.reduce((sum, item) => sum + item.value, 0);

  // Custom label renderer for pie chart with category names
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <g>
        <text
          x={x}
          y={y - 8}
          fill="white"
          textAnchor="middle"
          dominantBaseline="central"
          className="font-semibold text-sm"
        >
          {name}
        </text>
        <text
          x={x}
          y={y + 8}
          fill="white"
          textAnchor="middle"
          dominantBaseline="central"
          className="font-medium text-xs"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header - GitHub style */}
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Overview of your subscription spending</p>
      </div>

      {/* Stats Grid - GitHub style cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          value={`₹${analytics.upcomingRenewals.reduce((sum, sub) => sum + (parseFloat(sub.amount) || 0), 0).toFixed(2)}`}
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

      {/* Spending by Category - GitHub style clean card */}
      <div className="bg-white border border-gray-200 rounded-md p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Spending by Category</h2>
          <p className="text-sm text-gray-600">Monthly subscription distribution</p>
        </div>

        {pieData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pie Chart */}
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={140}
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
                      border: '1px solid #d0d7de',
                      borderRadius: '6px',
                      padding: '8px 12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with Details - GitHub style */}
            <div className="space-y-3">
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Total Monthly</div>
                <div className="text-3xl font-semibold text-gray-900">₹{totalSpending.toFixed(2)}</div>
                <div className="text-xs text-gray-600 mt-1">{analytics.totalSubscriptions} subscriptions</div>
              </div>

              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-2">
                {pieData.map((item) => {
                  const percentage = totalSpending > 0 ? (item.value / totalSpending * 100) : 0;
                  return (
                    <div
                      key={item.name}
                      className="bg-white border border-gray-200 rounded-md p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-medium text-gray-900">{item.name}</span>
                        </div>
                        <span className="text-xs text-gray-600">{item.count}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-base font-semibold text-gray-900">₹{item.value.toFixed(2)}</span>
                        <span className="text-sm text-gray-600">{percentage.toFixed(1)}%</span>
                      </div>
                      {/* Progress bar - subtle GitHub style */}
                      <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
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
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p className="text-sm">No spending data yet</p>
          </div>
        )}
      </div>

      {/* Upcoming Renewals - GitHub table style */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Upcoming Renewals</h3>
            <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded-md font-medium">Next 30 days</span>
          </div>
        </div>
        {analytics.upcomingRenewals.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {analytics.upcomingRenewals.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-0.5">{sub.name}</div>
                  <div className="text-xs text-gray-600">
                    {new Date(sub.next_billing_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-semibold text-gray-900">₹{sub.amount}</div>
                  <div className="text-xs text-gray-600 capitalize">{sub.billing_cycle}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <p className="text-sm">No upcoming renewals</p>
          </div>
        )}
      </div>

      {/* Category Table - GitHub style */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-900">Category Breakdown</h3>
        </div>
        {analytics.categoryBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</th>
                  <th className="text-right py-2 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Count</th>
                  <th className="text-right py-2 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Monthly</th>
                  <th className="text-right py-2 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Yearly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.categoryBreakdown.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-6 text-sm font-medium text-gray-900">{cat.category}</td>
                    <td className="py-3 px-6 text-sm text-gray-600 text-right">{cat.count}</td>
                    <td className="py-3 px-6 text-sm font-medium text-gray-900 text-right">
                      ₹{parseFloat(cat.monthly_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600 text-right">
                      ₹{(parseFloat(cat.monthly_amount) * 12).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            <p className="text-sm">No categories yet</p>
          </div>
        )}
      </div>

      {/* Info Alert - GitHub style */}
      {analytics.subscriptionsWithoutAmount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-md p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {analytics.subscriptionsWithoutAmount} subscriptions need attention
              </h4>
              <p className="text-sm text-gray-700">
                These subscriptions don't have amount information. Edit them to add amounts for accurate tracking.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// GitHub-style stat card component
function StatCard({ title, value, subtitle, change, icon: Icon, trend, variant }) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
          )}
          {change && (
            <p className={`text-xs mt-2 font-medium ${trend === 'up' ? 'text-green-600' : 'text-gray-600'}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-md ${
          variant === 'warning'
            ? 'bg-amber-100'
            : 'bg-blue-50'
        }`}>
          <Icon className={`w-5 h-5 ${
            variant === 'warning'
              ? 'text-amber-700'
              : 'text-blue-600'
          }`} />
        </div>
      </div>
    </div>
  );
}
