import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User as UserIcon, Building2, ArrowRight } from 'lucide-react';
import { Department } from '../types';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [dept, setDept] = useState<Department>('RD');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '123456') {
      onLogin({ username, department: dept, role: username === 'admin' ? 'admin' : 'user' });
    } else {
      setError('密码错误 (提示: 123456)');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Aceternity-style Background Beams */}
      <div className="bg-beams" />
      
      {/* Floating Decorative Elements */}
      <motion.div 
        animate={{ 
          y: [0, -30, 0],
          rotate: [0, 15, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] left-[5%] w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none"
      />
      <motion.div 
        animate={{ 
          y: [0, 30, 0],
          rotate: [0, -15, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] bg-primary-deep/10 rounded-full blur-[120px] pointer-events-none"
      />

      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass p-10 rounded-[3.5rem] shadow-2xl border-white/40 overflow-hidden relative">
          {/* Subtle Shimmer Effect on Card */}
          <div className="absolute inset-0 shimmer opacity-10 pointer-events-none" />
          
          <div className="text-center mb-12 relative z-10">
            <motion.div 
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 12 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
              className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/40"
            >
              <span className="text-white text-5xl font-serif font-bold">A</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-4xl font-serif text-slate-900 tracking-tight"
            >
              Aura Beauty AI
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-slate-500 mt-3 font-light tracking-widest uppercase text-[10px]"
            >
              Next-Gen Trend Intelligence System
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs text-center font-bold border border-red-100 flex items-center justify-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">
                  Identity
                </label>
                <div className="relative group">
                  <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                  <input 
                    type="text" 
                    className="input-field pl-16" 
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">
                  Security
                </label>
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                  <input 
                    type="password" 
                    className="input-field pl-16" 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">
                  Department
                </label>
                <div className="relative group">
                  <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                  <select 
                    className="input-field pl-16 appearance-none cursor-pointer"
                    value={dept}
                    onChange={(e) => setDept(e.target.value as Department)}
                  >
                    <option value="RD">研发部 (R&D)</option>
                    <option value="Market">市场部 (Market)</option>
                    <option value="Operation">运营部 (Operation)</option>
                    <option value="Admin">管理层 (Admin)</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                    <ArrowRight size={16} className="rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(255, 107, 157, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className="w-full btn-primary py-5 flex items-center justify-center gap-3 text-lg font-bold shadow-2xl shadow-primary/30 group"
            >
              进入系统 
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight size={22} />
              </motion.div>
            </motion.button>
          </form>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-12 space-y-2"
        >
          <p className="text-slate-400 text-[10px] font-bold tracking-[0.3em] uppercase">
            Aura Beauty AI · Enterprise v2.0
          </p>
          <div className="flex justify-center gap-4 text-[10px] text-slate-300 font-medium">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
