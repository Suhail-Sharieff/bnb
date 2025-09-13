import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      const newSocket = io(SOCKET_URL, {
        auth: {
          token,
          userId: user.id
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('🔗 Socket connected');
        setConnected(true);
        
        // Join user-specific room for notifications
        newSocket.emit('join_user_room', user.id);
        
        // Join role-specific rooms
        if (user.role === 'admin') {
          newSocket.emit('join_admin_room');
        } else if (user.role === 'vendor') {
          newSocket.emit('join_vendor_room', user.id);
        }
        
        toast.success('Connected to real-time updates');
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
        setConnected(false);
        toast.warning('Disconnected from real-time updates');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
      });

      // Real-time notification handlers
      newSocket.on('notification', (notification) => {
        console.log('📬 New notification:', notification);
        // Show toast for high priority notifications
        if (notification.priority === 'high') {
          if (notification.type === 'success') {
            toast.success(notification.message);
          } else if (notification.type === 'error') {
            toast.error(notification.message);
          } else if (notification.type === 'warning') {
            toast.warning(notification.message);
          } else {
            toast.info(notification.message);
          }
        }
      });

      // Budget request updates
      newSocket.on('budget_request_update', (data) => {
        console.log('💰 Budget request update:', data);
        toast.info(`Request ${data.requestId} status changed to ${data.status}`);
      });

      // Transaction updates
      newSocket.on('transaction_update', (transaction) => {
        console.log('🔄 Transaction update:', transaction);
        
        if (transaction.status === 'confirmed') {
          toast.success(`Transaction confirmed on block ${transaction.blockNumber}`);
        }
      });

      // Wallet balance updates
      newSocket.on('wallet_update', (walletData) => {
        console.log('💳 Wallet update:', walletData);
        toast.info(`Wallet balance updated`);
      });

      // Fund allocation notifications
      newSocket.on('fund_allocated', (data) => {
        console.log('💸 Fund allocated:', data);
        toast.success(`$${data.amount.toLocaleString()} allocated to ${data.project}`);
      });

      // Fund release notifications
      newSocket.on('fund_released', (data) => {
        console.log('💰 Fund released:', data);
        toast.success(`$${data.amount.toLocaleString()} released for ${data.project}`);
      });

      // System alerts
      newSocket.on('system_alert', (alert) => {
        console.log('⚠️ System alert:', alert);
        
        if (alert.severity === 'critical') {
          toast.error(alert.message);
        } else {
          toast.warning(alert.message);
        }
      });

      setSocket(newSocket);

      return () => {
        console.log('🔌 Cleaning up socket connection');
        newSocket.close();
      };
    }
  }, [user, token]);

  const emit = (event: string, data: any) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const on = (event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event: string, callback?: (data: any) => void) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  };

  const value = {
    socket,
    connected,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}