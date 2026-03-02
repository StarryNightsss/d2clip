#!/usr/bin/env python3
"""
带输出的 Playwright 浏览器安装（便于确认是否在下载）
用法：uv run python scripts/install_playwright_browsers.py
"""
import os
import subprocess
import sys

# 确认当前用的是哪个 Python / playwright
print("当前 Python:", sys.executable, flush=True)
try:
    import importlib.metadata
    v = importlib.metadata.version("playwright")
    print("当前 playwright 包版本:", v, flush=True)
except Exception as e:
    print("playwright 版本:", e, flush=True)
print("正在安装 Playwright 浏览器（Chromium）...", flush=True)

env = os.environ.copy()
env["PYTHONUNBUFFERED"] = "1"
r = subprocess.run(
    [sys.executable, "-u", "-m", "playwright", "install", "chromium"],
    env=env,
    cwd=os.path.dirname(os.path.abspath(__file__)) or ".",
)
if r.returncode != 0:
    print("安装失败，返回码:", r.returncode, flush=True)
    sys.exit(r.returncode)
print("Playwright 浏览器安装完成。", flush=True)
