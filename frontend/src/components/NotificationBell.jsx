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
      const items = data.notifications || data || [];
      setNotifications(items);
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
    const notifType = type || '';
    const icons = {
      renewal_reminder: '⏰',
      new_subscription: '✨',
      price_change: '📈',
      scan_completed: '📧',
      auto_imported: '🤖',
    };
    return icons[notifType] || '🔔';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="fixed top-16 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowDropdown(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => {
                  const isRead = notification.is_read ?? notification.read;
                  const notifType = notification.notification_type || notification.type;
                  const createdAt = notification.created_at || notification.createdAt;
                  const meta = notification.metadata || {};

                  return (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                        !isRead ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="text-lg">{getNotificationIcon(notifType)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
                              {(meta.subscriptionName || meta.amount) && (
                                <div className="mt-1 flex items-center gap-2">
                                  {meta.subscriptionName && (
                                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                                      {meta.subscriptionName}
                                    </span>
                                  )}
                                  {meta.amount && (
                                    <span className="text-xs font-semibold text-gray-600">
                                      ₹{meta.amount}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {!isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 hover:bg-white rounded transition-colors flex-shrink-0"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4 text-purple-600" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">{formatTime(createdAt)}</span>
                            {isRead && (
                              <span className="text-xs text-gray-400">Read</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
