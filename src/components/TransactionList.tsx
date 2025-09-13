import React, { useState } from 'react';
import { Search, Filter, ExternalLink, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import { mockTransactions } from '../data/mockData';
import { Transaction } from '../types';

const TransactionList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTransactions = mockTransactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tx.vendor && tx.vendor.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDepartment = filterDepartment === 'all' || tx.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const departments = [...new Set(mockTransactions.map(tx => tx.department))];
  const statuses = [...new Set(mockTransactions.map(tx => tx.status))];

  return (
    <div className="space-y-6">
      {/* Blockchain Trust Indicator */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-indigo-600" />
          <div>
            <h3 className="font-semibold text-indigo-900">Blockchain-Secured Transactions</h3>
            <p className="text-sm text-indigo-700">
              All transactions below are cryptographically secured and immutable. 
              Each entry represents a permanent, tamper-evident record on the distributed ledger.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search transactions, departments, or vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Transaction History ({filteredTransactions.length} records)
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{tx.description}</h4>
                    {tx.isAnomalous && (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                        AI Flagged
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Department:</span> {tx.department}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {tx.category}
                    </div>
                    {tx.vendor && (
                      <div>
                        <span className="font-medium">Vendor:</span> {tx.vendor}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Date:</span> {formatDate(tx.timestamp)}
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center space-x-4">
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                      {getStatusIcon(tx.status)}
                      <span>{tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</span>
                    </span>
                    
                    <span className="text-xs text-gray-500 font-mono">
                      Block ID: {tx.id}
                    </span>
                    
                    <button className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center space-x-1">
                      <ExternalLink className="w-3 h-3" />
                      <span>View on Ledger</span>
                    </button>
                  </div>
                </div>
                
                <div className="text-right ml-6">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(tx.amount)}
                  </div>
                  {tx.approver && (
                    <div className="text-xs text-gray-500 mt-1">
                      Approved by: {tx.approver}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transparency Note */}
      <div className="bg-green-50 p-4 rounded-xl border border-green-200">
        <p className="text-green-800 text-sm">
          <strong>Full Transparency:</strong> Every transaction shown above is permanently recorded on our blockchain network. 
          The cryptographic hash of each transaction ensures it cannot be altered or deleted, providing complete audit trail integrity.
        </p>
      </div>
    </div>
  );
};

export default TransactionList;