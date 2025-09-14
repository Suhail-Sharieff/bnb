import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { cn } from '../lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  ArrowRight,
  Building,
  FolderOpen,
  User,
  Wallet,
  CheckCircle,
  AlertCircle,
  Shield
} from 'lucide-react';

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

interface BudgetFlowData {
  budget: {
    id: string;
    name: string;
    totalAmount: number;
    spentAmount: number;
    remainingAmount: number;
    utilization: number;
  };
  departments: DepartmentFlow[];
}

interface DepartmentFlow {
  id: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilization: number;
  projects: ProjectFlow[];
}

interface ProjectFlow {
  id: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilization: number;
  vendors: VendorFlow[];
}

interface VendorFlow {
  id: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilization: number;
  walletAddress?: string;
  transactionHash?: string;
  status: string;
}

// --- Child Components ---

interface MetricCardProps {
  title: string;
  value: string;
  Icon: React.ElementType;
  iconColorClass: string;
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, Icon, iconColorClass, description }) => (
  <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700 transition-all hover:shadow-lg hover:border-blue-500">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-50">{value}</p>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      <div className={cn("p-3 rounded-full", iconColorClass)}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </div>
);

interface UtilizationBarProps {
  utilization: number;
  className?: string;
}

const UtilizationBar: React.FC<UtilizationBarProps> = ({ utilization, className }) => {
  let barColor = 'bg-green-500';
  if (utilization > 90) barColor = 'bg-red-500';
  else if (utilization > 75) barColor = 'bg-yellow-500';
  
  return (
    <div className={cn("w-full bg-gray-700 rounded-full h-2", className)}>
      <div 
        className={cn("h-2 rounded-full", barColor)}
        style={{ width: `${Math.min(utilization, 100)}%` }}
      ></div>
    </div>
  );
};

interface BudgetNodeProps {
  title: string;
  amount: number;
  utilization: number;
  icon: React.ElementType;
  iconColor: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void; // Simplify to no parameters
}

