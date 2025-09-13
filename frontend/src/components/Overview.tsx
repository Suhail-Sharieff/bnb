import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  ArrowRight 
} from 'lucide-react';
import { useBudgetTransactions, useDepartments } from '../hooks/useApi';
import { cn } from '../lib/utils'; // Assumes a utility function for conditional classes
import Analytics from './Analytics';
import FileUpload from './FileUpload';
import { useNotifications } from './NotificationSystem';

// --- Helper Functions ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// --- Child Components for Reusability ---

interface MetricCardProps {
  title: string;
  value: string;
  Icon: React.ElementType;
  iconColorClass: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, Icon, iconColorClass }) => (
  <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700 transition-all hover:shadow-lg hover:border-blue-500">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-50">{value}</p>
      </div>
      <div className={`p-2 rounded-full bg-opacity-20 ${iconColorClass.replace('text-', 'bg-')}`}>
        <Icon className={`w-6 h-6 ${iconColorClass}`} />
      </div>
    </div>
  </div>
);

interface DepartmentRowProps {
  name: string;
  spent: number;
  allocated: number;
}

const DepartmentRow: React.FC<DepartmentRowProps> = ({ name, spent, allocated }) => {
  const utilization = (spent / allocated) * 100;
  const isOverBudget = utilization > 100;
  const barWidth = Math.min(utilization, 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-medium text-gray-100">{name}</span>
        <div className="text-right">
          <span className="text-sm text-gray-400">
            {formatCurrency(spent)} / {formatCurrency(allocated)}
          </span>
          <span className={cn(
            'ml-2 text-sm font-bold',
            isOverBudget ? 'text-red-500' : 'text-green-400'
          )}>
            {utilization.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div
          className={cn(
            'h-2.5 rounded-full transition-all duration-500',
            isOverBudget ? 'bg-red-500' : 'bg-blue-500'
          )}
          style={{ width: `${barWidth}%` }}
        />
      </div>
       {isOverBudget && (
          <p className="text-xs text-right text-red-500 font-medium">
            Over budget by {formatCurrency(spent - allocated)}
          </p>
        )}
    </div>
  );
};

// --- Main Overview Component ---

const Overview: React.FC = () => {
  const { addNotification } = useNotifications();
  
  // Fetch real data from API
  const { data: transactionsData, loading: transactionsLoading, error: transactionsError } = useBudgetTransactions();
  const { data: departmentsData, loading: departmentsLoading, error: departmentsError } = useDepartments();
  
  // Use only real data - no mock data
  const transactions = (transactionsData as any)?.transactions || [];
  const departments = (departmentsData as any) || [];
  
  const isLoading = transactionsLoading || departmentsLoading;
  const hasError = transactionsError || departmentsError;
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-gray-900 p-8 min-h-screen text-gray-200">
        <div className="space-y-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700 animate-pulse">
                <div className="h-16 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (hasError) {
    return (
      <div className="bg-gray-900 p-8 min-h-screen text-gray-200">
        <div className="space-y-8 max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-xl p-6">
            <h3 className="text-red-400 font-semibold mb-2">Failed to Load Dashboard Data</h3>
            <p className="text-red-300 text-sm">{transactionsError || departmentsError}</p>
            <p className="text-gray-400 text-sm mt-2">Unable to fetch data from the database.</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show empty state when no data
  if (departments.length === 0 && transactions.length === 0) {
    return (
      <div className="bg-gray-900 p-8 min-h-screen text-gray-200">
        <div className="space-y-8 max-w-7xl mx-auto">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <DollarSign className="mx-auto w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Budget Data Available</h3>
            <p className="text-gray-500 mb-4">No departments or transactions have been added to the system yet.</p>
            <p className="text-gray-500 text-sm">Add some budget data to see your dashboard come to life!</p>
          </div>
        </div>
      </div>
    );
  }
  
  const totalBudget = departments.reduce((sum: number, dept: any) => sum + (dept.allocated || 0), 0);
  const totalSpent = departments.reduce((sum: number, dept: any) => sum + (dept.spent || 0), 0);
  const totalRemaining = totalBudget - totalSpent;
  const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const recentTransactions = transactions
    .filter((tx: any) => tx.status === 'completed')
    .sort((a: any, b: any) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="bg-gray-900 p-8 min-h-screen text-gray-200">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Total Budget" value={formatCurrency(totalBudget)} Icon={DollarSign} iconColorClass="text-blue-400" />
          <MetricCard title="Total Spent" value={formatCurrency(totalSpent)} Icon={TrendingDown} iconColorClass="text-red-400" />
          <MetricCard title="Remaining" value={formatCurrency(totalRemaining)} Icon={TrendingUp} iconColorClass="text-green-400" />
          <MetricCard title="Utilization" value={`${utilizationRate.toFixed(1)}%`} Icon={PieChart} iconColorClass="text-indigo-400" />
        </div>
        <Analytics/>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Department Breakdown */}
          <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-50 mb-4">Department Budget Status</h3>
            <div className="space-y-6">
              {departments.map((dept: any) => (
                <DepartmentRow key={dept.id || dept.name} {...dept} />
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-50 mb-4">Recent Transactions</h3>
            <div className="space-y-4">
              {recentTransactions.map((tx: any) => (
                <div key={tx.id || tx._id} className="flex items-center justify-between transition-all hover:bg-gray-700/60 p-2 rounded-md">
                  <div className="flex-1">
                    <p className="font-medium text-gray-200 text-sm">{tx.description}</p>
                    <p className="text-xs text-gray-500">{tx.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-50 text-sm">{formatCurrency(tx.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.timestamp || tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              <button className="w-full text-center text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2 mt-2">
                  View All
                  <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* File Upload Section */}
        <FileUpload 
          onUploadSuccess={(file) => {
            addNotification({
              type: 'success',
              title: 'File Uploaded Successfully',
              message: `Document ${file.originalName || 'file'} has been uploaded and is ready for processing.`,
              duration: 6000
            });
          }}
          onUploadError={(error) => {
            addNotification({
              type: 'error',
              title: 'Upload Failed',
              message: error,
              persistent: true
            });
          }}
          folder="budget-documents"
          maxSizeInMB={25}
        />

        {/* AI-Generated Summary */}
        <div className="bg-gradient-to-r from-gray-800 to-indigo-900/30 p-6 rounded-xl border border-indigo-800">
          <h3 className="text-lg font-semibold text-indigo-300 mb-3">AI-Generated Summary</h3>
          <p className="text-gray-300 leading-relaxed">
              For the current fiscal year, the total allocated budget is {formatCurrency(totalBudget)}. 
              Overall budget utilization stands at a healthy {utilizationRate.toFixed(1)}%. 
              {departments.length > 0 && (
                <>
                  Key activity includes departments managing their allocated budgets effectively.
                  {departments[0] && departments[0].spent && departments[0].allocated && (
                    <> The {departments[0].name || 'first'} Department has a utilization rate of {((departments[0].spent / departments[0].allocated) * 100).toFixed(1)}%.</>  
                  )}
                </>
              )}
              {transactions.length > 0 && ` Recent activity shows ${transactions.length} total transactions processed.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Overview;