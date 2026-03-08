#!/usr/bin/env python3
"""为 analysis_tasks 表添加 user_id 列（若不存在）。旧数据 user_id 为 NULL，仅新分析会写入用户。"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.db import is_db_configured
from backend.config import settings
from sqlalchemy import create_engine, text


def main():
    if not is_db_configured():
        print("DATABASE_URL 未配置，跳过迁移")
        return
    url = getattr(settings, "DATABASE_URL", "") or ""
    engine = create_engine(url)
    with engine.connect() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE analysis_tasks ADD COLUMN IF NOT EXISTS user_id VARCHAR(64)"
            ))
            conn.commit()
            print("analysis_tasks.user_id 已添加或已存在")
        except Exception as e:
            print(f"迁移失败: {e}")
            raise
    print("迁移完成")


if __name__ == "__main__":
    main()
