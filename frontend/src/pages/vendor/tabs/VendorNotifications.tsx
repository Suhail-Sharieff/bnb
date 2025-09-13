import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSocket } from '../../../contexts/SocketContext';
import { apiClient, Notification as ApiNotification } from '../../../lib/api';
import { Bell, CheckCircle, Clock, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'react-toastify';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  timestamp: string;
}

export default function VendorNotifications() {
  const { user, token } = useAuth();
  const { socket, connected } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time notification listeners
    if (socket) {
      socket.on('notification', handleRealTimeNotification);
      socket.on('fund_allocated', handleFundAllocated);
      socket.on('fund_released', handleFundReleased);
      socket.on('document_approved', handleDocumentApproved);
    }
    
    return () => {
      if (socket) {
        socket.off('notification', handleRealTimeNotification);
        socket.off('fund_allocated', handleFundAllocated);
        socket.off('fund_released', handleFundReleased);
        socket.off('document_approved', handleDocumentApproved);
      }
    };
  }, [token, socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getNotifications({
        page: 1,
        limit: 20
      });
      
      if (response.success && response.data) {
        // Transform notifications to match our interface
        const transformedNotifications = response.data.map((notification: ApiNotification) => ({
          id: notification._id,
          type: notification.type || 'info',
          title: notification.title,
          message: notification.message,
          priority: notification.priority || 'medium',
          read: notification.isRead || false,
          timestamp: notification.createdAt
        }));
        setNotifications(transformedNotifications);
      } else {
        throw new Error(response.message || 'Failed to fetch notifications');
      }
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.message || 'Failed to load notifications. Please try again.');
      toast.error('Failed to load notifications: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRealTimeNotification = (notificationData: any) => {
    // Add new notification to the list
    const newNotification: Notification = {
      id: notificationData._id || Date.now().toString(),
      type: notificationData.type || 'info',
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || 'medium',
      read: false,
      timestamp: notificationData.createdAt || new Date().toISOString()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show toast for high priority notifications
    if (newNotification.priority === 'high') {
      toast.success(newNotification.message);
    }
  };

  const handleFundAllocated = (data: any) => {
    const fundNotification: Notification = {
      id: `fund-${Date.now()}`,
      type: 'fund_allocation',
      title: 'Funds Allocated',
      message: `You have been allocated $${data.amount.toLocaleString()} for project: ${data.project}`,
      priority: 'high',
      read: false,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [fundNotification, ...prev]);
    toast.success(`Funds allocated: $${data.amount.toLocaleString()} for ${data.project}`);
  };

  const handleFundReleased = (data: any) => {
    const releaseNotification: Notification = {
      id: `release-${Date.now()}`,
      type: 'fund_release',
      title: 'Funds Released',
      message: `Payment of $${data.amount.toLocaleString()} has been released for project: ${data.project}`,
      priority: 'high',
      read: false,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [releaseNotification, ...prev]);
    toast.success(`Funds released: $${data.amount.toLocaleString()} for ${data.project}`);
  };

  const handleDocumentApproved = (data: any) => {
    const docNotification: Notification = {
      id: `doc-${Date.now()}`,
      type: 'document_approved',
      title: 'Document Approved',
      message: `Your document for project "${data.project}" has been approved`,
      priority: 'medium',
      read: false,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [docNotification, ...prev]);
    toast.success(`Document approved for ${data.project}`);
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
        throw new Error(response.message || 'Failed to mark notification as read');
      }
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
      toast.error('Failed to mark notification as read: ' + (err.message || 'Unknown error'));
      // Update UI optimistically even if API fails
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiClient.markAllNotificationsRead();
      
      if (response.success) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
        toast.success('All notifications marked as read');
      } else {
        throw new Error(response.message || 'Failed to mark all notifications as read');
      }
    } catch (err: any) {
      console.error('Failed to mark all notifications as read:', err);
      toast.error('Failed to mark all notifications as read: ' + (err.message || 'Unknown error'));
      // Update UI optimistically even if API fails
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
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
          <p className="text-gray-600">Stay updated with project updates and fund releases</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`h-2 w-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchNotifications}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark all as read
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 p-4 bg-white rounded-r-lg shadow-sm ${
                notification.priority === 'high' ? 'border-l-red-500 bg-red-50' : 
                notification.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50' : 
                'border-l-green-500 bg-green-50'
              } ${!notification.read ? 'border-opacity-100' : 'border-opacity-50 opacity-75'}`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  {notification.type === 'fund_release' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{formatDate(notification.timestamp)}</span>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
            <p className="text-gray-500">You're all caught up! Check back later for new notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
}