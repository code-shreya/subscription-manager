import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { Bell, X, Check } from 'lucide-react';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    const handleUpdate = () => loadNotifications();
    window.addEventListener('subscriptions-updated', handleUpdate);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      window.removeEventListener('subscriptions-updated', handleUpdate);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !(n.is_read ?? n.read)).length;

  const getNotificationIcon = (type) => {
    const icons = { renewal_reminder: '⏰', new_subscription: '✨', price_change: '📈', scan_completed: '📧', auto_imported: '🤖' };
    return icons[type || ''] || '🔔';
  };

  const formatTime = (timestamp) => {
    const diff = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="fixed top-14 right-0 sm:right-4 w-[calc(100vw-2rem)] sm:w-96 mx-auto left-0 sm:left-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  Mark all read
                </button>
              )}
              <button onClick={() => setShowDropdown(false)} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const isRead = notification.is_read ?? notification.read;
                const notifType = notification.notification_type || notification.type;
                const createdAt = notification.created_at || notification.createdAt;
                const meta = notification.metadata || {};

                return (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${!isRead ? 'bg-indigo-50/50' : ''}`}
                  >
                    <div className="flex gap-2.5">
                      <div className="text-base mt-0.5">{getNotificationIcon(notifType)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                            {(meta.subscriptionName || meta.amount) && (
                              <div className="mt-1 flex items-center gap-1.5">
                                {meta.subscriptionName && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-medium">
                                    {meta.subscriptionName}
                                  </span>
                                )}
                                {meta.amount && (
                                  <span className="text-[10px] font-semibold text-gray-500">₹{meta.amount}</span>
                                )}
                              </div>
                            )}
                          </div>
                          {!isRead && (
                            <button onClick={() => markAsRead(notification.id)} className="p-1 hover:bg-white rounded flex-shrink-0" title="Mark as read">
                              <Check className="w-3.5 h-3.5 text-indigo-600" />
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 block">{formatTime(createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
