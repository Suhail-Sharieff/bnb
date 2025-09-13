import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient, ApiResponse } from '../../../lib/api';
import { 
  Wallet, TrendingUp, CheckCircle, Clock, AlertTriangle, CreditCard, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

interface VendorStats {
  totalAllocated: number;
  availableBalance: number;
  pendingRelease: number;
  totalWithdrawn: number;
  activeProjects: number;
  completedProjects: number;
  reputationScore: number;
  complianceRate: number;
}

export default function VendorHome() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorStats();
  }, [token]);

  const fetchVendorStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getDashboard();
      
      if (response.success && response.data) {
        // Transform the data to match our interface
        const dashboardData = response.data;
        setStats({
          totalAllocated: dashboardData.totalAllocated || 0,
          availableBalance: dashboardData.availableBalance || 0,
          pendingRelease: dashboardData.pendingRelease || 0,
          totalWithdrawn: dashboardData.totalWithdrawn || 0,
          activeProjects: dashboardData.activeProjects || 0,
          completedProjects: dashboardData.completedProjects || 0,
          reputationScore: dashboardData.reputationScore || 0,
          complianceRate: dashboardData.complianceRate || 0
        });
        toast.success('Dashboard data loaded successfully');
      } else {
        throw new Error(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      console.error('Failed to fetch vendor stats:', err);
      setError(err.message || 'Failed to load dashboard data. Please try again.');
      toast.error('Failed to load dashboard data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Dashboard</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchVendorStats}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.fullName}</p>
        </div>
        <button
          onClick={fetchVendorStats}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Wallet Overview */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 mr-3" />
            <div>
              <h2 className="text-2xl font-bold">Digital Wallet</h2>
              <p className="text-blue-100">Blockchain-verified fund management</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Available Balance</p>
            <p className="text-3xl font-bold">{formatCurrency(stats.availableBalance)}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-blue-100 text-sm">Total Allocated</p>
            <p className="text-xl font-semibold">{formatCurrency(stats.totalAllocated)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-blue-100 text-sm">Pending Release</p>
            <p className="text-xl font-semibold">{formatCurrency(stats.pendingRelease)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-blue-100 text-sm">Total Withdrawn</p>
            <p className="text-xl font-semibold">{formatCurrency(stats.totalWithdrawn)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-blue-100 text-sm">Net Earnings</p>
            <p className="text-xl font-semibold">{formatCurrency(stats.totalWithdrawn)}</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Reputation Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.reputationScore}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-emerald-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.complianceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => window.location.hash = '#/wallet'}
            className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg transition-colors"
          >
            <Wallet className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">View Wallet</span>
          </button>
          <button 
            onClick={() => window.location.hash = '#/documents'}
            className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg transition-colors"
          >
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="font-medium text-green-800">Upload Document</span>
          </button>
          <button 
            onClick={() => window.location.hash = '#/transactions'}
            className="flex items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-lg transition-colors"
          >
            <CreditCard className="h-5 w-5 text-purple-600 mr-2" />
            <span className="font-medium text-purple-800">View Transactions</span>
          </button>
          <button 
            onClick={() => window.location.hash = '#/reports'}
            className="flex items-center justify-center p-4 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 rounded-lg transition-colors"
          >
            <TrendingUp className="h-5 w-5 text-indigo-600 mr-2" />
            <span className="font-medium text-indigo-800">Generate Report</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Document approved</p>
                  <p className="text-xs text-gray-600">Invoice for Website Redesign project</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">2 hours ago</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Fund release pending</p>
                  <p className="text-xs text-gray-600">Milestone 2 for Security Audit</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">5 hours ago</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">New project allocated</p>
                  <p className="text-xs text-gray-600">Marketing Campaign project - $35,000</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}