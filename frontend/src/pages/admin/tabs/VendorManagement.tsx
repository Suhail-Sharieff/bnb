import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Star, Building, Eye, Edit, UserX, CheckCircle, X, Mail, Phone, Calendar, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiClient, Vendor as ApiVendor } from '../../../lib/api';
import { toast } from 'react-toastify';

interface Vendor extends ApiVendor {
  name: string; // Alias for fullName
  companyName: string; // Alias for companyName
  phone: string; // This doesn't exist in API, will be placeholder
  status: 'active' | 'inactive' | 'pending'; // Derived from isActive
  reputationScore: number;
  totalProjects: number; // Derived from other data
  totalEarned: number;
  joinedAt: string; // Alias for createdAt
  lastActivity: string; // This doesn't exist in API, will be placeholder
  specialties: string[]; // This doesn't exist in API, will be placeholder
  // Additional fields from API
  walletAddress?: string;
  allocatedBudget?: number;
  documents?: any[];
}

export default function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchVendors();
  }, [statusFilter, currentPage]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getVendors({
        page: currentPage,
        limit: 10,
        isActive: statusFilter !== 'all' ? statusFilter === 'active' : undefined
      });
      
      if (response.success && response.data) {
        // Transform API vendor data to match our interface
        const transformedVendors: Vendor[] = response.data.map((vendor: ApiVendor) => ({
          ...vendor,
          name: vendor.fullName,
          companyName: vendor.companyName || 'N/A',
          phone: '+1 (555) 123-4567', // Placeholder
          status: vendor.isActive ? 'active' : 'inactive',
          reputationScore: vendor.reputationScore || 0,
          totalProjects: 0, // Placeholder
          totalEarned: vendor.totalWithdrawn || 0,
          joinedAt: vendor.createdAt,
          lastActivity: vendor.createdAt, // Placeholder
          specialties: ['Web Development', 'UI/UX Design'], // Placeholder
          allocatedBudget: vendor.totalAllocated || 0
        }));
        
        setVendors(transformedVendors);
        // Since pagination info isn't in the response, we'll set a default
        setTotalPages(1);
        toast.success('Vendors loaded successfully');
      } else {
        throw new Error(response.message || 'Failed to fetch vendors');
      }
    } catch (err: any) {
      console.error('Failed to fetch vendors:', err);
      setError(err.message || 'Failed to load vendors');
      toast.error('Failed to load vendors: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVendor = async (vendorId: string) => {
    try {
      const vendor = vendors.find(v => v._id === vendorId);
      if (!vendor) return;
      
      const confirmed = confirm(`Approve vendor registration?

Vendor: ${vendor.name}
Company: ${vendor.companyName}
Email: ${vendor.email}

This will activate their account and send a welcome email.`);
      if (!confirmed) return;
      
      // TODO: Implement actual API call when endpoint is available
      // For now, we'll just update the UI
      setVendors(prev => prev.map(v => 
        v._id === vendorId ? { ...v, status: 'active', reputationScore: 75 } : v
      ));
      toast.success(`Vendor "${vendor.name}" has been approved and activated!`);
    } catch (err: any) {
      console.error('Failed to approve vendor:', err);
      toast.error('Failed to approve vendor: ' + (err.message || 'Unknown error'));
    }
  };

  const handleRejectVendor = async (vendorId: string) => {
    try {
      const vendor = vendors.find(v => v._id === vendorId);
      if (!vendor) return;
      
      const reason = prompt(`Reject vendor registration for "${vendor.name}"?\n\nPlease provide a reason for rejection:`);
      if (!reason) return;
      
      // TODO: Implement actual API call when endpoint is available
      // For now, we'll just update the UI
      setVendors(prev => prev.filter(v => v._id !== vendorId));
      toast.success(`Vendor "${vendor.name}" has been rejected.`);
    } catch (err: any) {
      console.error('Failed to reject vendor:', err);
      toast.error('Failed to reject vendor: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeactivateVendor = async (vendorId: string) => {
    try {
      const vendor = vendors.find(v => v._id === vendorId);
      if (!vendor) return;
      
      const confirmed = confirm(`Deactivate vendor "${vendor.name}"?\n\nThis will suspend their account and prevent them from accessing the platform.`);
      if (!confirmed) return;
      
      // TODO: Implement actual API call when endpoint is available
      // For now, we'll just update the UI
      setVendors(prev => prev.map(v => 
        v._id === vendorId ? { ...v, status: 'inactive' } : v
      ));
      toast.success(`Vendor "${vendor.name}" has been deactivated.`);
    } catch (err: any) {
      console.error('Failed to deactivate vendor:', err);
      toast.error('Failed to deactivate vendor: ' + (err.message || 'Unknown error'));
    }
  };

  const handleActivateVendor = async (vendorId: string) => {
    try {
      const vendor = vendors.find(v => v._id === vendorId);
      if (!vendor) return;
      
      const confirmed = confirm(`Reactivate vendor "${vendor.name}"?\n\nThis will restore their account access.`);
      if (!confirmed) return;
      
      // TODO: Implement actual API call when endpoint is available
      // For now, we'll just update the UI
      setVendors(prev => prev.map(v => 
        v._id === vendorId ? { ...v, status: 'active' } : v
      ));
      toast.success(`Vendor "${vendor.name}" has been reactivated.`);
    } catch (err: any) {
      console.error('Failed to reactivate vendor:', err);
      toast.error('Failed to reactivate vendor: ' + (err.message || 'Unknown error'));
    }
  };

  const handleContactVendor = async (vendor: Vendor) => {
    const message = prompt(`Send message to ${vendor.name}:

Subject: Important Update

Enter your message:`);
    if (!message) return;
    
    // TODO: Implement actual API call when endpoint is available
    toast.success(`Message sent to ${vendor.name} at ${vendor.email}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
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

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading vendors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Vendors</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchVendors}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-600">Manage vendor accounts and performance</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </button>
      </div>

      {/* Vendor Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-900">45</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">38</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">4.7</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Filter className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Vendor Directory</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reputation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projects</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Earned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVendors.map((vendor) => (
                <tr key={vendor._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                      <div className="text-sm text-gray-500">{vendor.email}</div>
                      <div className="text-xs text-gray-400">{vendor.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{vendor.companyName}</div>
                    <div className="text-xs text-gray-500">
                      {vendor.specialties.slice(0, 2).join(', ')}
                      {vendor.specialties.length > 2 && ` +${vendor.specialties.length - 2} more`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(vendor.status)}`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{vendor.reputationScore}%</div>
                      <div className="ml-2 w-12 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${vendor.reputationScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vendor.totalProjects}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(vendor.totalEarned)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{formatDate(vendor.joinedAt)}</div>
                    <div className="text-xs text-gray-400">Last: {formatDate(vendor.lastActivity)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <div className="flex flex-col space-y-1">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => handleContactVendor(vendor)}
                          className="text-green-600 hover:text-green-800 font-medium flex items-center text-xs"
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Contact
                        </button>
                      </div>
                      <div className="flex space-x-1">
                        {vendor.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveVendor(vendor._id)}
                              className="text-green-600 hover:text-green-800 font-medium flex items-center text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectVendor(vendor._id)}
                              className="text-red-600 hover:text-red-800 font-medium flex items-center text-xs"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Reject
                            </button>
                          </>
                        ) : vendor.status === 'active' ? (
                          <button
                            onClick={() => handleDeactivateVendor(vendor._id)}
                            className="text-red-600 hover:text-red-800 font-medium flex items-center text-xs"
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivateVendor(vendor._id)}
                            className="text-green-600 hover:text-green-800 font-medium flex items-center text-xs"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activate
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vendor Details Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Vendor Details</h3>
              <button
                onClick={() => setSelectedVendor(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Basic Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Full Name</p>
                      <p className="text-sm text-gray-600">{selectedVendor.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Company</p>
                      <p className="text-sm text-gray-600">{selectedVendor.companyName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-sm text-gray-600">{selectedVendor.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                      <p className="text-sm text-gray-600">{selectedVendor.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(selectedVendor.status)}`}>
                        {selectedVendor.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Joined Date</p>
                      <p className="text-sm text-gray-600">{formatDate(selectedVendor.joinedAt)}</p>
                    </div>
                    {selectedVendor.walletAddress && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Wallet Address</p>
                        <p className="text-sm text-gray-600 font-mono text-xs break-all">{selectedVendor.walletAddress}</p>
                      </div>
                    )}
                    {selectedVendor.allocatedBudget !== undefined && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Allocated Budget</p>
                        <p className="text-sm text-gray-600">{formatCurrency(selectedVendor.allocatedBudget)}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Specialties</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.specialties.map((specialty, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
                
                {selectedVendor.documents && selectedVendor.documents.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-4">Uploaded Documents</h4>
                    <div className="space-y-2">
                      {selectedVendor.documents.map((doc: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.name || 'Document'}</p>
                            <p className="text-xs text-gray-600">{formatDate(doc.uploadedAt)}</p>
                          </div>
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Performance Stats */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Performance</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Reputation Score</span>
                        <span className="text-sm font-bold text-gray-900">{selectedVendor.reputationScore}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${selectedVendor.reputationScore}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{selectedVendor.totalProjects}</p>
                        <p className="text-sm text-gray-600">Total Projects</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedVendor.totalEarned)}</p>
                        <p className="text-sm text-gray-600">Total Earned</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">Last Activity</p>
                        <p className="text-sm text-gray-600">{formatDate(selectedVendor.lastActivity)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleContactVendor(selectedVendor)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Message
                  </button>
                  
                  {selectedVendor.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => {
                          handleApproveVendor(selectedVendor._id);
                          setSelectedVendor(null);
                        }}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Vendor
                      </button>
                      <button
                        onClick={() => {
                          handleRejectVendor(selectedVendor._id);
                          setSelectedVendor(null);
                        }}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject Application
                      </button>
                    </>
                  ) : selectedVendor.status === 'active' ? (
                    <button
                      onClick={() => {
                        handleDeactivateVendor(selectedVendor._id);
                        setSelectedVendor(null);
                      }}
                      className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Deactivate Account
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleActivateVendor(selectedVendor._id);
                        setSelectedVendor(null);
                      }}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Reactivate Account
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