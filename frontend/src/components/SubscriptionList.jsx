import { useEffect, useState } from 'react';
import { api } from '../api';
import { Edit, Trash2, Plus, Search, MoreVertical, TrendingUp, Clock, DollarSign } from 'lucide-react';
import SubscriptionForm from './SubscriptionForm';

const categoryColors = {
  'Streaming': 'from-rose-500 to-pink-600',
  'Music': 'from-purple-500 to-indigo-600',
  'Productivity': 'from-blue-500 to-cyan-600',
  'Cloud Storage': 'from-teal-500 to-emerald-600',
  'Gaming': 'from-orange-500 to-red-600',
  'News & Media': 'from-amber-500 to-yellow-600',
  'Fitness': 'from-green-500 to-lime-600',
  'Software': 'from-violet-500 to-purple-600',
  'Rentals': 'from-amber-600 to-orange-600',
  'Investment': 'from-indigo-600 to-blue-600',
  'Other': 'from-gray-500 to-slate-600',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Subscriptions</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm text-gray-500">{filteredSubscriptions.length} active</span>
            <span className="text-sm font-semibold text-purple-600">₹{totalSpending.toFixed(0)}/month</span>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transform hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Add Subscription
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Subscriptions Grid */}
      {filteredSubscriptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubscriptions.map((sub) => {
            const daysUntil = Math.ceil(
              (new Date(sub.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24)
            );
            const isUrgent = daysUntil <= 7 && daysUntil >= 0;
            const categoryGradient = categoryColors[sub.category] || categoryColors['Other'];

            return (
              <div
                key={sub.id}
                className={`group relative bg-white rounded-2xl border-2 p-5 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                  isUrgent ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white' : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                {/* Gradient Top Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${categoryGradient} rounded-t-2xl`}></div>

                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">{sub.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-gradient-to-r ${categoryGradient} text-white rounded-full shadow-sm`}>
                      {sub.category}
                    </span>
                  </div>
                  <div className="relative">
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-200 hidden group-hover:block z-10">
                      <button
                        onClick={() => handleEdit(sub)}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-2 rounded-t-xl transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-xl transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Amount - Large & Prominent */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {sub.amount ? `₹${sub.amount}` : '—'}
                    </span>
                    {sub.billing_cycle && (
                      <span className="text-sm text-gray-500 font-medium">/{sub.billing_cycle}</span>
                    )}
                  </div>
                </div>

                {/* Next Billing */}
                {sub.next_billing_date && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl ${
                    isUrgent ? 'bg-amber-100 border border-amber-300' : 'bg-gray-50'
                  }`}>
                    <Clock className={`w-4 h-4 ${isUrgent ? 'text-amber-600' : 'text-gray-500'}`} />
                    <div className="flex-1">
                      <div className={`text-xs font-medium ${isUrgent ? 'text-amber-900' : 'text-gray-600'}`}>
                        Next billing
                      </div>
                      <div className={`text-sm font-semibold ${isUrgent ? 'text-amber-700' : 'text-gray-900'}`}>
                        {new Date(sub.next_billing_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    {isUrgent && (
                      <span className="text-xs font-bold text-amber-600 bg-amber-200 px-2 py-1 rounded-full">
                        {daysUntil === 0 ? 'Today!' : `${daysUntil}d`}
                      </span>
                    )}
                  </div>
                )}

                {/* Status Badge */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
                      sub.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : sub.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      sub.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                    {sub.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-dashed border-purple-200 p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-gray-600 mb-4 font-medium">No subscriptions found</p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
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
