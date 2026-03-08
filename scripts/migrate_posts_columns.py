#!/usr/bin/env python3
"""为 posts 表添加 liked_by、analysis_id、role_display 列（若不存在）。PostgreSQL。"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.config import settings
from backend.db import is_db_configured
from sqlalchemy import create_engine, text

def main():
    if not is_db_configured():
        print("DATABASE_URL 未配置，跳过迁移")
        return
    url = getattr(settings, "DATABASE_URL", "") or ""
    engine = create_engine(url)
    with engine.connect() as conn:
        for col, typ in [
            ("liked_by", "JSONB DEFAULT '[]'::jsonb"),
            ("analysis_id", "VARCHAR(64) DEFAULT ''"),
            ("role_display", "VARCHAR(64) DEFAULT ''"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE posts ADD COLUMN IF NOT EXISTS {col} {typ}"))
                conn.commit()
                print(f"  posts.{col} ok")
            except Exception as e:
                print(f"  posts.{col}: {e}")
    print("迁移完成")

if __name__ == "__main__":
    main()
