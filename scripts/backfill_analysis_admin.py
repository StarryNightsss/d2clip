#!/usr/bin/env python3
"""将 analysis_tasks 中 user_id 为 NULL 的记录归为管理员，便于默认/历史记录仅 admin 可见。"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.db import is_db_configured
from backend.config import settings
from sqlalchemy import create_engine, text

ADMIN_USERNAME = "admin@d2clip.com"


def main():
    if not is_db_configured():
        print("DATABASE_URL 未配置，跳过")
        return
    url = getattr(settings, "DATABASE_URL", "") or ""
    engine = create_engine(url)
    with engine.connect() as conn:
        r = conn.execute(
            text("UPDATE analysis_tasks SET user_id = :uid WHERE user_id IS NULL"),
            {"uid": ADMIN_USERNAME},
        )
        conn.commit()
        n = r.rowcount
        if n > 0:
            print(f"已将 {n} 条分析历史归为管理员 {ADMIN_USERNAME}")
        else:
            print("表中没有 user_id 为空的记录。若要把旧 JSON 历史导入并归属管理员，请先运行：")
            print("  uv run python scripts/import_analysis_history_to_db.py")
    print("完成")


if __name__ == "__main__":
    main()
