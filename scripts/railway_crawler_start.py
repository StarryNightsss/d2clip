#!/usr/bin/env python3
"""
Railway 爬虫服务单入口：先拉取子模块，再启动爬虫 API（不用 &&）。
用法：uv run python scripts/railway_crawler_start.py
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def main():
    # 1. 拉取子模块（Railway 克隆时可能未包含子模块内容）
    print("📦 [Railway Crawler] 拉取 MediaCrawler 子模块...")
    r = subprocess.run(
        ["git", "submodule", "update", "--init", "--recursive"],
        cwd=str(ROOT),
        env=os.environ,
    )
    if r.returncode != 0:
        print("⚠️ 子模块拉取未成功，尝试继续启动...")
    else:
        print("✅ [Railway Crawler] 子模块就绪，启动爬虫 API...")

    # 2. 启动爬虫 API（替换当前进程，保留 PORT 等环境变量）
    os.execve(
        sys.executable,
        [sys.executable, str(ROOT / "scripts" / "run_crawler_api.py")],
        os.environ,
    )

if __name__ == "__main__":
    main()
