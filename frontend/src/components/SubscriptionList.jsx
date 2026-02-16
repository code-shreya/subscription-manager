import { useEffect, useState } from 'react';
import { api } from '../api';
import { Edit, Trash2, Plus, Search, MoreVertical, Clock, DollarSign } from 'lucide-react';
import SubscriptionForm from './SubscriptionForm';

const categoryColors = {
  'Streaming': 'bg-blue-50 text-blue-700 border-blue-200',
  'Music': 'bg-purple-50 text-purple-700 border-purple-200',
  'Productivity': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Cloud Storage': 'bg-teal-50 text-teal-700 border-teal-200',
  'Gaming': 'bg-orange-50 text-orange-700 border-orange-200',
  'News & Media': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Fitness': 'bg-green-50 text-green-700 border-green-200',
  'Software': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Rentals': 'bg-amber-50 text-amber-700 border-amber-200',
  'Investment': 'bg-blue-50 text-blue-700 border-blue-200',
  'Other': 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function SubscriptionList() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);

  useEffect(() => {
    loadSubscriptions();

    const handleUpdate = () => {
      loadSubscriptions();
    };

    window.addEventListener('subscriptions-updated', handleUpdate);
    return () => window.removeEventListener('subscriptions-updated', handleUpdate);
  }, []);

  useEffect(() => {
    filterSubscriptions();
  }, [subscriptions, searchTerm, filterCategory]);

  const loadSubscriptions = async () => {
    try {
      const data = await api.getSubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSubscriptions = () => {
    let filtered = [...subscriptions];

    if (searchTerm) {
      filtered = filtered.filter((sub) =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter((sub) => sub.category === filterCategory);
    }

    setFilteredSubscriptions(filtered);
  };

  const handleAdd = () => {
    setEditingSubscription(null);
    setShowForm(true);
  };

  const handleEdit = (subscription) => {
    setEditingSubscription(subscription);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subscription?')) return;

    try {
      await api.deleteSubscription(id);
      await loadSubscriptions();
    } catch (error) {
      console.error('Failed to delete subscription:', error);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingSubscription) {
        await api.updateSubscription(editingSubscription.id, formData);
      } else {
        await api.createSubscription(formData);
      }
      await loadSubscriptions();
      setShowForm(false);
      setEditingSubscription(null);
    } catch (error) {
      console.error('Failed to save subscription:', error);
    }
  };

  const categories = [...new Set(subscriptions.map((sub) => sub.category))];
  const totalSpending = filteredSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0969da]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#d0d7de]">
        <div>
          <h1 className="text-2xl font-semibold text-[#24292f]">Subscriptions</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm text-gray-600">{filteredSubscriptions.length} active</span>
            <span className="text-sm font-semibold text-[#24292f]">₹{totalSpending.toFixed(0)}/month</span>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white text-sm font-medium rounded-md hover:bg-[#2c974b] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Subscription
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#d0d7de] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 bg-white border border-[#d0d7de] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Subscriptions List */}
      {filteredSubscriptions.length > 0 ? (
        <div className="space-y-3">
          {filteredSubscriptions.map((sub) => {
            const daysUntil = Math.ceil(
              (new Date(sub.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24)
            );
            const isUrgent = daysUntil <= 7 && daysUntil >= 0;
            const categoryStyle = categoryColors[sub.category] || categoryColors['Other'];

            return (
              <div
                key={sub.id}
                className={`bg-white border border-[#d0d7de] rounded-md p-4 hover:bg-gray-50 transition-colors ${
                  isUrgent ? 'border-[#bf8700] bg-[#fff8c5]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-base text-[#24292f] truncate">{sub.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${categoryStyle}`}>
                        {sub.category}
                      </span>
                      {sub.status === 'active' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Active
                        </span>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-semibold text-[#24292f]">
                        {sub.amount ? `₹${sub.amount}` : '—'}
                      </span>
                      {sub.billing_cycle && (
                        <span className="text-sm text-gray-600">/{sub.billing_cycle}</span>
                      )}
                    </div>

                    {/* Next Billing */}
                    {sub.next_billing_date && (
                      <div className={`flex items-center gap-2 text-sm ${
                        isUrgent ? 'text-[#9a6700]' : 'text-gray-600'
                      }`}>
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Next billing:</span>
                        <span>
                          {new Date(sub.next_billing_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        {isUrgent && (
                          <span className="ml-1 px-2 py-0.5 bg-[#9a6700] text-white text-xs font-semibold rounded-md">
                            {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(sub)}
                      className="p-2 text-gray-600 hover:bg-gray-100 hover:text-[#24292f] rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#d0d7de] rounded-md p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4 font-medium">No subscriptions found</p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white text-sm font-medium rounded-md hover:bg-[#2c974b] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Subscription
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <SubscriptionForm
          subscription={editingSubscription}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingSubscription(null);
          }}
        />
      )}
    </div>
  );
}
