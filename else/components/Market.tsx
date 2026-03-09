import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Sparkles, 
  User, 
  RefreshCw, 
  Download, 
  Share2, 
  Maximize2, 
  Layers, 
  Smile,
  Zap,
  Plus
} from 'lucide-react';

const Market: React.FC = () => {
  const [activeModel, setActiveModel] = useState('https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=800&auto=format&fit=crop');
  const [isProcessing, setIsProcessing] = useState(false);

  const models = [
    'https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512496011212-72490451462a?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1503104834685-7205e8607eb9?q=80&w=800&auto=format&fit=crop'
  ];

  const handleTryOn = () => {
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12 animate-fade-in relative">
      {/* Decorative Background Glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl font-serif text-slate-900 tracking-tight">虚拟试妆实验室</h1>
          <p className="text-slate-500 mt-3 font-light text-lg">利用 AR 与 AI 技术，快速生成产品上妆效果图，辅助营销决策</p>
        </motion.div>
        <div className="flex gap-4">
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(255, 107, 157, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary flex items-center gap-3 py-4 px-10 text-lg"
          >
            <Camera size={22} /> 上传模特图
          </motion.button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Preview */}
        <div className="lg:col-span-8 space-y-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="card p-0 rounded-[3.5rem] overflow-hidden shadow-2xl relative aspect-[4/3] group"
          >
            <motion.img 
              key={activeModel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              src={activeModel} 
              className="w-full h-full object-cover" 
              alt="Model" 
            />
            
            <AnimatePresence>
              {isProcessing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center z-20"
                >
                  <div className="relative">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-32 h-32 border-4 border-white/20 border-t-primary rounded-full"
                    />
                    <Sparkles className="absolute inset-0 m-auto text-primary animate-pulse" size={40} />
                  </div>
                  <p className="text-white font-bold mt-8 uppercase tracking-[0.3em] text-sm">AI 智能上妆中...</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="absolute bottom-10 left-10 right-10 flex justify-between items-center translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700">
              <div className="flex gap-4">
                <motion.button whileHover={{ scale: 1.1 }} className="p-5 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white hover:bg-white/40 transition-all shadow-xl">
                  <Maximize2 size={24} />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} className="p-5 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white hover:bg-white/40 transition-all shadow-xl">
                  <Layers size={24} />
                </motion.button>
              </div>
              <div className="flex gap-4">
                <motion.button whileHover={{ scale: 1.05 }} className="btn-primary py-5 px-12 flex items-center gap-3 text-base shadow-2xl">
                  <Download size={20} /> 下载效果图
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} className="p-5 bg-white rounded-2xl text-primary shadow-2xl">
                  <Share2 size={24} />
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Model Selection */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 ml-2">
              <User size={16} className="text-primary" /> 选择模特
            </h3>
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
              {models.map((m, i) => (
                <motion.button 
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveModel(m)}
                  className={`w-28 h-28 rounded-[2rem] overflow-hidden shrink-0 border-4 transition-all ${
                    activeModel === m ? 'border-primary scale-105 shadow-2xl shadow-primary/30' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={m} className="w-full h-full object-cover" alt="" />
                </motion.button>
              ))}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                className="w-28 h-28 rounded-[2rem] border-4 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-primary/30 hover:text-primary transition-all shrink-0 bg-slate-50/50"
              >
                <Plus size={32} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Controls Sidebar */}
        <div className="lg:col-span-4 space-y-10">
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="card p-10 rounded-[3rem] space-y-10 relative overflow-hidden"
          >
            <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
            
            <div className="space-y-8 relative z-10">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <Zap size={16} className="text-primary" /> 产品选择
              </h3>
              <div className="space-y-5">
                {[
                  { name: 'Aura Pink #01', type: '哑光唇釉', color: 'bg-primary', shadow: 'shadow-primary/20' },
                  { name: 'Golden Glow #04', type: '高光粉饼', color: 'bg-amber-400', shadow: 'shadow-amber-400/20' },
                ].map((product) => (
                  <motion.div 
                    key={product.name}
                    whileHover={{ x: 5 }}
                    className="p-5 bg-slate-50/50 rounded-[1.5rem] border border-slate-100 flex items-center gap-5 group cursor-pointer hover:border-primary/30 transition-all"
                  >
                    <div className={`w-14 h-14 rounded-2xl ${product.color} shadow-lg ${product.shadow} transition-transform group-hover:scale-110`} />
                    <div>
                      <p className="text-base font-bold text-slate-900">{product.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{product.type}</p>
                    </div>
                    <RefreshCw size={18} className="ml-auto text-slate-200 group-hover:text-primary transition-all group-hover:rotate-180" />
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <Smile size={16} className="text-primary" /> 妆感调节
              </h3>
              <div className="space-y-8">
                {[
                  { label: '显色度 (Intensity)', value: '80%' },
                  { label: '晕染范围 (Blending)', value: '45%' },
                ].map((slider) => (
                  <div key={slider.label} className="space-y-4">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                      <span>{slider.label}</span>
                      <span className="text-primary">{slider.value}</span>
                    </div>
                    <input type="range" className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-primary" />
                  </div>
                ))}
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(255, 107, 157, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTryOn}
              disabled={isProcessing}
              className="w-full btn-primary py-6 rounded-[1.5rem] flex items-center justify-center gap-4 text-lg shadow-xl relative z-10"
            >
              <Sparkles size={24} /> 生成试妆效果
            </motion.button>

            <div className="pt-10 border-t border-slate-50 relative z-10">
              <div className="flex items-center gap-4 p-6 bg-emerald-50 rounded-[1.5rem] group relative overflow-hidden">
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 pointer-events-none" />
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm transition-transform group-hover:scale-110">
                  <Zap size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">AI 建议</p>
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed mt-1">当前模特肤色较白，建议搭配 #01 唇釉以提升气色。</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Market;
