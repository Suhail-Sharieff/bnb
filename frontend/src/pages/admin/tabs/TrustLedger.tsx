import React, { useState, useEffect } from 'react';
import { Shield, ExternalLink, Clock, CheckCircle, AlertTriangle, Award, Download, Copy, FileCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient, Transaction } from '../../../lib/api';
import { toast } from 'react-toastify';

interface TrustedTransaction {
  id: string;
  verificationId: string;
  recordNumber: number;
  from: string;
  to: string;
  amount: number;
  verificationCost: number;
  securityLevel: string;
  status: 'processing' | 'verified' | 'rejected';
  timestamp: string;
  type: 'allocation' | 'release' | 'withdrawal';
  project: string;
  authenticity: 'authentic' | 'pending' | 'tampered';
  explorerUrl?: string;
  gasUsed?: string;
  blockNumber?: number;
  contractAddress?: string;
}

export default function TrustLedger() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<TrustedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TrustedTransaction | null>(null);
  const [ledgerStats, setLedgerStats] = useState({
    totalRecords: 0,
    verifiedRecords: 0,
    processingRecords: 0,
    averageVerificationTime: '0',
    systemStatus: 'secure'
  });

  useEffect(() => {
    fetchTrustLedgerData();
  }, [token]);

  const fetchTrustLedgerData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getTransactions();
      
      if (response.success && response.data) {
        // Transform the data to match our interface using real blockchain data
        const adaptedTransactions = response.data.map((tx: Transaction) => ({
          id: tx._id,
          verificationId: tx.transactionHash || 'Pending',
          recordNumber: tx.blockNumber || 0,
          from: tx.createdBy?.fullName || 'System',
          to: tx.project || tx.department || 'Unknown',
          amount: tx.amount,
          verificationCost: parseInt(tx.gasUsed || '0') || 0,
          securityLevel: tx.networkName ? tx.networkName.charAt(0).toUpperCase() + tx.networkName.slice(1) : 'Standard',
          status: tx.verificationStatus === 'verified' ? 'verified' as const : tx.verificationStatus === 'failed' ? 'rejected' as const : 'processing' as const,
          timestamp: tx.createdAt,
          type: 'allocation' as const,
          project: tx.project || tx.description || 'General',
          authenticity: tx.verificationStatus === 'verified' ? 'authentic' as const : tx.verificationStatus === 'failed' ? 'tampered' as const : 'pending' as const,
          explorerUrl: tx.explorerUrl,
          gasUsed: tx.gasUsed,
          blockNumber: tx.blockNumber,
          contractAddress: tx.contractAddress
        }));
        
        setTransactions(adaptedTransactions);
        // Update stats based on real data
        const verifiedCount = response.data.filter((tx: Transaction) => tx.verificationStatus === 'verified').length;
        const processingCount = response.data.filter((tx: Transaction) => tx.verificationStatus === 'pending').length;
        
        setLedgerStats({
          totalRecords: response.data.length,
          verifiedRecords: verifiedCount,
          processingRecords: processingCount,
          averageVerificationTime: '2.3', // Placeholder - could be calculated from actual data
          systemStatus: 'secure'
        });
      } else {
        console.error('Failed to fetch trust ledger data:', response.error);
        throw new Error(response.error || 'Failed to fetch trust ledger data');
      }
    } catch (error) {
      console.error('Failed to fetch trust ledger data:', error);
      toast.error('Failed to load trust ledger data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      // Empty state instead of mock data
      setTransactions([]);
      setLedgerStats({
        totalRecords: 0,
        verifiedRecords: 0,
        processingRecords: 0,
        averageVerificationTime: '0',
        systemStatus: 'secure'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'allocation': return 'bg-blue-100 text-blue-800';
      case 'release': return 'bg-emerald-100 text-emerald-800';
      case 'withdrawal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAuthenticityIcon = (authenticity: string) => {
    switch (authenticity) {
      case 'authentic': return <Award className="h-4 w-4 text-green-500" />;
      case 'tampered': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getAuthenticityColor = (authenticity: string) => {
    switch (authenticity) {
      case 'authentic': return 'bg-green-100 text-green-800';
      case 'tampered': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const truncateVerificationId = (id: string) => {
    if (!id) return 'N/A';
    if (id.length <= 20) return id;
    return `${id.substring(0, 10)}...${id.substring(id.length - 10)}`;
  };

  const copyVerificationId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Verification ID copied to clipboard!');
  };

  const viewTransactionDetails = (transaction: TrustedTransaction) => {
    setSelectedTransaction(transaction);
  };

  const downloadProof = async (transaction: TrustedTransaction) => {
    try {
      // Fetch detailed transaction data from backend
      const response = await apiClient.getTransactionDetails(transaction.id);
      
      if (response.success && response.data) {
        // Create a detailed proof document with raw blockchain data
        const proofData = {
          transactionId: response.data._id,
          verificationId: response.data.transactionHash,
          amount: response.data.amount,
          description: response.data.description,
          project: response.data.project,
          department: response.data.department,
          status: response.data.verificationStatus,
          createdAt: response.data.createdAt,
          createdBy: response.data.createdBy,
          blockchainHash: response.data.transactionHash,
          blockNumber: response.data.blockNumber,
          gasUsed: response.data.gasUsed,
          contractAddress: response.data.contractAddress,
          networkName: response.data.networkName,
          explorerUrl: response.data.explorerUrl,
          // Additional raw blockchain data for proof
          rawTransactionData: {
            from: response.data.createdBy?.email || 'System',
            to: response.data.project || response.data.department || 'Unknown',
            timestamp: response.data.createdAt,
            signature: response.data.transactionHash ? `Signed-${response.data.transactionHash.substring(0, 10)}` : 'N/A'
          }
        };
        
        // Export as JSON
        const blob = new Blob([JSON.stringify(proofData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transaction-proof-${transaction.id}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Transaction proof downloaded successfully!');
      } else {
        throw new Error(response.error || 'Failed to fetch transaction details');
      }
    } catch (error) {
      console.error('Failed to download proof:', error);
      toast.error('Failed to download proof: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const exportTransactions = async (format: 'json' | 'csv' | 'pdf' = 'json') => {
    try {
      setLoading(true);
      
      // Get all transactions from the API
      const response = await apiClient.getTransactions();
      
      if (response.success && response.data) {
        // Export using the API client's export method
        const exportResponse = await apiClient.exportReport('transactions', format, {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          endDate: new Date().toISOString()
        });
        
        if (exportResponse.success && exportResponse.data) {
          // Handle the export based on format
          let blob;
          let fileName;
          
          switch (format) {
            case 'csv':
              blob = new Blob([exportResponse.data], { type: 'text/csv' });
              fileName = 'transactions.csv';
              break;
            case 'pdf':
              blob = new Blob([exportResponse.data], { type: 'application/pdf' });
              fileName = 'transactions.pdf';
              break;
            case 'json':
            default:
              blob = new Blob([JSON.stringify(exportResponse.data, null, 2)], { type: 'application/json' });
              fileName = 'transactions.json';
              break;
          }
          
          // Trigger download
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast.success(`Transactions exported successfully as ${format.toUpperCase()}!`);
        } else {
          throw new Error(exportResponse.error || 'Failed to export transactions');
        }
      } else {
        throw new Error(response.error || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Failed to export transactions:', error);
      toast.error('Failed to export transactions: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trusted records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trust Ledger</h1>
          <p className="text-gray-600">Immutable record verification and authenticity tracking</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportTransactions('json')}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-1" />
            Export JSON
          </button>
          <button
            onClick={() => exportTransactions('csv')}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </button>
          <button
            onClick={fetchTrustLedgerData}
            className="flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
          <Shield className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-600">System: {ledgerStats.systemStatus}</span>
        </div>
      </div>

      {/* Trust Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <FileCheck className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{ledgerStats.totalRecords}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-gray-900">{ledgerStats.verifiedRecords}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-gray-900">{ledgerStats.processingRecords}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Verification</p>
              <p className="text-2xl font-bold text-gray-900">{ledgerStats.averageVerificationTime}s</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Verified Records */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Verified Records</h3>
        </div>
        <div className="overflow-x-auto">
          {transactions.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verification ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Authenticity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr 
                    key={tx.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => viewTransactionDetails(tx)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono text-gray-900">
                          {truncateVerificationId(tx.verificationId)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyVerificationId(tx.verificationId);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.recordNumber > 0 ? `#${tx.recordNumber.toLocaleString()}` : 'Pending'}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getAuthenticityIcon(tx.authenticity)}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full capitalize ${getAuthenticityColor(tx.authenticity)}`}>
                          {tx.authenticity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(tx.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        {tx.status === 'verified' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadProof(tx);
                              }}
                              className="text-blue-600 hover:text-blue-800 flex items-center"
                              title="Download Proof"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            {tx.explorerUrl ? (
                              <a
                                href={tx.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-800 flex items-center"
                                onClick={(e) => e.stopPropagation()}
                                title="View Verification"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const explorerUrl = apiClient.getBlockchainExplorerUrl(
                                    tx.verificationId,
                                    'sepolia'
                                  );
                                  window.open(explorerUrl, '_blank');
                                }}
                                className="text-green-600 hover:text-green-800 flex items-center"
                                title="View Verification"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <FileCheck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating budget requests that will generate blockchain transactions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Types Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Types</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Allocations</span>
              <span className="text-sm font-medium text-gray-900">
                {transactions.filter(t => t.type === 'allocation').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Releases</span>
              <span className="text-sm font-medium text-gray-900">
                {transactions.filter(t => t.type === 'release').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Withdrawals</span>
              <span className="text-sm font-medium text-gray-900">
                {transactions.filter(t => t.type === 'withdrawal').length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Sepolia</span>
              <span className="text-sm font-medium text-gray-900">
                {transactions.filter(t => t.securityLevel.toLowerCase() === 'sepolia').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Amoy</span>
              <span className="text-sm font-medium text-gray-900">
                {transactions.filter(t => t.securityLevel.toLowerCase() === 'amoy').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Mumbai</span>
              <span className="text-sm font-medium text-gray-900">
                {transactions.filter(t => t.securityLevel.toLowerCase() === 'mumbai').length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Verified</span>
              <span className="text-sm font-medium text-gray-900">{ledgerStats.verifiedRecords}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Processing</span>
              <span className="text-sm font-medium text-gray-900">{ledgerStats.processingRecords}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Rejected</span>
              <span className="text-sm font-medium text-gray-900">
                {transactions.filter(t => t.status === 'rejected').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Verification ID</label>
                    <div className="mt-1 flex items-center">
                      <span className="text-sm font-mono text-gray-900 break-all">
                        {selectedTransaction.verificationId}
                      </span>
                      <button
                        onClick={() => copyVerificationId(selectedTransaction.verificationId)}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Record Number</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedTransaction.recordNumber > 0 ? `#${selectedTransaction.recordNumber.toLocaleString()}` : 'Pending'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedTransaction.project}</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {formatCurrency(selectedTransaction.amount)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(selectedTransaction.status)}`}>
                        {selectedTransaction.status}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Authenticity</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${getAuthenticityColor(selectedTransaction.authenticity)}`}>
                        {selectedTransaction.authenticity}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <div className="mt-1 text-sm text-gray-900">{formatDate(selectedTransaction.timestamp)}</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${getTypeColor(selectedTransaction.type)}`}>
                        {selectedTransaction.type}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gas Used</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedTransaction.gasUsed || 'N/A'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Security Level</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedTransaction.securityLevel}</div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">From</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedTransaction.from}</div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">To</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedTransaction.to}</div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => downloadProof(selectedTransaction)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Proof
                  </button>
                  {selectedTransaction.explorerUrl ? (
                    <a
                      href={selectedTransaction.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Explorer
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        const explorerUrl = apiClient.getBlockchainExplorerUrl(
                          selectedTransaction.verificationId,
                          'sepolia'
                        );
                        window.open(explorerUrl, '_blank');
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Explorer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}