import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Calendar,
  FileText,
  Shield,
  Hash,
  Eye,
  Download,
  Share2
} from 'lucide-react';
import { Transaction } from '../contexts/AppContext';
import { toast } from 'react-toastify';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionDetailModal({ 
  transaction, 
  isOpen, 
  onClose 
}: TransactionDetailModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const openExplorer = () => {
    if (transaction.explorerUrl) {
      window.open(transaction.explorerUrl, '_blank');
    } else {
      // Generate explorer URL based on network
      const baseUrls: Record<string, string> = {
        sepolia: 'https://sepolia.etherscan.io/tx/',
        mainnet: 'https://etherscan.io/tx/',
        polygon: 'https://polygonscan.com/tx/',
        mumbai: 'https://mumbai.polygonscan.com/tx/',
      };
      
      const explorerUrl = baseUrls.sepolia + transaction.transactionHash;
      window.open(explorerUrl, '_blank');
    }
  };

  const downloadReceipt = () => {
    const receiptData = {
      transactionId: transaction.id,
      transactionHash: transaction.transactionHash,
      blockNumber: transaction.blockNumber,
      amount: transaction.amount,
      project: transaction.project,
      department: transaction.department,
      status: transaction.status,
      type: transaction.type,
      timestamp: transaction.timestamp,
      from: transaction.from,
      to: transaction.to,
    };

    const blob = new Blob([JSON.stringify(receiptData, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction-${transaction.id}-receipt.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Transaction receipt downloaded');
  };

  const shareTransaction = async () => {
    const shareData = {
      title: `Transaction ${transaction.id}`,
      text: `${transaction.type} transaction of $${transaction.amount.toLocaleString()} for ${transaction.project}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Transaction shared successfully');
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copying URL
      await copyToClipboard(window.location.href, 'Transaction URL');
    }
  };

  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'confirmed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'failed':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      default:
        return <Clock className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = () => {
    switch (transaction.type) {
      case 'allocation':
        return <DollarSign className="w-5 h-5 text-blue-500" />;
      case 'release':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'withdrawal':
        return <ExternalLink className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatHash = (hash: string, length = 12) => {
    if (!hash) return 'N/A';
    if (hash.length <= length) return hash;
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h2 className="text-xl font-bold text-gray-900">Transaction Details</h2>
              <p className="text-sm text-gray-600">ID: {transaction.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={shareTransaction}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Share Transaction"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={downloadReceipt}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download Receipt"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon()}
                <div>
                  <p className="font-semibold capitalize">{transaction.status} Transaction</p>
                  <p className="text-sm opacity-80">
                    {transaction.status === 'confirmed' && 'Transaction has been confirmed on the blockchain'}
                    {transaction.status === 'pending' && 'Transaction is being processed'}
                    {transaction.status === 'failed' && 'Transaction failed to process'}
                  </p>
                </div>
              </div>
              {transaction.status === 'confirmed' && (
                <button
                  onClick={openExplorer}
                  className="flex items-center space-x-1 text-sm font-medium hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View on Explorer</span>
                </button>
              )}
            </div>
          </div>

          {/* Transaction Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Amount & Project */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Amount</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <span className="text-2xl font-bold text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Project</label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{transaction.project}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Department</label>
                    <p className="text-gray-900 mt-1">{transaction.department}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <div className="flex items-center space-x-2 mt-1">
                      {getTypeIcon()}
                      <span className="capitalize font-medium text-gray-900">{transaction.type}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Verification Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-blue-500" />
                  Trust Verification Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Verification ID</label>
                    <div className="flex items-center space-x-2 mt-1 p-3 bg-white rounded border">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <code className="text-sm font-mono text-gray-900 flex-1">
                        {formatHash(transaction.transactionHash, 20)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(transaction.transactionHash, 'Verification ID')}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {copied === 'Verification ID' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Record Number</label>
                      <p className="text-gray-900 mt-1 font-mono">#{transaction.blockNumber.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Verified At</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{formatDate(transaction.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  {transaction.from && transaction.to && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Source Account</label>
                        <div className="flex items-center space-x-2 mt-1 p-2 bg-white rounded border">
                          <code className="text-sm font-mono text-gray-900 flex-1">
                            {formatHash(transaction.from)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(transaction.from!, 'Source Account')}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {copied === 'Source Account' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Destination Account</label>
                        <div className="flex items-center space-x-2 mt-1 p-2 bg-white rounded border">
                          <code className="text-sm font-mono text-gray-900 flex-1">
                            {formatHash(transaction.to)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(transaction.to!, 'Destination Account')}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {copied === 'Destination Account' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {transaction.gasUsed && transaction.gasPrice && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Verification Cost</label>
                        <p className="text-gray-900 mt-1 font-mono">{transaction.gasUsed.toLocaleString()} units</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Security Level</label>
                        <p className="text-gray-900 mt-1 font-mono">High ({transaction.gasPrice} priority)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Status History */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Transaction Created</p>
                      <p className="text-xs text-gray-600">{formatDate(transaction.timestamp)}</p>
                    </div>
                  </div>
                  
                  {transaction.status === 'confirmed' && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Verified</p>
                        <p className="text-xs text-gray-600">Record #{transaction.blockNumber}</p>
                      </div>
                    </div>
                  )}
                  
                  {transaction.status === 'pending' && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Processing Verification</p>
                        <p className="text-xs text-gray-600">Awaiting verification</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Status */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Approval Status</span>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${
                      transaction.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                      transaction.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.approvalStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Verification Status</span>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${
                      transaction.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                      transaction.verificationStatus === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.verificationStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={openExplorer}
                    className="w-full flex items-center space-x-2 p-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Trust Verification</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(transaction.transactionHash, 'Verification ID')}
                    className="w-full flex items-center space-x-2 p-3 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Verification ID</span>
                  </button>
                  <button
                    onClick={downloadReceipt}
                    className="w-full flex items-center space-x-2 p-3 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Proof Certificate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}