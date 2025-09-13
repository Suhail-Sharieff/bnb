import React from 'react';
import { Shield, TrendingUp, Users, AlertTriangle, LogOut, Settings } from 'lucide-react';
import { cn } from '../lib/utils'; // Assumes a utility function for conditional classes

interface HeaderProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, onViewChange }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'flow', label: 'Fund Flow', icon: Shield },
    { id: 'transactions', label: 'Transactions', icon: Users },
    { id: 'alerts', label: 'AI Alerts', icon: AlertTriangle }
  ];

  return (
    <header className="bg-gray-900 border-b border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left Section: Logo & Title */}
          <div className="flex items-center space-x-4">
            <Shield className="w-9 h-9 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-50">Veritas Ledger</h1>
              <p className="text-xs text-gray-400">Radical Financial Transparency</p>
            </div>
          </div>
          
          {/* Center Section: Navigation */}
          <nav className="hidden md:flex items-center bg-gray-800 p-1 rounded-full space-x-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900',
                  activeView === id
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                )}
                aria-current={activeView === id ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Right Section: User Profile & Actions */}
          <div className="flex items-center space-x-4">
             <div className="relative">
                <img
                  className="h-10 w-10 rounded-full object-cover border-2 border-gray-600"
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde"
                  alt="User avatar"
                />
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-gray-900" />
             </div>
             <div className="hidden lg:block">
                 <p className="text-sm font-medium text-gray-50">Alex Greyston</p>
                 <p className="text-xs text-gray-400">Administrator</p>
             </div>
             <button className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

       {/* Mobile Navigation Bar */}
       <nav className="md:hidden flex items-center justify-around bg-gray-900 border-t border-gray-700 p-2">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={cn(
                  'flex flex-col items-center justify-center w-full p-2 rounded-lg transition-colors',
                  activeView === id
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-gray-400 hover:bg-gray-700/50'
                )}
                aria-label={label}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </nav>
    </header>
  );
};

export default Header;