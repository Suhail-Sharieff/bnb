import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, Shield, Clock, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { mockTransactions } from '../data/mockData';
import { Transaction } from '../types';
import { cn } from '../lib/utils';

// --- Configuration Object for Statuses ---
const statusConfig: { [key in Transaction['status']]: { Icon: React.ElementType, darkClasses: string } } = {
  completed: { Icon: CheckCircle, darkClasses: 'bg-green-500/20 text-green-300' },
  approved: { Icon: CheckCircle, darkClasses: 'bg-blue-500/20 text-blue-300' },
  pending: { Icon: Clock, darkClasses: 'bg-amber-500/20 text-amber-300' },
  rejected: { Icon: XCircle, darkClasses: 'bg-red-500/20 text-red-300' },
};

// --- Reusable Child Components ---

const StatusBadge: React.FC<{ status: Transaction['status'] }> = ({ status }) => {
  const { Icon, darkClasses } = statusConfig[status] || { Icon: Clock, darkClasses: 'bg-gray-500/20 text-gray-300' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', darkClasses)}>
      <Icon className="w-3.5 h-3.5" />
      <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </span>
  );
};

// --- Main Component ---

const TransactionList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const filteredTransactions = useMemo(() => {
    return mockTransactions.filter(tx => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchLower === '' ||
        tx.description.toLowerCase().includes(searchLower) ||
        tx.department.toLowerCase().includes(searchLower) ||
        (tx.vendor && tx.vendor.toLowerCase().includes(searchLower));
      
      const matchesDepartment = filterDepartment === 'all' || tx.department === filterDepartment;
      const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
      
      return matchesSearch && matchesDepartment && matchesStatus;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [searchTerm, filterDepartment, filterStatus]);

  const departments = useMemo(() => [...new Set(mockTransactions.map(tx => tx.department))], []);
  const statuses = useMemo(() => [...new Set(mockTransactions.map(tx => tx.status))], []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Blockchain Trust Indicator */}
      <div className="bg-gradient-to-r from-gray-800 to-indigo-900/30 p-4 rounded-xl border border-indigo-800">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-indigo-400 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-indigo-300">Blockchain-Secured Transactions</h3>
            <p className="text-sm text-indigo-400/80">
              All transactions below are cryptographically secured and immutable on the distributed ledger.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-700/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-5">Transaction</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Details</div>
        </div>

        {/* Table Body */}
        <div>
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((tx) => (
              <div key={tx.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-700 last:border-b-0 hover:bg-gray-700/40 transition-colors">
                {/* Column 1: Description & AI Flag */}
                <div className="col-span-5">
                  <p className="font-semibold text-gray-50">{tx.description}</p>
                  <p className="text-sm text-gray-400">{tx.category}</p>
                   {tx.isAnomalous && (
                    <span className="mt-1 inline-flex items-center gap-1.5 bg-red-500/20 text-red-300 text-xs font-medium px-2 py-1 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" /> AI Flagged
                    </span>
                  )}
                </div>
                {/* Column 2: Amount */}
                <div className="col-span-2 text-right">
                  <p className="text-lg font-bold text-gray-50">{formatCurrency(tx.amount)}</p>
                </div>
                {/* Column 3: Status */}
                <div className="col-span-2">
                  <StatusBadge status={tx.status} />
                </div>
                {/* Column 4: Details */}
                <div className="col-span-3 text-sm text-gray-400">
                  <p><strong className="text-gray-500">Dept:</strong> {tx.department}</p>
                  <p><strong className="text-gray-500">Date:</strong> {new Date(tx.timestamp).toLocaleDateString()}</p>
                  <button className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 mt-1">
                    <ExternalLink className="w-3 h-3" />
                    <span>View on Ledger</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 px-6">
              <Info className="mx-auto w-12 h-12 text-gray-600" />
              <h4 className="mt-4 text-lg font-semibold text-gray-300">No Transactions Found</h4>
              <p className="mt-1 text-gray-500">Adjust your search or filter criteria to find what you're looking for.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionList;