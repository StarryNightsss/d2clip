# D2C 口红实验室 🎨

基于 **LangChain Agent + RAG** 的美妆趋势分析系统

---

## 📁 项目结构

```
d2clips/
├── backend/                   # 后端服务（uv 管理）
│   ├── pyproject.toml         # uv 配置
│   ├── main.py                # FastAPI 入口
│   ├── api/                   # API 路由
│   │   ├── agent.py           # Agent 会话管理
│   │   └── crawler.py         # 爬虫控制
│   ├── services/              # 核心服务
│   │   ├── agent_service.py   # Agent 执行引擎
│   │   ├── agent_tools.py     # Agent 工具集
│   │   ├── crawler_service.py # 爬虫服务（xhs_simple）
│   │   └── session_store.py   # 会话持久化
│   └── db/                    # 数据库模型
│
├── frontend/                  # 前端界面（npm 管理）
│   └── src/
│       ├── pages/             # 功能页面
│       │   ├── AnalysisWorkbench.jsx  # 分析工作台
│       │   ├── ReportAgent.jsx        # AI 报告助手
│       │   ├── DataTable.jsx          # 数据列表
│       │   ├── TrendReport.jsx        # 趋势报告
│       │   └── Community.jsx          # 企业社群
│       └── services/api.js    # API 服务
│
├── crawler/                   # 爬虫程序
│   └── xhs_simple/            # 自研小红书爬虫
│       ├── crawler.py
│       └── ...
│
├── knowledge/                 # 知识库
│   ├── raw/                   # 原始 JSON
│   └── vectorized/            # Chroma 向量库
│
├── scripts/                   # 工具脚本
│   └── vectorize_knowledge.py # 向量化
│
└── start.sh                   # 快速启动
```

---

## ⚙️ 环境配置（uv）

项目使用 **uv** 管理 Python 依赖，请先安装 uv 再执行后续步骤。

### 安装 uv

- **Windows（PowerShell）：**
  ```powershell
  powershell -ExecutionPolicy ByScope -Command "irm https://astral.sh/uv/install.ps1 | iex"
  ```
- **macOS / Linux：**
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

安装后新开终端，或执行 `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`（Windows）使 `uv` 生效。

### 配置项目环境

在**项目根目录** `d2clip/` 下执行：

```bash
# 1. 安装依赖（会创建 .venv 并安装 backend）
uv sync

# 2. 首次需向量化知识库
uv run python scripts/vectorize_knowledge.py
```

根目录的 `pyproject.toml` 已配置 uv 工作区，成员为 `backend`，因此上述命令均在根目录执行即可，无需再 `cd backend`。

---

## 🚀 快速开始（3步）

### 1️⃣ 首次安装

**Linux / macOS：**
```bash
bash start.sh
# 选择 1
```

**或手动执行（任意系统，在项目根目录）：**
```bash
uv sync
uv run python scripts/vectorize_knowledge.py
```

**做什么：**
- `uv sync` - 安装后端依赖（根目录已含 workspace 配置）
- `uv run python scripts/vectorize_knowledge.py` - 向量化知识库

### 2️⃣ 启动后端

```bash
bash start.sh
# 选择 2
```

**访问：** http://localhost:8000/docs

### 3️⃣ 完整启动（后端+前端）

```bash
bash start.sh
# 选择 3
```

**访问：**
- 前端：http://localhost:5173
- 后端：http://localhost:8000/docs

---

## 🔌 调用与启动（端口与命令）

| 服务 | 端口 | 启动命令 | 说明 |
|------|------|----------|------|
| **主后端** | 8000 | 见下 | 笔记分析、趋势报告、RAG、爬虫控制；前端 `api.js` 里 `ANALYSIS_API_BASE = 'http://localhost:8000/api'` |
| **前端** | 5173 | 见下 | Vite 开发；请求 8000 端口 |

### 启动分析后端（必选）

在**项目根目录**执行：

```bash
uv run python -m backend.main
```

或进入 backend 目录后：

```bash
cd backend
uv run python main.py
```

访问：http://localhost:8000/docs

### 启动前端

**首次**需安装依赖，之后可直接 `npm run dev`：

```bash
cd frontend
npm install
npm run dev
```

访问：http://localhost:5173

前端会调用：
- **主后端接口**：`http://localhost:8000/api`（分析笔记、报告、历史、爬虫控制等）

### 爬虫功能

爬虫已集成到主后端（8000 端口），使用自研的 `xhs_simple` 小红书爬虫。在「分析工作台」页面可直接启动爬虫采集数据。

**数据流**：爬虫采集结果保存到 `backend/data/crawler_output/xhs/json/`，分析后端直接从该目录读取数据文件。

---

## 📊 核心功能

### 1. AI 报告助手（Agent 架构）

基于 LangChain Agent 的交互式数据分析：

```
用户输入分析需求
    ↓
Agent 生成分析计划（DAG）
    ↓
自动执行：数据加载 → 色调分析 → 风格分析 → 生成图表 → 生成报告
    ↓
实时 WebSocket 推送进度
    ↓
可视化报告展示
```

**特性**：
- 支持多轮对话式分析
- 自动生成分析计划并执行
- 历史会话持久化存储
- 支持问答模式（直接回答）和计划模式（生成计划后手动执行）

### 2. 数据列表

- 查看原始爬虫数据
- 查看 AI 分析结果（按会话筛选）
- 支持搜索、筛选、导出 Excel

### 3. 趋势报告

- 基于 Agent 分析结果生成可视化报告
- 支持口红色调分布、妆容风格占比等图表

### 支持平台

- **xhs** - 小红书（当前主要支持）

---

## 🛠️ 包管理方式

### **后端 & 爬虫：uv**

以下命令均在**项目根目录**执行（根目录 `pyproject.toml` 已配置 workspace）：

```bash
# 安装依赖
uv sync

# 运行脚本
uv run python scripts/vectorize_knowledge.py

# 启动服务
uv run python -m backend.main

# 添加依赖（在 backend 中加包）
cd backend && uv add langchain
```

### **前端：npm**

```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 配置

修改 `backend/config.py`：

```python
OPENAI_API_KEY = "your-key"
OPENAI_API_BASE = "https://api.openai.com/v1"
```

---

## 🌐 公网部署（点链接即用）

从未用过 Railway / Vercel 也没关系，按下面一步步做即可。整体顺序：**先部署后端 → 拿到后端网址 → 再部署前端并填上后端网址**。

---

### 一、部署分析后端（Railway）

1. **注册 Railway**
   - 打开 https://railway.app ，点 **Login**，用 **GitHub** 登录并授权。

2. **从 GitHub 创建项目**
   - 登录后点 **New Project**。
   - 选 **Deploy from GitHub repo**，若第一次会提示连接 GitHub 账号，选 **StarryNightsss/d2clip**（或你的仓库名）。
   - 选中仓库后 Railway 会创建一个 Service，并开始用默认设置构建（可能失败，下一步会改配置）。

3. **配置后端服务**
   - 点进刚创建的服务（一个方块/卡片）。
   - 打开 **Settings** 标签：
     - **Build Command** 填：`uv sync`
     - **Start Command** 填：`uv run python -m backend.main`
     - **Root Directory** 留空（用仓库根目录）。
   - 打开 **Variables** 标签，按下面**变量名**添加（值换成你自己的；Railway 会自动注入 `PORT`，不用填）：
     | 变量名 | 说明 | 示例值 |
     |--------|------|--------|
     | `OPENAI_API_KEY` | OpenAI 或代理的 API Key | 你的 key |
     | `OPENAI_API_BASE` | API 基础地址 | `https://api.chatanywhere.tech/v1` |
     | `FRONTEND_ORIGIN` | 前端公网地址（CORS），等 Vercel 部署完再填 | `https://d2clip-xxx.vercel.app` |
     `FRONTEND_ORIGIN` 可先不填，等前端部署完再回来填。

