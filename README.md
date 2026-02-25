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

## 🚀 快速开始（3步）

### 1️⃣ 首次安装

```bash
bash start.sh
# 选择 1
```

**做什么：**
- `cd backend && uv sync` - 安装后端依赖
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

```bash
# 安装依赖
cd backend && uv sync

# 运行脚本
uv run python scripts/vectorize_knowledge.py

# 启动服务
uv run python -m backend.main

# 添加依赖
uv add langchain
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
cd backend
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

**注意：** 项目全程使用 **uv** 管理 Python 依赖，不使用 pip。
