import React, { useState } from 'react';
import { AlertTriangle, Brain, TrendingUp, Clock, CheckCircle, Eye } from 'lucide-react';
import { mockAnomalies, mockTransactions } from '../data/mockData';

const AIAlerts: React.FC = () => {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      default:
        return <Eye className="w-5 h-5 text-gray-600" />;
    }
  };

  // Simulate additional AI insights
  const aiInsights = [
    {
      title: "Spending Pattern Analysis",
      description: "Engineering Department shows 15% increase in equipment purchases compared to last quarter",
      type: "trend",
      confidence: 87
    },
    {
      title: "Budget Utilization Forecast",
      description: "Athletics Department projected to exceed budget by 8% if current spending rate continues",
      type: "prediction",
      confidence: 92
    },
    {
      title: "Vendor Risk Assessment",
      description: "New vendor 'BuildCorp Construction' requires additional verification due to large transaction amount",
      type: "risk",
      confidence: 78
    }
  ];

  return (
    <div className="space-y-6">
      {/* AI System Status */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="w-8 h-8 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-purple-900">AI Anomaly Detection System</h3>
            <p className="text-sm text-purple-700">
              Powered by Isolation Forest ML algorithm • Real-time transaction monitoring
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Transactions Analyzed</span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{mockTransactions.length}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Anomalies Detected</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{mockAnomalies.length}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Detection Accuracy</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">94.2%</p>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Anomaly Alerts</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {mockAnomalies.map((alert) => (
            <div key={alert.id} className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getSeverityIcon(alert.severity)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold text-gray-900">
                      Anomalous Transaction Detected
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{alert.reason}</p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Transaction Details:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Amount:</span>
                        <p className="text-gray-900">{formatCurrency(alert.transaction.amount)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Department:</span>
                        <p className="text-gray-900">{alert.transaction.department}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Vendor:</span>
                        <p className="text-gray-900">{alert.transaction.vendor || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Date:</span>
                        <p className="text-gray-900">{formatDate(alert.transaction.timestamp)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        Anomaly Score: <span className="font-mono font-bold text-red-600">
                          {(alert.transaction.anomalyScore! * 100).toFixed(1)}%
                        </span>
                      </span>
                      <span className="text-sm text-gray-600">
                        Transaction ID: <span className="font-mono">{alert.transaction.id}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex space-x-3">
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                      Investigate
                    </button>
                    <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                      Mark as Reviewed
                    </button>
                    <button className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
                      Approve Transaction
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">AI-Generated Insights</h3>
        </div>
        
        <div className="p-6 space-y-4">
          {aiInsights.map((insight, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
                  <p className="text-gray-700 text-sm">{insight.description}</p>
                </div>
                <div className="text-right ml-4">
                  <span className="text-xs text-gray-500">Confidence</span>
                  <p className="text-lg font-bold text-indigo-600">{insight.confidence}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">🤖 How AI Anomaly Detection Works</h3>
        <div className="space-y-2 text-blue-800 text-sm">
          <p>• <strong>Unsupervised Learning:</strong> The Isolation Forest algorithm learns normal spending patterns without needing examples of fraud</p>
          <p>• <strong>Real-time Analysis:</strong> Every blockchain transaction is automatically scored for anomalies within seconds</p>
          <p>• <strong>Multi-factor Detection:</strong> Considers amount, timing, vendor history, approval patterns, and departmental norms</p>
          <p>• <strong>Adaptive Learning:</strong> The model continuously updates to detect new types of unusual activity</p>
          <p>• <strong>Human-in-the-Loop:</strong> AI flags suspicious transactions for human review, combining machine efficiency with human judgment</p>
        </div>
      </div>
    </div>
  );
};

export default AIAlerts;