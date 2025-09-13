import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  DollarSign, Users, FileText, TrendingUp, CheckCircle, Clock, XCircle,
  AlertTriangle, RefreshCw, Eye, BarChart3, PieChart
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useApp } from '../../../contexts/AppContext';
import TransactionDetailModal from '../../../components/TransactionDetailModal';
import { apiClient } from '../../../lib/api';
import { toast } from 'react-toastify';

interface DashboardData {
  overview: {
    totalBudget: number;
    allocatedBudget: number;
    releasedBudget: number;
    pendingRequests: number;
    totalVendors: number;
    activeAllocations: number;
  };
  requestStats: Array<{
    _id: string;
    count: number;
    totalAmount: number;
  }>;
  departmentSpending: Array<{
    _id: string;
    totalSpent: number;
    requestCount: number;
  }>;
  recentTransactions: Array<{
    id: string;
    project: string;
    vendor: string;
    amount: number;
    status: string;
    date: string;
    hash: string;
    transactionHash?: string;
    explorerUrl?: string;
  }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AdminHome() {
  const { token } = useAuth();
  const { state } = useApp();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getDashboard();
      
      if (response.success && response.data) {
        // Transform backend data to match frontend interface
        const transformedData: DashboardData = {
          overview: {
            totalBudget: response.data.totalBudget || response.data.overview?.totalApproved + response.data.overview?.totalAllocated + response.data.overview?.totalCompleted || 0,
            allocatedBudget: response.data.allocatedBudget || response.data.overview?.totalAllocated || 0,
            releasedBudget: response.data.releasedBudget || response.data.overview?.totalCompleted || 0,
            pendingRequests: response.data.pendingRequests || response.data.requestStats?.find((s: any) => s._id === 'pending')?.count || 0,
            totalVendors: response.data.totalVendors || response.data.overview?.activeVendors || 0,
            activeAllocations: response.data.activeAllocations || response.data.requestStats?.find((s: any) => s._id === 'allocated')?.count || 0
          },
          requestStats: response.data.requestStats || [
            { _id: 'pending', count: response.data.pendingRequests || 0, totalAmount: 0 },
            { _id: 'approved', count: 0, totalAmount: 0 },
            { _id: 'allocated', count: response.data.activeAllocations || 0, totalAmount: 0 },
            { _id: 'completed', count: 0, totalAmount: response.data.releasedBudget || 0 },
            { _id: 'rejected', count: 0, totalAmount: 0 }
          ],
          departmentSpending: response.data.departmentSpending || [],
          recentTransactions: (response.data.recentTransactions || []).map((tx: any) => ({
            id: tx._id,
            project: tx.project || tx.description || 'Unknown Project',
            vendor: tx.createdBy?.fullName || tx.vendor || 'Unknown Vendor',
            amount: tx.amount,
            status: tx.verificationStatus || tx.status || 'pending',
            date: tx.createdAt || tx.date,
            hash: tx.transactionHash || tx.hash || '0x...' + Math.random().toString(16).substr(2, 8),
            transactionHash: tx.transactionHash,
            explorerUrl: tx.explorerUrl
          }))
        };
        
        setDashboardData(transformedData);
        toast.success('Dashboard data refreshed successfully');
      } else {
        throw new Error(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
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
            onClick={fetchDashboardData}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">No dashboard data available</p>
      </div>
    );
  }

  const pieData = dashboardData.requestStats.map(stat => ({
    name: stat._id.charAt(0).toUpperCase() + stat._id.slice(1),
    value: stat.count,
    amount: stat.totalAmount
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Financial transparency and budget management overview</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
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
            <BarChart3 className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.overview.activeAllocations}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                dataKey="value"
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label={({ name, value }: any) => `${name}: ${value}`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any, name: string, props: any) => [
                `${value} requests`,
                `${formatCurrency(props.payload.amount)}`
              ]} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Spending */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Spending</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.departmentSpending}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="totalSpent" fill="#3B82F6" name="Total Spent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
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
                    {transaction.project}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.vendor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      transaction.status === 'completed' || transaction.status === 'verified' ? 'bg-green-100 text-green-800' :
                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      transaction.status === 'rejected' || transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(transaction.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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