# D2C 口红实验室 - 后端 API

基于 **LangChain + FastAPI** 的 AI 分析系统（uv 管理）

## 📦 目录结构

```
backend/
├── pyproject.toml             # uv 项目配置
├── main.py                    # FastAPI 入口
├── config.py                  # 配置
├── api/analysis.py            # 分析API
├── services/                  # 核心服务
│   ├── langchain_service.py   # RAG 核心
│   └── analysis_service.py    # 分析逻辑
└── models/schemas.py          # 数据模型
```

## 🚀 快速启动（uv）

```bash
# 1. 安装依赖
cd backend && uv sync

# 2. 向量化知识库（首次）
cd .. && uv run python scripts/vectorize_knowledge.py

# 3. 启动服务
uv run python -m backend.main
```

**访问：** http://localhost:8000/docs

## 📡 核心 API

**POST** `/api/analysis/analyze` - 分析笔记（支持7个平台）

```json
{
  "data_file": "xhs/json/search_contents_2026-02-18.json",
  "platform": "xhs",
  "limit": 10
}
```

**支持平台：** xhs(小红书) / dy(抖音) / ks(快手) / bili(B站) / wb(微博) / tieba(贴吧) / zhihu(知乎)

## 🔧 配置

修改 `config.py` 中的 `OPENAI_API_KEY`

## 📚 技术栈

- uv（包管理）
- LangChain（RAG）
- FastAPI（Web）
- Chroma（向量库）
- OpenAI（LLM）
