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

# 加载 .env 和 XHS_COOKIES 等环境变量
_env_file = crawler_root / ".env"
if _env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_file)
# 主仓库 crawler_config/xhs_cookies_default.txt 作为默认 Cookie（Railway 部署用）
_cookie_file = root / "crawler_config" / "xhs_cookies_default.txt"
if not os.environ.get("XHS_COOKIES") and _cookie_file.exists():
    _lines = _cookie_file.read_text(encoding="utf-8").strip().splitlines()
    _cookie = next((ln.strip() for ln in _lines if ln.strip() and not ln.startswith("#")), "")
    if _cookie:
        os.environ["XHS_COOKIES"] = _cookie

# 在本进程内导入 app，再传给 uvicorn（部署时平台会注入 PORT）
from api.main import app
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

# 生产环境 CORS：允许前端域名（Railway 上为爬虫服务设置 CORS_ORIGIN 或 FRONTEND_ORIGIN）
_frontend_origin = os.environ.get("CORS_ORIGIN") or os.environ.get("FRONTEND_ORIGIN") or "https://d2clip.vercel.app"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

port = int(os.environ.get("PORT", 8080))
uvicorn.run(app, host="0.0.0.0", port=port)
