import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Building, 
  FolderOpen, 
  User, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight
} from 'lucide-react';
import FlowVisualization from './FlowVisualization';
import Analytics from './Analytics';
import { useApi } from '../hooks/useApi';
import { cn } from '../lib/utils';

// --- Helper Functions ---
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

interface DashboardStats {
  overview: {
    totalRequests: number;
    totalTransactions: number;
    totalUsers: number;
    activeVendors: number;
    totalApproved: number;
    totalAllocated: number;
    totalCompleted: number;
    totalSpent?: number;
  };
  requestStats: {
    _id: string;
    count: number;
    totalAmount: number;
  }[];
  departmentSpending: {
    _id: string;
    totalSpent: number;
    requestCount: number;
  }[];
  categorySpending: any[];
  recentTransactions: Transaction[];
  pendingApprovals: any[];
  topVendors: any[];
}

interface Department {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  color: string;
  utilization: number;
  status: 'normal' | 'high_usage' | 'near_limit' | 'over_budget';
}

interface Transaction {
  id: string;
  timestamp: string;
  type: string;
  amount: number;
  description: string;
  department: string;
  category: string;
  vendor?: string;
  approver?: string;
  status: 'requested' | 'approved' | 'allocated' | 'in-progress' | 'completed' | 'rejected';
}

// --- Child Components ---

