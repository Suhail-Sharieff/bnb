// API configuration and helper functions
// Backend server runs on port 8000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  transaction?: Transaction;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface LoginRequest {
  email: string;
  password: string;  
}

interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'vendor';
}

interface AuthResponse {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    createdAt: string;
  };
  token: string;
  refreshToken: string;
  expiresIn: string;
}

interface BudgetRequest {
  _id: string;
  title: string;
  project: string;
  description: string;
  amount: number;
  department: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  state: 'pending' | 'approved' | 'rejected' | 'allocated' | 'completed';
  requester: {
    _id: string;
    fullName: string;
    email: string;
    department: string;
  };
  approvedBy?: {
    _id: string;
    fullName: string;
    email: string;
  };
  assignedVendor?: {
    _id: string;
    fullName: string;
    companyName: string;
  };
  createdAt: string;
  updatedAt: string;
  allocatedAmount?: number;
  approvalComments?: string;
}

interface Transaction {
  _id: string;
  amount: number;
  description: string;
  project: string;
  department: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  transactionHash?: string;
  explorerUrl?: string;
  gasUsed?: string;
  blockNumber?: number;
  contractAddress?: string;
  networkName?: string;
  createdAt: string;
  createdBy: {
    _id: string;
    fullName: string;
    email: string;
  };
  // Additional fields from BudgetTransaction model
  submittedBy?: string;
  submissionDate?: string;
  budgetRequestId?: string;
  vendorAddress?: string;
  dataHash?: string;
  category?: string;
  vendor?: string;
  updatedAt?: string;
  hashAlgorithm?: string;
}

