import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../lib/api';
import { Download, FileText, BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

export default function VendorReports() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const reportTypes: ReportConfig[] = [
    { 
      id: 'earnings', 
      name: 'Earnings Report', 
      description: 'Detailed breakdown of your earnings and payments',
      icon: <BarChart3 className="h-8 w-8 text-blue-600" />
    },
    { 
      id: 'projects', 
      name: 'Project Performance', 
      description: 'Analysis of your project completion rates and quality',
      icon: <TrendingUp className="h-8 w-8 text-green-600" />
    },
    { 
      id: 'compliance', 
      name: 'Compliance Report', 
      description: 'Documentation compliance and submission history',
      icon: <PieChart className="h-8 w-8 text-purple-600" />
    }
  ];

  const generateReport = async (reportId: string) => {
    setLoading(true);
    try {
      // TODO: Implement actual API call to generate report
      // This is a placeholder for the actual report generation API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Report "${reportTypes.find(r => r.id === reportId)?.name}" generated successfully!`);
      
      // Simulate download
      const link = document.createElement('a');
      link.href = '#';
      link.download = `${reportId}-report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and download your performance reports</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-gray-600" />
          Filter by Date Range
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTypes.map((report) => (
          <div key={report.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              {report.icon}
              <h3 className="text-lg font-semibold text-gray-900 ml-3">{report.name}</h3>
            </div>
            <p className="text-gray-600 mb-4">{report.description}</p>
            <button
              onClick={() => generateReport(report.id)}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        ))}
      </div>

      {/* Report Preview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Preview</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Select a report type above to generate and preview your data</p>
          <p className="text-sm text-gray-500 mt-2">Reports will include charts, tables, and blockchain verification</p>
        </div>
      </div>
    </div>
  );
}