4. **生成公网地址**
   - 点进 **d2clip** 这个服务（不是项目首页），然后按下面顺序找：
     1. **Settings** 标签 → 向下滚动，找 **Networking**、**Domains** 或 **Public Networking** → 点 **Generate Domain** / **Add Domain** / **Create domain**。
     2. 若没有，看服务**顶部**或 **Deployments** 旁边是否有 **「Unexposed」** 或 **「No public domain」** 的提示/按钮，点进去通常可以生成 `*.up.railway.app` 域名。
     3. 或看左侧/上方是否有 **「Networking」**、**「Domains」** 单独标签（和 Deployments、Variables、Settings 并列），点进去再点 **Generate** / **Add**。
   - 新界面里也可能在：服务卡片的 **「⋯」** 菜单里，或 **Settings** 最下方 **Domains** 区块。
   - 会得到一个类似 `https://xxx.up.railway.app` 的地址，记下来。前端要请求的 API 基础地址是：**这个地址 + `/api`**，例如 `https://xxx.up.railway.app/api`。
   - 若仍找不到，可打开 [Railway 文档 Domains](https://docs.railway.com/networking/domains) 看最新截图，或到 Railway Discord 问当前入口位置。

5. **验证**
   - 浏览器打开 `https://你的域名.railway.app/api/health`，若返回 `{"status":"ok"}` 说明后端已跑起来。

---

### 二、部署前端（Vercel）

1. **注册 Vercel**
   - 打开 https://vercel.com ，点 **Sign Up**，用 **GitHub** 登录并授权。

2. **从 GitHub 导入项目**
   - 登录后点 **Add New…** → **Project**。
   - 在列表里选 **d2clip**（或你的仓库名），点 **Import**。

3. **配置前端构建**
   - **Root Directory**：点 **Edit**，选 `frontend`，确认。
   - **Framework Preset**：选 **Vite**（一般会自动识别）。
   - **Build Command**：留默认 `npm run build` 即可。
   - **Output Directory**：留默认 `dist` 即可。

4. **填环境变量（重要）**
   - 在 **Environment Variables** 里添加：
     - 名称：`VITE_ANALYSIS_API_BASE`，值：`https://你的后端域名.railway.app/api`（上一步记下的那个 + `/api`）。
   - 然后点 **Deploy**，等构建完成。

5. **拿到前端链接**
   - 部署成功后会出现 **Visit** 链接，例如 `https://d2clip-xxx.vercel.app`，这就是「点链接即用」的地址。

6. **回去填后端的 CORS**
   - 回到 Railway 该服务的 **Variables**，新增：
     - 名称：`FRONTEND_ORIGIN`，值：`https://d2clip-xxx.vercel.app`（你上一步拿到的 Vercel 地址，不要带末尾斜杠）。
   - 保存后 Railway 会自动重新部署，几秒后刷新前端页面，跨域报错会消失。

---

### 三、小结

| 步骤 | 平台 | 你要做的 |
|------|------|----------|
| 1 | Railway | 用 GitHub 部署仓库，Build: `uv sync`，Start: `uv run python -m backend.main`，填 `OPENAI_API_KEY` 等，Generate Domain |
| 2 | Vercel | 用 GitHub 导入仓库，Root 选 `frontend`，填 `VITE_ANALYSIS_API_BASE` = 后端地址+`/api`，Deploy |
| 3 | Railway | 同一后端服务 Variables 里填 `FRONTEND_ORIGIN` = 你的 Vercel 地址 |

完成后，把 Vercel 的访问链接发给别人，对方打开即可使用，无需自己起终端。

### 五、环境变量清单（复制变量名用）

**Railway（后端服务）Variables 里要有的：**

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `OPENAI_API_KEY` | 是 | OpenAI 或代理的 API Key |
| `OPENAI_API_BASE` | 否 | 默认见 backend/config.py，可覆盖 |
| `FRONTEND_ORIGIN` | 前端部署后填 | 前端公网地址，如 `https://xxx.vercel.app`，用于 CORS |

**Vercel（前端）Environment Variables 里要有的：**

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `VITE_ANALYSIS_API_BASE` | 是 | 后端公网地址 + `/api`，如 `https://xxx.up.railway.app/api` |

---

## 📡 核心 API

**分析笔记：** `POST /api/analysis/analyze`

```json
{
  "data_file": "xhs/json/search_contents_2026-02-18.json",
  "platform": "xhs",
  "limit": 10
}
```

---

## 🧪 测试向量库

```bash
uv run python -c "
from backend.services.langchain_service import langchain_service
print('向量库:', langchain_service.vectorstore is not None)
"
```

---

## 📚 技术栈

- **包管理：** uv（后端）+ npm（前端）
- **AI 框架：** LangChain + RAG
- **向量库：** Chroma + OpenAI Embeddings
- **LLM：** GPT-3.5
- **后端：** FastAPI
- **前端：** React + Vite + ECharts
- **爬虫：** Playwright（小红书）
- **Agent 框架：** LangChain Agent + 自定义工具集
- **持久化：** PostgreSQL + Redis（可选）

---

## 🔍 故障排查

### 向量库加载失败

```bash
uv run python scripts/vectorize_knowledge.py
```

### 依赖安装失败

```bash
uv sync --refresh
```

### 爬虫启动失败

爬虫已集成到主后端，在「分析工作台」页面点击「开始采集」即可启动。

如需命令行运行：
```bash
uv run python -c "
from backend.services.crawler_service import crawler_service
crawler_service.start_crawl(['关键词1', '关键词2'], 10, True)
"
```

---

## 📖 文档

- 后端：`backend/README.md`
- 爬虫：`crawler/xhs_simple/README.md`
- Agent 架构：`docs/AGENT_ARCHITECTURE.md`

---

## 📎 补充文件到项目

若你有**三个文件**要补充进项目，可以按用途放到以下位置，并在对应位置接好入口：

| 用途 | 建议位置 | 说明 |
|------|----------|------|
| 工具/脚本 | `scripts/` | 与 `vectorize_knowledge.py` 同级，用 `uv run python scripts/xxx.py` 运行 |
| 后端 API/服务 | `backend/api/` 或 `backend/services/` | 在 `backend/main.py` 或对应路由中注册 |
| 爬虫相关 | `crawler/xhs_simple/` | 自研小红书爬虫 |
| 分析流水线 | `analysis/` | 当前用 `requirements.txt`，可后续改为 uv workspace 成员 |

把三个文件的**路径或内容**发给我后，我可以帮你写进项目并接好入口。

---

**注意：** 项目全程使用 **uv** 管理 Python 依赖，不使用 pip。
