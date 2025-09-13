import React from 'react';
import { Shield, TrendingUp, Users, AlertTriangle } from 'lucide-react';

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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Veritas Ledger</h1>
              <p className="text-xs text-gray-500">Radical Financial Transparency</p>
            </div>
          </div>
          
          <nav className="flex space-x-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;