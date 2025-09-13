// API configuration and helper functions
// Backend server runs from the backend directory
const API_BASE_URL = 'http://localhost:3000';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface LoginRequest {
  email: string;
  password: string;  
}

interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'user';
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

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
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
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signup(userData: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Test connection
  async testConnection(): Promise<ApiResponse<any>> {
    return this.request<any>('/test');
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
}

// Create and export API client instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { ApiResponse, LoginRequest, SignupRequest, AuthResponse };