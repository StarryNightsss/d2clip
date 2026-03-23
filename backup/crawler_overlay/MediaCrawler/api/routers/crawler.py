# -*- coding: utf-8 -*-
# d2clip overlay: 支持从 XHS_COOKIES 环境变量读取默认 Cookie
import os
from fastapi import APIRouter, HTTPException

from ..schemas import CrawlerStartRequest, CrawlerStatusResponse
from ..services import crawler_manager

router = APIRouter(prefix="/crawler", tags=["crawler"])


def _apply_default_cookies(request: CrawlerStartRequest) -> CrawlerStartRequest:
    """请求未传 cookie 时，从环境变量读取（XHS_COOKIES，由 run_crawler_api 或 Railway 注入）"""
    if request.cookies and request.cookies.strip():
        return request
    default = os.environ.get("XHS_COOKIES") if request.platform.value == "xhs" else ""
    default = default or os.environ.get("CRAWLER_DEFAULT_COOKIES", "")
    if default:
        return CrawlerStartRequest(**{**request.model_dump(), "cookies": default})
    return request


@router.post("/start")
async def start_crawler(request: CrawlerStartRequest):
    """Start crawler task"""
    request = _apply_default_cookies(request)
    success = await crawler_manager.start(request)
    if not success:
        if crawler_manager.process and crawler_manager.process.poll() is None:
            raise HTTPException(status_code=400, detail="Crawler is already running")
        raise HTTPException(status_code=500, detail="Failed to start crawler")
    return {"status": "ok", "message": "Crawler started successfully"}


@router.post("/stop")
async def stop_crawler():
    success = await crawler_manager.stop()
    if not success:
        if not crawler_manager.process or crawler_manager.process.poll() is not None:
            raise HTTPException(status_code=400, detail="No crawler is running")
        raise HTTPException(status_code=500, detail="Failed to stop crawler")
    return {"status": "ok", "message": "Crawler stopped successfully"}


@router.get("/status", response_model=CrawlerStatusResponse)
async def get_crawler_status():
    return crawler_manager.get_status()


@router.get("/logs")
async def get_logs(limit: int = 100):
    logs = crawler_manager.logs[-limit:] if limit > 0 else crawler_manager.logs
    return {"logs": [log.model_dump() for log in logs]}
