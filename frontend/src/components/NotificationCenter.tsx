import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
  Filter,
  Settings,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useSocket } from '../contexts/SocketContext';
import { toast } from 'react-toastify';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { state, markNotificationRead, removeNotification } = useApp();
  const { connected: socketConnected } = useSocket();
  const [filter, setFilter] = useState<'all' | 'unread' | 'high' | 'today'>('all');
  const [showSettings, setShowSettings] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return time.toLocaleDateString();
  };

  const filteredNotifications = state.notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'high':
        return notification.priority === 'high';
      case 'today':
        const today = new Date();
        const notifDate = new Date(notification.timestamp);
        return notifDate.toDateString() === today.toDateString();
      default:
        return true;
    }
  });

  const unreadCount = state.notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    markNotificationRead(id);
    toast.success('Notification marked as read');
  };

  const handleDelete = (id: string) => {
    removeNotification(id);
    toast.info('Notification removed');
  };

  const handleMarkAllAsRead = () => {
    state.notifications.forEach(notification => {
      if (!notification.read) {
        markNotificationRead(notification.id);
      }
    });
    toast.success('All notifications marked as read');
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all notifications?')) {
      state.notifications.forEach(notification => {
        removeNotification(notification.id);
      });
      toast.info('All notifications cleared');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      ></div>

      {/* Notification Panel */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-gray-700" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{unreadCount} unread</span>
                <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{socketConnected ? 'Live' : 'Offline'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter and Actions */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">All ({state.notifications.length})</option>
              <option value="unread">Unread ({unreadCount})</option>
              <option value="high">High Priority</option>
              <option value="today">Today</option>
            </select>
          </div>
          
          {unreadCount > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleMarkAllAsRead}
                className="flex-1 text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
              >
                Mark All Read
              </button>
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-600 hover:text-red-600 px-3 py-1 border border-gray-300 rounded-md hover:border-red-300 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Notification Settings</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm text-gray-600">Budget request updates</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm text-gray-600">Transaction confirmations</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm text-gray-600">Wallet updates</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm text-gray-600">System alerts</span>
              </label>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Bell className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs text-gray-400">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-gray-400 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                            {notification.priority === 'high' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                High Priority
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              title="Mark as read"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Action buttons if available */}
                      {notification.actions && notification.actions.length > 0 && (
                        <div className="flex items-center space-x-2 mt-3">
                          {notification.actions.map((action, index) => (
                            <button
                              key={index}
                              onClick={action.action}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                            >
                              {action.label}
                              <ArrowUpRight className="w-3 h-3 ml-1" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{socketConnected ? 'Real-time' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}