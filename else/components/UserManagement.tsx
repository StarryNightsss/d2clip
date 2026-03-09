import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  Shield, 
  User as UserIcon, 
  Mail, 
  Building, 
  ShieldCheck, 
  Settings, 
  MoreHorizontal,
  Users
} from 'lucide-react';
import { MOCK_USERS } from '../constants';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12 animate-fade-in relative">
      {/* Decorative Background Glow */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl font-serif text-slate-900 tracking-tight">职员管理</h1>
          <p className="text-slate-500 mt-3 font-light text-lg">管理企业内部各部门权限与人员配置，构建高效协同团队</p>
        </motion.div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative group flex-1 sm:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="搜索姓名、用户名或部门..." 
              className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl border-2 border-transparent focus:border-primary/30 focus:outline-none shadow-xl shadow-black/5 transition-all text-lg font-light"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(255, 107, 157, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary flex items-center justify-center gap-3 py-4 px-10 text-lg"
          >
            <UserPlus size={22} /> 添加职员
          </motion.button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: '总人数', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: '活跃用户', value: '12', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: '待审核', value: '3', icon: Mail, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: '部门数量', value: '4', icon: Settings, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5 }}
            key={stat.label} 
            className="card p-8 flex items-center gap-6 rounded-[2.5rem] relative overflow-hidden group"
          >
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-5 pointer-events-none" />
            <div className={`w-16 h-16 rounded-[1.5rem] ${stat.bg} ${stat.color} flex items-center justify-center shadow-sm transition-transform group-hover:scale-110`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
              <p className="text-3xl font-serif font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-0 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-primary/5 border-primary/10 relative"
      >
        <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-10 py-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">职员信息</th>
                <th className="px-10 py-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">所属部门</th>
                <th className="px-10 py-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">权限角色</th>
                <th className="px-10 py-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">状态</th>
                <th className="px-10 py-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredUsers.map((user, i) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={user.id} 
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          <img src={user.avatar} className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-white shadow-md transition-transform group-hover:scale-110" alt="" />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-lg">{user.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3 text-primary font-bold">
                        <div className="p-2 bg-primary-pale rounded-lg">
                          <Building size={16} className="text-primary" />
                        </div>
                        <span className="text-xs uppercase tracking-[0.1em]">{user.department}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        user.role === 'admin' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {user.role === 'admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                        {user.role === 'admin' ? '管理员' : '普通职员'}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">在线</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <motion.button whileHover={{ scale: 1.1 }} className="p-3 bg-white shadow-lg rounded-xl text-slate-400 hover:text-primary transition-all">
                          <Edit2 size={20} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} className="p-3 bg-white shadow-lg rounded-xl text-slate-400 hover:text-red-500 transition-all">
                          <Trash2 size={20} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} className="p-3 bg-white shadow-lg rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                          <MoreHorizontal size={20} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-10 py-8 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center relative z-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">显示 1 - {filteredUsers.length} 之 {users.length} 位职员</p>
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.05 }} className="px-6 py-3 rounded-xl bg-white border border-slate-100 text-xs font-bold text-slate-400 hover:text-primary transition-all shadow-sm">上一页</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-xl shadow-primary/20">1</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} className="px-6 py-3 rounded-xl bg-white border border-slate-100 text-xs font-bold text-slate-400 hover:text-primary transition-all shadow-sm">下一页</motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserManagement;
