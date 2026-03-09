/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { User, TrendData, Report, Post } from './types';

export const MOCK_USERS: User[] = [
  { id: '1', username: 'admin', name: '系统管理员', role: 'admin', department: 'Admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
  { id: '2', username: 'rd_user', name: '研发张工', role: 'user', department: 'RD', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rd' },
  { id: '3', username: 'market_user', name: '市场李姐', role: 'user', department: 'Market', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=market' },
  { id: '4', username: 'op_user', name: '运营王哥', role: 'user', department: 'Operation', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=op' },
];

export const TREND_DATA: TrendData[] = [
  {
    id: 't1',
    title: '2026 春季“多巴胺”妆容趋势',
    style: '活力',
    tone: '高饱和',
    scene: '日常/派对',
    content: '色彩明快，强调眼影与腮红的撞色搭配。',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=1000',
    date: '2026-03-01',
    likes: 128,
    comments: 45
  },
  {
    id: 't2',
    title: '极简主义“伪素颜”回归',
    style: '自然',
    tone: '大地色',
    scene: '职场',
    content: '轻薄底妆，弱化线条感，强调皮肤原生光泽。',
    imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=1000',
    date: '2026-03-05',
    likes: 256,
    comments: 89
  },
  {
    id: 't3',
    title: '复古港风红唇妆',
    style: '复古',
    tone: '正红',
    scene: '晚宴',
    content: '哑光底妆，浓郁红唇，勾勒清晰轮廓。',
    imageUrl: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=1000',
    date: '2026-03-07',
    likes: 512,
    comments: 120
  }
];

export const MOCK_REPORTS: Report[] = [
  { id: 'r1', title: 'Q1 唇彩色彩趋势报告', creator: '研发部', date: '2026-02-28', type: 'Color', summary: '分析了3000+小红书笔记，发现哑光质地热度上升。' },
  { id: 'r2', title: '2026 护肤成分关注度分析', creator: '市场部', date: '2026-03-02', type: 'Market', summary: '玻色因与视黄醇依然是讨论核心。' },
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    author: MOCK_USERS[1],
    content: '刚完成了一组新色号的调配，大家看看这个“落日橘”怎么样？',
    image: 'https://images.unsplash.com/photo-1527203561188-dae1bc1a417f?auto=format&fit=crop&q=80&w=1000',
    likes: 24,
    comments: 5,
    timestamp: '2小时前',
    department: 'RD'
  },
  {
    id: 'p2',
    author: MOCK_USERS[2],
    content: '分享一份最新的竞品分析报告，大家可以参考一下。',
    likes: 15,
    comments: 2,
    timestamp: '5小时前',
    department: 'Market'
  }
];

export const BRAND_NAME = 'Aura Beauty AI';
export const PRIMARY_COLOR = '#ff6b9d';
