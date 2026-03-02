#!/usr/bin/env python3
"""
构建阶段拉取 MediaCrawler：有 .git 则 submodule update，否则直接 clone。
Railway 构建上下文常无 .git，故用 clone 兜底。
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEDIACRAWLER_DIR = ROOT / "crawler" / "MediaCrawler"
REPO_URL = "https://github.com/NanmiCoder/MediaCrawler.git"


def main():
    if (ROOT / ".git").exists():
        r = subprocess.run(
            ["git", "submodule", "update", "--init", "--recursive"],
            cwd=str(ROOT),
        )
        if r.returncode != 0:
            sys.exit(r.returncode)
        print("✅ MediaCrawler: submodule 已拉取")
        return

    # 无 .git（如 Railway 构建）：直接 clone 到目标路径
    if MEDIACRAWLER_DIR.joinpath("pyproject.toml").exists():
        print("✅ MediaCrawler: 已存在，跳过")
        return

    import shutil
    MEDIACRAWLER_DIR.parent.mkdir(parents=True, exist_ok=True)
    if MEDIACRAWLER_DIR.exists():
        shutil.rmtree(MEDIACRAWLER_DIR, ignore_errors=True)

    r = subprocess.run(
        ["git", "clone", "--depth", "1", REPO_URL, str(MEDIACRAWLER_DIR)],
        cwd=str(ROOT),
    )
    if r.returncode != 0:
        sys.exit(r.returncode)
    print("✅ MediaCrawler: clone 完成")


if __name__ == "__main__":
    main()
