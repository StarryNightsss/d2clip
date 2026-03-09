import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BarChart3, 
  Database, 
  Palette, 
  Camera, 
  PenTool, 
  Users, 
  Settings, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  Sparkles,
  User as UserIcon
} from 'lucide-react';
import { ViewState, User } from '../types';

interface SidebarProps {
  currentView: ViewState['type'];
  onNavigate: (view: ViewState['type']) => void;
  user: User | null;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onNavigate, 
  user, 
  onLogout,
  isCollapsed,
  onToggleCollapse
}) => {

  const navItems = [
    { id: 'workbench', label: '工作台', icon: LayoutDashboard },
    { id: 'report', label: '可视化', icon: BarChart3 },
    { id: 'data', label: '趋势库', icon: Database },
    { id: 'community', label: '企业社群', icon: Users },
  ];

  const deptLinks: Record<string, any> = {
    RD: { id: 'rd', label: '色号设计', icon: Palette },
    Market: { id: 'market', label: '虚拟试妆', icon: Camera },
    Operation: { id: 'operation', label: '内容生成', icon: PenTool },
    Admin: { id: 'users', label: '职员管理', icon: Settings },
  };

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 88 }
  };

  const itemVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -10 }
  };

  return (
    <motion.aside
      initial="expanded"
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      className="fixed left-0 top-0 bottom-0 z-50 glass border-r border-white/40 flex flex-col transition-all duration-500 ease-in-out"
    >
      {/* Logo Section */}
      <div className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-4 overflow-hidden">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="w-12 h-12 min-w-[48px] gradient-primary rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-primary/30 cursor-pointer"
            onClick={() => onNavigate('workbench')}
          >
            <Sparkles className="text-white" size={24} />
          </motion.div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-serif font-bold tracking-tight shimmer-text whitespace-nowrap"
            >
              Aura
            </motion.span>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-4 space-y-3 py-6">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as any)}
            className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all relative group ${
              currentView === item.id 
              ? 'text-primary' 
              : 'text-slate-400 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <div className={`min-w-[24px] flex items-center justify-center transition-transform group-hover:scale-110 ${currentView === item.id ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>
              <item.icon size={22} />
            </div>
            {!isCollapsed && (
              <motion.span 
                variants={itemVariants}
                className="text-[15px] font-bold whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            )}
            {currentView === item.id && (
              <motion.div 
                layoutId="sidebar-active"
                className="absolute inset-0 bg-primary/10 rounded-[1.5rem] -z-10 shadow-inner"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-6 px-4 py-2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </button>
        ))}

        <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent mx-4 my-6" />

        {user && deptLinks[user.department] && (
          <button
            onClick={() => onNavigate(deptLinks[user.department].id)}
            className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all relative group ${
              currentView === deptLinks[user.department].id 
              ? 'text-primary' 
              : 'text-slate-400 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <div className={`min-w-[24px] flex items-center justify-center transition-transform group-hover:scale-110 ${currentView === deptLinks[user.department].id ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>
              {React.createElement(deptLinks[user.department].icon, { size: 22 })}
            </div>
            {!isCollapsed && (
              <motion.span 
                variants={itemVariants}
                className="text-[15px] font-bold whitespace-nowrap"
              >
                {deptLinks[user.department].label}
              </motion.span>
            )}
            {currentView === deptLinks[user.department].id && (
              <motion.div 
                layoutId="sidebar-active"
                className="absolute inset-0 bg-primary/10 rounded-[1.5rem] -z-10 shadow-inner"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-6 px-4 py-2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50">
                {deptLinks[user.department].label}
              </div>
            )}
          </button>
        )}
      </div>

      {/* User Section */}
      <div className="p-6 border-t border-slate-100/50">
        <div className={`flex items-center gap-4 p-3 rounded-[1.5rem] bg-white/40 border border-white/60 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-12 h-12 min-w-[48px] rounded-[1.25rem] bg-white border-2 border-white shadow-xl shadow-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden relative group">
            <img src={user?.avatar} alt="avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-hidden"
            >
              <div className="text-[15px] font-bold text-slate-900 truncate">{user?.name}</div>
              <div className="text-[11px] font-bold text-primary uppercase tracking-[0.15em] truncate mt-0.5">{user?.department}</div>
            </motion.div>
          )}
        </div>

        <button
          onClick={onLogout}
          className={`w-full mt-4 flex items-center gap-4 p-4 rounded-[1.5rem] text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all group relative ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="min-w-[24px] flex items-center justify-center transition-transform group-hover:scale-110">
            <LogOut size={22} />
          </div>
          {!isCollapsed && (
            <motion.span 
              variants={itemVariants}
              className="text-[15px] font-bold"
            >
              退出登录
            </motion.span>
          )}
          {isCollapsed && (
            <div className="absolute left-full ml-6 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50">
              退出登录
            </div>
          )}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-16 bg-white border border-slate-100 shadow-2xl shadow-primary/20 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-all z-50 group active:scale-90"
      >
        <div className="transition-transform group-hover:scale-125">
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </div>
      </button>

      {/* Pure Animation Element: Floating Particles inside sidebar */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-20">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${i % 3 === 0 ? 'bg-primary/20' : i % 3 === 1 ? 'bg-accent-purple/20' : 'bg-accent-rose/20'}`}
            animate={{
              y: [0, -300, 0],
              x: [0, Math.random() * 60 - 30, 0],
              opacity: [0, 0.8, 0],
              scale: [1, 3, 1],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 8 + Math.random() * 12,
              repeat: Infinity,
              delay: Math.random() * 15,
              ease: "easeInOut"
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>
    </motion.aside>
  );
};

export default Sidebar;
