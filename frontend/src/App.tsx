import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { SocketProvider } from './contexts/SocketContext';

// Pages
import AuthPage from './pages/AuthPage';
import AdminDashboardWithTabs from './pages/admin/AdminDashboardWithTabs';
import VendorDashboardWithTabs from './pages/vendor/VendorDashboardWithTabs';
import Reports from './pages/admin/Reports';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Unauthorized</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// App Component
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={user ? <Navigate to={getDashboardRoute(user.role)} replace /> : <AuthPage initialMode="login" />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to={getDashboardRoute(user.role)} replace /> : <AuthPage initialMode="signup" />} 
        />
        
        {/* Protected routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardWithTabs />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/vendor/*"
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <VendorDashboardWithTabs />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['admin', 'auditor']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        
        {/* Default redirects */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={getDashboardRoute(user.role)} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        {/* 404 */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">404 - Page Not Found</h1>
                <p className="text-gray-600">The page you're looking for doesn't exist.</p>
              </div>
            </div>
          } 
        />
      </Routes>
      
      {/* Toast notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

// Helper function to get dashboard route based on user role
function getDashboardRoute(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'vendor':
      return '/vendor';
    case 'auditor':
      return '/reports';
    default:
      return '/admin';
  }
}

// Main App with Providers
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <SocketProvider>
            <AppContent />
          </SocketProvider>
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;