interface Vendor {
  _id: string;
  fullName: string;
  email: string;
  companyName?: string;
  walletAddress?: string;
  totalAllocated: number;
  totalWithdrawn: number;
  reputationScore: number;
  level: string;
  isActive: boolean;
  createdAt: string;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system_alert';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Make request method public so it can be used by other methods
  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      // Handle network errors
      if (!response.ok) {
        let errorMessage = 'Request failed';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('API Request failed:', error);
      
      // Return a standardized error response
      return {
        success: false,
        message: error.message || 'Network error occurred',
        error: error.message || 'Network error occurred'
      } as ApiResponse<T>;
    }
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signup(userData: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Dashboard methods
  async getDashboard(): Promise<ApiResponse<any>> {
    const user = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const endpoint = user.role === 'vendor' ? '/vendor/dashboard' : '/admin/dashboard';
    return this.request<any>(endpoint);
  }

  // Budget Requests methods
  async getBudgetRequests(params?: {
    page?: number;
    limit?: number;
    state?: string;
    department?: string;
    priority?: string;
  }): Promise<ApiResponse<BudgetRequest[]>> {
    const query = new URLSearchParams(params as any).toString();
    const user = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const endpoint = user.role === 'vendor' ? '/vendor/projects' : '/admin/budget-requests';
    return this.request<BudgetRequest[]>(`${endpoint}?${query}`);
  }

  async approveBudgetRequest(id: string, comments?: string): Promise<ApiResponse<BudgetRequest>> {
    return this.request<BudgetRequest>(`/admin/budget-requests/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approvalComments: comments }),
    });
  }

  async rejectBudgetRequest(id: string, comments?: string): Promise<ApiResponse<BudgetRequest>> {
    return this.request<BudgetRequest>(`/admin/budget-requests/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionComments: comments }),
    });
  }

  async allocateFunds(id: string, vendorId: string, allocatedAmount: number): Promise<ApiResponse<BudgetRequest & { transaction?: Transaction }>> {
    return this.request<BudgetRequest & { transaction?: Transaction }>(`/admin/budget-requests/${id}/allocate`, {
      method: 'PUT',
      body: JSON.stringify({ vendorId, allocatedAmount }),
    });
  }

  // Transactions/Blockchain methods
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    department?: string;
    status?: string;
  }): Promise<ApiResponse<Transaction[]>> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<Transaction[]>(`/blockchain/transactions?${query}`);
  }

  // Vendors methods
  async getVendors(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Promise<ApiResponse<Vendor[]>> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<Vendor[]>(`/admin/users?role=vendor&${query}`);
  }

  // Notifications methods
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
  }): Promise<ApiResponse<Notification[]>> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<Notification[]>(`/notifications?${query}`);
  }

  async markNotificationRead(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead(): Promise<ApiResponse<any>> {
    return this.request<any>('/notifications/read-all', {
      method: 'PUT',
    });
  }

  // Reports methods
  async getReport(type: 'spending' | 'vendor-performance' | 'department-breakdown' | 'compliance', params?: {
    startDate?: string;
    endDate?: string;
    department?: string;
  }): Promise<ApiResponse<any>> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any>(`/admin/reports/${type}?${query}`);
  }

  // Wallet methods
  async getWalletInfo(): Promise<ApiResponse<any>> {
    return this.request<any>('/vendor/wallet');
  }

  // Test connection
  async testConnection(): Promise<ApiResponse<any>> {
    return this.request<any>('/health');
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request<any>('/health');
  }

  // Budget verification methods
  async verifyBudget(budgetData: any): Promise<ApiResponse<any>> {
    return this.request<any>('/api/budget/verify', {
      method: 'POST',
      body: JSON.stringify(budgetData),
    });
  }

  async checkBudget(budgetData: any): Promise<ApiResponse<any>> {
    return this.request<any>('/api/budget/check', {  
      method: 'POST',
      body: JSON.stringify(budgetData),
    });
  }

  async getStoredHash(): Promise<ApiResponse<any>> {
    return this.request<any>('/api/budget/hash');
  }

  async getBalance(): Promise<ApiResponse<any>> {
    return this.request<any>('/balance');
  }

  // Blockchain verification methods
  async getTransactionDetails(id: string): Promise<ApiResponse<Transaction>> {
    return this.request<Transaction>(`/blockchain/transaction/${id}`);
  }

  async verifyTransactionIntegrity(transactionId: string, dataHash: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/transactions/${transactionId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ dataHash }),
    });
  }

  // Method to fetch blockchain proof data
  async getTransactionProof(txHash: string): Promise<ApiResponse<any>> {
    try {
      return await this.request<any>(`/blockchain/proof/${txHash}`);
    } catch (error) {
      // Fallback to using transaction details if proof endpoint doesn't exist
      console.warn('Proof endpoint not found, falling back to transaction details');
      return {
        success: false,
        message: 'Proof endpoint not available',
        error: 'Endpoint not found'
      } as ApiResponse<any>;
    }
  }

  // Method to debug hash consistency
  async debugTransactionHash(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/blockchain/debug/${id}`);
  }

  getBlockchainExplorerUrl(transactionHash: string, network: string = 'sepolia'): string {
    const baseUrls: Record<string, string> = {
      'sepolia': 'https://sepolia.etherscan.io/tx/',
      'amoy': 'https://amoy.polygonscan.com/tx/',
      'mumbai': 'https://mumbai.polygonscan.com/tx/',
      'polygon': 'https://polygonscan.com/tx/',
      'mainnet': 'https://etherscan.io/tx/'
    };
    
    return `${baseUrls[network] || baseUrls['sepolia']}${transactionHash}`;
  }

  // Report export methods
  async exportReport(type: string, format: 'pdf' | 'csv' | 'json' = 'json', params?: any): Promise<ApiResponse<any>> {
    const query = new URLSearchParams({
      format,
      ...(params || {})
    }).toString();
    
    return this.request<any>(`/admin/reports/${type}/export?${query}`);
  }

  // Vendor document methods
  async uploadVendorDocuments(projectId: string, files: File[]): Promise<ApiResponse<any>> {
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));
    
    return this.request<any>(`/vendor/projects/${projectId}/documents`, {
      method: 'POST',
      body: formData as any,
      headers: {}, // Remove Content-Type to let browser set it with boundary
    });
  }

  async getVendorDocuments(projectId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/vendor/projects/${projectId}/documents`);
  }

  // WebSocket connection for real-time notifications
  connectWebSocket(token: string): WebSocket | null {
    try {
      const wsUrl = this.baseUrl.replace('http', 'ws').replace('api', 'ws');
      const ws = new WebSocket(`${wsUrl}/notifications?token=${token}`);
      return ws;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      return null;
    }
  }
}

// Create and export API client instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { 
  ApiResponse, 
  LoginRequest, 
  SignupRequest, 
  AuthResponse, 
  BudgetRequest,
  Transaction,
  Vendor,
  Notification
};