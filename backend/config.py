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
    OPENAI_API_KEY: str = "sk-guu0pkgYYHPkkNCjOXrnovpwVOQ0Vzw9S91FBPr8bzYnumzr"
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

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
