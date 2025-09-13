import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, AlertTriangle, CheckCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSocket } from '../../../contexts/SocketContext';
import { apiClient, Notification as ApiNotification } from '../../../lib/api';
import { toast } from 'react-toastify';

interface Notification {
  id: string;
  type: 'budget_request' | 'vendor_update' | 'system_alert' | 'blockchain_confirmation' | 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  timestamp: string;
  actionRequired?: boolean;
}

export default function AdminNotifications() {
  const { token } = useAuth();
  const { socket, connected } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time notification listeners
    if (socket) {
      socket.on('notification', handleRealTimeNotification);
      socket.on('budget_request_update', handleBudgetRequestUpdate);
      socket.on('transaction_update', handleTransactionUpdate);
      socket.on('system_alert', handleSystemAlert);
    }
    
    return () => {
      if (socket) {
        socket.off('notification', handleRealTimeNotification);
        socket.off('budget_request_update', handleBudgetRequestUpdate);
        socket.off('transaction_update', handleTransactionUpdate);
        socket.off('system_alert', handleSystemAlert);
      }
    };
  }, [token, socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getNotifications();
      
      if (response.success && response.data) {
        // Transform the data to match our interface
        const transformedNotifications = response.data.map((notification: ApiNotification) => {
          const mappedType = mapNotificationType(notification.type);
          return {
            id: notification._id,
            type: mappedType,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            read: notification.isRead,
            timestamp: notification.createdAt,
            actionRequired: mappedType === 'budget_request' || mappedType === 'system_alert'
          };
        });
        setNotifications(transformedNotifications);
      } else {
        console.error('Failed to fetch notifications:', response.error);
        toast.error('Failed to load notifications: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRealTimeNotification = (notificationData: any) => {
    // Add new notification to the list
    const newNotification: Notification = {
      id: notificationData._id || Date.now().toString(),
      type: mapNotificationType(notificationData.type),
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || 'medium',
      read: false,
      timestamp: notificationData.createdAt || new Date().toISOString(),
      actionRequired: notificationData.type === 'budget_request' || notificationData.type === 'system_alert'
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show toast for high priority notifications
    if (newNotification.priority === 'high') {
      if (newNotification.type === 'error') {
        toast.error(newNotification.message);
      } else if (newNotification.type === 'warning') {
        toast.warning(newNotification.message);
      } else {
        toast.info(newNotification.message);
      }
    }
  };

  const handleBudgetRequestUpdate = (data: any) => {
    const updateNotification: Notification = {
      id: `br-${data.requestId}-${Date.now()}`,
      type: 'budget_request',
      title: 'Budget Request Updated',
      message: `Request ${data.requestId} status changed to ${data.status}`,
      priority: 'medium',
      read: false,
      timestamp: new Date().toISOString(),
      actionRequired: true
    };
    
    setNotifications(prev => [updateNotification, ...prev]);
    toast.info(`Budget request ${data.requestId} status changed to ${data.status}`);
  };

  const handleTransactionUpdate = (transaction: any) => {
    const transactionNotification: Notification = {
      id: `tx-${transaction.id || Date.now()}`,
      type: 'blockchain_confirmation',
      title: 'Transaction Update',
      message: transaction.status === 'confirmed' 
        ? `Transaction confirmed on block ${transaction.blockNumber}`
        : `Transaction ${transaction.status}`,
      priority: transaction.status === 'confirmed' ? 'high' : 'medium',
      read: false,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [transactionNotification, ...prev]);
    
    if (transaction.status === 'confirmed') {
      toast.success(`Transaction confirmed on block ${transaction.blockNumber}`);
    }
  };

  const handleSystemAlert = (alert: any) => {
    const alertNotification: Notification = {
      id: `alert-${Date.now()}`,
      type: 'system_alert',
      title: alert.title || 'System Alert',
      message: alert.message,
      priority: alert.severity === 'critical' ? 'high' : 'medium',
      read: false,
      timestamp: new Date().toISOString(),
      actionRequired: alert.severity === 'critical'
    };
    
    setNotifications(prev => [alertNotification, ...prev]);
    
    if (alert.severity === 'critical') {
      toast.error(alert.message);
    } else {
      toast.warning(alert.message);
    }
  };

  const mapNotificationType = (type: string): Notification['type'] => {
    switch (type) {
      case 'budget_request': return 'budget_request';
      case 'vendor_update': return 'vendor_update';
      case 'system_alert': return 'system_alert';
      case 'blockchain_confirmation': return 'blockchain_confirmation';
      case 'info': return 'info';
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await apiClient.markNotificationRead(id);
      
      if (response.success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id ? { ...notification, read: true } : notification
          )
        );
      } else {
        console.error('Failed to mark notification as read:', response.error);
        toast.error('Failed to mark notification as read: ' + (response.error || 'Unknown error'));
        // Fallback to local state update
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id ? { ...notification, read: true } : notification
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read: ' + (error instanceof Error ? error.message : 'Unknown error'));
      // Fallback to local state update
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
    }
  };

  const markAsUnread = async (id: string) => {
    try {
      // Note: There's no specific API for marking as unread, so we'll just update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? { ...notification, read: false } : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as unread:', error);
      toast.error('Failed to mark notification as unread: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const markAllAsRead = async () => {
    try {
      // Mark all notifications as read
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Update local state first for better UX
      setNotifications(prev => 
        prev.map(notification => 
          !notification.read ? { ...notification, read: true } : notification
        )
      );
      
      // Then update on server
      const response = await apiClient.markAllNotificationsRead();
      
      if (!response.success) {
        console.error('Failed to mark all notifications as read:', response.error);
        toast.error('Failed to mark all notifications as read: ' + (response.error || 'Unknown error'));
        // Revert local state update on error
        setNotifications(prev => 
          prev.map(notification => 
            !notification.read ? { ...notification, read: false } : notification
          )
        );
      } else {
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark all notifications as read: ' + (error instanceof Error ? error.message : 'Unknown error'));
      // Revert local state update on error
      setNotifications(prev => 
        prev.map(notification => 
          !notification.read ? { ...notification, read: false } : notification
        )
      );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'budget_request': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'vendor_update': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'system_alert': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'blockchain_confirmation': return <Clock className="h-4 w-4 text-purple-500" />;
      case 'info': return <Bell className="h-4 w-4 text-blue-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-green-500 bg-green-50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Stay updated with system alerts and activity</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`h-2 w-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          <button 
            onClick={markAllAsRead}
            className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center"
          >
            <Eye className="h-4 w-4 mr-1" />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
            <p className="text-gray-500">You're all caught up! Check back later for new notifications.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 p-4 bg-white rounded-r-lg shadow-sm ${getPriorityColor(notification.priority)} ${
                !notification.read ? 'border-opacity-100' : 'border-opacity-50 opacity-75'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{formatDate(notification.timestamp)}</span>
                      <button
                        onClick={() => notification.read ? markAsUnread(notification.id) : markAsRead(notification.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {notification.read ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  {notification.actionRequired && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Action Required
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}