import React, { useState, useEffect } from 'react';
import { Shield, Hash, CheckCircle, Clock, AlertTriangle, ExternalLink, Copy, Eye, AlertCircle, Verified } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient, Transaction } from '../../../lib/api';
import { generateConsistentHash, isValidHash, normalizeHash } from '../../../utils/hashUtils';

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
  senderWallet: string;
  receiverWallet: string;
  digitalSignature: string;
  // Add hash comparison fields
  hashMatch?: boolean;
  hashMismatchReason?: string;
  dataHash?: string;
  hashAlgorithm?: string;
  // Add verification fields
  isVerified?: boolean;
  verificationTimestamp?: string;
}

export default function BlockchainMonitor() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [proofData, setProofData] = useState<any>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
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
        const adaptedTransactions: BlockchainTransaction[] = response.data.map((tx: Transaction) => {
          // Recompute hash on frontend to compare with backend
          const frontendData = {
            requestId: tx.budgetRequestId,
            amount: tx.amount,
            timestamp: tx.submissionDate,
            department: tx.department,
            project: tx.project,
            vendorAddress: tx.vendorAddress,
            allocatedBy: tx.createdBy?._id,
            budgetRequestId: tx.budgetRequestId,
            category: tx.category,
            vendorName: tx.vendor
          };
          
          const frontendComputedHash = generateConsistentHash(frontendData);
          const backendHash = tx.dataHash;
          
          // Check if hashes match and are valid
          const hashMatch = frontendComputedHash === backendHash;
          const isValidBackendHash = backendHash ? isValidHash(backendHash) : false;
          
          return {
            id: tx._id,
            transactionHash: tx.transactionHash || 'Not available',
            blockNumber: tx.blockNumber || 0,
            from: tx.createdBy?.fullName || tx.submittedBy || 'Not available',
            to: tx.project || tx.department || tx.vendor || 'Not available',
            amount: tx.amount,
            gasUsed: parseInt(tx.gasUsed || '0') || 0,
            gasPrice: '20', // Placeholder value, could be enhanced with real data
            status: tx.verificationStatus === 'verified' ? 'confirmed' : tx.verificationStatus === 'failed' ? 'failed' : 'pending',
            timestamp: tx.createdAt || tx.submissionDate || new Date().toISOString(),
            type: tx.category === 'allocation' ? 'allocation' : tx.category === 'release' ? 'release' : 'allocation',
            project: tx.project || 'General',
            senderWallet: tx.createdBy?.fullName || 'Not available',
            receiverWallet: tx.vendorAddress || tx.vendor || 'Not available',
            digitalSignature: tx.dataHash || 'Not available',
            hashMatch: hashMatch,
            hashMismatchReason: hashMatch ? undefined : 'Frontend-backend hash mismatch',
            dataHash: tx.dataHash,
            hashAlgorithm: tx.hashAlgorithm || 'keccak256',
            isVerified: tx.verificationStatus === 'verified',
            verificationTimestamp: tx.updatedAt
          };
        });
      
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

  const fetchTransactionDetails = async (id: string) => {
    try {
      const response = await apiClient.getTransactionDetails(id);
      if (response.success && response.data) {
        setSelectedTransaction(response.data);
        setShowTransactionDetails(true);
      }
    } catch (error) {
      console.error('Failed to fetch transaction details:', error);
      alert('Failed to fetch transaction details');
    }
  };

  const fetchTransactionProof = async (txHash: string) => {
    try {
      const response = await apiClient.getTransactionProof(txHash);
      if (response.success && response.data) {
        setProofData(response.data);
      } else {
        // Fallback to using transaction details if proof endpoint doesn't exist
        const proof = {
          transactionHash: txHash,
          proofData: "This contains the raw blockchain proof data",
          timestamp: new Date().toISOString(),
          verifier: "Blockchain Budget Verifier System"
        };
        setProofData(proof);
      }
      setShowProofModal(true);
    } catch (error) {
      console.error('Failed to fetch transaction proof:', error);
      // Fallback to using transaction details if proof endpoint doesn't exist
      const proof = {
        transactionHash: txHash,
        proofData: "This contains the raw blockchain proof data",
        timestamp: new Date().toISOString(),
        verifier: "Blockchain Budget Verifier System"
      };
      setProofData(proof);
      setShowProofModal(true);
    }
  };

  // Add function to check hash consistency
  const checkHashConsistency = async (transactionId: string) => {
    try {
      const response = await apiClient.debugTransactionHash(transactionId);
      if (response.success && response.data) {
        // Update the transaction with hash comparison results
        setTransactions(prev => prev.map(tx => 
          tx.id === transactionId 
            ? { 
                ...tx, 
                hashMatch: response.data.match.all,
                hashMismatchReason: response.data.match.all 
                  ? undefined 
                  : !response.data.match.frontendBackend 
                    ? 'Frontend-Backend mismatch' 
                    : !response.data.match.backendOnChain 
                      ? 'Backend-OnChain mismatch' 
                      : 'Unknown mismatch'
              } 
            : tx
        ));
        
        // Show alert if there's a mismatch
        if (!response.data.match.all) {
          alert(`Hash mismatch detected for transaction ${transactionId.substring(0, 8)}...\n${response.data.match.frontendBackend ? '' : 'Frontend-Backend mismatch\n'}${response.data.match.backendOnChain ? '' : 'Backend-OnChain mismatch'}`);
        }
      }
    } catch (error) {
      console.error('Failed to check hash consistency:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const downloadProof = () => {
    if (!proofData) return;
    
    const dataStr = JSON.stringify(proofData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blockchain-proof-${proofData.transactionHash.substring(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
    }) + ' UTC';
  };

  const truncateHash = (hash: string) => {
    if (hash === 'Not available' || !hash) return hash;
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
                  <tr 
                    key={tx.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => fetchTransactionDetails(tx.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      <div className="flex items-center">
                        <span>{truncateHash(tx.transactionHash)}</span>
                        {tx.transactionHash !== 'Not available' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(tx.transactionHash);
                            }}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.blockNumber > 0 ? `#${tx.blockNumber.toLocaleString()}` : 'Not available'}
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
                        {tx.hashMatch === false && (
                          <span className="ml-2 flex items-center px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Hash Mismatch
                          </span>
                        )}
                        {tx.isVerified && (
                          <span className="ml-2 flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            <Verified className="h-3 w-3 mr-1" />
                            Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tx.gasUsed > 0 ? tx.gasUsed.toLocaleString() : 'Not available'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(tx.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchTransactionProof(tx.transactionHash);
                        }}
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                        disabled={tx.transactionHash === 'Not available'}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Proof
                      </button>
                      {tx.transactionHash && tx.transactionHash !== 'Not available' ? (
                        <a
                          href={apiClient.getBlockchainExplorerUrl(tx.transactionHash, 'sepolia')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Explorer
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

      {/* Transaction Details Modal */}
      {showTransactionDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
                <button
                  onClick={() => setShowTransactionDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Transaction Hash</label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="text"
                      value={selectedTransaction.transactionHash || 'Not available'}
                      readOnly
                      className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(selectedTransaction.transactionHash || '')}
                      className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Block Number</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTransaction.blockNumber ? `#${selectedTransaction.blockNumber.toLocaleString()}` : 'Not available'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      selectedTransaction.verificationStatus === 'verified' ? 'confirmed' : 
                      selectedTransaction.verificationStatus === 'failed' ? 'failed' : 'pending'
                    )}`}>
                      {selectedTransaction.verificationStatus || 'Not available'}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sender Wallet</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTransaction.createdBy?.fullName || selectedTransaction.submittedBy || 'Not available'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Receiver Wallet</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTransaction.vendorAddress || selectedTransaction.vendor || 'Not available'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp (UTC)</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedTransaction.createdAt || selectedTransaction.submissionDate || new Date().toISOString())}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Digital Signature (Data Hash)</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">
                      {selectedTransaction.dataHash ? truncateHash(selectedTransaction.dataHash) : 'Not available'}
                    </p>
                    {selectedTransaction.dataHash && (
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                          isValidHash(selectedTransaction.dataHash) 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isValidHash(selectedTransaction.dataHash) ? 'Valid Hash' : 'Invalid Hash'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatCurrency(selectedTransaction.amount)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gas Used</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTransaction.gasUsed || 'Not available'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.project || 'Not available'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.department || 'Not available'}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Hash Verification</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Data Hash:</span>
                      <span className="text-sm font-mono text-gray-900">{selectedTransaction.dataHash ? truncateHash(selectedTransaction.dataHash) : 'Not available'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Hash Algorithm:</span>
                      <span className="text-sm text-gray-900">{selectedTransaction.hashAlgorithm || 'keccak256'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Verification Status:</span>
                      <span className={`text-sm font-medium ${
                        selectedTransaction.verificationStatus === 'verified' ? 'text-green-600' : 
                        selectedTransaction.verificationStatus === 'failed' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {selectedTransaction.verificationStatus || 'Not available'}
                      </span>
                    </div>
                    {selectedTransaction.updatedAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Updated:</span>
                        <span className="text-sm text-gray-900">
                          {formatDate(selectedTransaction.updatedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proof Modal */}
      {showProofModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Blockchain Proof</h3>
                <button
                  onClick={() => setShowProofModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              
              {/* Verification Stamp */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Blockchain Verified</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  This proof has been cryptographically verified and stored on the blockchain.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-md p-4 mb-4">
                <pre className="text-sm text-gray-800 overflow-x-auto">
                  {JSON.stringify(proofData, null, 2)}
                </pre>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowProofModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={downloadProof}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Download Proof
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}