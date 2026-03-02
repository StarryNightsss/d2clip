#!/usr/bin/env bash
# Railway 爬虫服务构建脚本（不用 &&，每行一条命令，失败即退出）
set -e

python scripts/ensure_mediacrawler.py
uv sync --directory crawler/MediaCrawler --no-dev
crawler/MediaCrawler/.venv/bin/pip uninstall opencv-python -y
crawler/MediaCrawler/.venv/bin/pip install 'opencv-python-headless>=4.11.0.86'
python scripts/patch_mediacrawler_venv.py
