import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Square, 
  Loader2, 
  History, 
  FileText, 
  Search, 
  Database, 
  Sparkles, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  Layout, 
  ChevronRight, 
  Settings,
  Share2,
  Bell
} from 'lucide-react';
import { TREND_DATA } from '../constants';

const Workbench: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsRunning(false);
            setLogs(l => [...l, '[完成] 数据爬取与初步清洗结束', '[AI] 正在生成趋势摘要...']);
            return 100;
          }
          const next = prev + Math.random() * 10;
          if (Math.floor(next / 20) > Math.floor(prev / 20)) {
            setLogs(l => [...l, `[进度] 已处理 ${Math.floor(next)}% 的社交媒体笔记...`]);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
    setProgress(0);
    setLogs(['[系统] 启动爬虫引擎...', '[网络] 正在连接社交媒体 API...', '[过滤] 关键词: 美妆, 趋势, 2026']);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-serif text-slate-900 tracking-tight">分析工作台</h1>
          <p className="text-slate-500 mt-2 text-lg">配置爬虫任务并监控实时分析进度</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          {!isRunning ? (
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStart} 
              className="btn-primary flex-1 md:flex-none flex items-center justify-center gap-3 py-4 px-10 text-base font-bold shadow-2xl shadow-primary/20"
            >
              <Play size={20} fill="currentColor" /> 开始分析
            </motion.button>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsRunning(false)} 
              className="bg-slate-900 text-white px-10 py-4 rounded-2xl flex-1 md:flex-none flex items-center justify-center gap-3 text-base font-bold shadow-2xl shadow-black/20"
            >
              <Square size={20} fill="currentColor" /> 停止任务
            </motion.button>
          )}
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: '活跃爬虫', value: '12', icon: Search, color: 'bg-primary/10 text-primary', gradient: 'from-primary/5 to-transparent' },
          { label: '今日抓取', value: '4,281', icon: Database, color: 'bg-accent-purple/10 text-accent-purple', gradient: 'from-accent-purple/5 to-transparent' },
          { label: 'AI 识别率', value: '94.2%', icon: Sparkles, color: 'bg-accent-rose/10 text-accent-rose', gradient: 'from-accent-rose/5 to-transparent' },
          { label: '待处理任务', value: '08', icon: History, color: 'bg-primary-light/20 text-primary-deep', gradient: 'from-primary-light/10 to-transparent' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className={`card flex items-center gap-6 p-8 group relative overflow-hidden border-2 border-transparent hover:border-primary/20 bg-gradient-to-br ${stat.gradient}`}
          >
            <div className={`p-5 rounded-2xl ${stat.color} transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 shadow-lg`}>
              <stat.icon size={32} />
            </div>
            <div>
              <div className="text-4xl font-serif font-bold text-slate-900 tracking-tight group-hover:text-primary transition-colors">{stat.value}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">{stat.label}</div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <stat.icon size={120} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Config & Progress */}
        <div className="lg:col-span-2 space-y-10">
          <div className="card relative overflow-hidden group p-10 rounded-[3rem]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-[80px] group-hover:bg-primary/10 transition-all duration-700" />
            <h3 className="text-2xl font-serif font-bold mb-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                <Search size={22} className="text-primary" />
              </div>
              任务配置
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">数据源</label>
                <div className="p-6 bg-white/40 rounded-[2rem] border-2 border-slate-50 flex items-center gap-5 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 group/item">
                  <div className="flex -space-x-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center text-xs font-bold shadow-lg group-hover/item:scale-110 transition-transform">
                        {i === 1 ? '小' : i === 2 ? '抖' : '微'}
                      </div>
                    ))}
                  </div>
                  <span className="text-base font-bold text-slate-700">多渠道社交媒体聚合</span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">分析周期</label>
                <div className="p-6 bg-white/40 rounded-[2rem] border-2 border-slate-50 flex items-center gap-5 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 group/item">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shadow-inner group-hover/item:scale-110 transition-transform">
                    <History size={22} className="text-slate-400" />
                  </div>
                  <span className="text-base font-bold text-slate-700">最近 7 天滚动分析</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card relative overflow-hidden group p-10 rounded-[3rem]">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-purple/5 rounded-full -ml-32 -mb-32 blur-[80px] group-hover:bg-accent-purple/10 transition-all duration-700" />
            <h3 className="text-2xl font-serif font-bold mb-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                <Loader2 size={22} className={`text-primary ${isRunning ? 'animate-spin' : ''}`} />
              </div>
              实时进度
            </h3>
            <div className="space-y-10">
              <div className="relative pt-1">
                <div className="flex mb-6 items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold inline-block py-2 px-5 uppercase rounded-full text-primary bg-primary/10 tracking-[0.2em] shadow-sm">
                      {isRunning ? '正在处理数据' : progress === 100 ? '分析已完成' : '等待任务启动'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-serif font-bold text-primary shimmer-text" style={{ backgroundImage: 'linear-gradient(90deg, #ff6b9d, #9b59b6, #ff6b9d)' }}>
                      {Math.floor(progress)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-6 mb-6 text-xs flex rounded-full bg-slate-100 shadow-inner p-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="shadow-xl flex flex-col text-center whitespace-nowrap text-white justify-center gradient-primary transition-all duration-500 relative rounded-full"
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                  </motion.div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="p-8 bg-white/40 rounded-[2.5rem] text-center border-2 border-slate-50 hover:border-primary/20 transition-all hover:shadow-2xl hover:shadow-primary/5 group/stat">
                  <div className="text-4xl font-serif font-bold text-slate-900 group-hover/stat:text-primary transition-colors">{Math.floor(progress * 50)}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">已抓取笔记</div>
                </div>
                <div className="p-8 bg-white/40 rounded-[2.5rem] text-center border-2 border-slate-50 hover:border-primary/20 transition-all hover:shadow-2xl hover:shadow-primary/5 group/stat">
                  <div className="text-4xl font-serif font-bold text-slate-900 group-hover/stat:text-primary transition-colors">{isRunning ? Math.max(0, Math.floor((100 - progress) / 5)) : 0}m</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">预计剩余</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-slate-900 text-slate-300 font-mono text-sm h-80 overflow-y-auto p-10 rounded-[3rem] border-none shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent-purple to-accent-rose opacity-50" />
            <div className="flex items-center gap-3 mb-6 opacity-50">
              <Terminal size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">System Logs</span>
            </div>
            <div className="space-y-3">
              {logs.map((log, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className="flex gap-4 group/log"
                >
                  <span className="text-primary-light opacity-30 shrink-0 font-bold">[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                  <span className={`transition-colors ${log.startsWith('[完成]') ? 'text-emerald-400 font-bold' : log.startsWith('[系统]') ? 'text-blue-400' : 'group-hover/log:text-white'}`}>{log}</span>
                </motion.div>
              ))}
              {isRunning && (
                <div className="flex items-center gap-2">
                  <div className="animate-pulse w-2 h-4 bg-primary" />
                  <span className="text-primary/50 text-xs italic">正在监听实时流...</span>
                </div>
              )}
              {!isRunning && logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 italic py-10">
                  <Play size={48} className="mb-6 opacity-10" />
                  <p className="text-base">点击“开始分析”启动 Aura 引擎</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History & Insights */}
        <div className="space-y-10">
          <div className="card p-10 rounded-[3rem]">
            <h3 className="text-2xl font-serif font-bold mb-10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <History size={20} className="text-primary" />
              </div>
              分析历史
            </h3>
            <div className="space-y-6">
              {TREND_DATA.map((trend, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={trend.id} 
                  className="flex gap-5 p-4 rounded-[2rem] hover:bg-primary/5 transition-all cursor-pointer group border-2 border-transparent hover:border-primary/10"
                >
                  <div className="relative shrink-0">
                    <img src={trend.imageUrl} className="w-16 h-16 rounded-2xl object-cover shadow-xl group-hover:scale-110 transition-transform duration-500" alt="" />
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-50">
                      <FileText size={12} className="text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold truncate group-hover:text-primary transition-colors leading-tight">{trend.title}</h4>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{trend.date}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{trend.style}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <button className="w-full mt-10 py-5 text-[10px] font-bold text-slate-400 hover:text-primary transition-all uppercase tracking-[0.3em] border-t border-slate-50 hover:bg-slate-50 rounded-b-[3rem]">
              查看全部历史记录
            </button>
          </div>

          <div className="card gradient-primary text-white relative overflow-hidden group p-10 rounded-[3rem] shadow-2xl shadow-primary/30">
            <motion.div 
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"
            />
            <div className="relative z-10">
              <h3 className="text-2xl font-serif font-bold mb-8 flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Sparkles size={24} />
                </div>
                AI 洞察概览
              </h3>
              <div className="space-y-6">
                <div className="p-6 bg-white/10 rounded-[2rem] backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors">
                  <div className="text-4xl font-serif font-bold">12.4k</div>
                  <div className="text-[10px] font-bold opacity-70 uppercase tracking-[0.2em] mt-2">本月处理笔记</div>
                </div>
                <div className="p-6 bg-white/10 rounded-[2rem] backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors">
                  <div className="text-4xl font-serif font-bold">85%</div>
                  <div className="text-[10px] font-bold opacity-70 uppercase tracking-[0.2em] mt-2">AI 识别准确率</div>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-full mt-10 py-5 bg-white text-primary rounded-2xl text-base font-bold hover:shadow-2xl hover:shadow-white/20 transition-all shadow-xl"
              >
                导出月度分析汇总
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workbench;
