#!/usr/bin/env python3
"""
从项目根目录用根环境启动爬虫 API（8080）
用法：uv run python scripts/run_crawler_api.py
"""
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
crawler_root = root / "crawler" / "MediaCrawler"
api_main = crawler_root / "api" / "main.py"
if not crawler_root.exists():
    print("crawler/MediaCrawler 不存在，请先在项目根目录执行: git submodule update --init")
    sys.exit(1)
if not api_main.exists():
    print("crawler/MediaCrawler/api/main.py 不存在，子模块可能未拉取完整。")
    print("请在项目根目录执行: git submodule update --init --recursive")
    sys.exit(1)

sys.path.insert(0, str(crawler_root))
os.chdir(crawler_root)

# 在本进程内导入 app，再传给 uvicorn（部署时平台会注入 PORT）
from api.main import app
import uvicorn
port = int(os.environ.get("PORT", 8080))
uvicorn.run(app, host="0.0.0.0", port=port)
