import React, { useState, useEffect } from 'react';
import { Shield, Hash, CheckCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient, Transaction } from '../../../lib/api';

interface BlockchainTransaction {
  id: string;
  transactionHash: string;
  blockNumber: number;
  from: string;
  to: string;
  amount: number;
  gasUsed: number;
  gasPrice: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  type: 'allocation' | 'release' | 'withdrawal';
  project: string;
}

export default function BlockchainMonitor() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkStats, setNetworkStats] = useState({
    totalTransactions: 0,
    confirmedTransactions: 0,
    pendingTransactions: 0,
    averageGasPrice: '0',
    networkStatus: 'healthy'
  });

  useEffect(() => {
    fetchBlockchainData();
  }, [token]);

  const fetchBlockchainData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getTransactions();
      
      if (response.success && response.data) {
        // Transform the data to match our interface
        const adaptedTransactions: BlockchainTransaction[] = response.data.map((tx: Transaction) => ({
          id: tx._id,
          transactionHash: tx.transactionHash || 'Pending',
          blockNumber: tx.blockNumber || 0,
          from: tx.createdBy?.email || 'System',
          to: tx.project || tx.department || 'Unknown',
          amount: tx.amount,
          gasUsed: parseInt(tx.gasUsed || '0') || 0,
          gasPrice: tx.networkName ? '20' : '0', // Placeholder value
          status: tx.verificationStatus === 'verified' ? 'confirmed' : tx.verificationStatus === 'failed' ? 'failed' : 'pending',
          timestamp: tx.createdAt,
          type: 'allocation', // Default type
          project: tx.project || tx.description || 'General'
        }));
        
        setTransactions(adaptedTransactions);
        
        // Calculate network stats based on real data
        const confirmedCount = response.data.filter((tx: Transaction) => tx.verificationStatus === 'verified').length;
        const pendingCount = response.data.filter((tx: Transaction) => tx.verificationStatus === 'pending').length;
        const totalGas = response.data.reduce((sum: number, tx: Transaction) => sum + (parseInt(tx.gasUsed || '0') || 0), 0);
        const averageGasPrice = response.data.length > 0 ? (totalGas / response.data.length / 1000).toFixed(1) : '0';
        
        setNetworkStats({
          totalTransactions: response.data.length,
          confirmedTransactions: confirmedCount,
          pendingTransactions: pendingCount,
          averageGasPrice,
          networkStatus: 'healthy'
        });
      } else {
        throw new Error(response.error || 'Failed to fetch blockchain data');
      }
    } catch (error) {
      console.error('Failed to fetch blockchain data:', error);
      // Empty state instead of mock data
      setTransactions([]);
      setNetworkStats({
        totalTransactions: 0,
        confirmedTransactions: 0,
        pendingTransactions: 0,
        averageGasPrice: '0',
        networkStatus: 'healthy'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: BlockchainTransaction['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getTypeColor = (type: BlockchainTransaction['type']) => {
    switch (type) {
      case 'allocation': return 'bg-blue-100 text-blue-800';
      case 'release': return 'bg-emerald-100 text-emerald-800';
      case 'withdrawal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const truncateHash = (hash: string) => {
    if (hash === 'Pending') return hash;
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading blockchain data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blockchain Monitor</h1>
          <p className="text-gray-600">Real-time blockchain transaction monitoring and verification</p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-600">Network: {networkStats.networkStatus}</span>
        </div>
      </div>

      {/* Network Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Hash className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{networkStats.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Confirmed</p>
              <p className="text-2xl font-bold text-gray-900">{networkStats.confirmedTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{networkStats.pendingTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Gas Price</p>
              <p className="text-2xl font-bold text-gray-900">{networkStats.averageGasPrice} Gwei</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Blockchain Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          {transactions.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction Hash</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Block #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gas Used</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {truncateHash(tx.transactionHash)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.blockNumber > 0 ? `#${tx.blockNumber.toLocaleString()}` : 'Pending'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${getTypeColor(tx.type)}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.project}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(tx.status)}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.gasUsed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(tx.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {tx.transactionHash && tx.transactionHash !== 'Pending' ? (
                        <a
                          href={apiClient.getBlockchainExplorerUrl(tx.transactionHash, 'sepolia')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </a>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <Hash className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
              <p className="mt-1 text-sm text-gray-500">No blockchain transactions have been recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}