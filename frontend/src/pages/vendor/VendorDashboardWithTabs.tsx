import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import VendorHome from './tabs/VendorHome';

// Lazy load other components to avoid circular dependency issues
const VendorWallet = React.lazy(() => import('./tabs/VendorWallet'));
const VendorDocuments = React.lazy(() => import('./tabs/VendorDocuments'));
const VendorTransactions = React.lazy(() => import('./tabs/VendorTransactions'));
const VendorNotifications = React.lazy(() => import('./tabs/VendorNotifications'));
const VendorReports = React.lazy(() => import('./tabs/VendorReports'));

export default function VendorDashboardWithTabs() {
  return (
    <DashboardLayout>
      <React.Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<VendorHome />} />
          <Route path="/home" element={<VendorHome />} />
          <Route path="/wallet" element={<VendorWallet />} />
          <Route path="/documents" element={<VendorDocuments />} />
          <Route path="/transactions" element={<VendorTransactions />} />
          <Route path="/notifications" element={<VendorNotifications />} />
          <Route path="/reports" element={<VendorReports />} />
          <Route path="*" element={<Navigate to="/vendor/home" replace />} />
        </Routes>
      </React.Suspense>
    </DashboardLayout>
  );
}