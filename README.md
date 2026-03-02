# D2C 口红实验室 🎨

基于 **LangChain + RAG** 的美妆趋势分析系统

---

## 📁 项目结构

```
d2clips/
├── backend/                   # 后端服务（uv 管理）
│   ├── pyproject.toml         # uv 配置
│   ├── main.py                # FastAPI 入口
│   └── services/              # LangChain RAG 核心
│
├── frontend/                  # 前端界面（npm 管理）
│   └── src/
│       ├── pages/             # 5个功能页面
│       └── services/api.js    # API 服务
│
├── crawler/                   # 爬虫程序（uv 管理）
│   └── MediaCrawler/
│       ├── pyproject.toml     # 支持7个平台
│       └── data/              # 采集数据输出
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

爬虫为 Git 子模块，若需使用请先初始化：

```bash
git submodule update --init
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
| **分析后端** | 8000 | 见下 | 笔记分析、趋势报告、RAG；前端 `api.js` 里 `ANALYSIS_API_BASE = 'http://localhost:8000/api'` |
| **前端** | 5173 | 见下 | Vite 开发；会请求 8000（分析）和 8080（爬虫） |
| **爬虫后端** | 8080 | 见下「启动爬虫后端」 | 前端 `api.js` 里 `CRAWLER_API_BASE = 'http://localhost:8080/api'`，用于启动/停止爬虫、数据文件列表等 |

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
- **分析接口**：`http://localhost:8000/api`（分析笔记、报告、历史等）
- **爬虫接口**：`http://localhost:8080/api`（爬虫任务、数据文件列表等；若未起 8080 服务则对应功能不可用）

### 启动爬虫后端（8080，供前端调用）

爬虫代码在 **MediaCrawler** 子模块里，自带 `api/main.py`，可在 8080 端口提供 API（前端会请求该端口拉取文件列表、控制爬虫等）。

**1. 初始化子模块（首次）**

在**项目根目录**执行：

```bash
git submodule update --init
```

**2. 安装依赖并启动爬虫 API**

**方案 A：用根目录 uv 环境（推荐，Playwright 已加入根项目）**

在**项目根目录**执行：

```bash
# 安装 Playwright 浏览器驱动（首次）
uv run python -m playwright install

# 启动爬虫 API（8080）
uv run python scripts/run_crawler_api.py
```

**方案 B：在 crawler/MediaCrawler 下用本地环境**

```bash
cd crawler/MediaCrawler
uv sync
uv run python -m playwright install
uv run uvicorn api.main:app --host 0.0.0.0 --port 8080
```

访问：http://localhost:8080。前端会请求 `http://localhost:8080/api` 获取数据文件列表、爬虫状态等。

**3. 仅命令行跑爬虫（不启 8080 也可）**

若只想要数据、不用前端的「选择数据文件」列表，可直接命令行采集，数据仍会写到 `crawler/MediaCrawler/data/`，分析后端从该目录读：

```bash
cd crawler/MediaCrawler
uv run python main.py --platform xhs --lt qrcode --type search
```

- **数据流**：爬虫把采集结果写到 `crawler/MediaCrawler/data/`（如 `xhs/json/xxx.json`），分析后端的 `data_file` 即指向该目录下的文件。

---

## 📊 功能1：笔记分析 + 趋势报告

### 技术流程

```
爬虫采集（7平台）
    ↓ JSON
LangChain RAG 分析
    ↓ (Chroma 向量检索知识库)
GPT-3.5 提取结构化数据
    ↓ FastAPI 统计聚合
React + ECharts 可视化
```

### 支持平台

- **xhs** - 小红书（主要）
- **dy** - 抖音
- **ks** - 快手
- **bili** - B站
- **wb** - 微博
- **tieba** - 贴吧
- **zhihu** - 知乎

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
- **爬虫：** Playwright（7平台）

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

```bash
cd crawler/MediaCrawler
uv run python main.py --platform xhs --type search --keywords "口红"
```

---

## 📖 文档

- 后端：`backend/README.md`
- 爬虫：`crawler/MediaCrawler/README.md`

---

## 📎 补充文件到项目

若你有**三个文件**要补充进项目，可以按用途放到以下位置，并在对应位置接好入口：

| 用途 | 建议位置 | 说明 |
|------|----------|------|
| 工具/脚本 | `scripts/` | 与 `vectorize_knowledge.py` 同级，用 `uv run python scripts/xxx.py` 运行 |
| 后端 API/服务 | `backend/api/` 或 `backend/services/` | 在 `backend/main.py` 或对应路由中注册 |
| 爬虫相关 | `crawler/MediaCrawler/` 子模块内 | 需先 `git submodule update --init` |
| 分析流水线 | `analysis/` | 当前用 `requirements.txt`，可后续改为 uv workspace 成员 |

把三个文件的**路径或内容**发给我后，我可以帮你写进项目并接好入口。

---

**注意：** 项目全程使用 **uv** 管理 Python 依赖，不使用 pip。
