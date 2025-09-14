import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth'; 
import { 
  DollarSign, Users, FileText, TrendingUp, CheckCircle, Clock, XCircle,
  AlertTriangle, Settings, Download, RefreshCw, Eye
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import TransactionDetailModal from '../../components/TransactionDetailModal';
import { apiClient } from '../../lib/api';

interface DashboardData {
  overview: {
    totalRequests: number;
    totalTransactions: number;
    totalUsers: number;
    activeVendors: number;
    totalApproved: number;
    totalAllocated: number;
    totalCompleted: number;
  };
  requestStats: Array<{
    _id: string;
    count: number;
    totalAmount: number;
  }>;
  recentTransactions: Array<{
    _id: string;
    amount: number;
    description: string;
    project: string;
    department: string;
    verificationStatus: string;
    approvalStatus: string;
    createdAt: string;
    createdBy: {
      fullName: string;
      email: string;
    };
  }>;
  blockchainStats: {
    totalTransactions: number;
    confirmedTransactions: number;
    pendingTransactions: number;
    averageConfirmationTime: number;
  };
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'allocated': return <DollarSign className="h-4 w-4 text-blue-500" />;
    default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
  }
};

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const { state } = useApp();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      
      // Use the API client instead of direct fetch
      const response = await apiClient.getDashboard();
      
      if (response.success && response.data) {
        // Transform the backend data to match our expected interface
        const transformedData: DashboardData = {
          overview: response.data.overview,
          requestStats: response.data.requestStats || [],
          recentTransactions: response.data.recentTransactions || [],
          blockchainStats: {
            totalTransactions: response.data.overview?.totalTransactions || 0,
            confirmedTransactions: (response.data.overview?.totalTransactions || 0) - (response.data.requestStats?.find((s: any) => s._id === 'pending')?.count || 0),
            pendingTransactions: response.data.requestStats?.find((s: any) => s._id === 'pending')?.count || 0,
            averageConfirmationTime: 2.5 // Placeholder value
          }
        };
        
        setDashboardData(transformedData);
        setError(null);
      } else {
        throw new Error(response.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error Loading Dashboard</h3>
                <p className="text-red-700">{error}</p>
                <button 
                  onClick={() => fetchDashboardData()}
                  className="mt-3 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-gray-600">No dashboard data available</p>
        </div>
      </div>
    );
  }

  const getRequestStat = (state: string) => {
    const stat = dashboardData?.requestStats.find(s => s._id === state);
    return stat ? stat.count : 0;
  };

  const getTotalAmountByState = (state: string) => {
    const stat = dashboardData?.requestStats.find(s => s._id === state);
    return stat ? stat.totalAmount : 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome back, {user?.fullName} • Financial Transparency Platform
              </p>
            </div>
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.overview.totalRequests || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(getTotalAmountByState('approved'))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Allocated</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(getTotalAmountByState('allocated'))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getRequestStat('pending')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Vendors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.overview.activeVendors || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.overview.totalTransactions || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Request Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {getRequestStat('pending')}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-blue-600">
                  {getRequestStat('approved')}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {getRequestStat('rejected')}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Allocated</p>
                <p className="text-2xl font-bold text-green-600">
                  {getRequestStat('allocated')}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {getRequestStat('completed')}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Recent Activity and Blockchain Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                <button className="text-sm text-blue-600 hover:text-blue-800">
                  View All
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData?.recentTransactions.map((transaction) => (
                    <tr 
                      key={transaction._id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTransactionId(transaction._id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                        {transaction.project || 'General'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.createdBy?.fullName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(transaction.approvalStatus)}
                          <span className="ml-2 text-sm text-gray-700 capitalize">{transaction.approvalStatus}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(transaction.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Blockchain Stats */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Blockchain Statistics</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="rounded-full bg-blue-100 p-2">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData?.blockchainStats.totalTransactions || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="rounded-full bg-green-100 p-2">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Confirmed</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData?.blockchainStats.confirmedTransactions || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="rounded-full bg-yellow-100 p-2">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData?.blockchainStats.pendingTransactions || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="rounded-full bg-purple-100 p-2">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Confirmation</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData?.blockchainStats.averageConfirmationTime || 0}s
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Transaction Overview</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="text-sm font-medium text-gray-900">
                      {dashboardData?.blockchainStats.totalTransactions && dashboardData.blockchainStats.totalTransactions > 0 
                        ? Math.round((dashboardData.blockchainStats.confirmedTransactions / dashboardData.blockchainStats.totalTransactions) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Network Status</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                      Operational
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Detail Modal */}
        {selectedTransactionId && (
          <TransactionDetailModal
            transaction={state.transactions.find(t => t.id === selectedTransactionId) || null}
            isOpen={!!selectedTransactionId}
            onClose={() => setSelectedTransactionId(null)}
          />
        )}
      </div>
    </div>
  );
}