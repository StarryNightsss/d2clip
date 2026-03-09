/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import BackgroundAnimation from './components/BackgroundAnimation';
import Login from './components/Login';
import Workbench from './components/Workbench';
import ReportView from './components/Report';
import DataList from './components/DataList';
import Community from './components/Community';
import UserManagement from './components/UserManagement';
import RDPage from './components/RD';
import MarketPage from './components/Market';
import OperationPage from './components/Operation';
import { ViewState, User } from './types';
import { MOCK_USERS } from './constants';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>({ type: 'login' });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Check local storage for session
    const savedUser = localStorage.getItem('aura_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setView({ type: 'workbench' });
    }
    setIsInitialized(true);
  }, []);

  const handleLogin = (loginData: any) => {
    const fullUser = MOCK_USERS.find(u => u.username === loginData.username) || {
      id: Date.now().toString(),
      username: loginData.username,
      name: loginData.username,
      role: loginData.role,
      department: loginData.department,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${loginData.username}`
    };
    
    setUser(fullUser);
    localStorage.setItem('aura_user', JSON.stringify(fullUser));
    setView({ type: 'workbench' });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('aura_user');
    setView({ type: 'login' });
  };

  if (!isInitialized) return null;

  if (view.type === 'login' && !user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#FFF9FB] flex">
      <BackgroundAnimation />
      
      <Sidebar 
        currentView={view.type} 
        onNavigate={(type) => setView({ type } as ViewState)}
        user={user}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'ml-[88px]' : 'ml-[280px]'}`}>
        <main className="flex-1 p-6 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={view.type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {view.type === 'workbench' && <Workbench />}
              {view.type === 'report' && <ReportView />}
              {view.type === 'data' && <DataList />}
              {view.type === 'rd' && <RDPage />}
              {view.type === 'market' && <MarketPage />}
              {view.type === 'operation' && <OperationPage />}
              {view.type === 'community' && <Community />}
              {view.type === 'users' && <UserManagement />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Footer for Internal App */}
        <footer className="px-10 py-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm bg-white/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center text-primary font-bold text-xs">A</div>
            <span>© 2026 Aura Beauty AI. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">隐私政策</a>
            <a href="#" className="hover:text-primary transition-colors">服务条款</a>
            <a href="#" className="hover:text-primary transition-colors">帮助中心</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
