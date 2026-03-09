import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  Eye, 
  Heart, 
  MessageCircle, 
  X, 
  Calendar, 
  Sparkles,
  User,
  Share2,
  FileText
} from 'lucide-react';
import { TREND_DATA } from '../constants';
import { TrendData } from '../types';

const DataList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('全部');
  const [selectedTrend, setSelectedTrend] = useState<TrendData | null>(null);

  const styles = ['全部', '活力', '自然', '复古', '极简', '优雅'];

  const filteredData = TREND_DATA.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStyle = selectedStyle === '全部' || item.style === selectedStyle;
    return matchesSearch && matchesStyle;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 animate-fade-in relative">
      {/* Decorative Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl font-serif text-slate-900 tracking-tight">趋势趋势库</h1>
          <p className="text-slate-500 mt-3 font-light text-lg">结构化存储的全球美妆趋势数据资产，构建品牌专属灵感池</p>
        </motion.div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative group flex-1 sm:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="搜索关键词、风格或色号..." 
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
            <Download size={22} /> 导出 CSV
          </motion.button>
        </div>
      </header>

      {/* Style Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide"
      >
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-primary shrink-0 mr-2">
          <Filter size={20} />
        </div>
        {styles.map((style, i) => (
          <motion.button
            key={style}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedStyle(style)}
            className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border-2 relative overflow-hidden group ${
              selectedStyle === style 
              ? 'text-white border-primary shadow-xl shadow-primary/20' 
              : 'bg-white border-transparent text-slate-500 hover:border-primary/30 hover:text-primary shadow-sm'
            }`}
          >
            {selectedStyle === style && (
              <motion.div 
                layoutId="filter-active"
                className="absolute inset-0 gradient-primary -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{style}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
        <AnimatePresence mode="popLayout">
          {filteredData.map((item, i) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              key={item.id} 
              whileHover={{ y: -12 }}
              className="card group cursor-pointer p-0 overflow-hidden flex flex-col h-full rounded-[3rem] border-transparent hover:border-primary/20 transition-all shadow-xl hover:shadow-2xl"
              onClick={() => setSelectedTrend(item)}
            >
              <div className="relative h-72 overflow-hidden">
                <img 
                  src={item.imageUrl} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                  alt={item.title} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
                
                <div className="absolute top-6 right-6 flex flex-col gap-3">
                  <motion.span 
                    whileHover={{ scale: 1.1 }}
                    className="bg-white/90 backdrop-blur-md text-primary px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl"
                  >
                    {item.style}
                  </motion.span>
                </div>

                <div className="absolute bottom-6 left-6 right-6 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                  <button className="w-full py-4 bg-white text-slate-900 rounded-2xl text-xs font-bold shadow-2xl hover:bg-primary hover:text-white transition-colors">
                    探索趋势详情
                  </button>
                </div>
              </div>
              
              <div className="p-8 flex-1 flex flex-col bg-white relative">
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-5 pointer-events-none" />
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <h3 className="text-xl font-serif font-bold text-slate-900 leading-tight group-hover:text-primary transition-colors">{item.title}</h3>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-8 flex-1 leading-relaxed font-light relative z-10">
                  {item.content}
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-slate-100 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-pale flex items-center justify-center text-primary font-bold text-xs shadow-sm">
                      A
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aura Intelligence</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Calendar size={12} className="text-primary" />
                    {item.date}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredData.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-40 text-center space-y-8"
        >
          <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Search size={56} className="text-slate-200" />
          </div>
          <div>
            <h3 className="text-3xl font-serif text-slate-900">未找到匹配的趋势灵感</h3>
            <p className="text-slate-500 mt-3 text-lg font-light">尝试更换关键词或筛选条件，或者启动全球监听获取新数据</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {setSearchTerm(''); setSelectedStyle('全部');}}
            className="text-primary font-bold text-sm uppercase tracking-[0.2em] hover:underline"
          >
            重置所有筛选条件
          </motion.button>
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedTrend && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTrend(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
              className="bg-white w-full max-w-5xl rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative z-10 flex flex-col md:flex-row max-h-[90vh]"
            >
              <div className="md:w-1/2 h-80 md:h-auto relative">
                <img src={selectedTrend.imageUrl} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-10 left-10">
                  <motion.span 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-primary text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] shadow-2xl"
                  >
                    {selectedTrend.style}
                  </motion.span>
                </div>
              </div>
              <div className="md:w-1/2 p-12 md:p-16 overflow-y-auto flex flex-col">
                <div className="flex justify-between items-start mb-10">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="text-4xl font-serif font-bold text-slate-900 leading-tight">{selectedTrend.title}</h2>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mt-4">Trend Analysis Report • Aura AI</p>
                  </motion.div>
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedTrend(null)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all shadow-sm"
                  >
                    <X size={24} className="text-slate-400" />
                  </motion.button>
                </div>
                
                <div className="space-y-10 flex-1">
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-4"
                  >
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                      <FileText size={14} className="text-primary" /> 趋势深度解读
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-xl font-light">
                      {selectedTrend.content}
                    </p>
                  </motion.div>

                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="grid grid-cols-2 gap-8"
                  >
                    <div className="space-y-3 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">发布日期</h4>
                      <div className="flex items-center gap-3 text-slate-900 font-bold">
                        <Calendar size={18} className="text-primary" />
                        {selectedTrend.date}
                      </div>
                    </div>
                    <div className="space-y-3 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">分析引擎</h4>
                      <div className="flex items-center gap-3 text-slate-900 font-bold">
                        <Sparkles size={18} className="text-primary" />
                        Aura Gen-3
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="pt-12 mt-12 border-t border-slate-100 flex gap-6"
                >
                  <motion.button 
                    whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(255, 107, 157, 0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 btn-primary py-5 text-lg"
                  >
                    加入研发看板
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 107, 157, 0.1)", color: "#ff6b9d" }}
                    whileTap={{ scale: 0.9 }}
                    className="p-5 bg-slate-50 rounded-[2rem] text-slate-400 transition-all shadow-sm"
                  >
                    <Share2 size={24} />
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataList;
