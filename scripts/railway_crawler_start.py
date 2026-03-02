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

    mc_dir = ROOT / "crawler" / "MediaCrawler"
    mc_venv_py = mc_dir / ".venv" / "bin" / "python"
    need_sync = not mc_venv_py.exists() or not os.access(mc_venv_py, os.X_OK)

    # 2. 先启动 API（立即监听 PORT，避免 Railway 健康检查超时）
    if need_sync:
        print("📦 [Railway Crawler] .venv 待同步，先启动 API，后台同步依赖（约 1 分钟）...")
    api_argv = [sys.executable, str(ROOT / "scripts" / "run_crawler_api.py")]
    if need_sync:
        # 不 exec：当前进程保持，子进程跑 API，后台再跑 uv sync
        api_proc = subprocess.Popen(
            api_argv,
            env=os.environ,
            cwd=str(ROOT),
        )
        env_no_venv = {**os.environ, "VIRTUAL_ENV": ""}
        subprocess.Popen(
            ["uv", "sync", "--no-dev"],
            cwd=str(mc_dir),
            env=env_no_venv,
        ).wait()
        subprocess.run(["uv", "pip", "uninstall", "opencv-python"], cwd=str(mc_dir), env=env_no_venv)
        subprocess.run(["uv", "pip", "install", "opencv-python-headless>=4.11.0.86"], cwd=str(mc_dir), env=env_no_venv)
        print("✅ [Railway Crawler] MediaCrawler .venv 就绪。")
        sys.exit(api_proc.wait())
    else:
        os.execve(sys.executable, api_argv, os.environ)

if __name__ == "__main__":
    main()
