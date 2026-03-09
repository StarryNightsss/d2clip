import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pipette, 
  FlaskConical, 
  Sparkles, 
  History, 
  Save, 
  Share2, 
  Plus, 
  Trash2, 
  Check,
  ChevronRight,
  Beaker
} from 'lucide-react';

const RD: React.FC = () => {
  const [activeColor, setActiveColor] = useState('#ff6b9d');
  const [history, setHistory] = useState([
    { id: '1', color: '#ff6b9d', name: 'Aura Pink', date: '2024-03-20' },
    { id: '2', color: '#ffa6c1', name: 'Soft Petal', date: '2024-03-19' },
    { id: '3', color: '#c44569', name: 'Deep Rose', date: '2024-03-18' },
  ]);

  const handleSave = () => {
    const newColor = {
      id: Date.now().toString(),
      color: activeColor,
      name: `New Shade ${history.length + 1}`,
      date: new Date().toISOString().split('T')[0]
    };
    setHistory([newColor, ...history]);
  };

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
          <h1 className="text-5xl font-serif text-slate-900 tracking-tight">AI 色号实验室</h1>
          <p className="text-slate-500 mt-3 font-light text-lg">基于趋势分析的虚拟色彩研发与配方模拟，重塑美妆研发流程</p>
        </motion.div>
        <div className="flex gap-4">
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(255, 107, 157, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary flex items-center gap-3 py-4 px-10 text-lg"
          >
            <Sparkles size={22} /> AI 智能配色
          </motion.button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Color Mixer */}
        <div className="lg:col-span-2 space-y-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="card p-12 rounded-[3.5rem] shadow-2xl shadow-primary/5 border-primary/10 relative overflow-hidden"
          >
            <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
            <div className="flex flex-col md:flex-row gap-16 relative z-10">
              <div className="md:w-1/2 space-y-10">
                <div className="relative group">
                  <motion.div 
                    layoutId="active-color-preview"
                    className="w-full aspect-square rounded-[3rem] shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]"
                    style={{ backgroundColor: activeColor }}
                  />
                  <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/20 backdrop-blur-md rounded-[2rem] border border-white/30 shadow-xl">
                    <p className="text-white text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">当前色号</p>
                    <p className="text-white text-3xl font-serif font-bold mt-2">{activeColor.toUpperCase()}</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl"
                  >
                    <Save size={20} /> 保存配方
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} className="p-5 bg-slate-50 rounded-[1.5rem] text-slate-400 hover:text-primary transition-all shadow-sm">
                    <Share2 size={24} />
                  </motion.button>
                </div>
              </div>

              <div className="md:w-1/2 space-y-10">
                <div className="space-y-8">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                    <Pipette size={16} className="text-primary" /> 色彩调节
                  </h3>
                  
                  <div className="space-y-8">
                    {[
                      { label: '色相 (Hue)', value: '180°' },
                      { label: '饱和度 (Sat)', value: '85%' },
                      { label: '明度 (Val)', value: '92%' },
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

                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                    <Beaker size={16} className="text-primary" /> 质地模拟
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {['哑光 Matte', '缎面 Satin', '镜面 Glossy', '金属 Metallic'].map((t, i) => (
                      <motion.button 
                        key={t}
                        whileHover={{ scale: 1.05 }}
                        className={`py-4 px-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.1em] border-2 transition-all ${
                          i === 0 ? 'border-primary bg-primary-pale text-primary' : 'border-slate-50 text-slate-400 hover:border-primary/30'
                        }`}
                      >
                        {t}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Suggestions */}
          <div className="space-y-8">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 ml-2">
              <Sparkles size={16} className="text-primary" /> AI 推荐配色方案
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: '落日余晖', colors: ['#ff6b6b', '#feca57', '#ff9f43'] },
                { name: '午夜玫瑰', colors: ['#5f27cd', '#341f97', '#c44569'] },
                { name: '清新薄荷', colors: ['#1dd1a1', '#00d2d3', '#48dbfb'] },
              ].map((scheme, i) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  whileHover={{ y: -5 }}
                  key={scheme.name} 
                  className="card p-8 rounded-[2.5rem] hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-5 pointer-events-none" />
                  <div className="flex h-16 rounded-2xl overflow-hidden mb-6 shadow-inner relative z-10">
                    {scheme.colors.map(c => (
                      <div key={c} className="flex-1 transition-transform group-hover:scale-110" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-base font-bold text-slate-900">{scheme.name}</span>
                    <ChevronRight size={18} className="text-slate-200 group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="card p-10 rounded-[3rem] h-full shadow-xl shadow-black/5 relative overflow-hidden"
          >
            <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
            <div className="flex justify-between items-center mb-10 relative z-10">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <History size={16} className="text-primary" /> 研发历史
              </h3>
              <button className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] hover:underline underline-offset-4">查看全部</button>
            </div>
            
            <div className="space-y-8 relative z-10">
              <AnimatePresence mode="popLayout">
                {history.map((item, i) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    key={item.id} 
                    className="flex items-center gap-5 group cursor-pointer"
                    onClick={() => setActiveColor(item.color)}
                  >
                    <div className="w-14 h-14 rounded-2xl shadow-lg shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: item.color }} />
                    <div className="flex-1">
                      <p className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors">{item.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">{item.date}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <motion.button whileHover={{ scale: 1.2 }} className="p-2 text-slate-300 hover:text-red-500">
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-16 pt-10 border-t border-slate-50 relative z-10">
              <div className="bg-primary-pale rounded-[2rem] p-8 relative overflow-hidden group">
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 pointer-events-none" />
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm transition-transform group-hover:rotate-12">
                    <FlaskConical size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">研发进度</p>
                    <p className="text-base font-serif font-bold text-slate-900 mt-1">Q2 唇彩系列</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '75%' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full gradient-primary"
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-4 text-right">75% 完成</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default RD;
