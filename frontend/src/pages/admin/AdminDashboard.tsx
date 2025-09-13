import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  DollarSign, Users, FileText, TrendingUp, CheckCircle, Clock, XCircle,
  AlertTriangle, Settings, Download, RefreshCw, Eye
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import TransactionDetailModal from '../../components/TransactionDetailModal';

interface DashboardData {
  overview: {
    totalBudget: number;
    allocatedBudget: number;
    releasedBudget: number;
    pendingRequests: number;
    totalVendors: number;
    activeAllocations: number;
  };
  requestStats: {
    pending: number;
    approved: number;
    rejected: number;
    allocated: number;
    completed: number;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    vendor: string;
    status: string;
    timestamp: string;
    blockchainTxHash?: string;
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
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setDashboardData(data.data);
      setError(null);
    } catch (err) {
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
                <p className="text-sm font-medium text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboardData.overview.totalBudget)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Allocated</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboardData.overview.allocatedBudget)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Released</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboardData.overview.releasedBudget)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.overview.pendingRequests}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vendors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.overview.totalVendors}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.overview.activeAllocations}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Overview and Trust Ledger Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Request Status Overview</h3>
            </div>
            <div className="p-6 space-y-4">
              {Object.entries(dashboardData.requestStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(status)}
                    <span className="ml-3 text-sm font-medium text-gray-700 capitalize">{status}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Trust Ledger Status</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {dashboardData.blockchainStats.totalTransactions}
                  </p>
                  <p className="text-sm text-blue-800">Total Transactions</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {dashboardData.blockchainStats.confirmedTransactions}
                  </p>
                  <p className="text-sm text-green-800">Confirmed</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    {dashboardData.blockchainStats.pendingTransactions}
                  </p>
                  <p className="text-sm text-yellow-800">Pending</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(dashboardData.blockchainStats.averageConfirmationTime)}s
                  </p>
                  <p className="text-sm text-purple-800">Avg. Confirmation</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg transition-colors">
                <Eye className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">Review Requests</span>
              </button>
              <button className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg transition-colors">
                <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">Allocate Funds</span>
              </button>
              <button className="flex items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-lg transition-colors">
                <Download className="h-5 w-5 text-purple-600 mr-2" />
                <span className="font-medium text-purple-800">Generate Report</span>
              </button>
              <button className="flex items-center justify-center p-4 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 rounded-lg transition-colors">
                <Users className="h-5 w-5 text-indigo-600 mr-2" />
                <span className="font-medium text-indigo-800">Manage Vendors</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent Verified Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.recentTransactions.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTransactionId(transaction.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                      {transaction.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(transaction.status)}
                        <span className="ml-2 text-sm text-gray-700 capitalize">{transaction.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(transaction.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  );
}