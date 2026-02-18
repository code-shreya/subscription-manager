import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CATEGORIES = [
  'Streaming', 'Music', 'Productivity', 'Cloud Storage',
  'Gaming', 'News & Media', 'Fitness', 'Software', 'Other',
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
    if (subscription) setFormData(subscription);
  }, [subscription]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-lg font-semibold text-gray-900">
            {subscription ? 'Edit Subscription' : 'Add Subscription'}
          </h2>
          <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Service Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Netflix, Spotify, etc." className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select name="category" value={formData.category} onChange={handleChange} required className={inputClass}>
              {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Amount</label>
              <input type="number" name="amount" value={formData.amount} onChange={handleChange} required step="0.01" min="0" placeholder="499" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <input type="text" name="currency" value={formData.currency} onChange={handleChange} placeholder="INR" maxLength="3" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Billing Cycle</label>
            <select name="billing_cycle" value={formData.billing_cycle} onChange={handleChange} required className={inputClass}>
              {BILLING_CYCLES.map((cycle) => (<option key={cycle} value={cycle}>{cycle.charAt(0).toUpperCase() + cycle.slice(1)}</option>))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Next Billing Date</label>
            <input type="date" name="next_billing_date" value={formData.next_billing_date} onChange={handleChange} required className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Description (optional)</label>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Notes about this subscription" rows="2" className={inputClass} />
          </div>

          {subscription && (
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {subscription ? 'Update' : 'Add'} Subscription
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
