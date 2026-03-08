#!/usr/bin/env python3
"""把 analysis_history.json 里的历史导入到 analysis_tasks 表，并归属为管理员。有 DB 时执行。"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.db import is_db_configured, SessionLocal
from backend.db.models import AnalysisTask
from backend.config import settings

ADMIN_USERNAME = "admin@d2clip.com"
PLATFORM_MAX_LEN = 32
DATA_FILE_MAX_LEN = 512


def _normalize_platform(raw):
    """platform 表字段为 VARCHAR(32)，只允许短代码如 xhs，不能是路径"""
    s = (raw or "xhs").strip()
    if len(s) > PLATFORM_MAX_LEN or "/" in s or "\\" in s or ".json" in s:
        return "xhs"
    return s[:PLATFORM_MAX_LEN]


def _normalize_data_file(raw):
    """data_file 表字段为 VARCHAR(512)，超长则截断"""
    s = (raw or "").strip()
    return s[:DATA_FILE_MAX_LEN] if len(s) > DATA_FILE_MAX_LEN else s


def main():
    if not is_db_configured():
        print("DATABASE_URL 未配置，跳过")
        return
    path = settings.DATA_DIR / "analysis_history.json"
    if not path.exists():
        print(f"未找到 {path}，无需导入")
        return
    with open(path, "r", encoding="utf-8") as f:
        items = json.load(f)
    if not isinstance(items, list) or not items:
        print("analysis_history.json 为空或格式不对，跳过")
        return
    total_in_json = len(items)
    db = SessionLocal()
    added = 0
    skipped_no_id = 0
    skipped_dup = 0
    try:
        for h in items:
            aid = (h.get("analysis_id") or "").strip()
            if not aid:
                skipped_no_id += 1
                continue
            if db.query(AnalysisTask).filter(AnalysisTask.analysis_id == aid).first():
                skipped_dup += 1
                continue
            db.add(AnalysisTask(
                analysis_id=aid,
                user_id=ADMIN_USERNAME,
                platform=_normalize_platform(h.get("platform")),
                data_file=_normalize_data_file(h.get("data_file")),
                total_notes=int(h.get("total_notes") or 0),
                analyzed_notes=int(h.get("analyzed_notes") or 0),
                failed_notes=int(h.get("failed_notes") or 0),
                status=(h.get("status") or "completed")[:32],
            ))
            added += 1
        db.commit()
        print(f"JSON 共 {total_in_json} 条；已存在跳过 {skipped_dup} 条；无 id 跳过 {skipped_no_id} 条；本次新导入 {added} 条，全部归属为 {ADMIN_USERNAME}")
    finally:
        db.close()
    print("完成")


if __name__ == "__main__":
    main()
