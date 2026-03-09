/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

export type Department = 'RD' | 'Market' | 'Operation' | 'Admin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
  department: Department;
  avatar?: string;
}

export interface TrendData {
  id: string;
  title: string;
  style: string;
  tone: string;
  scene: string;
  content: string;
  imageUrl: string;
  date: string;
  likes: number;
  comments: number;
}

export interface Report {
  id: string;
  title: string;
  creator: string;
  date: string;
  type: 'Trend' | 'Color' | 'Market';
  summary: string;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  timestamp: string;
  department: Department;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type ViewState = 
  | { type: 'login' }
  | { type: 'workbench' }
  | { type: 'report', reportId?: string }
  | { type: 'data' }
  | { type: 'rd' }
  | { type: 'market' }
  | { type: 'operation' }
  | { type: 'community' }
  | { type: 'users' };
