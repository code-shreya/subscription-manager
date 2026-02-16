import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CATEGORIES = [
  'Streaming',
  'Music',
  'Productivity',
  'Cloud Storage',
  'Gaming',
  'News & Media',
  'Fitness',
  'Software',
  'Other',
];

const BILLING_CYCLES = ['monthly', 'yearly'];

export default function SubscriptionForm({ subscription, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Streaming',
    amount: '',
    currency: 'INR',
    billing_cycle: 'monthly',
    next_billing_date: '',
    description: '',
    status: 'active',
  });

  useEffect(() => {
    if (subscription) {
      setFormData(subscription);
    }
  }, [subscription]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-purple-900/50 to-pink-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border-4 border-purple-200 transform animate-in slide-in-from-bottom duration-300">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {subscription ? '✏️ Edit Subscription' : '✨ Add New Subscription'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 transform hover:scale-110 hover:rotate-90"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-purple-700 mb-2">
              🏷️ Service Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Netflix, Spotify, etc."
              className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 font-medium transition-all bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-purple-700 mb-2">
              📂 Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 font-semibold transition-all bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-purple-700 mb-2">
                💰 Amount *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                placeholder="9.99"
                className="w-full px-4 py-3 border-2 border-green-300 rounded-xl focus:ring-4 focus:ring-green-300 focus:border-green-500 font-bold transition-all bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-purple-700 mb-2">
                💵 Currency
              </label>
              <input
                type="text"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                placeholder="INR"
                maxLength="3"
                className="w-full px-4 py-3 border-2 border-green-300 rounded-xl focus:ring-4 focus:ring-green-300 focus:border-green-500 font-bold transition-all bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-purple-700 mb-2">
              🔄 Billing Cycle *
            </label>
            <select
              name="billing_cycle"
              value={formData.billing_cycle}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 font-semibold transition-all bg-white"
            >
              {BILLING_CYCLES.map((cycle) => (
                <option key={cycle} value={cycle}>
                  {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-purple-700 mb-2">
              📅 Next Billing Date *
            </label>
            <input
              type="date"
              name="next_billing_date"
              value={formData.next_billing_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-pink-300 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-500 font-medium transition-all bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-purple-700 mb-2">
              📝 Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional notes about this subscription"
              rows="3"
              className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 font-medium transition-all bg-white"
            />
          </div>

          {subscription && (
            <div>
              <label className="block text-sm font-bold text-purple-700 mb-2">
                🔔 Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 font-semibold transition-all bg-white"
              >
                <option value="active">✅ Active</option>
                <option value="cancelled">❌ Cancelled</option>
                <option value="paused">⏸️ Paused</option>
              </select>
            </div>
          )}

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-4 px-6 rounded-2xl hover:shadow-2xl transition-all duration-300 font-bold text-lg transform hover:scale-105"
            >
              {subscription ? '✏️ Update' : '✨ Add'} Subscription
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white py-4 px-6 rounded-2xl hover:shadow-xl transition-all duration-300 font-bold text-lg transform hover:scale-105"
            >
              ❌ Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
