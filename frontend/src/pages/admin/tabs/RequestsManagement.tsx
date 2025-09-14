import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, DollarSign, Filter, Search, Eye, AlertTriangle, ArrowUpDown, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient, BudgetRequest } from '../../../lib/api';

export default function RequestsManagement() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof BudgetRequest>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const fetchRequests = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await apiClient.getBudgetRequests();
      
      if (response.success && response.data) {
        // Transform the data to match our interface
        // Map 'project' to 'title' to match the interface
        const transformedRequests = response.data.map(req => ({
          ...req,
          title: req.title || req.project // Use title if available, otherwise use project
        }));
        setRequests(transformedRequests);
      } else {
        console.error('Failed to fetch requests:', response.error);
        throw new Error(response.error || 'Failed to fetch requests');
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      // Show error message instead of mock data
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const handleApprove = useCallback(async (requestId: string) => {
    if (processing) return;
    
    try {
      setProcessing(requestId);
      const request = requests.find(r => r._id === requestId);
      if (!request) return;
      
      const confirmed = confirm(`Approve budget request?

Project: ${request.title}
Amount: ${formatCurrency(request.amount)}
Requester: ${request.requester?.fullName || request.requester}
Department: ${request.department}
Estimated Duration: Provided

This will send notification to ${request.requester?.email || 'requester'}`);
      if (!confirmed) return;
      
      const response = await apiClient.approveBudgetRequest(requestId);
      
      if (response.success) {
        setRequests(prev => 
          prev.map(req => 
            req._id === requestId ? { ...req, state: 'approved' } : req
          )
        );
        alert(`✅ Request Approved Successfully!

📋 Project: ${request.title}
💰 Amount: ${formatCurrency(request.amount)}
👤 Requester: ${request.requester?.fullName || request.requester}
🏢 Department: ${request.department}
⏱️ Duration: Provided

📧 Approval notification sent to ${request.requester?.email || 'requester'}`);
      } else {
        throw new Error(response.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert(`❌ Failed to approve request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(null);
    }
  }, [requests, token, processing]);

  const handleReject = async (requestId: string) => {
    try {
      const request = requests.find(r => r._id === requestId);
      if (!request) return;
      
      const reason = prompt(`Reject budget request: ${request.title}\n\nPlease provide a reason for rejection:`, 'Budget constraints for this quarter');
      if (!reason) return;
      
      const response = await apiClient.rejectBudgetRequest(requestId, reason);
      
      if (response.success) {
        setRequests(prev => 
          prev.map(req => 
            req._id === requestId ? { ...req, state: 'rejected' } : req
          )
        );
        alert(`❌ Request Rejected

📋 ${request.title}
💰 ${formatCurrency(request.amount)}
📝 Reason: ${reason}

📧 Rejection notice sent to ${request.requester?.email || 'requester'}`);
      } else {
        throw new Error(response.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert(`❌ Failed to reject request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAllocate = async (requestId: string) => {
    try {
      // For allocation, we need to show a modal to select vendor and amount
      const request = requests.find(r => r._id === requestId);
      if (!request) return;
      
      // In a real implementation, we would show a modal to select vendor
      // For now, we'll use a simple prompt for demonstration
      const vendorId = prompt('Enter vendor ID for allocation:');
      if (!vendorId) return;
      
      const response = await apiClient.allocateFunds(requestId, vendorId, request.amount);
      
      if (response.success) {
        setRequests(prev => 
          prev.map(req => 
            req._id === requestId ? { ...req, state: 'allocated' } : req
          )
        );
        alert(`✅ Funds Allocated Successfully!

📋 Project: ${request.title}
💰 Amount: ${formatCurrency(request.amount)}
🏢 Vendor ID: ${vendorId}`);
      } else {
        throw new Error(response.error || 'Failed to allocate funds');
      }
    } catch (error) {
      console.error('Failed to allocate request:', error);
      alert(`❌ Failed to allocate funds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Optimized filtering and sorting with useMemo
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = requests.filter(request => {
      const matchesFilter = filter === 'all' || request.state === filter;
      const matchesSearch = 
        (request.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.requester?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Handle nested properties
      if (sortField === 'requester') {
        aValue = (a.requester as any)?.fullName || '';
        bValue = (b.requester as any)?.fullName || '';
      }
      
      // Handle different data types
      if (sortField === 'amount') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [requests, filter, searchTerm, sortField, sortDirection]);

  const handleSort = (field: keyof BudgetRequest) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRefresh = () => {
    fetchRequests(true);
  };

  const handleViewDetails = (request: BudgetRequest) => {
    setSelectedRequest(request);
  };

  const exportToCSV = () => {
    const headers = ['Project', 'Amount', 'Requester', 'Department', 'Priority', 'Status', 'Created', 'Description'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedRequests.map(req => [
        `"${req.title}"`,
        req.amount,
        `"${req.requester?.fullName || req.requester}"`,
        `"${req.department}"`,
        req.priority,
        req.state,
        formatDate(req.createdAt),
        `"${(req.description || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'allocated': return <DollarSign className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'allocated': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Requests</h1>
          <p className="text-gray-600">Review and manage budget allocation requests</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center text-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="allocated">Allocated</option>
            </select>
          </div>

          <div className="flex-1 flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by project or requester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('title')}>
                  <div className="flex items-center">
                    Project
                    {sortField === 'title' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}>
                  <div className="flex items-center">
                    Amount
                    {sortField === 'amount' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('requester')}>
                  <div className="flex items-center">
                    Requester
                    {sortField === 'requester' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('department')}>
                  <div className="flex items-center">
                    Department
                    {sortField === 'department' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('priority')}>
                  <div className="flex items-center">
                    Priority
                    {sortField === 'priority' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('state')}>
                  <div className="flex items-center">
                    Status
                    {sortField === 'state' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center">
                    Date
                    {sortField === 'createdAt' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedRequests.length > 0 ? (
                filteredAndSortedRequests.map((request: BudgetRequest) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{request.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(request.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.requester && typeof request.requester === 'object' ? request.requester.fullName : request.requester}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(request.state)}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(request.state)}`}>
                          {request.state}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <div className="flex flex-col space-y-1">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleViewDetails(request)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </button>
                        </div>
                        {request.state === 'pending' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleApprove(request._id)}
                              disabled={processing === request._id}
                              className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50 flex items-center text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {processing === request._id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(request._id)}
                              disabled={processing === request._id}
                              className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 flex items-center text-xs"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </button>
                        </div>
                        )}
                        {request.state === 'approved' && (
                          <button
                            onClick={() => handleAllocate(request._id)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center text-xs"
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            Allocate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No requests found</h3>
                      <p className="text-gray-500 mb-4">There are no budget requests matching your current filters.</p>
                      <button
                        onClick={() => fetchRequests()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Data
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.state === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.state === 'approved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Allocated</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.state === 'allocated').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.state === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Request Details</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Project Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Project Name</p>
                      <p className="text-sm text-gray-600">{selectedRequest.title}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Requested Amount</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(selectedRequest.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Department</p>
                      <p className="text-sm text-gray-600">{selectedRequest.department}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Estimated Duration</p>
                      <p className="text-sm text-gray-600">Provided</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Priority</p>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full capitalize ${getPriorityColor(selectedRequest.priority)}`}>
                        {selectedRequest.priority}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status</p>
                      <div className="flex items-center">
                        {getStatusIcon(selectedRequest.state)}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(selectedRequest.state)}`}>
                          {selectedRequest.state}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Description</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedRequest.description}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Business Justification</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">Not provided</p>
                </div>
                
                {/* selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-4">Attachments</h4>
                    <div className="space-y-2">
                      {selectedRequest.attachments.map((attachment: string, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="text-sm text-gray-600">{attachment}</span>
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) */}
              </div>
              
              {/* Requester Info & Actions */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Requester Information</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Name</p>
                      <p className="text-sm text-gray-600">{selectedRequest.requester && typeof selectedRequest.requester === "object" ? selectedRequest.requester.fullName : selectedRequest.requester || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-sm text-gray-600">{selectedRequest.requester?.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Request Date</p>
                      <p className="text-sm text-gray-600">{formatDate(selectedRequest.createdAt)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                {selectedRequest.state === 'pending' && (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        handleApprove(selectedRequest._id);
                        setSelectedRequest(null);
                      }}
                      disabled={processing === selectedRequest._id}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {processing === selectedRequest._id ? 'Processing...' : 'Approve Request'}
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedRequest._id);
                        setSelectedRequest(null);
                      }}
                      disabled={processing === selectedRequest._id}
                      className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Request
                    </button>
                  </div>
                )}
                
                {selectedRequest.state === 'approved' && (
                  <button
                    onClick={() => {
                      handleAllocate(selectedRequest._id);
                      setSelectedRequest(null);
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Allocate Budget
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}