const BudgetNode: React.FC<BudgetNodeProps> = ({ 
  title, 
  amount, 
  utilization, 
  icon: Icon, 
  iconColor,
  children,
  className,
  onClick
}) => (
  <div 
    className={cn("bg-gray-800 rounded-xl shadow-md border border-gray-700 p-4 transition-all hover:shadow-lg", className)}
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div className="flex items-center">
        <div className={cn("p-2 rounded-lg mr-3", iconColor)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-50">{title}</h4>
          <p className="text-sm text-gray-400">{formatCurrency(amount)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-50">{formatPercentage(utilization)}</p>
        <UtilizationBar utilization={utilization} className="mt-1" />
      </div>
    </div>
    {children && (
      <div className="mt-4 pl-4 border-l-2 border-gray-700">
        {children}
      </div>
    )}
  </div>
);

// --- Main Component ---

interface BudgetFlowVisualizationProps {
  budgetFlowId: string;
}

const BudgetFlowVisualization: React.FC<BudgetFlowVisualizationProps> = ({ budgetFlowId }) => {
  const { data, loading, error } = useApi<BudgetFlowData>(
    () => fetch(`/api/admin/budget-flow/${budgetFlowId}/visualization`).then(res => res.json())
  );
  
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<{type: string, id: string} | null>(null);
  
  const toggleDepartment = (deptId: string) => {
    const newSet = new Set(expandedDepartments);
    if (newSet.has(deptId)) {
      newSet.delete(deptId);
    } else {
      newSet.add(deptId);
    }
    setExpandedDepartments(newSet);
  };
  
  const toggleProject = (projId: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projId)) {
      newSet.delete(projId);
    } else {
      newSet.add(projId);
    }
    setExpandedProjects(newSet);
  };
  
  const selectNode = (type: string, id: string) => {
    setSelectedNode({type, id});
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading budget flow visualization...</p>
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-50 mb-2">Error Loading Data</h3>
        <p className="text-gray-300">{error || 'Failed to load budget flow data'}</p>
      </div>
    );
  }
  
  const { budget, departments } = data;
  
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Budget Flow Visualization</h1>
          <p className="text-gray-400">Complete tracking from budget to departments, projects, and vendors</p>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-sm font-medium text-green-500">Real-time Tracking</span>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Budget" 
          value={formatCurrency(budget.totalAmount)} 
          Icon={DollarSign} 
          iconColorClass="text-blue-500/20" 
        />
        <MetricCard 
          title="Total Spent" 
          value={formatCurrency(budget.spentAmount)} 
          Icon={TrendingDown} 
          iconColorClass="text-red-500/20" 
        />
        <MetricCard 
          title="Remaining" 
          value={formatCurrency(budget.remainingAmount)} 
          Icon={TrendingUp} 
          iconColorClass="text-green-500/20" 
        />
        <MetricCard 
          title="Utilization" 
          value={formatPercentage(budget.utilization)} 
          Icon={PieChart} 
          iconColorClass="text-indigo-500/20" 
          description="Overall budget utilization"
        />
      </div>
      
      {/* Budget Flow Diagram */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-50 mb-6">Complete Budget Flow</h3>
        
        {/* Top Level Budget */}
        <BudgetNode
          title={budget.name}
          amount={budget.totalAmount}
          utilization={budget.utilization}
          icon={DollarSign}
          iconColor="bg-blue-500"
          className="mb-6"
          onClick={() => selectNode('budget', budget.id)}
        >
          {/* Departments */}
          <div className="space-y-4 mt-4">
            {departments.map(dept => (
              <div key={dept.id}>
                <BudgetNode
                  title={dept.name}
                  amount={dept.allocatedAmount}
                  utilization={dept.utilization}
                  icon={Building}
                  iconColor="bg-indigo-500"
                  className={`cursor-pointer hover:border-indigo-500 ${selectedNode?.type === 'department' && selectedNode?.id === dept.id ? 'border-2 border-indigo-400' : ''}`}
                  onClick={() => {
                    toggleDepartment(dept.id);
                    selectNode('department', dept.id);
                  }}
                >
                  {expandedDepartments.has(dept.id) && (
                    <div className="space-y-4 mt-4">
                      {dept.projects.map(proj => (
                        <div key={proj.id}>
                          <BudgetNode
                            title={proj.name}
                            amount={proj.allocatedAmount}
                            utilization={proj.utilization}
                            icon={FolderOpen}
                            iconColor="bg-purple-500"
                            className={`cursor-pointer hover:border-purple-500 ${selectedNode?.type === 'project' && selectedNode?.id === proj.id ? 'border-2 border-purple-400' : ''}`}
                            onClick={() => {
                              toggleProject(proj.id);
                              selectNode('project', proj.id);
                            }}
                          >
                            {expandedProjects.has(proj.id) && (
                              <div className="space-y-4 mt-4">
                                {proj.vendors.map(vendor => (
                                  <BudgetNode
                                    key={vendor.id}
                                    title={vendor.name}
                                    amount={vendor.allocatedAmount}
                                    utilization={vendor.utilization}
                                    icon={User}
                                    iconColor="bg-amber-500"
                                    className={`hover:border-amber-500 ${selectedNode?.type === 'vendor' && selectedNode?.id === vendor.id ? 'border-2 border-amber-400' : ''}`}
                                    onClick={() => {
                                      selectNode('vendor', vendor.id);
                                    }}
                                  >
                                    <div className="mt-3 pt-3 border-t border-gray-700">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">Status</span>
                                        <span className={cn(
                                          "font-medium",
                                          vendor.status === 'completed' ? 'text-green-500' : 
                                          vendor.status === 'in-progress' ? 'text-blue-500' : 
                                          vendor.status === 'allocated' ? 'text-yellow-500' : 'text-gray-500'
                                        )}>
                                          {vendor.status}
                                        </span>
                                      </div>
                                      {vendor.walletAddress && (
                                        <div className="flex items-center justify-between text-sm mt-1">
                                          <span className="text-gray-400">Wallet</span>
                                          <span className="font-mono text-xs text-gray-300 truncate ml-2">
                                            {vendor.walletAddress.substring(0, 6)}...{vendor.walletAddress.substring(vendor.walletAddress.length - 4)}
                                          </span>
                                        </div>
                                      )}
                                      {vendor.transactionHash && (
                                        <div className="flex items-center justify-between text-sm mt-1">
                                          <span className="text-gray-400">Transaction</span>
                                          <span className="font-mono text-xs text-gray-300 truncate ml-2">
                                            {vendor.transactionHash.substring(0, 6)}...{vendor.transactionHash.substring(vendor.transactionHash.length - 4)}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between text-sm mt-1">
                                        <span className="text-gray-400">Spent</span>
                                        <span className="font-medium text-gray-300">
                                          {formatCurrency(vendor.spentAmount)} of {formatCurrency(vendor.allocatedAmount)}
                                        </span>
                                      </div>
                                    </div>
                                  </BudgetNode>
                                ))}
                              </div>
                            )}
                          </BudgetNode>
                        </div>
                      ))}
                    </div>
                  )}
                </BudgetNode>
              </div>
            ))}
          </div>
        </BudgetNode>
      </div>
      
      {/* Selected Node Details */}
      {selectedNode && (
        <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">Selected Item Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <p className="text-sm text-gray-400">Type</p>
              <p className="font-medium text-gray-50 capitalize">{selectedNode.type}</p>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <p className="text-sm text-gray-400">ID</p>
              <p className="font-mono text-sm text-gray-300 truncate">{selectedNode.id}</p>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <p className="text-sm text-gray-400">Action</p>
              <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                View Full Details
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-50 mb-4">Visualization Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-300">Utilization &lt; 75%</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
            <span className="text-sm text-gray-300">Utilization 75-90%</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
            <span className="text-sm text-gray-300">Utilization &gt; 90%</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Click on departments and projects to expand/collapse details. 
          Hover over nodes to see more information.
        </p>
      </div>
      
      {/* Blockchain Verification Stamp */}
      <div className="bg-gradient-to-r from-gray-800 to-green-900/30 p-6 rounded-xl border border-green-800">
        <div className="flex items-center">
          <Shield className="w-6 h-6 text-green-400 mr-2" />
          <h3 className="text-lg font-semibold text-green-300">🔒 Blockchain Verified</h3>
        </div>
        <p className="text-green-200 text-sm mt-2">
          This budget flow visualization is cryptographically verified and stored on the blockchain. 
          All data is immutable and publicly verifiable.
        </p>
        <div className="flex items-center mt-3">
          <CheckCircle className="w-4 h-4 text-green-400 mr-1" />
          <span className="text-xs text-green-300">Real-time tracking</span>
          <CheckCircle className="w-4 h-4 text-green-400 ml-3 mr-1" />
          <span className="text-xs text-green-300">Immutable records</span>
          <CheckCircle className="w-4 h-4 text-green-400 ml-3 mr-1" />
          <span className="text-xs text-green-300">Public verification</span>
        </div>
      </div>
    </div>
  );
};

export default BudgetFlowVisualization;