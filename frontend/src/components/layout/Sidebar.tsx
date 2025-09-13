import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  DollarSign, 
  FileText, 
  Bell, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Upload,
  Wallet,
  CreditCard,
  Shield,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const adminNavigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Budget Allocation', href: '/admin/allocation', icon: DollarSign },
    { name: 'Requests', href: '/admin/requests', icon: FileText },
    { name: 'Trust Ledger', href: '/admin/trust-ledger', icon: Shield },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Notifications', href: '/admin/notifications', icon: Bell, badge: 3 },
    { name: 'Vendors', href: '/admin/vendors', icon: Users },
  ];

  const vendorNavigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/vendor', icon: LayoutDashboard },
    { name: 'Wallet', href: '/vendor/wallet', icon: Wallet },
    { name: 'Documents', href: '/vendor/documents', icon: Upload },
    { name: 'Transactions', href: '/vendor/transactions', icon: CreditCard },
    { name: 'Notifications', href: '/vendor/notifications', icon: Bell, badge: 2 },
    { name: 'Reports', href: '/vendor/reports', icon: BarChart3 },
  ];

  const navigation = user?.role === 'admin' ? adminNavigation : vendorNavigation;

  const isActiveRoute = (href: string) => {
    if (href === '/admin' || href === '/vendor') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-6">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-blue-600" />
          <div className="ml-3">
            <h1 className="text-lg font-bold text-gray-900">Financial</h1>
            <p className="text-xs text-gray-600">Transparency Platform</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase()}
            </span>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
            <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = isActiveRoute(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0
                  ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}
                `}
              />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="ml-3 inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-red-100 text-red-800">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings & Logout */}
      <div className="border-t border-gray-200 p-4 space-y-1">
        <Link
          to={`/${user?.role}/settings`}
          className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        >
          <Settings className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
          Logout
        </button>
      </div>
    </div>
  );
}