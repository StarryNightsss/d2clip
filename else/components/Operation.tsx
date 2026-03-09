import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenTool, 
  Sparkles, 
  Layout, 
  Type, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  RefreshCw, 
  Send, 
  Hash,
  MessageSquare,
  Instagram,
  Twitter,
  Facebook,
  Share2
} from 'lucide-react';

const Operation: React.FC = () => {
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedText('✨ 发现你的独特光芒！Aura Beauty 全新 Q2 唇彩系列现已上线。从落日余晖到午夜玫瑰，每一抹色彩都是对自我的深情告白。持久显色，丝绒质地，让你在任何场合都能自信闪耀。💖 #AuraBeauty #美妆趋势 #春夏必备');
      setIsGenerating(false);
    }, 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <h1 className="text-5xl font-serif text-slate-900 tracking-tight">智能内容生成</h1>
          <p className="text-slate-500 mt-3 font-light text-lg">一键生成符合品牌调性的社交媒体文案与海报素材，驱动高效运营</p>
        </motion.div>
        <div className="flex gap-4">
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(255, 107, 157, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary flex items-center gap-3 py-4 px-10 text-lg"
          >
            <Layout size={22} /> 创意画布
          </motion.button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Input Section */}
        <div className="lg:col-span-5 space-y-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="card p-12 rounded-[3.5rem] shadow-2xl shadow-primary/5 border-primary/10 space-y-10 relative overflow-hidden"
          >
            <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
            
            <div className="space-y-6 relative z-10">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 ml-2">
                <PenTool size={16} className="text-primary" /> 创作主题
              </h3>
              <textarea 
                className="w-full bg-slate-50/50 border-none focus:ring-4 focus:ring-primary/10 rounded-[2rem] p-8 text-slate-700 min-h-[200px] resize-none placeholder:text-slate-300 font-light text-lg transition-all"
                placeholder="输入产品名称、核心卖点或营销活动主题..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="space-y-8 relative z-10">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 ml-2">
                <Hash size={16} className="text-primary" /> 平台选择
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: '小红书', icon: MessageSquare, color: 'text-red-500', bg: 'bg-red-50' },
                  { name: 'Instagram', icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-50' },
                  { name: '微博', icon: Twitter, color: 'text-blue-500', bg: 'bg-blue-50' },
                ].map((p, i) => (
                  <motion.button 
                    key={p.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-5 rounded-2xl flex flex-col items-center gap-3 border-2 transition-all ${
                      i === 0 ? 'border-primary bg-primary-pale text-primary shadow-lg shadow-primary/10' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-primary/30'
                    }`}
                  >
                    <p.icon size={24} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]">{p.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 ml-2">
                <Type size={16} className="text-primary" /> 语气风格
              </h3>
              <div className="flex flex-wrap gap-3">
                {['专业 Professional', '亲切 Friendly', '奢华 Luxury', '潮流 Trendy', '极简 Minimalist'].map((s, i) => (
                  <motion.button 
                    key={s}
                    whileHover={{ scale: 1.05 }}
                    className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] border-2 transition-all ${
                      i === 2 ? 'border-primary bg-primary-pale text-primary shadow-md shadow-primary/5' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-primary/30'
                    }`}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(255, 107, 157, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={isGenerating || !content}
              className="w-full btn-primary py-6 rounded-[1.5rem] flex items-center justify-center gap-4 text-xl shadow-xl relative z-10"
            >
              {isGenerating ? (
                <RefreshCw size={24} className="animate-spin" />
              ) : (
                <Sparkles size={24} />
              )}
              生成文案
            </motion.button>
          </motion.div>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-7 space-y-10">
          <AnimatePresence mode="wait">
            {generatedText ? (
              <motion.div 
                key="output"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="card p-12 rounded-[3.5rem] shadow-2xl border-primary/10 h-full flex flex-col relative overflow-hidden"
              >
                <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
                
                <div className="flex justify-between items-center mb-10 relative z-10">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                    <Sparkles size={16} className="text-primary" /> AI 生成结果
                  </h3>
                  <div className="flex gap-3">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopy}
                      className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-primary transition-all flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm"
                    >
                      {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                      {copied ? '已复制' : '复制'}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-primary transition-all shadow-sm">
                      <Share2 size={20} />
                    </motion.button>
                  </div>
                </div>

                <div className="flex-1 bg-slate-50/30 rounded-[2.5rem] p-10 border border-slate-100 relative z-10 group">
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-5 pointer-events-none" />
                  <p className="text-slate-700 leading-relaxed text-2xl font-light font-serif">
                    {generatedText}
                  </p>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-8 relative z-10">
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="p-8 bg-primary-pale rounded-[2.5rem] border border-primary/10 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 pointer-events-none" />
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm transition-transform group-hover:rotate-12">
                        <ImageIcon size={24} />
                      </div>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">配图建议</p>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      建议使用模特在落日背景下的特写镜头，突出唇釉的丝绒质感与光泽。
                    </p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 pointer-events-none" />
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-500 shadow-sm transition-transform group-hover:rotate-12">
                        <Send size={24} />
                      </div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">发布建议</p>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      建议在周四晚 20:00 发布，该时段美妆类内容互动率最高。
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-12 rounded-[3.5rem] border-dashed border-2 border-slate-200 bg-slate-50/50 h-full flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden"
              >
                <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-slate-200 shadow-xl relative z-10"
                >
                  <Sparkles size={64} />
                </motion.div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-serif text-slate-900">准备好开始创作了吗？</h3>
                  <p className="text-slate-400 mt-4 max-w-sm mx-auto text-lg font-light">在左侧输入你的创意想法，Aura AI 将为你生成专业的营销内容。</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Operation;