interface MetricCardProps {
  title: string;
  value: string;
  Icon: React.ElementType;
  iconColorClass: string;
  trend?: 'up' | 'down';
  trendValue?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, Icon, iconColorClass, trend, trendValue }) => (
  <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700 transition-all hover:shadow-lg hover:border-blue-500">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-50">{value}</p>
        {trend && trendValue && (
          <div className="flex items-center mt-1">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
      <div className={cn("p-3 rounded-full", iconColorClass)}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </div>
);

interface DepartmentRowProps {
  department: Department;
}

const DepartmentRow: React.FC<DepartmentRowProps> = ({ department }) => {
  let statusColor = 'text-green-500';
  let statusIcon = <CheckCircle className="w-4 h-4" />;
  
  if (department.status === 'high_usage') {
    statusColor = 'text-yellow-500';
    statusIcon = <AlertTriangle className="w-4 h-4" />;
  } else if (department.status === 'near_limit') {
    statusColor = 'text-orange-500';
    statusIcon = <Clock className="w-4 h-4" />;
  } else if (department.status === 'over_budget') {
    statusColor = 'text-red-500';
    statusIcon = <XCircle className="w-4 h-4" />;
  }
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: department.color }}></div>
        <div>
          <p className="font-medium text-gray-50">{department.name}</p>
          <p className="text-sm text-gray-400">{formatCurrency(department.allocated)} allocated</p>
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <div className="text-right">
          <p className="font-medium text-gray-50">{formatCurrency(department.spent)}</p>
          <p className="text-sm text-gray-400">Spent</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-gray-50">{formatCurrency(department.remaining)}</p>
          <p className="text-sm text-gray-400">Remaining</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-gray-50">{formatPercentage(department.utilization)}</p>
          <div className="flex items-center justify-end">
            <span className={cn("text-sm", statusColor)}>
              {statusIcon}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TransactionRowProps {
  transaction: Transaction;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ transaction }) => {
  let statusColor = 'text-gray-500';
  let statusText = 'Unknown';
  
  switch (transaction.status) {
    case 'requested':
      statusColor = 'text-yellow-500';
      statusText = 'Requested';
      break;
    case 'approved':
      statusColor = 'text-blue-500';
      statusText = 'Approved';
      break;
    case 'allocated':
      statusColor = 'text-indigo-500';
      statusText = 'Allocated';
      break;
    case 'in-progress':
      statusColor = 'text-purple-500';
      statusText = 'In Progress';
      break;
    case 'completed':
      statusColor = 'text-green-500';
      statusText = 'Completed';
      break;
    case 'rejected':
      statusColor = 'text-red-500';
      statusText = 'Rejected';
      break;
  }
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-50 truncate">{transaction.description}</p>
        <div className="flex items-center mt-1">
          <span className="text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded mr-2">
            {transaction.department}
          </span>
          <span className="text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded">
            {transaction.category}
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <div className="text-right">
          <p className="font-medium text-gray-50">{formatCurrency(transaction.amount)}</p>
          <p className="text-sm text-gray-400">{transaction.type}</p>
        </div>
        <div className="text-right">
          <p className={cn("font-medium", statusColor)}>{statusText}</p>
          <p className="text-sm text-gray-400">
            {new Date(transaction.timestamp).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const ComprehensiveDashboard: React.FC = () => {
  const { data: stats, loading, refetch } = useApi<DashboardStats>(() => 
    fetch('/api/admin/dashboard').then(res => res.json())
  );
  
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  
  // Add real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [refetch]);
  
  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard data...</p>
        </div>
      </div>
    );
  }
  
  const { overview, recentTransactions } = stats;
  const totalBudget = overview.totalApproved + overview.totalAllocated + overview.totalCompleted;
  const totalSpent = overview.totalSpent || 0; // Use the totalSpent from overview or default to 0
  const totalRemaining = totalBudget - totalSpent;
  const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  // Mock departments data - in a real implementation, this would come from the API
  const departments: Department[] = [
    {
      id: '1',
      name: 'Education',
      allocated: 500000,
      spent: 350000,
      remaining: 150000,
      color: '#3B82F6',
      utilization: 70,
      status: 'normal'
    },
    {
      id: '2',
      name: 'Infrastructure',
      allocated: 750000,
      spent: 600000,
      remaining: 150000,
      color: '#10B981',
      utilization: 80,
      status: 'high_usage'
    },
    {
      id: '3',
      name: 'Healthcare',
      allocated: 400000,
      spent: 380000,
      remaining: 20000,
      color: '#F59E0B',
      utilization: 95,
      status: 'near_limit'
    },
    {
      id: '4',
      name: 'Administration',
      allocated: 200000,
      spent: 150000,
      remaining: 50000,
      color: '#EF4444',
      utilization: 75,
      status: 'normal'
    }
  ];
  
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Financial Transparency Dashboard</h1>
          <p className="text-gray-400">Complete overview of budget allocation and spending</p>
        </div>
        <div className="flex items-center space-x-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button 
            onClick={() => refetch()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Budget" 
          value={formatCurrency(totalBudget)} 
          Icon={DollarSign} 
          iconColorClass="text-blue-500/20" 
          trend="up"
          trendValue="+2.5%"
        />
        <MetricCard 
          title="Total Spent" 
          value={formatCurrency(totalSpent)} 
          Icon={TrendingDown} 
          iconColorClass="text-red-500/20" 
          trend="up"
          trendValue="+5.2%"
        />
        <MetricCard 
          title="Remaining" 
          value={formatCurrency(totalRemaining)} 
          Icon={TrendingUp} 
          iconColorClass="text-green-500/20" 
        />
        <MetricCard 
          title="Utilization" 
          value={formatPercentage(utilizationRate)} 
          Icon={PieChart} 
          iconColorClass="text-indigo-500/20" 
        />
      </div>
      
      {/* Analytics and Flow Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Department Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-50">Department Budget Status</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Normal</span>
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>High Usage</span>
                <Clock className="w-4 h-4 text-orange-500" />
                <span>Near Limit</span>
                <XCircle className="w-4 h-4 text-red-500" />
                <span>Over Budget</span>
              </div>
            </div>
            <div className="space-y-4">
              {departments.map((dept: Department) => (
                <DepartmentRow key={dept.id} department={dept} />
              ))}
            </div>
          </div>
          
          {/* Flow Visualization */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-50 mb-6">Budget Flow Visualization</h3>
            <p className="text-gray-400 mb-4">
              Visualize how funds move from the overall budget through departments, projects, and vendors.
            </p>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-4">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-300 mt-2">Budget</p>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-300 mt-2">Departments</p>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-300 mt-2">Projects</p>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-300 mt-2">Vendors</p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                  View Complete Flow Visualization
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Transactions and Analytics */}
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-50">Recent Transactions</h3>
              <button 
                onClick={() => refetch()}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-4">
              {recentTransactions.map((transaction: Transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-50 mb-4">Financial Analytics</h3>
            <p className="text-gray-400 text-sm mb-4">
              Track spending patterns and budget utilization over time.
            </p>
            <div className="space-y-4">
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-300">Monthly Spending</span>
                  <span className="text-sm font-medium text-gray-50">$125,430</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-300">Budget Utilization</span>
                  <span className="text-sm font-medium text-gray-50">78%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Information */}
      <div className="bg-gradient-to-r from-gray-800 to-blue-900/30 p-6 rounded-xl border border-blue-800">
        <h3 className="text-lg font-semibold text-blue-300 mb-4">🔒 Blockchain Verified Transparency</h3>
        <p className="text-blue-200 mb-4">
          All financial data is cryptographically verified and stored on the blockchain for complete transparency and immutability. 
          Every transaction is traceable from budget allocation to vendor payment.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-blue-200">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" />
            <span className="text-sm">Real-time budget tracking</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" />
            <span className="text-sm">Immutable transaction records</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" />
            <span className="text-sm">Public verification available</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-800">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            View Blockchain Verification
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveDashboard;