import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

interface ConnectionTestProps {
  onClose: () => void;
}

const ConnectionTest: React.FC<ConnectionTestProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [backendInfo, setBackendInfo] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setStatus('testing');
      setError('');
      
      // First try the simple test endpoint
      console.log('Testing connection to backend...');
      const response = await apiClient.testConnection();
      
      if (response.success) {
        // Then try the health endpoint for more detailed info
        const healthResponse = await apiClient.healthCheck();
        setBackendInfo({
          test: response,
          health: healthResponse.data || healthResponse
        });
        setStatus('success');
        console.log('Backend connection successful!');
      } else {
        setError('Backend returned unsuccessful response');
        setStatus('error');
      }
    } catch (err: any) {
      console.error('Connection test failed:', err);
      setError(err.message || 'Failed to connect to backend');
      setStatus('error');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'testing': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'testing': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Backend Connection Test</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon()}</span>
            <span className={`font-medium ${getStatusColor()}`}>
              {status === 'testing' && 'Testing connection...'}
              {status === 'success' && 'Backend Connected Successfully!'}
              {status === 'error' && 'Connection Failed'}
            </span>
          </div>

          {status === 'success' && backendInfo && (
            <div className="bg-gray-900 rounded p-3 text-sm">
              <div className="text-green-400 font-medium mb-2">Backend Information:</div>
              <div className="text-gray-300 space-y-1">
                {backendInfo.test && (
                  <>
                    <div>Server: {backendInfo.test.server}</div>
                    <div>Port: {backendInfo.test.port}</div>
                  </>
                )}
                {backendInfo.health && (
                  <>
                    <div>Status: {backendInfo.health.status}</div>
                    <div>Message: {backendInfo.health.message}</div>
                    {backendInfo.health.services && (
                      <>
                        <div>Database: {backendInfo.health.services.database?.connected ? '✅ Connected' : '❌ Disconnected'}</div>
                        <div>Blockchain: {backendInfo.health.services.blockchain?.network || 'Not configured'}</div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-900/20 border border-red-800 rounded p-3">
              <div className="text-red-400 font-medium mb-1">Error Details:</div>
              <div className="text-red-300 text-sm">{error}</div>
              <div className="text-red-300 text-xs mt-2">
                Make sure your backend server is running on http://localhost:8000
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={testConnection}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded transition-colors"
            >
              Test Again
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionTest;