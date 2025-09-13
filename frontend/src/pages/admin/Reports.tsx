import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Report {
  id: string;
  title: string;
  type: 'admin' | 'vendor' | 'general';
  generatedAt: string;
  blockchainHash?: string;
  status: 'generating' | 'ready' | 'error';
  downloadUrl?: string;
  format: 'pdf' | 'csv';
  description: string;
}

interface ReportData {
  totalAllocations: number;
  totalAmount: number;
  pendingAllocations: number;
  completedAllocations: number;
  activeVendors: number;
  blockchainTransactions: number;
  averageProcessingTime: string;
  topCategories: { name: string; amount: number; count: number }[];
  recentTransactions: any[];
}

const Reports: React.FC = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReports();
    fetchReportData();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  };

  const generateReport = async (type: string, format: 'pdf' | 'csv') => {
    setGenerating(`${type}-${format}`);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/reports/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          format,
          dateRange: selectedDateRange,
          includeBlockchainVerification: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (format === 'pdf' || format === 'csv') {
          // For file downloads, create blob and download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.${format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }

        // Refresh reports list
        fetchReports();
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/reports/${reportId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const verifyBlockchainHash = async (hash: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/blockchain/verify/${hash}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Blockchain Verification: ${result.verified ? 'VERIFIED ✓' : 'NOT VERIFIED ✗'}\nBlock: ${result.blockNumber}\nTimestamp: ${result.timestamp}`);
      }
    } catch (error) {
      console.error('Error verifying hash:', error);
      alert('Failed to verify blockchain hash');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="flex space-x-2">
          <input
            type="date"
            value={selectedDateRange.startDate}
            onChange={(e) => setSelectedDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <span className="self-center text-gray-500">to</span>
          <input
            type="date"
            value={selectedDateRange.endDate}
            onChange={(e) => setSelectedDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Allocations</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalAllocations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">${reportData.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Vendors</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.activeVendors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Blockchain Txns</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.blockchainTransactions}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Generation */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Generate New Report</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Fund Allocation Report</h3>
              <p className="text-sm text-gray-600">Complete overview of all fund allocations, vendor payments, and blockchain transactions</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => generateReport('fund-allocation', 'pdf')}
                  disabled={generating === 'fund-allocation-pdf'}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {generating === 'fund-allocation-pdf' ? 'Generating...' : 'Generate PDF'}
                </button>
                <button
                  onClick={() => generateReport('fund-allocation', 'csv')}
                  disabled={generating === 'fund-allocation-csv'}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  {generating === 'fund-allocation-csv' ? 'Generating...' : 'Generate CSV'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Vendor Performance Report</h3>
              <p className="text-sm text-gray-600">Vendor activity, document submissions, fund utilization, and performance metrics</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => generateReport('vendor-performance', 'pdf')}
                  disabled={generating === 'vendor-performance-pdf'}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {generating === 'vendor-performance-pdf' ? 'Generating...' : 'Generate PDF'}
                </button>
                <button
                  onClick={() => generateReport('vendor-performance', 'csv')}
                  disabled={generating === 'vendor-performance-csv'}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  {generating === 'vendor-performance-csv' ? 'Generating...' : 'Generate CSV'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Blockchain Audit Report</h3>
              <p className="text-sm text-gray-600">Complete blockchain transaction history with verification and integrity checks</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => generateReport('blockchain-audit', 'pdf')}
                  disabled={generating === 'blockchain-audit-pdf'}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {generating === 'blockchain-audit-pdf' ? 'Generating...' : 'Generate PDF'}
                </button>
                <button
                  onClick={() => generateReport('blockchain-audit', 'csv')}
                  disabled={generating === 'blockchain-audit-csv'}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  {generating === 'blockchain-audit-csv' ? 'Generating...' : 'Generate CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Reports</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blockchain Hash</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No reports generated yet. Create your first report above.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{report.title}</div>
                        <div className="text-sm text-gray-500">{report.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        report.format === 'pdf' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {report.format.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(report.generatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        report.status === 'ready' ? 'bg-green-100 text-green-800' :
                        report.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.blockchainHash ? (
                        <button
                          onClick={() => verifyBlockchainHash(report.blockchainHash!)}
                          className="text-blue-600 hover:text-blue-900 text-xs font-mono"
                          title="Click to verify on blockchain"
                        >
                          {report.blockchainHash.substring(0, 12)}...
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">No hash</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {report.status === 'ready' && (
                        <button
                          onClick={() => downloadReport(report.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Download
                        </button>
                      )}
                      {report.blockchainHash && (
                        <button
                          onClick={() => verifyBlockchainHash(report.blockchainHash!)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Categories */}
      {reportData && reportData.topCategories && reportData.topCategories.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Top Categories by Allocation</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {reportData.topCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{category.name}</div>
                      <div className="text-sm text-gray-500">{category.count} allocations</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    ${category.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;