#!/bin/bash
# D2C 口红实验室 - 快速启动（uv 管理）

echo "🚀 D2C 口红实验室"
echo "1) 首次安装  2) 启动后端  3) 完整启动"
read -p "选择: " choice

case $choice in
    1)
        echo "📦 安装依赖（uv）..."
        cd backend && uv sync && cd ..
        echo "🔢 向量化知识库..."
        uv run python scripts/vectorize_knowledge.py
        ;;
    2)
        echo "🌐 启动后端..."
        uv run python -m backend.main
        ;;
    3)
        echo "🚀 完整启动..."
        uv run python -m backend.main &
        sleep 2
        cd frontend && npm run dev
        ;;
esac
