import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AdminHome from './tabs/AdminHome';
import RequestsManagement from './tabs/RequestsManagement';
import BlockchainMonitor from './tabs/BlockchainMonitor';
import TrustLedger from './tabs/TrustLedger';
import AdminNotifications from './tabs/AdminNotifications';
import VendorManagement from './tabs/VendorManagement';

export default function AdminDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<AdminHome />} />
        {/* <Route path="/allocation" element={<BudgetAllocation />} /> */}
        <Route path="/requests" element={<RequestsManagement />} />
        <Route path="/blockchain" element={<BlockchainMonitor />} />
        <Route path="/trust-ledger" element={<TrustLedger />} />
        {/* <Route path="/reports" element={<AdminReports />} /> */}
        <Route path="/notifications" element={<AdminNotifications />} />
        <Route path="/vendors" element={<VendorManagement />} />
      </Routes>
    </DashboardLayout>
  );
}