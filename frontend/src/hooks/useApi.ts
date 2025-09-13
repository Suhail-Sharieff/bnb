import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiResponse } from '../lib/api';

// Generic hook for API calls with loading, error, and data states
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = [],
  immediate: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      setData(response.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies);

  return { data, loading, error, refetch: execute };
}

// Hook for budget transactions
export function useBudgetTransactions() {
  return useApi(() => fetch('/api/budget/transactions').then(res => res.json()));
}

// Hook for departments data
export function useDepartments() {
  return useApi(() => fetch('/api/departments').then(res => res.json()));
}

// Hook for wallet balance
export function useWalletBalance() {
  return useApi(() => apiClient.getBalance(), [], true);
}

// Hook for health check
export function useHealthCheck() {
  return useApi(() => apiClient.healthCheck(), [], true);
}

// Hook for real-time budget verification
export function useBudgetVerification() {
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const verifyBudget = useCallback(async (budgetData: any) => {
    try {
      setIsVerifying(true);
      setVerificationError(null);
      const response = await apiClient.verifyBudget(budgetData);
      setVerificationResult(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setVerificationError(errorMessage);
      throw err;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const checkBudget = useCallback(async (budgetData: any) => {
    try {
      setIsVerifying(true);
      setVerificationError(null);
      const response = await apiClient.checkBudget(budgetData);
      setVerificationResult(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Check failed';
      setVerificationError(errorMessage);
      throw err;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    verificationResult,
    isVerifying,
    verificationError,
    verifyBudget,
    checkBudget,
    clearResult: () => setVerificationResult(null)
  };
}

// Hook for file uploads
export function useFileUpload() {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  const uploadFile = useCallback(async (file: File, folder: string = 'documents', description: string = '') => {
    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      formData.append('description', description);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadedFile(result.data || result);
      
      return result.data || result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const resetUpload = useCallback(() => {
    setUploadProgress(0);
    setUploadError(null);
    setUploadedFile(null);
  }, []);

  return {
    uploadFile,
    uploadProgress,
    isUploading,
    uploadError,
    uploadedFile,
    resetUpload
  };
}

// Hook for real-time data polling
export function usePolling<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  interval: number = 30000, // 30 seconds default
  enabled: boolean = true
) {
  const { data, loading, error, refetch } = useApi(apiCall, [], enabled);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      refetch();
    }, interval);

    return () => clearInterval(timer);
  }, [refetch, interval, enabled]);

  return { data, loading, error, refetch };
}

// Hook for search functionality
export function useSearch<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
) {
  const filteredItems = useCallback(() => {
    if (!searchTerm.trim()) return items;
    
    return items.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchTerm);
        }
        return false;
      })
    );
  }, [items, searchTerm, searchFields]);

  return filteredItems();
}

// Hook for pagination
export function usePagination<T>(
  items: T[],
  itemsPerPage: number = 10
) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Reset to first page when items change
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  return {
    currentItems,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems: items.length,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
}