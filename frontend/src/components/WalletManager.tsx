import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  DollarSign,
  Clock,
  Shield,
  AlertCircle,
  Copy,
  ExternalLink,
  History,
  Filter,
  Download,
  Eye,
  CheckCircle
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

interface WalletManagerProps {
  userRole: 'admin' | 'vendor';
  compactView?: boolean;
}

export default function WalletManager({ userRole, compactView = false }: WalletManagerProps) {
  const { state, fetchWalletData, updateWalletBalance } = useApp();
  const { connected: socketConnected } = useSocket();
  const { user, token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const wallet = state.wallet;
  const isVendor = userRole === 'vendor';

  // Real-time balance calculations
  const totalBalance = wallet ? (
    wallet.balance.allocated + 
    wallet.balance.available + 
    wallet.balance.pending
  ) : 0;

  const utilizationRate = wallet && totalBalance > 0 ? 
    ((wallet.balance.allocated + wallet.balance.withdrawn) / totalBalance * 100) : 0;

  // Filter transactions for wallet view
  const walletTransactions = state.transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'incoming') return ['allocation', 'release'].includes(tx.type);
    if (filter === 'outgoing') return ['withdrawal'].includes(tx.type);
    if (filter === 'pending') return tx.status === 'pending';
    return true;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchWalletData();
      toast.success('Wallet data refreshed');
    } catch (error) {
      toast.error('Failed to refresh wallet data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount))) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = Number(withdrawAmount);
    if (!wallet || amount > wallet.balance.available) {
      toast.error('Insufficient available balance');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendor/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      if (response.ok) {
        // Update local state optimistically
        updateWalletBalance({
          available: wallet.balance.available - amount,
          withdrawn: wallet.balance.withdrawn + amount
        });
        
        toast.success(`Withdrawal of $${amount.toLocaleString()} initiated`);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
      } else {
        throw new Error('Withdrawal failed');
      }
    } catch (error) {
      toast.error('Failed to process withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const copyAddress = async () => {
    if (wallet?.address) {
      try {
        await navigator.clipboard.writeText(wallet.address);
        toast.success('Wallet address copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy address');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'allocation':
        return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case 'release':
        return <ArrowDownLeft className="w-4 h-4 text-blue-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-purple-500" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!wallet) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Wallet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Loading wallet data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (compactView) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Wallet className="w-5 h-5 mr-2" />
            Wallet Overview
          </h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Available</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(wallet.balance.available)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalBalance)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 p-3 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isVendor ? 'Vendor Wallet' : 'Admin Wallet'}
              </h2>
              <p className="text-blue-100 text-sm">Trust-verified financial management</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${socketConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-sm">{socketConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
          <div>
            <p className="text-blue-100 text-sm">Wallet Address</p>
            <p className="text-white font-mono text-sm">
              {wallet.address.slice(0, 16)}...{wallet.address.slice(-8)}
            </p>
          </div>
          <button
            onClick={copyAddress}
            className="p-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(wallet.balance.available)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Ready for use
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Allocated</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(wallet.balance.allocated)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Project funds
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(wallet.balance.pending)}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Processing
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Withdrawn</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(wallet.balance.withdrawn)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Total withdrawn
          </div>
        </div>
      </div>

      {/* Wallet Actions */}
      {isVendor && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={wallet.balance.available <= 0}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ArrowUpRight className="w-5 h-5 mr-2" />
              Withdraw Funds
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Transaction History
            </h3>
            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All Transactions</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
                <option value="pending">Pending</option>
              </select>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {walletTransactions.slice(0, 10).map((transaction) => (
            <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.project}
                      </p>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} • {formatDate(transaction.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    ['allocation', 'release'].includes(transaction.type) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {['allocation', 'release'].includes(transaction.type) ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </p>
                  {transaction.transactionHash && (
                    <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center mt-1">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View on Explorer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {walletTransactions.length === 0 && (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No transactions found</p>
            <p className="text-sm text-gray-400">Transactions will appear here once they're processed</p>
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Withdraw Funds</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Withdraw
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pl-8"
                    max={wallet.balance.available}
                  />
                  <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Available: {formatCurrency(wallet.balance.available)}
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Withdrawal Notice</p>
                    <p>Funds will be transferred to your registered bank account within 1-3 business days.</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={processing || !withdrawAmount || Number(withdrawAmount) <= 0}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}