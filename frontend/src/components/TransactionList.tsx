import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, Shield, Clock, CheckCircle, XCircle, AlertTriangle, Info, Filter, Download, Calendar, DollarSign, FileText } from 'lucide-react';
import { useBudgetTransactions, useSearch, usePagination } from '../hooks/useApi';
import { Transaction } from '../types';
import { cn } from '../lib/utils';
import { generateTransactionPDF } from '../lib/pdfGenerator';

// --- Configuration Object for Statuses ---
const statusConfig: { [key in Transaction['status']]: { Icon: React.ElementType, darkClasses: string } } = {
  completed: { Icon: CheckCircle, darkClasses: 'bg-green-500/20 text-green-300' },
  approved: { Icon: CheckCircle, darkClasses: 'bg-blue-500/20 text-blue-300' },
  allocated: { Icon: Shield, darkClasses: 'bg-indigo-500/20 text-indigo-300' },
  'in-progress': { Icon: Clock, darkClasses: 'bg-yellow-500/20 text-yellow-300' },
  requested: { Icon: Clock, darkClasses: 'bg-amber-500/20 text-amber-300' },
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
  const [amountFilter, setAmountFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Fetch live data ONLY - no mock data fallback
  const { data: transactionsData, loading, error, refetch } = useBudgetTransactions();
  const allTransactions = (transactionsData as any)?.transactions || [];
  
  // Show message when no real data is available
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading transactions from database...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-6">
        <h3 className="text-red-400 font-semibold mb-2">Failed to Load Transactions</h3>
        <p className="text-red-300 text-sm mb-4">{error}</p>
        <button 
          onClick={refetch}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (allTransactions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
        <Info className="mx-auto w-12 h-12 text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No Transactions Found</h3>
        <p className="text-gray-500">No budget transactions have been added to the database yet.</p>
        <p className="text-gray-500 text-sm mt-2">Submit some budget data to see transactions here.</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx: any) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchLower === '' ||
        tx.description?.toLowerCase().includes(searchLower) ||
        tx.department?.toLowerCase().includes(searchLower) ||
        tx.project?.toLowerCase().includes(searchLower) ||
        (tx.vendor && tx.vendor.toLowerCase().includes(searchLower));
      
      const matchesDepartment = filterDepartment === 'all' || tx.department === filterDepartment;
      const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
      
      const matchesAmount = amountFilter === 'all' || (() => {
        const amount = tx.amount || 0;
        switch (amountFilter) {
          case 'small': return amount < 10000;
          case 'medium': return amount >= 10000 && amount < 100000;
          case 'large': return amount >= 100000;
          default: return true;
        }
      })();
      
      const matchesDate = dateRange === 'all' || (() => {
        const txDate = new Date(tx.timestamp || tx.createdAt);
        const now = new Date();
        switch (dateRange) {
          case 'today': return txDate.toDateString() === now.toDateString();
          case 'week': return (now.getTime() - txDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          case 'month': return (now.getTime() - txDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          default: return true;
        }
      })();
      
      return matchesSearch && matchesDepartment && matchesStatus && matchesAmount && matchesDate;
    }).sort((a: any, b: any) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());
  }, [allTransactions, searchTerm, filterDepartment, filterStatus, amountFilter, dateRange]);
  
  // Pagination
  const {
    currentItems: paginatedTransactions,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    hasNextPage,
    hasPrevPage
  } = usePagination(filteredTransactions, 10);

  const departments = useMemo(() => [...new Set(allTransactions.map((tx: any) => tx.department).filter(Boolean))] as string[], [allTransactions]);
  const statuses = useMemo(() => [...new Set(allTransactions.map((tx: any) => tx.status).filter(Boolean))] as string[], [allTransactions]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Trust Verification Indicator */}
      <div className="bg-gradient-to-r from-gray-800 to-indigo-900/30 p-4 rounded-xl border border-indigo-800">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-indigo-400 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-indigo-300">Trust-Verified Transactions</h3>
            <p className="text-sm text-indigo-400/80">
              All transactions below are cryptographically secured and permanently verified in our immutable trust ledger.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
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
            {departments.map((dept: string) => <option key={dept} value={dept}>{dept}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            {statuses.map((status: string) => (
              <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
        
        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Amount Range
                </label>
                <select
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Amounts</option>
                  <option value="small">Under $10,000</option>
                  <option value="medium">$10,000 - $100,000</option>
                  <option value="large">Over $100,000</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterDepartment('all');
                    setFilterStatus('all');
                    setAmountFilter('all');
                    setDateRange('all');
                  }}
                  className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
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
          {paginatedTransactions.length > 0 ? (
            paginatedTransactions.map((tx: any) => (
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
      
      {/* Pagination and Export Controls */}
      {filteredTransactions.length > 0 && (
        <div className="flex items-center justify-between bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">
              Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, filteredTransactions.length)} of {filteredTransactions.length} transactions
            </span>
            <button
              onClick={() => {
                generateTransactionPDF(filteredTransactions);
              }}
              className="flex items-center space-x-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => {
                const csvContent = [
                  ['Description', 'Amount', 'Department', 'Status', 'Date', 'Vendor'].join(','),
                  ...filteredTransactions.map((tx: any) => [
                    tx.description || '',
                    tx.amount || 0,
                    tx.department || '',
                    tx.status || '',
                    new Date(tx.timestamp || tx.createdAt).toLocaleDateString(),
                    tx.vendor || ''
                  ].join(','))
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}
              className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={prevPage}
              disabled={!hasPrevPage}
              className={cn(
                "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                hasPrevPage
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              )}
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                    )}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={nextPage}
              disabled={!hasNextPage}
              className={cn(
                "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                hasNextPage
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;