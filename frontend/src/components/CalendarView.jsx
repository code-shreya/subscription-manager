import { useEffect, useState } from 'react';
import { api } from '../api';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const categoryColors = {
  'Streaming': 'bg-blue-100 text-blue-700',
  'Music': 'bg-purple-100 text-purple-700',
  'Productivity': 'bg-cyan-100 text-cyan-700',
  'Cloud Storage': 'bg-sky-100 text-sky-700',
  'Gaming': 'bg-orange-100 text-orange-700',
  'News & Media': 'bg-amber-100 text-amber-700',
  'Fitness': 'bg-emerald-100 text-emerald-700',
  'Software': 'bg-violet-100 text-violet-700',
  'Rentals': 'bg-rose-100 text-rose-700',
  'Investment': 'bg-indigo-100 text-indigo-700',
  'Other': 'bg-gray-100 text-gray-700',
};

const categoryDotColors = {
  'Streaming': 'bg-blue-500',
  'Music': 'bg-purple-500',
  'Productivity': 'bg-cyan-500',
  'Cloud Storage': 'bg-sky-500',
  'Gaming': 'bg-orange-500',
  'News & Media': 'bg-amber-500',
  'Fitness': 'bg-emerald-500',
  'Software': 'bg-violet-500',
  'Rentals': 'bg-rose-500',
  'Investment': 'bg-indigo-500',
  'Other': 'bg-gray-500',
};

export default function CalendarView() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();

    const handleUpdate = () => loadSubscriptions();
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
    return { daysInMonth: lastDay.getDate(), startingDayOfWeek: firstDay.getDay(), year, month };
  };

  const getSubscriptionsForDate = (date) => {
    return subscriptions.filter((sub) => {
      if (!sub.next_billing_date) return false;
      const subDate = new Date(sub.next_billing_date);
      return subDate.getDate() === date.getDate() && subDate.getMonth() === date.getMonth() && subDate.getFullYear() === date.getFullYear();
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
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">View your upcoming subscription renewals</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Calendar Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigateMonth(-1)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {subscriptions.filter(s => s.next_billing_date && new Date(s.next_billing_date).getMonth() === month).length} renewals this month
              </p>
            </div>
            <button onClick={() => navigateMonth(1)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-gray-400 uppercase py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="aspect-square" />;

              const date = new Date(year, month, day);
              const daySubscriptions = getSubscriptionsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isPast = date < new Date() && !isToday;

              return (
                <div
                  key={day}
                  className={`aspect-square p-1.5 rounded-lg border transition-colors ${
                    isToday
                      ? 'border-indigo-300 bg-indigo-50'
                      : daySubscriptions.length > 0
                      ? 'border-gray-200 bg-white hover:bg-gray-50'
                      : isPast
                      ? 'border-transparent bg-gray-50/50'
                      : 'border-transparent bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="h-full flex flex-col">
                    <div className={`text-xs font-medium mb-0.5 ${
                      isToday ? 'text-indigo-600 font-semibold' : isPast ? 'text-gray-300' : daySubscriptions.length > 0 ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {day}
                    </div>
                    <div className="flex-1 overflow-hidden space-y-0.5">
                      {daySubscriptions.slice(0, 2).map((sub) => (
                        <div
                          key={sub.id}
                          className={`${categoryColors[sub.category] || categoryColors['Other']} text-[10px] px-1 py-0.5 rounded font-medium truncate max-w-full overflow-hidden`}
                          title={`${sub.name} - ₹${sub.amount}`}
                        >
                          {sub.name}
                        </div>
                      ))}
                      {daySubscriptions.length > 2 && (
                        <div className="text-[10px] text-indigo-600 font-medium px-1">+{daySubscriptions.length - 2}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Renewals */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Upcoming Renewals</h3>
        {subscriptions.length > 0 ? (
          <div className="space-y-2">
            {subscriptions
              .filter((sub) => sub.next_billing_date && new Date(sub.next_billing_date) >= new Date())
              .sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date))
              .slice(0, 10)
              .map((sub) => {
                const daysUntil = Math.ceil((new Date(sub.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysUntil <= 7;

                return (
                  <div
                    key={sub.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isUrgent ? 'border-amber-200 bg-amber-50' : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-1.5 h-10 rounded-full ${categoryDotColors[sub.category] || categoryDotColors['Other']}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{sub.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(sub.next_billing_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">₹{sub.amount || '---'}</div>
                      <div className={`text-xs font-medium ${isUrgent ? 'text-amber-600' : 'text-gray-400'}`}>
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil}d`}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No upcoming renewals</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          {Object.entries(categoryDotColors).map(([category, color]) => (
            <div key={category} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-xs text-gray-500">{category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
