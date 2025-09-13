import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

// Types
interface Transaction {
  id: string;
  transactionHash: string;
  blockNumber: number;
  amount: number;
  project: string;
  department: string;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'allocation' | 'release' | 'withdrawal';
  timestamp: string;
  from?: string;
  to?: string;
  gasUsed?: number;
  gasPrice?: string;
  explorerUrl?: string;
  approvalStatus: 'requested' | 'approved' | 'rejected' | 'allocated' | 'completed';
  verificationStatus: 'pending' | 'verified' | 'failed';
}

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

interface WalletData {
  address: string;
  balance: {
    allocated: number;
    available: number;
    withdrawn: number;
    pending: number;
  };
  transactions: Transaction[];
  lastUpdated: string;
}

interface DashboardData {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  activeVendors: number;
  pendingRequests: number;
  completedProjects: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    amount?: number;
  }>;
}

interface AppState {
  transactions: Transaction[];
  notifications: Notification[];
  wallet: WalletData | null;
  dashboard: DashboardData | null;
  loading: {
    transactions: boolean;
    notifications: boolean;
    wallet: boolean;
    dashboard: boolean;
  };
  error: {
    transactions: string | null;
    notifications: string | null;
    wallet: string | null;
    dashboard: string | null;
  };
  filters: {
    transactions: {
      status: string;
      type: string;
      search: string;
      dateRange: {
        start: string;
        end: string;
      };
    };
  };
}

type AppAction =
  | { type: 'SET_LOADING'; payload: { key: keyof AppState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: { key: keyof AppState['error']; value: string | null } }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: { id: string; updates: Partial<Transaction> } }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_WALLET'; payload: WalletData }
  | { type: 'UPDATE_WALLET_BALANCE'; payload: Partial<WalletData['balance']> }
  | { type: 'SET_DASHBOARD'; payload: DashboardData }
  | { type: 'UPDATE_FILTERS'; payload: { key: string; value: any } }
  | { type: 'RESET_STATE' };

