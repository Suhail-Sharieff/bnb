import React, { useState, useLayoutEffect, useRef } from 'react';
import { useDepartments } from '../hooks/useApi';
import { cn } from '../lib/utils';
import { CheckCircle, MousePointerClick, Filter, Download } from 'lucide-react';
import BudgetFlowVisualization from './BudgetFlowVisualization';

// --- Helper Functions & Data ---
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Map hex colors to Tailwind classes for better maintainability
const colorMap: { [key: string]: { bg: string; border: string; text: string } } = {
  '#3B82F6': { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-300' },
  '#EF4444': { bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-300' },
  '#10B981': { bg: 'bg-green-500', border: 'border-green-400', text: 'text-green-300' },
  '#F59E0B': { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-300' },
};

// --- SVG Path Component for the Flow Diagram ---

interface PathData {
  id: string;
  d: string;
  stroke: string;
  strokeWidth: number;
}

const SankeyDiagram: React.FC = () => {
  const sourceRef = useRef<HTMLDivElement>(null);
  const destRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<PathData[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // Fetch real department data
  const { data: departmentsData, loading } = useDepartments();
  const departments = (departmentsData as any) || [];
  const totalBudget = departments.reduce((sum: number, dept: any) => sum + (dept.allocated || 0), 0);
  
  // Show loading state
  if (loading || departments.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-50 mb-4 text-center">Budget Flow Visualization</h3>
        <div className="flex items-center justify-center h-64">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-300">Loading department data...</p>
            </div>
          ) : (
            <div className="text-center">
              <Filter className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-300">No department data available</p>
              <p className="text-gray-500 text-sm mt-2">Add departments to see budget flow visualization</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  useLayoutEffect(() => {
    const calculatePaths = () => {
      if (!sourceRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const sourceRect = sourceRef.current.getBoundingClientRect();
      const startX = sourceRect.right - containerRect.left;
      const startY = sourceRect.top - containerRect.top + sourceRect.height / 2;

      const newPaths = departments.map((dept: any, index: number) => {
        const destEl = destRefs.current[index];
        if (!destEl) return null;

        const destRect = destEl.getBoundingClientRect();
        const endX = destRect.left - containerRect.left;
        const endY = destRect.top - containerRect.top + destRect.height / 2;

        const controlX1 = startX + (endX - startX) * 0.5;
        const controlY1 = startY;
        const controlX2 = startX + (endX - startX) * 0.5;
        const controlY2 = endY;

        const d = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
        const strokeWidth = (dept.allocated / totalBudget) * 60; // Max width of 60px

        return {
          id: dept.id,
          d,
          stroke: dept.color,
          strokeWidth: Math.max(strokeWidth, 2), // Min width of 2px
        };
      }).filter((p: any): p is PathData => p !== null);

      setPaths(newPaths);
    };

    calculatePaths();
    window.addEventListener('resize', calculatePaths);
    return () => window.removeEventListener('resize', calculatePaths);
  }, [departments, totalBudget]);

  // ... rest of the component with real data
  return (
    <div ref={containerRef} className="relative grid grid-cols-3 gap-8 items-center min-h-[400px]">
      {/* SVG Container for Paths */}
      <svg className="absolute top-0 left-0 w-full h-full z-0" style={{ pointerEvents: 'none' }}>
        <defs>
          {paths.map(p => (
            <linearGradient key={p.id} id={`grad-${p.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: p.stroke, stopOpacity: 0.1 }} />
              <stop offset="100%" style={{ stopColor: p.stroke, stopOpacity: 0.6 }} />
            </linearGradient>
          ))}
        </defs>
        <g>
          {paths.map(p => (
            <path
              key={p.id}
              d={p.d}
              fill="none"
              stroke={`url(#grad-${p.id})`}
              strokeWidth={p.strokeWidth}
              className={cn(
                "transition-all duration-300",
                hoveredId && hoveredId !== p.id ? 'opacity-20' : 'opacity-100'
              )}
            />
          ))}
        </g>
      </svg>
      
      {/* Source Node */}
      <div ref={sourceRef} onMouseEnter={() => setHoveredId('source')} onMouseLeave={() => setHoveredId(null)} className="z-10 col-span-1 bg-indigo-500/20 text-indigo-300 px-6 py-4 rounded-lg font-semibold border-2 border-indigo-500 text-center transition-all hover:shadow-2xl hover:border-indigo-300 cursor-pointer">
        <p className="text-sm">Total Budget</p>
        <p className="text-xl">{formatCurrency(totalBudget)}</p>
      </div>

      {/* Destination Nodes */}
      <div className="z-10 col-span-2 space-y-2">
        {departments.map((dept: any, index: number) => {
          const colors = colorMap[dept.color] || colorMap['#3B82F6'];
          return (
            <div
              key={dept.id}
              ref={el => destRefs.current[index] = el}
              onMouseEnter={() => setHoveredId(dept.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "bg-gray-800/80 backdrop-blur-sm p-3 rounded-md border transition-all duration-300 cursor-pointer",
                colors.border,
                hoveredId === dept.id ? 'scale-105 shadow-lg' : '',
                hoveredId && hoveredId !== dept.id && hoveredId !== 'source' ? 'opacity-50' : 'opacity-100'
              )}
            >
              <p className="font-bold text-gray-50 text-sm">{dept.name}</p>
              <p className={cn("font-semibold", colors.text)}>{formatCurrency(dept.allocated)}</p>
            </div>
          )
        })}
      </div>
    </div>
  );
};

const FlowVisualization: React.FC = () => {
  const { data: departmentsData, loading } = useDepartments();
  const departments = (departmentsData as any) || [];
  const totalBudget = departments.reduce((sum: number, dept: any) => sum + (dept.allocated || 0), 0);
  const [activeTab, setActiveTab] = useState<'departments' | 'budgetFlow'>('departments');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        <button
          className={cn(
            "px-4 py-2 font-medium text-sm",
            activeTab === 'departments' 
              ? "text-blue-500 border-b-2 border-blue-500" 
              : "text-gray-500 hover:text-gray-300"
          )}
          onClick={() => setActiveTab('departments')}
        >
          Department Flow
        </button>
        <button
          className={cn(
            "px-4 py-2 font-medium text-sm",
            activeTab === 'budgetFlow' 
              ? "text-blue-500 border-b-2 border-blue-500" 
              : "text-gray-500 hover:text-gray-300"
          )}
          onClick={() => setActiveTab('budgetFlow')}
        >
          Complete Budget Flow
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'departments' ? (
        <>
          {/* Sankey-style Flow Diagram */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-50 mb-4 text-center">Budget Flow Visualization</h3>
            <SankeyDiagram />
            <p className="text-sm text-gray-500 mt-4 text-center">
              Flow thickness is proportional to budget allocation. Hover over a department to highlight its path.
            </p>
          </div>

          {/* Budget Allocation Treemap */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-50 mb-4 text-center">Budget Allocation Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 h-48">
              {departments.map((dept: any, index: number) => {
                const percentage = totalBudget > 0 ? (dept.allocated / totalBudget) * 100 : 0;
                const colors = colorMap[dept.color] || colorMap['#3B82F6'];
                return (
                  <div
                    key={dept.id || index}
                    className={cn("relative rounded-lg p-4 transition-all hover:scale-105 cursor-pointer", colors.bg)}
                    style={{ 
                      height: `${Math.max(percentage * 2, 20)}%`,
                      minHeight: '60px'
                    }}
                  >
                    <p className="font-bold text-white text-sm">{dept.name}</p>
                    <p className="text-white/90 text-xs">{formatCurrency(dept.allocated)}</p>
                    <p className="text-white/70 text-xs font-mono">
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-gray-500 mt-6 text-center">
              Each rectangle's size represents its budget allocation relative to the total.
            </p>
          </div>
        </>
      ) : (
        <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
          <BudgetFlowVisualization budgetFlowId="BUDGET-EXAMPLE" />
        </div>
      )}

      {/* Interactive Features Demo */}
      <div className="bg-gradient-to-r from-gray-800 to-emerald-900/30 p-6 rounded-xl border border-emerald-800">
        <h3 className="text-lg font-semibold text-emerald-300 mb-4">🔍 Interactive Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-emerald-200">
            {[
                { icon: MousePointerClick, text: "Drill down into specific transactions by clicking a department." },
                { icon: Filter, text: "Filter by date range, transaction type, or vendor." },
                { icon: Download, text: "Export visualizations and data for external analysis." },
                { icon: CheckCircle, text: "Get real-time updates as new transactions are verified in the trust ledger." }
            ].map(item => (
                <div key={item.text} className="flex items-center gap-3 bg-emerald-900/40 p-3 rounded-lg">
                    <item.icon className="w-5 h-5 text-emerald-400 flex-shrink-0"/>
                    <p className="text-sm">{item.text}</p>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default FlowVisualization;
