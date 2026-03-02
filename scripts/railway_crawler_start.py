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
        print("📦 [Railway Crawler] 无 git，使用构建阶段已拉取的子模块。")

    # 1.5 运行时用当前 Python 重建 MediaCrawler .venv（构建时 venv 的 Python 路径在运行镜像可能失效）
    mc_venv_py = ROOT / "crawler" / "MediaCrawler" / ".venv" / "bin" / "python"
    if not mc_venv_py.exists() or not os.access(mc_venv_py, os.X_OK):
        print("📦 [Railway Crawler] 正在用运行时 Python 同步 MediaCrawler 依赖（约 1 分钟）...")
        r = subprocess.run(
            ["uv", "sync", "--no-dev"],
            cwd=str(ROOT / "crawler" / "MediaCrawler"),
            env={**os.environ, "VIRTUAL_ENV": ""},  # 不继承父进程 venv，让 uv 在 MediaCrawler 下创建 .venv
        )
        if r.returncode != 0:
            print("⚠️ MediaCrawler uv sync 未成功，环境检测可能失败。")
        else:
            # 替换为 headless OpenCV，避免运行时 libGL 缺失
            subprocess.run(
                ["uv", "pip", "uninstall", "opencv-python"],
                cwd=str(ROOT / "crawler" / "MediaCrawler"),
                env={**os.environ, "VIRTUAL_ENV": ""},
            )
            subprocess.run(
                ["uv", "pip", "install", "opencv-python-headless>=4.11.0.86"],
                cwd=str(ROOT / "crawler" / "MediaCrawler"),
                env={**os.environ, "VIRTUAL_ENV": ""},
            )
            print("✅ [Railway Crawler] MediaCrawler .venv 就绪。")

    # 2. 启动爬虫 API（替换当前进程，保留 PORT 等环境变量）
    os.execve(
        sys.executable,
        [sys.executable, str(ROOT / "scripts" / "run_crawler_api.py")],
        os.environ,
    )

if __name__ == "__main__":
    main()
