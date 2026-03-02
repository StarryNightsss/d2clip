#!/usr/bin/env python3
"""
构建时对 MediaCrawler 子模块打补丁：让环境检测和爬虫任务使用子模块自身的 .venv，
避免继承根项目 VIRTUAL_ENV 导致 ModuleNotFoundError。子模块无法在主仓库提交，故在构建阶段应用。
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MC = ROOT / "crawler" / "MediaCrawler"

# 1) api/main.py: check_environment 使用本地 .venv
MAIN_PY = MC / "api" / "main.py"
OLD_ENV_CHECK = '''@app.get("/api/env/check")
async def check_environment():
    """Check if MediaCrawler environment is configured correctly"""
    try:
        # Run uv run main.py --help command to check environment
        process = await asyncio.create_subprocess_exec(
            "uv", "run", "main.py", "--help",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd="."  # Project root directory
        )'''

NEW_ENV_CHECK = '''@app.get("/api/env/check")
async def check_environment():
    """Check if MediaCrawler environment is configured correctly"""
    try:
        # Use local .venv so "uv run main.py" does not inherit parent VIRTUAL_ENV (e.g. /app/.venv)
        env = os.environ.copy()
        api_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(api_dir)  # MediaCrawler root
        local_venv = os.path.join(project_root, ".venv")
        if os.path.isdir(local_venv):
            env["VIRTUAL_ENV"] = local_venv
        else:
            env.pop("VIRTUAL_ENV", None)
        # Run uv run main.py --help to check environment
        process = await asyncio.create_subprocess_exec(
            "uv", "run", "main.py", "--help",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=project_root,
            env=env,
        )'''

# 2) api/services/crawler_manager.py: 启动爬虫子进程时使用本地 .venv
MANAGER_PY = MC / "api" / "services" / "crawler_manager.py"
OLD_POPEN = '''            try:
                # Start subprocess
                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding='utf-8',
                    bufsize=1,
                    cwd=str(self._project_root),
                    env={**os.environ, "PYTHONUNBUFFERED": "1"}
                )'''

NEW_POPEN = '''            try:
                # Use MediaCrawler .venv when present (e.g. Railway) so uv run uses local deps
                run_env = {**os.environ, "PYTHONUNBUFFERED": "1"}
                local_venv = os.path.join(self._project_root, ".venv")
                if os.path.isdir(local_venv):
                    run_env["VIRTUAL_ENV"] = local_venv
                else:
                    run_env.pop("VIRTUAL_ENV", None)
                # Start subprocess
                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding='utf-8',
                    bufsize=1,
                    cwd=str(self._project_root),
                    env=run_env,
                )'''


def main():
    if not MAIN_PY.exists():
        print("MediaCrawler api/main.py not found, skip patch")
        return
    text = MAIN_PY.read_text(encoding="utf-8")
    if NEW_ENV_CHECK in text:
        print("api/main.py already patched")
    elif OLD_ENV_CHECK in text:
        text = text.replace(OLD_ENV_CHECK, NEW_ENV_CHECK, 1)
        MAIN_PY.write_text(text, encoding="utf-8")
        print("Patched api/main.py")
    else:
        print("api/main.py: env check block not found, skip")

    if not MANAGER_PY.exists():
        print("crawler_manager.py not found, skip patch")
        return
    text = MANAGER_PY.read_text(encoding="utf-8")
    if NEW_POPEN in text:
        print("crawler_manager.py already patched")
    elif OLD_POPEN in text:
        text = text.replace(OLD_POPEN, NEW_POPEN, 1)
        MANAGER_PY.write_text(text, encoding="utf-8")
        print("Patched crawler_manager.py")
    else:
        print("crawler_manager.py: Popen block not found, skip")


if __name__ == "__main__":
    main()
