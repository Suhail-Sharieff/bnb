import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
          </div>
          <div className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col lg:hidden">
            <Sidebar />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Navigation */}
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page Content */}
        <main className="min-h-screen">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}