const initialState: AppState = {
  transactions: [],
  notifications: [],
  wallet: null,
  dashboard: null,
  loading: {
    transactions: false,
    notifications: false,
    wallet: false,
    dashboard: false,
  },
  error: {
    transactions: null,
    notifications: null,
    wallet: null,
    dashboard: null,
  },
  filters: {
    transactions: {
      status: 'all',
      type: 'all',
      search: '',
      dateRange: {
        start: '',
        end: '',
      },
    },
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: {
          ...state.error,
          [action.payload.key]: action.payload.value,
        },
      };
    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload,
      };
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
      };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(tx =>
          tx.id === action.payload.id ? { ...tx, ...action.payload.updates } : tx
        ),
      };
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif =>
          notif.id === action.payload ? { ...notif, read: true } : notif
        ),
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notif => notif.id !== action.payload),
      };
    case 'SET_WALLET':
      return {
        ...state,
        wallet: action.payload,
      };
    case 'UPDATE_WALLET_BALANCE':
      return {
        ...state,
        wallet: state.wallet ? {
          ...state.wallet,
          balance: { ...state.wallet.balance, ...action.payload },
          lastUpdated: new Date().toISOString(),
        } : null,
      };
    case 'SET_DASHBOARD':
      return {
        ...state,
        dashboard: action.payload,
      };
    case 'UPDATE_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.key]: {
            ...state.filters[action.payload.key as keyof typeof state.filters],
            ...action.payload.value,
          },
        },
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Transaction actions
  fetchTransactions: (filters?: any) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  
  // Notification actions
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  
  // Wallet actions
  fetchWalletData: () => Promise<void>;
  updateWalletBalance: (updates: Partial<WalletData['balance']>) => void;
  
  // Dashboard actions
  fetchDashboardData: () => Promise<void>;
  
  // Filter actions
  updateFilters: (key: string, value: any) => void;
  
  // Utility actions
  resetState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user, token } = useAuth();

  // Fetch transactions with filters
  const fetchTransactions = async (filters?: any) => {
    if (!token) return;
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'transactions', value: true } });
    dispatch({ type: 'SET_ERROR', payload: { key: 'transactions', value: null } });
    
    try {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const response = await fetch(`${API_BASE_URL}/budget/transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_TRANSACTIONS', payload: data.data?.transactions || [] });
      } else {
        throw new Error('Failed to fetch transactions');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'transactions', value: error.message } });
      // Use mock data in development
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          blockNumber: 19234567,
          amount: 50000,
          project: 'Website Redesign',
          department: 'Marketing',
          status: 'confirmed',
          type: 'allocation',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          from: '0xabcd...ef12',
          to: '0x1234...5678',
          gasUsed: 21000,
          gasPrice: '20.5',
          approvalStatus: 'approved',
          verificationStatus: 'verified',
        },
        {
          id: '2',
          transactionHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          blockNumber: 19234566,
          amount: 25000,
          project: 'Security Audit',
          department: 'Engineering',
          status: 'confirmed',
          type: 'release',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          from: '0x1234...5678',
          to: '0xabcd...ef12',
          gasUsed: 35000,
          gasPrice: '18.2',
          approvalStatus: 'completed',
          verificationStatus: 'verified',
        },
      ];
      dispatch({ type: 'SET_TRANSACTIONS', payload: mockTransactions });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'transactions', value: false } });
    }
  };

  // Add new transaction
  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Math.random().toString(36).substr(2, 9),
    };
    dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
    toast.success('New transaction added');
  };

  // Update transaction
  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, updates } });
    toast.info('Transaction updated');
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return;
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'notifications', value: true } });
    dispatch({ type: 'SET_ERROR', payload: { key: 'notifications', value: null } });
    
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_NOTIFICATIONS', payload: data.data || [] });
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'notifications', value: error.message } });
      // Use mock data in development
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'success',
          title: 'Transaction Confirmed',
          message: 'Your allocation of $50,000 for Website Redesign has been verified and recorded in the trust ledger.',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          read: false,
          priority: 'high',
        },
        {
          id: '2',
          type: 'info',
          title: 'New Budget Request',
          message: 'A new budget request for $25,000 has been submitted for your review.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false,
          priority: 'medium',
        },
      ];
      dispatch({ type: 'SET_NOTIFICATIONS', payload: mockNotifications });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'notifications', value: false } });
    }
  };

  // Add notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
  };

  // Mark notification as read
  const markNotificationRead = (id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  };

  // Remove notification
  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  // Fetch wallet data
  const fetchWalletData = async () => {
    if (!token || !user) return;
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'wallet', value: true } });
    dispatch({ type: 'SET_ERROR', payload: { key: 'wallet', value: null } });
    
    try {
      const endpoint = user.role === 'vendor' ? '/vendor/wallet' : '/admin/wallet';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_WALLET', payload: data.data });
      } else {
        throw new Error('Failed to fetch wallet data');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'wallet', value: error.message } });
      // Use mock data in development
      const mockWallet: WalletData = {
        address: user?.walletAddress || '0x742d35Cc7Bf58D43aB6d9e6C2E4DE14b87aF3b47',
        balance: {
          allocated: 150000,
          available: 75000,
          withdrawn: 25000,
          pending: 50000,
        },
        transactions: state.transactions,
        lastUpdated: new Date().toISOString(),
      };
      dispatch({ type: 'SET_WALLET', payload: mockWallet });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'wallet', value: false } });
    }
  };

  // Update wallet balance
  const updateWalletBalance = (updates: Partial<WalletData['balance']>) => {
    dispatch({ type: 'UPDATE_WALLET_BALANCE', payload: updates });
    toast.success('Wallet balance updated');
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!token) return;
    
    dispatch({ type: 'SET_LOADING', payload: { key: 'dashboard', value: true } });
    dispatch({ type: 'SET_ERROR', payload: { key: 'dashboard', value: null } });
    
    try {
      const endpoint = user?.role === 'vendor' ? '/vendor/dashboard' : '/admin/dashboard';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_DASHBOARD', payload: data.data });
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: { key: 'dashboard', value: error.message } });
      // Use mock data in development
      const mockDashboard: DashboardData = {
        totalBudget: 2500000,
        totalSpent: 1850000,
        totalRemaining: 650000,
        activeVendors: 28,
        pendingRequests: 12,
        completedProjects: 145,
        recentActivity: [
          {
            id: '1',
            type: 'allocation',
            description: 'Budget allocated to Website Redesign project',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            amount: 50000,
          },
          {
            id: '2',
            type: 'approval',
            description: 'Security Audit request approved',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            amount: 25000,
          },
        ],
      };
      dispatch({ type: 'SET_DASHBOARD', payload: mockDashboard });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'dashboard', value: false } });
    }
  };

  // Update filters
  const updateFilters = (key: string, value: any) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: { key, value } });
  };

  // Reset state
  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  // Load initial data when user changes
  useEffect(() => {
    if (user && token) {
      fetchDashboardData();
      fetchTransactions();
      fetchNotifications();
      fetchWalletData();
    } else {
      resetState();
    }
  }, [user, token]);

  const value: AppContextType = {
    state,
    dispatch,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    fetchNotifications,
    addNotification,
    markNotificationRead,
    removeNotification,
    fetchWalletData,
    updateWalletBalance,
    fetchDashboardData,
    updateFilters,
    resetState,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export type { Transaction, Notification, WalletData, DashboardData };