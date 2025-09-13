import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { mockDepartments, mockTransactions } from '../data/mockData';

const Overview: React.FC = () => {
  const totalBudget = mockDepartments.reduce((sum, dept) => sum + dept.allocated, 0);
  const totalSpent = mockDepartments.reduce((sum, dept) => sum + dept.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const utilizationRate = (totalSpent / totalBudget) * 100;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const recentTransactions = mockTransactions
    .filter(tx => tx.status === 'completed')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Remaining</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRemaining)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilization</p>
              <p className="text-2xl font-bold text-gray-900">{utilizationRate.toFixed(1)}%</p>
            </div>
            <AlertCircle className={`w-8 h-8 ${utilizationRate > 90 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Budget Status</h3>
        <div className="space-y-4">
          {mockDepartments.map((dept) => {
            const utilizationPercent = (dept.spent / dept.allocated) * 100;
            const isOverBudget = dept.spent > dept.allocated;
            
            return (
              <div key={dept.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{dept.name}</span>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">
                      {formatCurrency(dept.spent)} / {formatCurrency(dept.allocated)}
                    </span>
                    <span className={`ml-2 text-sm font-medium ${
                      isOverBudget ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {utilizationPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isOverBudget ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                  />
                  {isOverBudget && (
                    <div
                      className="h-2 bg-red-300 rounded-full -mt-2"
                      style={{ width: `${utilizationPercent - 100}%`, marginLeft: '100%' }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{tx.description}</p>
                <p className="text-sm text-gray-600">{tx.department} • {tx.vendor || 'Internal'}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(tx.amount)}</p>
                <p className="text-xs text-gray-500">
                  {new Date(tx.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NLP Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
        <h3 className="text-lg font-semibold text-indigo-900 mb-3">AI-Generated Summary</h3>
        <p className="text-indigo-800 leading-relaxed">
          For the current fiscal year, the institution has allocated a total budget of {formatCurrency(totalBudget)}. 
          The Engineering Department has spent {formatCurrency(mockDepartments[0].spent)} of its {formatCurrency(mockDepartments[0].allocated)} allocation ({((mockDepartments[0].spent / mockDepartments[0].allocated) * 100).toFixed(1)}%), 
          with the largest expenditures in lab equipment. The Athletics Department has exceeded its budget by {formatCurrency(Math.abs(mockDepartments[1].remaining))}, 
          primarily due to unscheduled facility maintenance costs. Overall budget utilization stands at {utilizationRate.toFixed(1)}%.
        </p>
      </div>
    </div>
  );
};

export default Overview;