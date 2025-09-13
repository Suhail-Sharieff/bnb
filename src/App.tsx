import React from 'react';
import { useState } from 'react';
import Header from './components/Header';
import Overview from './components/Overview';
import FlowVisualization from './components/FlowVisualization';
import TransactionList from './components/TransactionList';
import AIAlerts from './components/AIAlerts';
import Analytics from './components/Analytics';

function App() {
  const [activeView, setActiveView] = useState('overview');

  const renderActiveView = () => {
    switch (activeView) {
      case 'overview':
        return <Overview />;
      case 'flow':
        return <FlowVisualization />;
      case 'transactions':
        return <TransactionList />;
      case 'alerts':
        return <AIAlerts />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header activeView={activeView} onViewChange={setActiveView} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveView()}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Veritas Ledger - Powered by blockchain technology for radical financial transparency
            </p>
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span>🔒 Blockchain Secured</span>
              <span>🤖 AI Monitored</span>
              <span>🌐 Publicly Auditable</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;