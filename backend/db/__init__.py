"""
数据库连接（仅当配置了 DATABASE_URL 时初始化，不配置则 engine 为 None，原有功能不受影响）

【何时走 DB / 何时走 JSON】
- 若启动时 DATABASE_URL 有值且能成功创建 engine → is_db_configured() 为 True，登录/职员/社群/分析历史 都走 DB。
- 若未配置或启动时创建 engine 失败（如 URL 错误、PostgreSQL 未启动）→ engine 为 None，is_db_configured() 为 False：
  - 登录 → 503（Auth not configured）
  - 职员管理 → /api/users 不挂载，前端请求 404
  - 社群、分析历史 → 走原有 JSON/文件逻辑

【配置了但「失效」时】
- 启动时失效（连不上、密码错等）：create_engine 在 try 里，失败则 engine=None，等同于未配置 → 上面「走 JSON/503」。
- 运行中失效（例如 PostgreSQL 中途停了）：请求时用 SessionLocal() 查库会抛异常，接口返回 5xx，不会自动回退到 JSON
  （避免数据一部分在 DB、一部分在 JSON 难以一致）。API 会尽量返回明确原因，便于排查。
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.config import settings
from backend.db.base import Base

engine = None
SessionLocal = None

_db_url = getattr(settings, "DATABASE_URL", "") or ""
if _db_url and str(_db_url).strip():
    try:
        engine = create_engine(_db_url, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        import backend.db.models  # noqa: F401 - 注册表到 Base.metadata
    except Exception:
        engine = None
        SessionLocal = None


def get_db():
    """依赖注入用：返回 DB session，仅当 engine 存在时可用"""
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL 未配置，无法使用数据库")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def is_db_configured():
    """是否已配置并可用数据库（以启动时是否成功创建 engine 为准）"""
    return engine is not None
