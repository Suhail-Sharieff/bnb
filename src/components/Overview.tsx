import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  ArrowRight 
} from 'lucide-react';
import { mockDepartments, mockTransactions } from '../data/mockData';
import { cn } from '../lib/utils'; // Assumes a utility function for conditional classes
import Analytics from './Analytics';

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
  const totalBudget = mockDepartments.reduce((sum, dept) => sum + dept.allocated, 0);
  const totalSpent = mockDepartments.reduce((sum, dept) => sum + dept.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const utilizationRate = (totalSpent / totalBudget) * 100;

  const recentTransactions = mockTransactions
    .filter(tx => tx.status === 'completed')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
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
              {mockDepartments.map((dept) => (
                <DepartmentRow key={dept.id} {...dept} />
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-50 mb-4">Recent Transactions</h3>
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between transition-all hover:bg-gray-700/60 p-2 rounded-md">
                  <div className="flex-1">
                    <p className="font-medium text-gray-200 text-sm">{tx.description}</p>
                    <p className="text-xs text-gray-500">{tx.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-50 text-sm">{formatCurrency(tx.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.timestamp).toLocaleDateString()}
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

        {/* AI-Generated Summary */}
        <div className="bg-gradient-to-r from-gray-800 to-indigo-900/30 p-6 rounded-xl border border-indigo-800">
          <h3 className="text-lg font-semibold text-indigo-300 mb-3">AI-Generated Summary</h3>
          <p className="text-gray-300 leading-relaxed">
              For the current fiscal year, the total allocated budget is {formatCurrency(totalBudget)}. 
              Overall budget utilization stands at a healthy {utilizationRate.toFixed(1)}%. 
              Key activity includes the Athletics Department exceeding its budget by {formatCurrency(Math.abs(mockDepartments.find(d => d.name === 'Athletics')?.remaining || 0))}, primarily due to unscheduled facility maintenance. 
              Meanwhile, the Engineering Department has a utilization rate of {((mockDepartments[0].spent / mockDepartments[0].allocated) * 100).toFixed(1)}%, with major spending on new lab equipment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Overview;