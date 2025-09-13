import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Filter, Eye, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../lib/api';
import { toast } from 'react-toastify';

interface Report {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  format: string;
  size: string;
  url?: string;
  data?: any;
}

export default function AdminReports() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportType, setReportType] = useState('spending');
  const [dateRange, setDateRange] = useState('this_month');
  const [format, setFormat] = useState('json');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const reportTypes = [
    { value: 'spending', label: 'Spending Report' },
    { value: 'vendor-performance', label: 'Vendor Performance Report' },
    { value: 'department-breakdown', label: 'Department Breakdown Report' },
    { value: 'compliance', label: 'Compliance Report' }
  ];

  const dateRanges = [
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const formats = [
    { value: 'json', label: 'JSON' },
    { value: 'csv', label: 'CSV' },
    { value: 'pdf', label: 'PDF' }
  ];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // We'll generate some mock recent reports for display
      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Spending Report - November 2024',
          type: 'Spending Report',
          generatedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          format: 'PDF',
          size: '2.4 MB'
        },
        {
          id: '2',
          name: 'Vendor Performance - Q4 2024',
          type: 'Vendor Performance Report',
          generatedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          format: 'Excel',
          size: '1.8 MB'
        },
        {
          id: '3',
          name: 'Department Breakdown - October 2024',
          type: 'Department Breakdown Report',
          generatedAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          format: 'CSV',
          size: '956 KB'
        }
      ];
      
      setReports(mockReports);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      // Generate date range parameters
      const today = new Date();
      let startDate = '';
      let endDate = today.toISOString();
      
      if (dateRange === 'custom') {
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate).toISOString();
          endDate = new Date(customEndDate).toISOString();
        } else {
          throw new Error('Please select both start and end dates for custom range');
        }
      } else {
        switch (dateRange) {
          case 'this_week':
            startDate = new Date(today.setDate(today.getDate() - 7)).toISOString();
            break;
          case 'this_month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
            break;
          case 'last_month':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
            endDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
            break;
          case 'this_quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1).toISOString();
            break;
          case 'this_year':
            startDate = new Date(today.getFullYear(), 0, 1).toISOString();
            break;
          default:
            startDate = new Date(today.setDate(today.getDate() - 30)).toISOString();
        }
      }
      
      const response = await apiClient.getReport(reportType as any, {
        startDate,
        endDate
      });

      if (response.success) {
        // Create a new report entry
        const newReport: Report = {
          id: Date.now().toString(),
          name: `${reportTypes.find(r => r.value === reportType)?.label || reportType} - ${new Date().toLocaleDateString()}`,
          type: reportTypes.find(r => r.value === reportType)?.label || reportType,
          generatedAt: new Date().toISOString(),
          format: format.toUpperCase(),
          size: 'Unknown',
          data: response.data
        };
        
        // Add to reports list
        setReports(prev => [newReport, ...prev]);
        
        toast.success(`✅ Report Generated Successfully!

📄 Report: ${newReport.name}
💾 Format: ${format.toUpperCase()}

Use the download button to save the report.`);
      } else {
        throw new Error(response.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error(`❌ Failed to generate report: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (reportId: string, reportName: string) => {
    try {
      const report = reports.find(r => r.id === reportId);
      
      if (!report) {
        throw new Error('Report not found');
      }
      
      // Use the API client's exportReport method
      const response = await apiClient.exportReport(reportType, format as any, {
        startDate: customStartDate || new Date().toISOString(),
        endDate: customEndDate || new Date().toISOString()
      });
      
      if (response.success && response.data) {
        exportData(response.data, reportName, format);
      } else {
        throw new Error(response.error || 'Failed to export report');
      }
    } catch (error) {
      console.error('Failed to download report:', error);
      toast.error('Failed to download report: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const exportData = (data: any, fileName: string, exportFormat: string) => {
    try {
      let blob;
      let mimeType;
      let fileExtension;
      
      switch (exportFormat.toLowerCase()) {
        case 'csv':
          // Convert JSON to CSV
          const csvContent = convertToCSV(data);
          blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;
          
        case 'pdf':
          // For PDF, we'll export as JSON for now
          // In a real implementation, you would use a PDF library
          const pdfContent = JSON.stringify(data, null, 2);
          blob = new Blob([pdfContent], { type: 'application/json;charset=utf-8;' });
          mimeType = 'application/json';
          fileExtension = 'json';
          toast.info('PDF export not implemented. Exporting as JSON instead.');
          break;
          
        case 'json':
        default:
          const jsonContent = JSON.stringify(data, null, 2);
          blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
          mimeType = 'application/json';
          fileExtension = 'json';
          break;
      }
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Report downloaded successfully as ${fileExtension.toUpperCase()}!`);
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('Failed to export data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const convertToCSV = (data: any): string => {
    if (!data) return '';
    
    // Handle array of objects
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(fieldName => {
            const value = row[fieldName];
            // Escape commas and quotes
            if (typeof value === 'string') {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ];
      
      return csvRows.join('\n');
    }
    
    // Handle single object
    if (typeof data === 'object') {
      const rows = Object.entries(data).map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key},"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `${key},${value}`;
      });
      return rows.join('\n');
    }
    
    return String(data);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and export detailed financial reports</p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Report Generator */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {dateRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {formats.map((fmt) => (
                <option key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {report.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {report.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(report.generatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {report.format.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {report.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                      onClick={() => handleDownloadReport(report.id, report.name)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Download className="h-8 w-8 text-emerald-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Downloads</p>
              <p className="text-2xl font-bold text-gray-900">156</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center">
            <Filter className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Automated</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}