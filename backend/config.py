from pydantic_settings import BaseSettings
from pathlib import Path


def _resolve_project_root() -> Path:
    """解析项目根目录（避免从 .venv 里加载时 BASE_DIR 指错路径）"""
    path = Path(__file__).resolve().parent.parent
    for _ in range(6):
        if (path / "knowledge").exists() and (path / "backend").exists():
            return path
        path = path.parent
    return Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # 项目路径（始终解析到含 knowledge/ 与 backend/ 的根目录）
    BASE_DIR: Path = _resolve_project_root()

    # OpenAI 配置
    OPENAI_API_KEY: str = "sk-S8EsuBGprC7HfOXtGCfyBkfGApbpwf1bN8k27dKgazQH8Ybm"
    OPENAI_API_BASE: str = "https://api.chatanywhere.tech/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"    # 笔记分析、报告骨架、板块内容（升级到4o-mini）
    OPENAI_CHART_MODEL: str = "gpt-4o"   # 图表生成（需要更强的结构化输出能力）
    OPENAI_TEMPERATURE: float = 0.7      # 提高多样性

    # 向量数据库配置
    CHROMA_DB_PATH: str = str(BASE_DIR / "knowledge" / "vectorized" / "chroma_db")

    # 数据路径
    DATA_DIR: Path = BASE_DIR / "backend" / "data"
    # 简化版爬虫数据目录（无需 MediaCrawler 子模块）
    CRAWLER_DATA_DIR: Path = BASE_DIR / "backend" / "data" / "crawler_output"
    KNOWLEDGE_DIR: Path = BASE_DIR / "knowledge" / "raw"

    # API 配置
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # CORS 配置（部署时设置 FRONTEND_ORIGIN 为前端公网地址，如 https://xxx.vercel.app）
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    FRONTEND_ORIGIN: str = ""

    # 数据库（可选：不设则所有现有逻辑仍走 JSON，不影响原功能）
    DATABASE_URL: str = ""

    # JWT（仅当使用 DB 登录时生效）
    JWT_SECRET: str = "d2clip-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 天

    # Redis（Agent 会话持久化，Railway 通过 REDIS_URL 注入）
    REDIS_URL: str = ""   # 空字符串 = 降级为内存存储
    AGENT_SESSION_TTL: int = 60 * 60 * 24 * 7  # 7 天

    class Config:
        env_file = str(_resolve_project_root() / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()
