#!/usr/bin/env bash
# Railway 爬虫服务构建脚本（不用 &&，每行一条命令，失败即退出）
set -e

python scripts/ensure_mediacrawler.py
cd crawler/MediaCrawler
uv sync --no-dev
.venv/bin/pip uninstall opencv-python -y
.venv/bin/pip install 'opencv-python-headless>=4.11.0.86'
cd ../..
python scripts/patch_mediacrawler_venv.py
