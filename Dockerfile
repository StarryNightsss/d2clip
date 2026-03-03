# d2clip 主后端 + xhs_simple 爬虫（Railway 部署）
# 使用 Debian 基础镜像，playwright install --with-deps 可正确安装 Chromium 与系统依赖
# Railway 检测到 Dockerfile 会自动使用，替代 Nixpacks

FROM python:3.12-bookworm

# 1. 安装 uv
RUN pip install --no-cache-dir uv

WORKDIR /app

# 2. 拷贝依赖定义（利用层缓存加速重复构建）
COPY pyproject.toml uv.lock ./
COPY backend/ ./backend/

# 3. 安装 Python 依赖（含 playwright）
RUN uv sync --no-dev --frozen

# 4. 安装 Playwright Chromium + 系统依赖（Debian 有 apt，--with-deps 可正确执行）
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright
RUN uv run playwright install --with-deps chromium

# 5. 拷贝完整项目（crawler、scripts、knowledge、crawler_config 等）
COPY . .

# 6. 向量化知识库（构建时执行，减少首次启动耗时）
RUN uv run python scripts/vectorize_knowledge.py || true

# 7. 启动（Railway 注入 PORT 环境变量）
EXPOSE 8000
CMD ["uv", "run", "python", "scripts/railway_start.py"]
