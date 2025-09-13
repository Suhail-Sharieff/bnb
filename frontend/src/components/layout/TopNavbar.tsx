import React, { useState } from 'react';
import { Menu, Bell, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import NotificationCenter from '../NotificationCenter';

interface TopNavbarProps {
  onMenuClick: () => void;
}

export default function TopNavbar({ onMenuClick }: TopNavbarProps) {
  const { user } = useAuth();
  const { state } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  
  const unreadCount = state.notifications.filter(n => !n.read).length;

  return (
    <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search */}
        <div className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions, vendors, or projects..."
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Refresh button */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Refresh</span>
            <RefreshCw className="h-6 w-6" />
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="-m-2.5 relative p-2.5 text-gray-400 hover:text-gray-500 transition-colors"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Profile dropdown */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />
          
          <div className="relative">
            <div className="flex items-center text-sm">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-medium text-blue-600">
                  {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-gray-900">
                  {user?.fullName}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notification Center */}
      <NotificationCenter 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </div>
  );
}