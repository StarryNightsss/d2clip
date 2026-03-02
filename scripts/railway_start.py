#!/usr/bin/env python3
"""
Railway 启动脚本：同一容器内先向量化知识库，再启动后端（不用 &&，单入口）。
用法：uv run python scripts/railway_start.py
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def main():
    # 1. 先跑向量化（与后端同容器、同磁盘，避免 preDeploy 环境不一致）
    print("📦 [Railway] 正在向量化知识库...")
    r = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "vectorize_knowledge.py")],
        cwd=str(ROOT),
        env=os.environ,
    )
    if r.returncode != 0:
        print("⚠️ 向量化未成功，继续启动后端（向量检索可能为空）")
    else:
        print("✅ [Railway] 向量化完成，正在启动后端...")

    # 2. 用 exec 替换当前进程为后端，保留 PORT 等环境变量，便于 Railway 管理
    os.execve(sys.executable, [sys.executable, "-m", "backend.main"], os.environ)

if __name__ == "__main__":
    main()
