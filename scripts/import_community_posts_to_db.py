#!/usr/bin/env python3
"""把 community_posts.json（或种子数据）里的帖子和评论导入到 posts / post_comments 表。有 DB 时执行一次即可。"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.db import is_db_configured, SessionLocal
from backend.db.models import Post
from backend.db.community_db import import_post_from_json
from backend.config import settings


def main():
    if not is_db_configured():
        print("DATABASE_URL 未配置，跳过")
        return
    path = settings.DATA_DIR / "community_posts.json"
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            items = json.load(f)
    else:
        from backend.services.community_service import load_posts
        items = load_posts()
    if not isinstance(items, list) or not items:
        print("无帖子数据，跳过")
        return
    db = SessionLocal()
    try:
        existing = db.query(Post).count()
        if existing > 0:
            print(f"posts 表已有 {existing} 条，跳过导入（如需重新导入请先清空 posts / post_comments 表）")
            return
        imported = 0
        for post_dict in items:
            if not isinstance(post_dict, dict):
                continue
            p = import_post_from_json(db, post_dict)
            if p:
                imported += 1
        db.commit()
        print(f"已从 community_posts.json（或种子）导入 {imported} 条帖子到 posts，评论已写入 post_comments")
    finally:
        db.close()
    print("完成")


if __name__ == "__main__":
    main()
