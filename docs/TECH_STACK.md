# D2C 口红实验室 - 技术栈

本文档只描述当前项目实际使用的技术，不包含已废弃方案。

---

## 概览

| 层级 | 技术 |
|------|------|
| 包管理 | uv（Python，根 workspace 含 backend）+ npm（前端） |
| 前端 | React 19 + Vite 7 + Ant Design 6 + React Router 7 + ECharts 6 |
| 后端 | FastAPI + Uvicorn + Pydantic |
| AI / RAG | LangChain + OpenAI（GPT-4o-mini / 4o）+ Chroma + tiktoken |
| 数据库 | PostgreSQL + SQLAlchemy 2 + psycopg2 |
| 认证 | JWT（python-jose）+ bcrypt |
| 爬虫 | xhs_simple（Playwright + httpx + 小红书签名） |
| 部署 | Docker + Railway（后端）+ Vercel（前端） |

---

## 一、前端 (frontend/)

| 用途 | 技术 |
|------|------|
| 框架 / 构建 | React 19.2、Vite 7.3 |
| UI | Ant Design 6.3 |
| 路由 | React Router 7.13 |
| 图表 | ECharts 6、echarts-for-react |
| 报告导出 | jspdf、html2canvas、file-saver、docx |
| 请求 | 环境变量 `VITE_ANALYSIS_API_BASE`，默认 `http://localhost:8000/api` |

---

## 二、后端 (backend/)

| 用途 | 技术 |
|------|------|
| 框架 / 服务 | FastAPI 0.110+、Uvicorn 0.27+ |
| 配置与校验 | Pydantic 2、pydantic-settings |
| AI / RAG | langchain、langchain-openai、langchain-community、langchain-chroma |
| 向量库 | Chroma 0.4+、OpenAI Embeddings |
| LLM | OpenAI 1.12+（GPT-4o-mini / 4o）、tiktoken |
| 数据库 | SQLAlchemy 2、psycopg2-binary（连接 PostgreSQL） |
| 认证 | python-jose（JWT）、bcrypt（密码） |
| 数据处理 | Pandas、NumPy、jieba、Matplotlib |
| 工具 | httpx、aiofiles、python-multipart、python-dotenv |

**API 模块**（统一前缀 `/api`）：

- **auth**：登录、JWT
- **analysis**：笔记分析、报告、历史、进度
- **community**：社群用户/小组/帖子/评论/点赞/上传
- **crawler**：爬虫启停、状态、日志流
- **data**：数据文件列表、预览、统计
- **users**：职员 CRUD（依赖 `DATABASE_URL`）

---

## 三、爬虫（xhs_simple）

项目使用自研的 **xhs_simple** 小红书爬虫，与主后端同进程、同端口（8000），不依赖 MediaCrawler 或独立 8080 服务。

### 3.1 技术栈

| 用途 | 技术 |
|------|------|
| 浏览器自动化 | **Playwright**（Chromium，无头模式） |
| HTTP 请求 | **httpx**（带签名头请求评论等接口） |
| 签名 | **playwright_sign**：在 Playwright 页面内调用 `window.mnsv2()` 生成签名；**xhs_sign**：纯 Python 签名算法（自定义 Base64、CRC32 等，用于请求参数与头） |
| 数据校验 / 配置 | **Pydantic**、**python-dotenv** |
| Cookie | 登录后 Cookie 存于 `crawler_config/xhs_cookies_default.txt`，由 `login_helper.py`（Playwright 扫码登录）写入 |

### 3.2 流程简述

- **笔记搜索**：Playwright 打开小红书搜索页，拦截前端请求的 API 响应，得到笔记列表。
- **评论拉取**：用 Playwright 在页面内执行 JS 拿到签名，再用 **httpx** 发 GET 请求（带完整签名头），不打开详情页以降低风控。
- **输出**：JSON 写入 `backend/data/crawler_output/xhs/json/`（笔记、评论格式与后续分析兼容）。

### 3.3 依赖（crawler/xhs_simple/requirements.txt）

```
playwright>=1.40.0
httpx>=0.24.0
pydantic==2.0.0
python-dotenv==1.0.0
```

实际运行使用根目录 `uv` 环境（根项目已依赖 Playwright），无需单独安装 xhs_simple 的 requirements。

---

## 四、知识库与 RAG

| 用途 | 技术 / 路径 |
|------|-------------|
| 原始知识 | `knowledge/raw/`（如 makeup_knowledge.json） |
| 向量库 | Chroma 持久化目录 `knowledge/vectorized/chroma_db` |
| 向量化脚本 | `scripts/vectorize_knowledge.py`（将 raw JSON 转为 LangChain Document 写入 Chroma） |

---

## 五、数据库与存储

| 用途 | 技术 |
|------|------|
| 业务数据 | **PostgreSQL**（用户、部门、社群、分析任务等），连接串由环境变量 `DATABASE_URL` 配置 |
| 爬虫结果 | 本地目录 `backend/data/crawler_output/xhs/json/` |
| 社群上传 | 本地目录 `backend/data/community_uploads/` |

---

## 六、开发与部署

| 用途 | 技术 |
|------|------|
| Python | 3.11+（推荐 3.12） |
| 前端 | Node + npm，`npm run dev` / `npm run build` |
| 容器 | 根目录 Dockerfile：uv sync、Playwright Chromium、知识库向量化、启动主后端 |
| 托管 | Railway（后端）、Vercel（前端静态） |
| 环境变量 | OPENAI_API_KEY、OPENAI_API_BASE、FRONTEND_ORIGIN、DATABASE_URL、JWT_SECRET 等（见 README 与 backend/config.py） |
