import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  Wallet, Upload, FileText, DollarSign, TrendingUp, Clock, CheckCircle,
  AlertTriangle, Download, RefreshCw, Eye, CreditCard, ArrowUpRight
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import TransactionDetailModal from '../../components/TransactionDetailModal';

interface VendorWalletData {
  balances: {
    allocated: number;
    available: number;
    pending: number;
    withdrawn: number;
    frozen: number;
  };
  allocations: Array<{
    id: string;
    project: string;
    totalAmount: number;
    releasedAmount: number;
    status: string;
    createdAt: string;
    milestones: Array<{
      id: string;
      description: string;
      amount: number;
      dueDate: string;
      status: string;
    }>;
    requiredDocuments: Array<{
      name: string;
      type: string;
      submitted: boolean;
      approved: boolean;
    }>;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    timestamp: string;
    blockchainTxHash?: string;
    description: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    uploadedAt: string;
    allocationId: string;
  }>;
  performance: {
    complianceRate: number;
    averageReleaseTime: number;
    totalProjectsCompleted: number;
    reputationScore: number;
  };
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'approved':
    case 'released': return 'text-green-600 bg-green-50 border-green-200';
    case 'pending':
    case 'allocated': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'rejected':
    case 'frozen': return 'text-red-600 bg-red-50 border-red-200';
    case 'under_review': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export default function VendorDashboard() {
  const { user, token } = useAuth();
  const { state } = useApp();
  const [walletData, setWalletData] = useState<VendorWalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('wallet'); // wallet, allocations, documents, transactions
  const [uploadModal, setUploadModal] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  useEffect(() => {
    fetchWalletData();
  }, [token]);

  const fetchWalletData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendor/wallet`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWalletData(data.data);
        setError(null);
        
        // Update global state if needed
        if (data.data.transactions) {
          // Transform transactions to match global state format
          const transformedTransactions = data.data.transactions.map((tx: any) => ({
            id: tx.id,
            transactionHash: tx.blockchainTxHash || '',
            blockNumber: tx.blockNumber || 0,
            amount: tx.amount,
            project: tx.project || 'Vendor Transaction',
            department: 'Vendor',
            status: tx.status === 'completed' ? 'confirmed' : tx.status,
            type: tx.type || 'release',
            timestamp: tx.timestamp || tx.createdAt,
            approvalStatus: 'approved',
            verificationStatus: 'verified'
          }));
          // Could update AppContext here if needed
        }
      } else {
        throw new Error('Failed to fetch wallet data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.log('Using demo wallet data for development.');
      
      // Enhanced mock data with realistic vendor wallet information
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

  const handleFileUpload = async (file: File, documentType: string, allocationId: string) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', documentType);
    formData.append('allocationId', allocationId);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendor/upload-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload document');
      
      // Refresh data after upload
      fetchWalletData(true);
      setUploadModal(false);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleWithdrawal = async (amount: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendor/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) throw new Error('Withdrawal failed');
      fetchWalletData(true);
    } catch (err) {
      console.error('Withdrawal failed:', err);
    }
  };

  if (loading && !walletData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (error && !walletData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error Loading Wallet</h3>
                <p className="text-red-700">{error}</p>
                <button 
                  onClick={() => fetchWalletData()}
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

  if (!walletData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-gray-600">No wallet data available</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Vendor Console</h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome {user?.fullName} • {user?.companyName}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchWalletData(true)}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Digital Wallet Overview */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white mb-8">
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
              <p className="text-3xl font-bold">{formatCurrency(walletData.balances.available)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-blue-100 text-sm">Total Allocated</p>
              <p className="text-xl font-semibold">{formatCurrency(walletData.balances.allocated)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-blue-100 text-sm">Pending Release</p>
              <p className="text-xl font-semibold">{formatCurrency(walletData.balances.pending)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-blue-100 text-sm">Total Withdrawn</p>
              <p className="text-xl font-semibold">{formatCurrency(walletData.balances.withdrawn)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-blue-100 text-sm">Frozen Funds</p>
              <p className="text-xl font-semibold">{formatCurrency(walletData.balances.frozen)}</p>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={() => handleWithdrawal(walletData.balances.available)}
              disabled={walletData.balances.available <= 0}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw Funds
            </button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                <p className="text-2xl font-bold text-gray-900">{walletData.performance.complianceRate}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Release Time</p>
                <p className="text-2xl font-bold text-gray-900">{walletData.performance.averageReleaseTime}h</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Projects Completed</p>
                <p className="text-2xl font-bold text-gray-900">{walletData.performance.totalProjectsCompleted}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reputation Score</p>
                <p className="text-2xl font-bold text-gray-900">{walletData.performance.reputationScore}/100</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {['wallet', 'allocations', 'documents', 'transactions'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'allocations' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Fund Allocations</h3>
                  <button
                    onClick={() => setUploadModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </button>
                </div>
                
                {walletData.allocations.map((allocation) => (
                  <div key={allocation.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{allocation.project}</h4>
                        <p className="text-sm text-gray-600">Allocated: {formatDate(allocation.createdAt)}</p>
                      </div>
                      <span className={`px-3 py-1 text-sm rounded-full border ${getStatusColor(allocation.status)}`}>
                        {allocation.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(allocation.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Released Amount</p>
                        <p className="text-lg font-semibold text-green-600">{formatCurrency(allocation.releasedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Progress</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(allocation.releasedAmount / allocation.totalAmount) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {allocation.milestones.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium text-gray-900 mb-2">Milestones</h5>
                        <div className="space-y-2">
                          {allocation.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{milestone.description}</p>
                                <p className="text-xs text-gray-600">Due: {formatDate(milestone.dueDate)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">{formatCurrency(milestone.amount)}</p>
                                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(milestone.status)}`}>
                                  {milestone.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Document Management</h3>
                  <span className="text-sm text-gray-600">
                    {walletData.documents.filter(d => d.status === 'pending').length} pending review
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {walletData.documents.map((doc) => (
                        <tr key={doc.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {doc.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                            {doc.type.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(doc.status)}`}>
                              {doc.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(doc.uploadedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-blue-600 hover:text-blue-800 flex items-center">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blockchain</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {walletData.transactions.map((transaction) => (
                        <tr 
                          key={transaction.id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedTransactionId(transaction.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                            {transaction.type.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(transaction.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {transaction.blockchainTxHash ? (
                              <a 
                                href={`https://sepolia.etherscan.io/tx/${transaction.blockchainTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </a>
                            ) : (
                              <span className="text-gray-400">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allocation</label>
                <select 
                  value={selectedAllocation || ''}
                  onChange={(e) => setSelectedAllocation(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select allocation...</option>
                  {walletData.allocations.map((allocation) => (
                    <option key={allocation.id} value={allocation.id}>
                      {allocation.project}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="delivery_proof">Delivery Proof</option>
                  <option value="milestone_report">Milestone Report</option>
                  <option value="compliance_doc">Compliance Document</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setUploadModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

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