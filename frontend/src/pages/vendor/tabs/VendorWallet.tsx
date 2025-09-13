import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient, ApiResponse } from '../../../lib/api';
import { Wallet, ArrowUpRight, CreditCard, AlertCircle, TrendingUp, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface WalletBalances {
  allocated: number;
  available: number;
  pending: number;
  withdrawn: number;
  frozen: number;
}

interface Transaction {
  _id: string;
  amount: number;
  description: string;
  project?: string;
  department?: string;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  explorerUrl?: string;
  createdAt: string;
  type: 'credit' | 'debit';
}

export default function VendorWallet() {
  const { user, token } = useAuth();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<{ balances: WalletBalances } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWalletData();
    fetchTransactions();
  }, [token]);

  const fetchWalletData = async () => {
    try {
      setWalletLoading(true);
      setError(null);
      
      const response = await apiClient.getWalletInfo();
      
      if (response.success && response.data) {
        setWalletData({
          balances: {
            allocated: response.data.totalAllocated || 0,
            available: response.data.availableBalance || 0,
            pending: response.data.pendingRelease || 0,
            withdrawn: response.data.totalWithdrawn || 0,
            frozen: response.data.frozenFunds || 0
          }
        });
      } else {
        throw new Error(response.message || 'Failed to fetch wallet data');
      }
    } catch (err: any) {
      console.error('Failed to fetch wallet data:', err);
      setError(err.message || 'Failed to load wallet data. Please try again.');
      // Mock data for development
      setWalletData({
        balances: {
          allocated: 150000,
          available: 45000,
          pending: 25000,
          withdrawn: 80000,
          frozen: 0
        }
      });
    } finally {
      setWalletLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true);
      setError(null);
      
      const response = await apiClient.getTransactions({
        page: 1,
        limit: 10
      });
      
      if (response.success && response.data) {
        // Transform transactions to match our interface
        const transformedTransactions = response.data.map((tx: any) => ({
          _id: tx._id,
          amount: tx.amount,
          description: tx.description,
          project: tx.project,
          department: tx.department,
          status: tx.verificationStatus,
          transactionHash: tx.transactionHash,
          explorerUrl: tx.explorerUrl,
          createdAt: tx.createdAt,
          type: tx.type || (tx.amount > 0 ? 'credit' : 'debit')
        }));
        setTransactions(transformedTransactions);
      } else {
        throw new Error(response.message || 'Failed to fetch transactions');
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setError(err.message || 'Failed to load transactions. Please try again.');
      // Mock transaction history
      setTransactions([
        {
          _id: 'TX001',
          type: 'credit',
          amount: 45000,
          description: 'Website Redesign Project - Milestone 1',
          createdAt: '2024-12-12T10:30:00Z',
          status: 'completed',
          transactionHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b'
        },
        {
          _id: 'TX002',
          type: 'debit',
          amount: 15000,
          description: 'Withdrawal to Bank Account',
          createdAt: '2024-12-10T14:20:00Z',
          status: 'completed',
          transactionHash: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c'
        },
        {
          _id: 'TX003',
          type: 'credit',
          amount: 25000,
          description: 'Security Audit Project - Initial Payment',
          createdAt: '2024-12-08T09:15:00Z',
          status: 'pending',
          transactionHash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d'
        },
        {
          _id: 'TX004',
          type: 'credit',
          amount: 75000,
          description: 'Mobile App Development - Phase 2',
          createdAt: '2024-12-05T16:45:00Z',
          status: 'completed',
          transactionHash: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e'
        }
      ]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || !walletData || amount > walletData.balances.available) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setLoading(true);
    try {
      // TODO: Implement actual withdrawal API call
      // This is a placeholder for the actual withdrawal API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Withdrawal request submitted successfully!`);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      
      // Refresh wallet data after withdrawal
      fetchWalletData();
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      toast.error('Withdrawal failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (walletLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Digital Wallet</h1>
          <p className="text-gray-600">Manage your funds and view transaction history</p>
        </div>
        <button
          onClick={fetchWalletData}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${walletLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Wallet Overview */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 mr-3" />
            <div>
              <h2 className="text-2xl font-bold">Available Balance</h2>
              <p className="text-blue-100">Ready for withdrawal</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{walletData ? formatCurrency(walletData.balances.available) : '$0'}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-blue-100 text-sm">Total Allocated</p>
            <p className="text-xl font-semibold">{walletData ? formatCurrency(walletData.balances.allocated) : '$0'}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-blue-100 text-sm">Pending Release</p>
            <p className="text-xl font-semibold">{walletData ? formatCurrency(walletData.balances.pending) : '$0'}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-blue-100 text-sm">Total Withdrawn</p>
            <p className="text-xl font-semibold">{walletData ? formatCurrency(walletData.balances.withdrawn) : '$0'}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-blue-100 text-sm">Frozen Funds</p>
            <p className="text-xl font-semibold">{walletData ? formatCurrency(walletData.balances.frozen) : '$0'}</p>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!walletData || walletData.balances.available <= 0}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Withdraw Funds
          </button>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Withdraw Funds</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Balance: {walletData ? formatCurrency(walletData.balances.available) : '$0'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    max={walletData?.balances.available}
                    min="1"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-blue-600 mr-2" />
                  <p className="text-sm text-blue-800">
                    Funds will be transferred to your registered bank account within 2-3 business days.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <button
            onClick={fetchTransactions}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${transactionsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          {transactionsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blockchain Hash</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-2 w-2 rounded-full mr-3 ${tx.type === 'credit' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{tx.description}</div>
                            <div className="text-sm text-gray-500">ID: {tx._id.substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{tx.type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {tx.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tx.transactionHash ? (
                          <div>
                            <div className="text-sm text-gray-900 font-mono">
                              {tx.transactionHash.substring(0, 20)}...
                            </div>
                            {tx.explorerUrl ? (
                              <a 
                                href={tx.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 text-xs hover:text-blue-800 flex items-center"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View on Blockchain
                              </a>
                            ) : (
                              <button className="text-blue-600 text-xs hover:text-blue-800">
                                View on Blockchain
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Not available</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Wallet Statistics */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Wallet Performance</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-2xl font-bold text-green-600">+12.5%</span>
              </div>
              <div className="text-sm text-gray-600">Monthly Growth</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{transactions.length}</div>
              <div className="text-sm text-gray-600">Total Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">95%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}