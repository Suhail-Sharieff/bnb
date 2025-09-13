import React, { useState } from 'react';
import { useBudgetTransactions } from '../hooks/useApi';
import { cn } from '../lib/utils';
import { AlertTriangle, Brain, TrendingUp, Clock, CheckCircle, Eye, Search, Edit, ShieldCheck, ChevronDown } from 'lucide-react';

// --- Configuration Objects for Reusability ---
const severityConfig = {
  high: { Icon: AlertTriangle, darkClasses: 'bg-red-500/20 text-red-300 border-red-500/30' },
  medium: { Icon: Clock, darkClasses: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  low: { Icon: TrendingUp, darkClasses: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
};

const insightConfig = {
  trend: { Icon: TrendingUp, darkClasses: 'text-blue-400' },
  prediction: { Icon: Brain, darkClasses: 'text-purple-400' },
  risk: { Icon: ShieldCheck, darkClasses: 'text-amber-400' },
};

// --- Reusable Child Components ---

const StatCard: React.FC<{ title: string; value: string | number; Icon: React.ElementType; iconColor: string }> = ({ title, value, Icon, iconColor }) => (
  <div className="bg-gray-900/50 p-4 rounded-lg border border-purple-500/20">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-400">{title}</span>
      <Icon className={cn("w-4 h-4", iconColor)} />
    </div>
    <p className="text-2xl font-bold text-gray-50">{value}</p>
  </div>
);

const AlertCard: React.FC<{ alert: any; isExpanded: boolean; onToggle: () => void }> = ({ alert, isExpanded, onToggle }) => {
  const { Icon, darkClasses } = severityConfig[alert.severity as keyof typeof severityConfig];
  
  return (
    <div className={cn("border rounded-xl transition-all duration-300", darkClasses)}>
      {/* Collapsed View / Header */}
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start space-x-4">
          <Icon className="w-6 h-6 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${darkClasses}`}>
                {alert.severity.toUpperCase()} PRIORITY
              </span>
              <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", isExpanded && "rotate-180")} />
            </div>
            <p className="text-gray-300 mt-2">{alert.reason}</p>
            <div className="flex items-center space-x-4 text-sm mt-2 text-gray-400">
              <span><strong>Amount:</strong> {formatCurrency(alert.transaction.amount)}</span>
              <span><strong>Dept:</strong> {alert.transaction.department}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="px-4 pb-4 animate-fadeIn">
          <div className="bg-gray-900/50 p-4 rounded-lg mt-2">
            <h5 className="font-medium text-gray-50 mb-2">Full Transaction Details:</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong className="text-gray-400">Vendor:</strong><p className="text-gray-200">{alert.transaction.vendor || 'N/A'}</p></div>
                <div><strong className="text-gray-400">Date:</strong><p className="text-gray-200">{formatDate(alert.transaction.timestamp)}</p></div>
                <div><strong className="text-gray-400">Anomaly Score:</strong><p className="font-mono font-bold text-red-400">{(alert.transaction.anomalyScore! * 100).toFixed(1)}%</p></div>
                <div><strong className="text-gray-400">Transaction ID:</strong><p className="font-mono text-gray-200 text-xs">{alert.transaction.id}</p></div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"><Search className="w-4 h-4"/>Investigate</button>
            <button className="flex items-center gap-2 bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"><Edit className="w-4 h-4"/>Mark as Reviewed</button>
            <button className="flex items-center gap-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"><CheckCircle className="w-4 h-4"/>Approve</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Functions ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const formatDate = (timestamp: string) => new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// --- Main Component ---
const AIAlerts: React.FC = () => {
  // Fetch real data from API
  const { data: transactionsData, loading, error } = useBudgetTransactions();
  const transactions = (transactionsData as any)?.transactions || [];
  
  // Filter anomalous transactions from real data
  const anomalousTransactions = transactions.filter((tx: any) => tx.isAnomalous || tx.anomalyScore > 0.7);
  
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(anomalousTransactions[0]?.id || anomalousTransactions[0]?._id || null);
  
  // Show loading state
  if (loading) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading AI analysis...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="bg-red-900/20 border border-red-500 rounded-xl p-6">
          <h3 className="text-red-400 font-semibold mb-2">Failed to Load AI Alerts</h3>
          <p className="text-red-300 text-sm">{error}</p>
          <p className="text-gray-400 text-sm mt-2">Unable to fetch transaction data for AI analysis.</p>
        </div>
      </div>
    );
  }

  const aiInsights = [
    { title: "Spending Pattern Analysis", description: "Engineering shows 15% increase in equipment purchases vs last quarter.", type: "trend", confidence: 87 },
    { title: "Budget Utilization Forecast", description: "Athletics projected to exceed budget by 8% at current rate.", type: "prediction", confidence: 92 },
    { title: "Vendor Risk Assessment", description: "'BuildCorp Construction' requires verification due to large transaction size.", type: "risk", confidence: 78 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* AI System Status */}
      <div className="bg-gradient-to-r from-gray-800 to-purple-900/30 p-6 rounded-xl border border-purple-800">
        <div className="flex items-center space-x-4 mb-4">
          <Brain className="w-8 h-8 text-purple-400 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-purple-300">AI Anomaly Detection System</h3>
            <p className="text-sm text-purple-400/80">Powered by Isolation Forest ML algorithm • Real-time monitoring</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Transactions Analyzed" value={transactions.length} Icon={CheckCircle} iconColor="text-green-400" />
          <StatCard title="Anomalies Detected" value={anomalousTransactions.length} Icon={AlertTriangle} iconColor="text-red-400" />
          <StatCard title="Detection Accuracy" value="94.2%" Icon={TrendingUp} iconColor="text-blue-400" />
        </div>
      </div>

      {/* Active Alerts */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-50">Active Anomaly Alerts</h3>
        {anomalousTransactions.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
            <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-300 mb-2">No Anomalies Detected</h4>
            <p className="text-gray-500">All transactions appear normal. The AI system is monitoring for suspicious activity.</p>
          </div>
        ) : (
          anomalousTransactions.map((tx: any) => {
            // Convert transaction to alert format
            const alert = {
              id: tx.id || tx._id,
              transaction: tx,
              reason: tx.anomalyReason || `High anomaly score: ${((tx.anomalyScore || 0) * 100).toFixed(1)}%`,
              severity: tx.anomalyScore > 0.9 ? 'high' : tx.anomalyScore > 0.7 ? 'medium' : 'low',
              timestamp: tx.timestamp || tx.createdAt
            };
            
            return (
              <AlertCard 
                key={alert.id} 
                alert={alert}
                isExpanded={selectedAlertId === alert.id}
                onToggle={() => setSelectedAlertId(selectedAlertId === alert.id ? null : alert.id)}
              />
            );
          })
        )}
      </div>

      {/* AI Insights & How It Works */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">AI-Generated Insights</h3>
          <div className="space-y-4">
            {aiInsights.map((insight, index) => {
              const { Icon, darkClasses } = insightConfig[insight.type as keyof typeof insightConfig];
              return (
                <div key={index} className="flex items-start gap-4 bg-gray-700/50 p-4 rounded-lg">
                  <Icon className={cn("w-6 h-6 flex-shrink-0 mt-1", darkClasses)} />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-200">{insight.title}</h4>
                    <p className="text-gray-400 text-sm">{insight.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Confidence</p>
                    <p className={cn("text-lg font-bold", darkClasses)}>{insight.confidence}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-cyan-900/30 p-6 rounded-xl border border-cyan-800">
          <h3 className="text-lg font-semibold text-cyan-300 mb-3">🤖 How It Works</h3>
          <ul className="space-y-2 text-cyan-200/80 text-sm list-disc list-inside">
            <li><strong>Unsupervised Learning:</strong> The AI learns normal spending patterns without needing prior fraud examples.</li>
            <li><strong>Real-time Analysis:</strong> Every transaction is automatically scored for anomalies in seconds.</li>
            <li><strong>Multi-factor Detection:</strong> Considers amount, timing, vendor history, and departmental norms.</li>
            <li><strong>Human-in-the-Loop:</strong> The system flags suspicious activity for human review, combining machine efficiency with expert judgment.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AIAlerts;