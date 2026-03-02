#!/usr/bin/env python3
"""
Railway 爬虫服务单入口：先拉取子模块，再启动爬虫 API（不用 &&）。
用法：uv run python scripts/railway_crawler_start.py
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def main():
    # 1. 若有 git 则拉取子模块（仅本地/CI；Railway 运行镜像无 git，子模块在 build 阶段已拉取）
    if shutil.which("git"):
        print("📦 [Railway Crawler] 拉取 MediaCrawler 子模块...")
        r = subprocess.run(
            ["git", "submodule", "update", "--init", "--recursive"],
            cwd=str(ROOT),
            env=os.environ,
        )
        if r.returncode != 0:
            print("⚠️ 子模块拉取未成功，尝试继续启动...")
        else:
            print("✅ [Railway Crawler] 子模块就绪。")
    else:
        print("📦 [Railway Crawler] 无 git，使用构建阶段已拉取的子模块，启动爬虫 API...")

    # 2. 启动爬虫 API（替换当前进程，保留 PORT 等环境变量）
    os.execve(
        sys.executable,
        [sys.executable, str(ROOT / "scripts" / "run_crawler_api.py")],
        os.environ,
    )

if __name__ == "__main__":
    main()
