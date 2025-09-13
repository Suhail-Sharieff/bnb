import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

interface NotFoundPageProps {
  type?: '404' | 'unauthorized';
}

export default function NotFoundPage({ type = '404' }: NotFoundPageProps) {
  const isUnauthorized = type === 'unauthorized';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <AlertTriangle className="h-24 w-24 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {isUnauthorized ? 'Access Denied' : 'Page Not Found'}
          </h1>
          <p className="text-gray-600">
            {isUnauthorized 
              ? 'You do not have permission to access this page.'
              : 'The page you are looking for does not exist.'
            }
          </p>
        </div>
        
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Home className="h-4 w-4 mr-2" />
          Go Home
        </Link>
      </div>
    </div>
  );
}