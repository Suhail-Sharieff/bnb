import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'vendor' | 'auditor';
  department?: string;
  companyName?: string;
  walletAddress?: string;
  reputationScore?: number;
  level?: string;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Configure axios interceptors
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      validateToken(token);
    } else {
      dispatch({ type: 'AUTH_FAILURE', payload: 'No token found' });
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // For development - use mock user if backend is not available
      if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
        // Mock admin user for development
        const mockUser: User = {
          id: 'dev-user-1',
          fullName: 'Development Admin',
          email: 'admin@dev.com',
          role: 'admin',
          department: 'IT',
          isActive: true
        };
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: mockUser,
            token
          }
        });
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.data.user,
          token
        }
      });
    } catch (error) {
      localStorage.removeItem('token');
      dispatch({ type: 'AUTH_FAILURE', payload: 'Invalid token' });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // For development - use mock authentication if backend is not available
      if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
        // Mock users for development
        const mockUsers = {
          'admin@demo.com': {
            id: 'admin-1',
            fullName: 'Admin User',
            email: 'admin@demo.com',
            role: 'admin' as const,
            department: 'Administration',
            isActive: true
          },
          'vendor@demo.com': {
            id: 'vendor-1',
            fullName: 'Vendor User',
            email: 'vendor@demo.com',
            role: 'vendor' as const,
            companyName: 'Demo Vendor Inc.',
            walletAddress: '0x742d35Cc7Bf58D43aB6d9e6C2E4DE14b87aF3b47',
            reputationScore: 85,
            level: 'Gold',
            isActive: true
          }
        };
        
        const user = mockUsers[email as keyof typeof mockUsers];
        if (user && password === 'demo123') {
          const token = 'mock-jwt-token-' + Date.now();
          localStorage.setItem('token', token);
          
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, token }
          });
          
          toast.success(`Welcome back, ${user.fullName}!`);
          return;
        } else {
          throw new Error('Invalid credentials. Use admin@demo.com or vendor@demo.com with password: demo123');
        }
      }
      
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      });
      
      toast.success(`Welcome back, ${user.fullName}!`);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      });
      
      toast.success(`Welcome to the platform, ${user.fullName}!`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
    toast.info('You have been logged out');
  };

  const updateUser = (userData: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}