# 小红书爬虫迁移说明（备份 → 当前版本）

## 迁移概述

已将备份中的**简化版小红书爬虫**（xhs_simple）迁移到当前 d2clip 项目，实现**前后端统一部署**，无需 MediaCrawler 子模块。

## 文件变更对照表

| 备份路径 | 当前 d2clip 路径 | 说明 |
|---------|------------------|------|
| `backup/crawler/xhs_simple/*` | `crawler/xhs_simple/*` | 爬虫模块（已修改 output_dir） |
| `backup/backend/api/crawler.py` | `backend/api/crawler.py` | 新增 |
| `backup/backend/api/data.py` | `backend/api/data.py` | 新增（使用 config 路径） |
| `backup/backend/services/crawler_service.py` | `backend/services/crawler_service.py` | 新增 |
| `backup/backend/main.py` | `backend/main.py` | 仅添加 crawler、data 路由注册 |
| `backup/backend/config.py` | `backend/config.py` | 仅修改 CRAWLER_DATA_DIR |
| `backup/frontend/api.js` | `frontend/src/services/api.js` | 统一爬虫/数据 API 至 8000 端口 |

**前端补充（备份有而此前未迁移）：**
- `frontend/src/components/CrawlerTerminal.jsx`：**新增** - SSE 实时日志流
- `frontend/src/pages/AnalysisWorkbench.jsx`：**已更新** - 引入 CrawlerTerminal、仅保留小红书/关键词搜索、关键词默认空

**未替换的文件：**
- `DataTable.jsx`、`App.jsx`：与备份一致
- `community_service.py`、`analysis_service.py`、`langchain_service.py` 等：保持不变

## 关键改动

### 1. 数据目录（无 MediaCrawler）

- **原**：`crawler/MediaCrawler/data/`
- **现**：`backend/data/crawler_output/`

### 2. API 端口统一

- **原**：爬虫 8080，分析 8000（双后端）
- **现**：全部在 8000 端口（单后端）

### 3. Windows 兼容

- 使用 `Path()` 和 `/`，保证跨平台
- `login_helper.py` 用 `Path(__file__).resolve().parents[2]` 解析项目根
- 不再使用 bash 脚本

## 部署步骤（Windows）

### 1. 安装依赖

```powershell
cd d:\uestc\d2clip
uv sync
uv run playwright install chromium
```

### 2. 首次使用 - 获取 Cookie

```powershell
cd d:\uestc\d2clip
uv run python crawler/xhs_simple/login_helper.py
```

1. 浏览器会自动打开小红书
2. 扫码登录
3. 回到终端按 Enter
4. Cookie 保存在 `crawler_config/xhs_cookies_default.txt`

### 3. 启动服务

**终端 1 - 后端：**
```powershell
cd d:\uestc\d2clip
uv run python backend/main.py
```

**终端 2 - 前端：**
```powershell
cd d:\uestc\d2clip\frontend
npm run dev
```

### 4. 使用流程

1. 访问 http://localhost:5173
2. 进入「分析工作台」
3. 输入关键词（支持逗号分隔）：如 `口红,妆容,平价`
4. 点击「启动爬虫」
5. 等待完成
6. 点击「AI智能分析」生成报告

## 爬虫输出路径

```
backend/data/crawler_output/xhs/json/
├── search_contents_2026-03-04_xxxxxx.json   # 笔记
└── search_comments_2026-03-04_xxxxxx.json    # 评论
```

分析服务会自动从 `CRAWLER_DATA_DIR` 读取上述文件。

## Railway / Vercel 部署（避免继续调用 MediaCrawler）

**问题**：若之前配置过 `VITE_CRAWLER_API_BASE` 指向单独的爬虫服务（MediaCrawler），前端会继续请求旧服务，日志里会出现 MediaCrawler 路径。

**正确做法**：

1. **Vercel 环境变量**：只设置 `VITE_ANALYSIS_API_BASE` 指向主后端 URL（如 `https://xxx.up.railway.app/api`）。**不要设置** `VITE_CRAWLER_API_BASE`。
2. **Railway 服务**：只保留一个主后端服务（使用 `railway.toml`）。若之前有单独的爬虫服务（使用 `railway.crawler.toml` / `Dockerfile.crawler`），请删除或停用。
3. **验证**：爬虫启动后，终端应出现 `[xhs_simple] 开始爬取...`。若看到 `MediaCrawler`、`BrowserLauncher` 等字样，说明仍在调用旧服务。
