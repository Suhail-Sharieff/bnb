import React, { useEffect, useRef } from 'react';
import { mockDepartments, generateFlowData } from '../data/mockData';

const FlowVisualization: React.FC = () => {
  const sankeyRef = useRef<HTMLDivElement>(null);
  const treemapRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    // For MVP, we'll create a simplified visual representation
    // In a full implementation, this would use D3.js or Plotly.js
    
    if (sankeyRef.current) {
      const flowData = generateFlowData();
      const totalBudget = mockDepartments.reduce((sum, dept) => sum + dept.allocated, 0);
      
      sankeyRef.current.innerHTML = `
        <div class="space-y-4">
          <div class="text-center">
            <div class="inline-block bg-indigo-100 text-indigo-800 px-6 py-3 rounded-lg font-semibold">
              Total Budget: ${formatCurrency(totalBudget)}
            </div>
          </div>
          
          <div class="flex justify-center">
            <div class="w-2 h-16 bg-gradient-to-b from-indigo-500 to-transparent"></div>
          </div>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${mockDepartments.map(dept => `
              <div class="text-center">
                <div class="bg-white border-2 border-${dept.color === '#3B82F6' ? 'blue' : dept.color === '#EF4444' ? 'red' : dept.color === '#10B981' ? 'green' : 'yellow'}-500 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-900">${dept.name}</h4>
                  <p class="text-sm text-gray-600">${formatCurrency(dept.allocated)}</p>
                  <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-${dept.color === '#3B82F6' ? 'blue' : dept.color === '#EF4444' ? 'red' : dept.color === '#10B981' ? 'green' : 'yellow'}-500 h-2 rounded-full" 
                         style="width: ${Math.min((dept.spent / dept.allocated) * 100, 100)}%"></div>
                  </div>
                  <p class="text-xs mt-1 ${dept.remaining < 0 ? 'text-red-600' : 'text-green-600'}">
                    ${dept.remaining < 0 ? 'Over by ' + formatCurrency(Math.abs(dept.remaining)) : 'Remaining: ' + formatCurrency(dept.remaining)}
                  </p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (treemapRef.current) {
      const totalBudget = mockDepartments.reduce((sum, dept) => sum + dept.allocated, 0);
      
      treemapRef.current.innerHTML = `
        <div class="grid grid-cols-2 gap-2 h-64">
          ${mockDepartments.map(dept => {
            const percentage = (dept.allocated / totalBudget) * 100;
            const heightClass = percentage > 30 ? 'row-span-2' : 'row-span-1';
            const bgColor = dept.color === '#3B82F6' ? 'bg-blue-500' : 
                           dept.color === '#EF4444' ? 'bg-red-500' : 
                           dept.color === '#10B981' ? 'bg-green-500' : 'bg-yellow-500';
            
            return `
              <div class="${heightClass} ${bgColor} rounded-lg p-4 text-white flex flex-col justify-center items-center">
                <h4 class="font-bold text-lg">${dept.name}</h4>
                <p class="text-sm opacity-90">${formatCurrency(dept.allocated)}</p>
                <p class="text-xs opacity-75">${percentage.toFixed(1)}%</p>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Sankey-style Flow Diagram */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Budget Flow Visualization</h3>
        <div ref={sankeyRef} className="min-h-[300px]"></div>
        <p className="text-sm text-gray-600 mt-4 text-center">
          This simplified flow shows how the total budget is allocated across departments. 
          In the full implementation, this would be an interactive Sankey diagram showing detailed fund flows.
        </p>
      </div>

      {/* Treemap-style Proportion View */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Budget Proportions (Treemap Style)</h3>
        <div ref={treemapRef}></div>
        <p className="text-sm text-gray-600 mt-4 text-center">
          Each rectangle's size represents the department's budget allocation relative to the total budget.
        </p>
      </div>

      {/* Interactive Features Demo */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-3">🔍 Interactive Features (Full Version)</h3>
        <div className="space-y-2 text-green-800">
          <p>• Click on any department to drill down into specific transactions</p>
          <p>• Hover over flow connections to see detailed amounts and percentages</p>
          <p>• Filter by date range, transaction type, or vendor</p>
          <p>• Export visualizations and underlying data for external analysis</p>
          <p>• Real-time updates as new transactions are added to the blockchain</p>
        </div>
      </div>
    </div>
  );
};

export default FlowVisualization;