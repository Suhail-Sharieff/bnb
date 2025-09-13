import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  timestamp: Date;
  read?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remove non-persistent notifications
    if (!notification.persistent) {
      const duration = notification.duration || 5000;
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      markAsRead,
      clearAll,
      unreadCount
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Toast notification component
const ToastNotification: React.FC<{ notification: Notification; onClose: (id: string) => void }> = ({
  notification,
  onClose
}) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  };

  const colors = {
    success: 'bg-green-900/90 border-green-500 text-green-100',
    error: 'bg-red-900/90 border-red-500 text-red-100',
    warning: 'bg-amber-900/90 border-amber-500 text-amber-100',
    info: 'bg-blue-900/90 border-blue-500 text-blue-100'
  };

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-blue-400'
  };

  const Icon = icons[notification.type];

  return (
    <div className={cn(
      "flex items-start space-x-3 p-4 rounded-lg border backdrop-blur-sm shadow-lg animate-slideIn",
      colors[notification.type]
    )}>
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", iconColors[notification.type])} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{notification.title}</p>
        <p className="text-sm opacity-90 mt-1">{notification.message}</p>
        <p className="text-xs opacity-70 mt-2">
          {notification.timestamp.toLocaleTimeString()}
        </p>
      </div>
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-200 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Toast container component
export const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();
  const visibleNotifications = notifications.slice(0, 5); // Show max 5 toasts

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {visibleNotifications.map(notification => (
        <ToastNotification
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};

// Notification bell component for header
interface NotificationBellProps {
  onClick: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const { unreadCount } = useNotifications();

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-400 hover:text-gray-200 transition-colors"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

// Notification panel component
interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, clearAll, removeNotification } = useNotifications();

  useEffect(() => {
    if (isOpen) {
      // Mark all notifications as read when panel is opened
      notifications.forEach(notification => {
        if (!notification.read) {
          markAsRead(notification.id);
        }
      });
    }
  }, [isOpen, notifications, markAsRead]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-96 bg-gray-800 border-l border-gray-700 z-50 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100">Notifications</h3>
          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto h-full pb-16">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Bell className="w-8 h-8 mb-2" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map(notification => {
                const Icon = {
                  success: CheckCircle,
                  error: AlertCircle,
                  warning: AlertTriangle,
                  info: Info
                }[notification.type];

                const iconColor = {
                  success: 'text-green-400',
                  error: 'text-red-400',
                  warning: 'text-amber-400',
                  info: 'text-blue-400'
                }[notification.type];

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 border-b border-gray-700 hover:bg-gray-700/50 transition-colors",
                      !notification.read && "bg-blue-900/10 border-blue-800"
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", iconColor)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-100 text-sm">
                          {notification.title}
                        </p>
                        <p className="text-gray-300 text-sm mt-1">
                          {notification.message}
                        </p>
                        <p className="text-gray-500 text-xs mt-2">
                          {notification.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Hook for trust verification notifications
export const useTrustVerificationNotifications = () => {
  const { addNotification } = useNotifications();

  const notifyTransactionSubmitted = (txHash: string, amount: number) => {
    addNotification({
      type: 'info',
      title: 'Transaction Submitted',
      message: `Budget transaction of $${amount.toLocaleString()} submitted for trust verification. ID: ${txHash.slice(0, 10)}...`,
      duration: 8000
    });
  };

  const notifyTransactionConfirmed = (txHash: string, blockNumber: number) => {
    addNotification({
      type: 'success',
      title: 'Transaction Confirmed',
      message: `Transaction confirmed in block ${blockNumber}. Hash: ${txHash.slice(0, 10)}...`,
      duration: 10000
    });
  };

  const notifyTransactionFailed = (error: string) => {
    addNotification({
      type: 'error',
      title: 'Transaction Failed',
      message: `Trust verification transaction failed: ${error}`,
      persistent: true
    });
  };

  const notifyAnomalyDetected = (transactionId: string, reason: string) => {
    addNotification({
      type: 'warning',
      title: 'Anomaly Detected',
      message: `AI flagged transaction ${transactionId}: ${reason}`,
      persistent: true
    });
  };

  const notifyVerificationComplete = (isVerified: boolean, dataHash: string) => {
    addNotification({
      type: isVerified ? 'success' : 'error',
      title: isVerified ? 'Data Verified' : 'Data Tampered',
      message: isVerified 
        ? `Budget data integrity verified. Hash: ${dataHash.slice(0, 10)}...`
        : `Data tampering detected! Hash mismatch: ${dataHash.slice(0, 10)}...`,
      duration: isVerified ? 6000 : undefined,
      persistent: !isVerified
    });
  };

  return {
    notifyTransactionSubmitted,
    notifyTransactionConfirmed,
    notifyTransactionFailed,
    notifyAnomalyDetected,
    notifyVerificationComplete
  };
};