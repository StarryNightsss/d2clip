# 支持从 backend 目录直接启动：把项目根加入 path，保证 backend.* 导入可用
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from backend.config import settings
from backend.api.analysis import router as analysis_router
from backend.api.community import router as community_router

# 创建 FastAPI 应用
app = FastAPI(
    title="D2C 口红实验室 API",
    description="基于 LangChain 的 AI 分析系统",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(analysis_router, prefix="/api")
app.include_router(community_router, prefix="/api")

@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "D2C 口红实验室 API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )
