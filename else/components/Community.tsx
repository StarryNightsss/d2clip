import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  Image as ImageIcon, 
  Send, 
  Users, 
  Hash, 
  TrendingUp, 
  MoreHorizontal, 
  Smile, 
  FileText, 
  Download 
} from 'lucide-react';
import { MOCK_POSTS, MOCK_USERS } from '../constants';

const Community: React.FC = () => {
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [newPost, setNewPost] = useState('');

  const handlePost = () => {
    if (!newPost.trim()) return;
    const post = {
      id: Date.now().toString(),
      author: MOCK_USERS[0],
      content: newPost,
      likes: 0,
      comments: 0,
      timestamp: '刚刚',
      department: 'Admin' as any,
      image: undefined
    };
    setPosts([post, ...posts]);
    setNewPost('');
  };

  const handleLike = (id: string) => {
    setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-10 animate-fade-in relative">
      {/* Decorative Background Glow */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      
      {/* Left Sidebar: Groups */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:block space-y-8"
      >
        <div className="card p-10 rounded-[3rem] shadow-xl shadow-black/5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-8 ml-2">我的小组</h3>
          <div className="space-y-4">
            {['研发讨论组', '市场周报群', '运营灵感库', '全员公告栏'].map((group, i) => (
              <motion.button 
                key={group} 
                whileHover={{ x: 8 }}
                className={`w-full text-left px-6 py-4 rounded-2xl text-sm font-bold transition-all flex items-center gap-4 group relative overflow-hidden ${
                  i === 0 ? 'text-white shadow-xl shadow-primary/20' : 'hover:bg-slate-50 text-slate-600 hover:text-primary'
                }`}
              >
                {i === 0 && (
                  <motion.div 
                    layoutId="group-active"
                    className="absolute inset-0 gradient-primary -z-10"
                  />
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${i === 0 ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-primary-pale'}`}>
                  {i === 0 ? <Users size={18} /> : <Hash size={18} />}
                </div>
                {group}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="card p-10 rounded-[3rem] shadow-xl shadow-black/5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-8 ml-2">热门话题</h3>
          <div className="space-y-6">
            {['#2026春季趋势', '#落日妆色号', '#小红书流量密码', '#AI分析心得'].map(tag => (
              <motion.div 
                key={tag} 
                whileHover={{ x: 5 }}
                className="flex items-center justify-between group cursor-pointer"
              >
                <span className="text-sm font-medium text-slate-600 group-hover:text-primary transition-colors">{tag}</span>
                <TrendingUp size={16} className="text-slate-200 group-hover:text-primary transition-colors" />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Feed */}
      <div className="lg:col-span-2 space-y-10">
        {/* Create Post */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="card p-10 rounded-[3.5rem] shadow-2xl shadow-primary/5 border-primary/10 relative overflow-hidden"
        >
          <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
          <div className="flex gap-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-primary-pale flex items-center justify-center text-primary shrink-0 overflow-hidden shadow-md">
              <img src={MOCK_USERS[0].avatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-8">
              <textarea 
                placeholder="分享你的发现、报告或灵感..." 
                className="w-full bg-slate-50 border-none rounded-[2rem] p-6 text-lg focus:ring-2 focus:ring-primary/20 resize-none h-40 placeholder:text-slate-400 font-light transition-all"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <motion.button whileHover={{ scale: 1.1 }} className="p-4 text-slate-400 hover:text-primary hover:bg-primary-pale rounded-2xl transition-all"><ImageIcon size={22} /></motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} className="p-4 text-slate-400 hover:text-primary hover:bg-primary-pale rounded-2xl transition-all"><FileText size={22} /></motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} className="p-4 text-slate-400 hover:text-primary hover:bg-primary-pale rounded-2xl transition-all"><Smile size={22} /></motion.button>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(255, 107, 157, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePost} 
                  className="btn-primary flex items-center gap-3 px-12 py-4 text-lg"
                >
                  发布动态 <Send size={20} />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Posts List */}
        <AnimatePresence mode="popLayout">
          {posts.map((post, i) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
              key={post.id} 
              className="card p-10 rounded-[3.5rem] hover:shadow-2xl transition-all duration-700 group relative overflow-hidden"
            >
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-5 pointer-events-none" />
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex gap-5">
                  <div className="relative">
                    <img src={post.author.avatar} className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-white shadow-lg transition-transform group-hover:scale-110" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-slate-900 text-xl leading-none">{post.author.name}</h4>
                      <span className="text-[10px] px-3 py-1 bg-primary-pale text-primary rounded-full font-bold uppercase tracking-[0.2em]">{post.department}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">{post.timestamp}</p>
                  </div>
                </div>
                <motion.button whileHover={{ rotate: 90 }} className="p-3 text-slate-200 hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={24} />
                </motion.button>
              </div>
              
              <p className="text-slate-600 leading-relaxed text-xl font-light mb-10 relative z-10">{post.content}</p>
              
              {post.image && (
                <div className="mb-10 rounded-[3rem] overflow-hidden border border-slate-100 shadow-xl relative group/img z-10">
                  <img src={post.image} className="w-full h-auto transition-transform duration-1000 group-hover/img:scale-105" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center translate-y-6 opacity-0 group-hover/img:translate-y-0 group-hover/img:opacity-100 transition-all duration-500">
                    <span className="text-white text-[10px] font-bold uppercase tracking-[0.3em] bg-white/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                      Trend Analysis Report
                    </span>
                    <motion.button whileHover={{ scale: 1.1 }} className="p-4 bg-white text-primary rounded-full shadow-2xl">
                      <Download size={24} />
                    </motion.button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-10 pt-8 border-t border-slate-50 relative z-10">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-3 text-slate-400 hover:text-primary transition-all group/btn"
                >
                  <div className="p-3 rounded-2xl group-hover/btn:bg-primary-pale transition-all shadow-sm">
                    <Heart size={24} className={post.likes > 0 ? 'fill-primary text-primary' : ''} />
                  </div>
                  <span className="text-base font-bold">{post.likes}</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} className="flex items-center gap-3 text-slate-400 hover:text-blue-500 transition-all group/btn">
                  <div className="p-3 rounded-2xl group-hover/btn:bg-blue-50 transition-all shadow-sm">
                    <MessageSquare size={24} />
                  </div>
                  <span className="text-base font-bold">{post.comments}</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} className="flex items-center gap-3 text-slate-400 hover:text-emerald-500 transition-all group/btn ml-auto">
                  <div className="p-3 rounded-2xl group-hover/btn:bg-emerald-50 transition-all shadow-sm">
                    <Share2 size={24} />
                  </div>
                  <span className="text-base font-bold uppercase tracking-widest">转发</span>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Right Sidebar: Notifications/Activity */}
      <motion.div 
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:block space-y-8"
      >
        <div className="card p-10 rounded-[3rem] shadow-xl shadow-black/5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-8 ml-2">最新动态</h3>
          <div className="space-y-8">
            {[
              { user: '研发张工', action: '分享了报告', target: 'Q1 唇彩趋势' },
              { user: '市场李姐', action: '点赞了你的帖子', target: '' },
              { user: '运营王哥', action: '评论了', target: '落日橘色号' },
            ].map((act, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex gap-5 text-sm items-start group cursor-default"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-primary mt-2.5 shrink-0 shadow-[0_0_12px_rgba(255,107,157,0.8)] group-hover:scale-125 transition-transform" />
                <p className="text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-900">{act.user}</span> {act.action} 
                  {act.target && <span className="text-primary font-bold ml-2 underline decoration-primary/20 underline-offset-4">“{act.target}”</span>}
                </p>
              </motion.div>
            ))}
          </div>
          <motion.button 
            whileHover={{ y: -2 }}
            className="w-full mt-10 py-4 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-[0.3em] border-t border-slate-50"
          >
            查看全部通知
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Community;
