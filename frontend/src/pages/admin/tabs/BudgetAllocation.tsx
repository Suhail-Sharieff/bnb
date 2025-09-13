import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Users, AlertTriangle, CheckCircle, Eye, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient, BudgetRequest, Vendor } from '../../../lib/api';

interface AllocationForm {
  project: string;
  amount: number;
  department: string;
  vendor: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  deadline: string;
}

interface DashboardStats {
  availableBudget: number;
  activeVendors: number;
  pendingApproval: number;
  thisMonth: number;
}

export default function BudgetAllocation() {
  const { token } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    availableBudget: 0,
    activeVendors: 0,
    pendingApproval: 0,
    thisMonth: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationData, setAllocationData] = useState({ vendorId: '', allocatedAmount: 0 });
  const [formData, setFormData] = useState<AllocationForm>({
    project: '',
    amount: 0,
    department: '',
    vendor: '',
    priority: 'medium',
    description: '',
    deadline: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadBudgetRequests();
    loadVendors();
    loadDashboardStats();
  }, [currentPage]);

  const loadBudgetRequests = async () => {
    try {
      setPageLoading(true);
      const response = await apiClient.getBudgetRequests({
        page: currentPage,
        limit: 10,
        state: 'approved' // Show approved requests that can be allocated
      });
      
      if (response.success && response.data) {
        setBudgetRequests(response.data);
        // TODO: Add pagination support to API response
        setTotalPages(1); // For now, single page
      } else {
        console.error('Failed to load budget requests:', response.error);
        alert('Failed to load budget requests. Please try again.');
      }
    } catch (error) {
      console.error('Error loading budget requests:', error);
      alert('Failed to load budget requests. Please try again.');
    } finally {
      setPageLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await apiClient.getVendors();
      if (response.success && response.data) {
        setAvailableVendors(response.data);
      } else {
        console.error('Failed to load vendors:', response.error);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const response = await apiClient.getDashboard();
      if (response.success) {
        setStats({
          availableBudget: response.data.totalBudget - response.data.allocatedBudget,
          activeVendors: response.data.activeVendors || 0,
          pendingApproval: response.data.pendingRequests || 0,
          thisMonth: response.data.completedTransactions || 0
        });
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const handleAllocateFunds = async (request: BudgetRequest) => {
    setSelectedRequest(request);
    setAllocationData({ vendorId: '', allocatedAmount: request.amount });
    setShowAllocationModal(true);
  };

  const submitAllocation = async () => {
    if (!selectedRequest || !allocationData.vendorId || allocationData.allocatedAmount <= 0) {
      alert('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.allocateFunds(
        selectedRequest._id,
        allocationData.vendorId,
        allocationData.allocatedAmount
      );

      if (response.success) {
        const vendor = availableVendors.find(v => v._id === allocationData.vendorId);
        alert(`✅ Funds Allocated Successfully!

Project: ${selectedRequest.title}
Amount: $${allocationData.allocatedAmount.toLocaleString()}
Vendor: ${vendor?.companyName || 'Unknown'}`);
        setShowAllocationModal(false);
        setAllocationData({ vendorId: '', allocatedAmount: 0 });
        loadBudgetRequests(); // Refresh the list
      } else {
        alert('❌ Failed to allocate funds: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error allocating funds:', error);
      alert('❌ Failed to allocate funds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const response = await apiClient.approveBudgetRequest(requestId);
      if (response.success) {
        alert('✅ Request approved successfully!');
        loadBudgetRequests();
      } else {
        alert('❌ Failed to approve request: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('❌ Failed to approve request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (requestId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setLoading(true);
    try {
      const response = await apiClient.rejectBudgetRequest(requestId, reason);
      if (response.success) {
        alert('✅ Request rejected successfully!');
        loadBudgetRequests();
      } else {
        alert('❌ Failed to reject request: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('❌ Failed to reject request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const departments = ['Engineering', 'Marketing', 'Operations', 'Research', 'Sales'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'allocated': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (pageLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading budget allocation data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Allocation</h1>
          <p className="text-gray-600">Allocate funds to vendors and projects</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Budget</p>
              <p className="text-2xl font-bold text-gray-900">${stats.availableBudget.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeVendors}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingApproval}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Requests */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Budget Requests for Allocation</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {budgetRequests.map((request) => (
                <tr key={request._id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{request.title}</div>
                      <div className="text-sm text-gray-500">{request.description.substring(0, 50)}...</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">${request.amount.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">USD</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {request.department}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(request.priority)}`}>
                      {request.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.state)}`}>
                      {request.state.charAt(0).toUpperCase() + request.state.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {request.state === 'approved' && (
                      <button
                        onClick={() => handleAllocateFunds(request)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100 transition-colors"
                        disabled={loading}
                      >
                        Allocate Funds
                      </button>
                    )}
                    {request.state === 'pending' && (
                      <>
                        <button
                          onClick={() => approveRequest(request._id)}
                          className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md hover:bg-green-100 transition-colors"
                          disabled={loading}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectRequest(request._id)}
                          className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-md hover:bg-red-100 transition-colors"
                          disabled={loading}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button className="text-gray-600 hover:text-gray-900">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fund Allocation Modal */}
      {showAllocationModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Allocate Funds</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                <div className="text-sm text-gray-900 font-medium">{selectedRequest.title}</div>
                <div className="text-sm text-gray-500">{selectedRequest.description}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Vendor</label>
                <select
                  value={allocationData.vendorId}
                  onChange={(e) => setAllocationData({...allocationData, vendorId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select vendor...</option>
                  {availableVendors.map(vendor => (
                    <option key={vendor._id} value={vendor._id}>{vendor.companyName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allocation Amount ($)</label>
                <input
                  type="number"
                  value={allocationData.allocatedAmount}
                  onChange={(e) => setAllocationData({...allocationData, allocatedAmount: Number(e.target.value)})}
                  max={selectedRequest.amount}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  Maximum: ${selectedRequest.amount.toLocaleString()}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAllocationModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAllocation}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Allocating...' : 'Allocate Funds'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}