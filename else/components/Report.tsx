import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Download, 
  Share2, 
  FileJson, 
  FileSpreadsheet, 
  FileText as FileIcon, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  PieChart as PieChartIcon, 
  BarChart as BarChartIcon, 
  Activity, 
  Bell 
} from 'lucide-react';
import { MOCK_REPORTS } from '../constants';

const COLORS = ['#ff6b9d', '#9b59b6', '#e84393', '#ffa6c1', '#c44569'];

const data = [
  { name: '哑光', value: 45 },
  { name: '水光', value: 30 },
  { name: '丝绒', value: 15 },
  { name: '金属', value: 10 },
];

const trendData = [
  { month: '10月', count: 1200 },
  { month: '11月', count: 1900 },
  { month: '12月', count: 1500 },
  { month: '1月', count: 2800 },
  { month: '2月', count: 3200 },
  { month: '3月', count: 4500 },
];

const ReportView: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState(MOCK_REPORTS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAIAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-serif text-slate-900 tracking-tight">可视化报告</h1>
          <p className="text-slate-500 mt-2 text-lg">基于海量社交数据的深度洞察与 AI 智能分析</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex bg-white/60 backdrop-blur-md rounded-2xl p-1.5 shadow-sm border border-white/60">
            <button className="p-3 hover:bg-primary/10 rounded-xl text-slate-400 hover:text-primary transition-all" title="导出 JSON"><FileJson size={22} /></button>
            <button className="p-3 hover:bg-primary/10 rounded-xl text-slate-400 hover:text-primary transition-all" title="导出 Excel"><FileSpreadsheet size={22} /></button>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary flex-1 md:flex-none flex items-center justify-center gap-3 py-4 px-10 text-base font-bold"
          >
            <Download size={20} /> 导出 PDF
          </motion.button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Sidebar: Report List */}
        <div className="space-y-8">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">报告存档</h3>
          <div className="space-y-4">
            {MOCK_REPORTS.map(report => (
              <motion.div 
                key={report.id}
                whileHover={{ x: 8 }}
                onClick={() => setSelectedReport(report)}
                className={`p-6 rounded-[2rem] cursor-pointer transition-all border-2 relative overflow-hidden group ${
                  selectedReport.id === report.id 
                  ? 'bg-white border-primary shadow-2xl shadow-primary/20 text-primary' 
                  : 'bg-white/40 border-transparent text-slate-600 hover:border-primary/20 shadow-sm'
                }`}
              >
                {selectedReport.id === report.id && (
                  <motion.div 
                    layoutId="report-active-bg"
                    className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent-purple/5 -z-10"
                  />
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${selectedReport.id === report.id ? 'bg-primary/10' : 'bg-slate-100'}`}>
                    <FileIcon size={18} />
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                    selectedReport.id === report.id ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {report.type}
                  </span>
                </div>
                <h4 className="font-bold text-base leading-snug group-hover:text-primary transition-colors">{report.title}</h4>
                <div className="flex items-center gap-2 mt-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                  <span>{report.date}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                  <span>{report.creator}</span>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="card gradient-primary text-white p-8 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6 opacity-70">快捷操作</h4>
            <div className="space-y-3">
              <button className="w-full py-4 px-5 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-left text-sm font-bold flex items-center justify-between group/btn">
                分享报告 <Share2 size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
              <button className="w-full py-4 px-5 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-left text-sm font-bold flex items-center justify-between group/btn">
                订阅更新 <Bell size={16} className="group-hover/btn:rotate-12 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-10">
          {/* AI Summary Card */}
          <div className="card gradient-primary text-white relative overflow-hidden p-12 rounded-[3rem] shadow-2xl shadow-primary/20">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md shadow-xl">
                  <Sparkles size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-serif font-bold">AI 智能洞察摘要</h2>
                  <p className="text-[10px] opacity-70 uppercase tracking-[0.2em] font-bold mt-1">Generated by Aura Intelligence v2.0</p>
                </div>
              </div>
              <p className="text-2xl leading-relaxed font-light">
                {selectedReport.summary} 
                <span className="font-bold ml-2 shimmer-text" style={{ backgroundImage: 'linear-gradient(90deg, #fff, #ffa6c1, #fff)' }}>本季度“清冷感”妆容热度环比增长 145%</span>，建议研发部门重点关注低饱和度色彩的开发。
              </p>
              <div className="flex flex-wrap gap-3 mt-10">
                {['#清冷感', '#低饱和度', '#Z世代', '#社交媒体热点'].map(tag => (
                  <span key={tag} className="px-5 py-2 bg-white/10 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors cursor-default">
                    {tag}
                  </span>
                ))}
              </div>
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAIAnalyze}
                disabled={isAnalyzing}
                className="mt-12 bg-white text-primary px-10 py-4 rounded-2xl text-base font-bold transition-all flex items-center gap-3 shadow-2xl shadow-black/10 hover:shadow-primary/30"
              >
                {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                {isAnalyzing ? '正在深度重构分析...' : '重新生成深度分析'}
              </motion.button>
            </div>
            
            {/* Animated background shapes */}
            <motion.div 
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute -right-20 -bottom-20 w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px]"
            />
            <motion.div 
              animate={{ 
                x: [0, 100, 0],
                y: [0, -50, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 right-20 w-64 h-64 bg-accent-purple/20 rounded-full blur-[80px]"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="card h-[450px] flex flex-col group"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-serif font-bold">质地偏好分布</h3>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Data Source: Social Media</div>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={10}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px'}}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-8">
                {data.map((d, i) => (
                  <div key={d.name} className="text-center group/item">
                    <div className="text-lg font-serif font-bold text-slate-900 group-hover/item:text-primary transition-colors">{d.value}%</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{d.name}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card h-[450px] flex flex-col group"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-serif font-bold">讨论热度趋势</h3>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Monthly Growth Rate</div>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff6b9d" />
                        <stop offset="100%" stopColor="#9b59b6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dx={-10} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px'}}
                    />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[12, 12, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Keywords Cloud */}
          <div className="card relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent-purple to-accent-rose" />
            <h3 className="text-xl font-serif font-bold mb-10">关键词云图分析</h3>
            <div className="flex flex-wrap gap-6 justify-center py-10">
              {[
                { text: '清冷感', size: 'text-5xl', color: 'text-primary' },
                { text: '多巴胺', size: 'text-3xl', color: 'text-accent-purple' },
                { text: '伪素颜', size: 'text-4xl', color: 'text-accent-rose' },
                { text: '哑光', size: 'text-2xl', color: 'text-slate-400' },
                { text: '玻色因', size: 'text-3xl', color: 'text-slate-500' },
                { text: '早C晚A', size: 'text-2xl', color: 'text-slate-400' },
                { text: '纯欲风', size: 'text-4xl', color: 'text-primary' },
                { text: '美拉德', size: 'text-3xl', color: 'text-accent-purple' },
                { text: '落日妆', size: 'text-2xl', color: 'text-slate-500' },
                { text: '极简', size: 'text-xl', color: 'text-slate-400' },
                { text: '高光', size: 'text-3xl', color: 'text-primary-light' },
              ].map((tag, i) => (
                <motion.span 
                  key={tag.text} 
                  whileHover={{ scale: 1.15, rotate: (i % 2 === 0 ? 3 : -3), y: -5 }}
                  className={`px-8 py-4 rounded-[2rem] bg-white/40 border border-white/60 font-serif italic cursor-default transition-all hover:bg-white hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 ${tag.size} ${tag.color} shadow-sm`}
                >
                  {tag.text}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default ReportView;
