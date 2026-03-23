# 支持从 backend 目录直接启动：把项目根加入 path，保证 backend.* 导入可用
import os
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from sqlalchemy.exc import OperationalError, InterfaceError

from backend.config import settings
from backend.api.community import router as community_router
from backend.api.crawler import router as crawler_router
from backend.api.data import router as data_router
from backend.api.auth import router as auth_router
from backend.api.agent import router as agent_router
from backend.db import is_db_configured

# 创建 FastAPI 应用
app = FastAPI(
    title="D2C 口红实验室 API",
    description="基于 LangChain 的 AI 分析系统",
    version="1.0.0"
)

# CORS 配置（部署时通过 FRONTEND_ORIGIN 加入前端域名）
_cors_origins = list(settings.CORS_ORIGINS)
if settings.FRONTEND_ORIGIN:
    _cors_origins.append(settings.FRONTEND_ORIGIN)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router, prefix="/api")
app.include_router(community_router, prefix="/api")
app.include_router(crawler_router, prefix="/api")
app.include_router(data_router, prefix="/api")
app.include_router(agent_router, prefix="/api")
# 职员管理 CRUD（仅当配置了 DATABASE_URL 时挂载）
if is_db_configured():
    from backend.api.users import router as users_router
    app.include_router(users_router, prefix="/api")


@app.exception_handler(OperationalError)
@app.exception_handler(InterfaceError)
async def db_unavailable_handler(request: Request, exc: Exception):
    """配置了 DB 但运行中连接失败（如 PostgreSQL 停了）时，返回 503 与明确原因，便于排查"""
    return JSONResponse(
        status_code=503,
        content={
            "detail": "数据库暂时不可用，请检查 PostgreSQL 是否运行、网络与 DATABASE_URL 是否正确。",
            "error_type": type(exc).__name__,
        },
    )


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
    port = int(os.environ.get("PORT", settings.API_PORT))
    uvicorn.run(
        "backend.main:app",
        host=settings.API_HOST,
        port=port,
        reload=True
    )
