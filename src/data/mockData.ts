import { Transaction, Department, AnomalyAlert } from '../types';

// Mock blockchain-like data with immutable transaction history
export const mockTransactions: Transaction[] = [
  {
    id: 'tx_001',
    timestamp: '2024-01-15T09:00:00Z',
    type: 'budget_allocation',
    amount: 5000000,
    description: 'Engineering Department Annual Budget',
    department: 'Engineering',
    category: 'Budget Allocation',
    status: 'completed',
    approver: 'CFO Johnson'
  },
  {
    id: 'tx_002',
    timestamp: '2024-01-15T09:15:00Z',
    type: 'budget_allocation',
    amount: 2000000,
    description: 'Athletics Department Annual Budget',
    department: 'Athletics',
    category: 'Budget Allocation',
    status: 'completed',
    approver: 'CFO Johnson'
  },
  {
    id: 'tx_003',
    timestamp: '2024-01-20T14:30:00Z',
    type: 'expense_submission',
    amount: 150000,
    description: 'Dell Computer Lab Equipment',
    department: 'Engineering',
    category: 'Equipment',
    vendor: 'Dell Technologies',
    status: 'completed',
    parentTransactionId: 'tx_001'
  },
  {
    id: 'tx_004',
    timestamp: '2024-01-22T11:45:00Z',
    type: 'expense_submission',
    amount: 100000,
    description: 'Apple MacBook Pro for Design Lab',
    department: 'Engineering',
    category: 'Equipment',
    vendor: 'Apple Inc.',
    status: 'completed',
    parentTransactionId: 'tx_001'
  },
  {
    id: 'tx_005',
    timestamp: '2024-02-01T16:20:00Z',
    type: 'expense_submission',
    amount: 2100000,
    description: 'Stadium Facility Maintenance',
    department: 'Athletics',
    category: 'Maintenance',
    vendor: 'BuildCorp Construction',
    status: 'completed',
    parentTransactionId: 'tx_002',
    anomalyScore: 0.85,
    isAnomalous: true
  },
  {
    id: 'tx_006',
    timestamp: '2024-02-05T10:15:00Z',
    type: 'expense_submission',
    amount: 75000,
    description: 'Software Licenses - Engineering Tools',
    department: 'Engineering',
    category: 'Software',
    vendor: 'Autodesk',
    status: 'pending',
    parentTransactionId: 'tx_001'
  },
  {
    id: 'tx_007',
    timestamp: '2024-02-10T13:30:00Z',
    type: 'expense_submission',
    amount: 45000,
    description: 'Athletic Equipment Purchase',
    department: 'Athletics',
    category: 'Equipment',
    vendor: 'SportsCorp',
    status: 'approved',
    parentTransactionId: 'tx_002'
  }
];

export const mockDepartments: Department[] = [
  {
    id: 'eng',
    name: 'Engineering',
    allocated: 5000000,
    spent: 325000,
    remaining: 4675000,
    color: '#3B82F6'
  },
  {
    id: 'ath',
    name: 'Athletics',
    allocated: 2000000,
    spent: 2145000,
    remaining: -145000,
    color: '#EF4444'
  },
  {
    id: 'lib',
    name: 'Library',
    allocated: 1500000,
    spent: 890000,
    remaining: 610000,
    color: '#10B981'
  },
  {
    id: 'admin',
    name: 'Administration',
    allocated: 3000000,
    spent: 1200000,
    remaining: 1800000,
    color: '#F59E0B'
  }
];

export const mockAnomalies: AnomalyAlert[] = [
  {
    id: 'alert_001',
    transaction: mockTransactions[4], // Stadium maintenance
    reason: 'Payment amount exceeds allocated budget by 5%. Unusually large single transaction.',
    severity: 'high',
    timestamp: '2024-02-01T16:25:00Z'
  }
];

// Generate flow data for Sankey diagram
export const generateFlowData = () => {
  const flows = [];
  
  // Total budget to departments
  mockDepartments.forEach(dept => {
    flows.push({
      source: 'Total Budget',
      target: dept.name,
      value: dept.allocated
    });
  });
  
  // Departments to categories
  const categorySpending = mockTransactions
    .filter(tx => tx.status === 'completed' && tx.type === 'expense_submission')
    .reduce((acc, tx) => {
      const key = `${tx.department}-${tx.category}`;
      acc[key] = (acc[key] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);
  
  Object.entries(categorySpending).forEach(([key, value]) => {
    const [dept, category] = key.split('-');
    flows.push({
      source: dept,
      target: category,
      value
    });
  });
  
  return flows;
};