import { useEffect, useState } from 'react';
import { api } from '../api';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const categoryColors = {
  'Streaming': 'bg-[#0969da] text-white',
  'Music': 'bg-[#8250df] text-white',
  'Productivity': 'bg-[#1f6feb] text-white',
  'Cloud Storage': 'bg-[#0969da] text-white',
  'Gaming': 'bg-[#fb8500] text-white',
  'News & Media': 'bg-[#9a6700] text-white',
  'Fitness': 'bg-[#1a7f37] text-white',
  'Software': 'bg-[#8250df] text-white',
  'Rentals': 'bg-[#bf8700] text-white',
  'Investment': 'bg-[#0969da] text-white',
  'Other': 'bg-gray-600 text-white',
};

export default function CalendarView() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();

    const handleUpdate = () => {
      loadSubscriptions();
    };

    window.addEventListener('subscriptions-updated', handleUpdate);
    return () => window.removeEventListener('subscriptions-updated', handleUpdate);
  }, []);

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

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getSubscriptionsForDate = (date) => {
    return subscriptions.filter((sub) => {
      if (!sub.next_billing_date) return false;
      const subDate = new Date(sub.next_billing_date);
      return (
        subDate.getDate() === date.getDate() &&
        subDate.getMonth() === date.getMonth() &&
        subDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0969da]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#d0d7de]">
        <h1 className="text-2xl font-semibold text-[#24292f]">Calendar</h1>
        <p className="text-sm text-gray-600 mt-1">View your upcoming subscription renewals</p>
      </div>

      {/* Calendar Card */}
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        {/* Calendar Header */}
        <div className="bg-[#24292f] px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 text-white hover:bg-white/10 rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white">{monthName}</h2>
              <p className="text-sm text-gray-300 mt-1">
                {subscriptions.filter(s => new Date(s.next_billing_date).getMonth() === month).length} renewals this month
              </p>
            </div>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 text-white hover:bg-white/10 rounded-md transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-600 uppercase py-2"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const date = new Date(year, month, day);
              const daySubscriptions = getSubscriptionsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isPast = date < new Date() && !isToday;

              return (
                <div
                  key={day}
                  className={`
                    relative aspect-square p-2 rounded-md border transition-colors
                    ${isToday
                      ? 'border-[#0969da] bg-[#ddf4ff] border-2'
                      : daySubscriptions.length > 0
                      ? 'border-[#0969da] bg-[#f6f8fa] hover:bg-gray-100'
                      : isPast
                      ? 'border-[#d0d7de] bg-gray-50'
                      : 'border-[#d0d7de] bg-white hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="h-full flex flex-col">
                    <div
                      className={`text-sm font-semibold mb-1 ${
                        isToday
                          ? 'text-[#0969da]'
                          : isPast
                          ? 'text-gray-400'
                          : daySubscriptions.length > 0
                          ? 'text-[#24292f]'
                          : 'text-gray-600'
                      }`}
                    >
                      {day}
                    </div>
                    <div className="flex-1 overflow-hidden space-y-0.5">
                      {daySubscriptions.slice(0, 3).map((sub) => (
                        <div
                          key={sub.id}
                          className={`${categoryColors[sub.category] || categoryColors['Other']} text-xs px-1.5 py-0.5 rounded font-medium truncate`}
                          title={`${sub.name} - ₹${sub.amount}`}
                        >
                          {sub.name}
                        </div>
                      ))}
                      {daySubscriptions.length > 3 && (
                        <div className="text-xs text-[#0969da] font-semibold px-1">
                          +{daySubscriptions.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Renewals List */}
      <div className="bg-white border border-[#d0d7de] rounded-md p-6">
        <h3 className="text-lg font-semibold text-[#24292f] mb-4">Upcoming Renewals</h3>
        {subscriptions.length > 0 ? (
          <div className="space-y-2">
            {subscriptions
              .filter((sub) => sub.next_billing_date && new Date(sub.next_billing_date) >= new Date())
              .sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date))
              .slice(0, 10)
              .map((sub) => {
                const daysUntil = Math.ceil(
                  (new Date(sub.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24)
                );
                const isUrgent = daysUntil <= 7;
                const categoryColor = categoryColors[sub.category] || categoryColors['Other'];

                return (
                  <div
                    key={sub.id}
                    className={`flex items-center gap-4 p-3 rounded-md border hover:bg-gray-50 transition-colors ${
                      isUrgent
                        ? 'border-[#bf8700] bg-[#fff8c5]'
                        : 'border-[#d0d7de]'
                    }`}
                  >
                    <div className={`w-1 h-12 rounded-full ${categoryColor}`}></div>
                    <div className="flex-1">
                      <div className="font-semibold text-[#24292f]">{sub.name}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(sub.next_billing_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#24292f]">₹{sub.amount || '—'}</div>
                      <div
                        className={`text-xs font-medium ${
                          isUrgent ? 'text-[#9a6700]' : 'text-gray-600'
                        }`}
                      >
                        {daysUntil === 0
                          ? 'Today'
                          : daysUntil === 1
                          ? 'Tomorrow'
                          : `in ${daysUntil} days`}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No upcoming renewals</p>
          </div>
        )}
      </div>

      {/* Color Legend */}
      <div className="bg-[#f6f8fa] border border-[#d0d7de] rounded-md p-6">
        <h3 className="text-sm font-semibold text-[#24292f] mb-3">Categories</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(categoryColors).map(([category, color]) => (
            <div key={category} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${color}`}></div>
              <span className="text-xs text-gray-600">{category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
