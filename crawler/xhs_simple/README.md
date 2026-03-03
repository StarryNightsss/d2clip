# 小红书爬虫系统使用指南

## 📍 入口和出口

### 入口
```
前端 AnalysisWorkbench.jsx → 点击"启动爬虫" → POST /api/crawler/start
```

### 出口
```
backend/data/crawler_output/xhs/json/
  ├── search_contents_2026-03-03_140530.json  (笔记)
  └── search_comments_2026-03-03_140530.json  (评论)
```

## 🔄 系统流程

```
前端表单 → 后端API (/api/crawler) → 爬虫模块 (xhs_simple)
→ 保存JSON (backend/data/crawler_output) → 分析服务读取 → 生成报告
```

## 🔧 已修改的文件

1. **新增爬虫模块**：`/crawler/xhs_simple/`
2. **新增后端路由**：`/backend/api/crawler.py`
3. **新增爬虫服务**：`/backend/services/crawler_service.py`
4. **注册路由**：`/backend/main.py`（添加了 crawler_router）
5. **前端API配置**：`/frontend/src/services/api.js`（改1行，统一端口8000）

## 🚀 快速开始

### 1. 安装依赖（项目根目录）

**Windows:**
```powershell
cd d:\uestc\d2clip
uv sync
uv run playwright install chromium
```

**Mac/Linux:**
```bash
cd /path/to/d2clip
uv sync
uv run playwright install chromium
```

### 2. **首次使用 - 登录小红书获取 Cookie**

**重要：**第一次使用前必须手动登录保存 Cookie：

```powershell
# Windows（在项目根目录）
cd d:\uestc\d2clip
uv run python crawler/xhs_simple/login_helper.py
```

操作步骤：
1. 会自动打开浏览器窗口
2. 在浏览器中扫码登录小红书
3. 登录成功后，在终端按 Enter 键
4. Cookie 自动保存到 `crawler_config/xhs_cookies_default.txt`

**注意：**Cookie 可能定期失效，失效后重新运行此命令登录即可

### 3. 测试爬虫
```powershell
cd d:\uestc\d2clip
uv run python crawler/xhs_simple/test_crawler.py
```

### 4. 启动完整系统
```powershell
# 终端1：后端
cd d:\uestc\d2clip
uv run python backend/main.py

# 终端2：前端
cd d:\uestc\d2clip\frontend
npm run dev
```

### 5. 使用流程
1. 访问 http://localhost:5173
2. 进入"分析工作台"
3. 填写关键词（支持多个，逗号分隔）：`口红,妆容,平价`
4. 点击"启动爬虫"
5. 等待完成（查看实时日志）
6. 点击"开始分析"生成报告

## 📂 数据格式

### 笔记（contents）
```json
{
  "note_id": "xxx",
  "title": "标题",
  "desc": "描述",
  "user_id": "xxx",
  "nickname": "昵称",
  "liked_count": "100",
  "comment_count": "50",
  "image_list": ["url1"],
  "tag_list": ["标签"],
  "note_url": "https://...",
  "source_keyword": "口红推荐"
}
```

### 评论（comments）
```json
{
  "comment_id": "xxx",
  "note_id": "xxx",
  "content": "评论内容",
  "user_id": "xxx",
  "nickname": "昵称",
  "like_count": "10",
  "parent_comment_id": 0
}
```

✅ **与 MediaCrawler 格式100%兼容，后端无需修改**

## 🎯 多关键词支持

输入：`口红推荐,妆容推荐,平价口红`（3个关键词，90条数据）

处理：每个关键词30条，自动循环爬取

输出：3个独立文件或合并分析

## 🔑 API 接口

### POST /api/crawler/start
启动爬虫
```json
{
  "platform": "xhs",
  "keywords": "口红推荐,妆容推荐",
  "max_notes_count": 100,
  "enable_comments": true
}
```

### GET /api/crawler/status
获取状态
```json
{
  "status": "idle",  // idle/running/error
  "current_stats": {
    "notes_count": 100,
    "comments_count": 3000,
    "data_file": "xhs/json/search_contents_*.json"
  }
}
```

### GET /api/crawler/logs
获取日志（最近100条）

## 💡 特点

- ✅ 使用 Playwright 绕过反爬检测
- ✅ Cookie 登录认证，保存会话
- ✅ **完整评论功能**（使用 httpx + Playwright 签名）
- ✅ 集成到后端，无需独立部署
- ✅ 数据格式100%兼容 MediaCrawler
- ✅ 支持多关键词批量爬取
- ✅ 实时日志和状态监控
- ✅ 可部署到 Railway（支持 Playwright + httpx）

## 🎯 技术实现

参考 MediaCrawler 的实现方式：

1. **笔记搜索**：Playwright 拦截搜索 API 响应
2. **评论获取**：
   - 使用 Playwright 调用 `window.mnsv2()` 生成签名
   - 使用 httpx 发送 GET 请求（带完整签名头）
   - 不访问详情页，避免触发风控

## ❓ 常见问题

**Q: Cookie 过期怎么办？**
A: 重新获取并更新 `xhs_cookies_default.txt`

**Q: 前端调用失败？**
A: 检查后端是否运行在 8000 端口

**Q: 数据文件在哪？**
A: `backend/data/crawler_output/xhs/json/`

**Q: 如何支持更多关键词？**
A: 前端表单直接输入，用逗号分隔即可

## 🏗️ 系统架构

```
后端 (localhost:8000)
├── /api/analysis  (分析服务)
├── /api/community (社群服务)
└── /api/crawler   (爬虫服务) ← 新增
       ↓
    crawler_service (管理任务、状态、日志)
       ↓
    xhs_simple (HTTP爬虫，Cookie认证)
       ↓
    backend/data/crawler_output/ (保存JSON)
       ↓
    analysis_service (读取并分析)
```

爬虫是后端的一个模块，不是独立服务，统一在8000端口。
