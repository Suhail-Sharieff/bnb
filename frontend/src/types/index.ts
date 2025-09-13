export interface Transaction {
  id: string;
  timestamp: string;
  type: 'budget_allocation' | 'expense_submission' | 'expense_approval' | 'payment_execution';
  amount: number;
  description: string;
  department: string;
  category: string;
  vendor?: string;
  approver?: string;
  status: 'requested' | 'approved' | 'allocated' | 'in-progress' | 'completed' | 'rejected';
  parentTransactionId?: string;
  anomalyScore?: number;
  isAnomalous?: boolean;
}

export interface Department {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  color: string;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  departments: Department[];
}

export interface FlowData {
  source: string;
  target: string;
  value: number;
}

export interface AnomalyAlert {
  id: string;
  transaction: Transaction;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'vendor';
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}