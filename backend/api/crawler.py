"""爬虫 API 路由"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Optional
from pydantic import BaseModel
import json
import asyncio

from backend.services.crawler_service import crawler_service


router = APIRouter(prefix="/crawler", tags=["crawler"])


class CrawlerStartRequest(BaseModel):
    """启动爬虫请求（与前端参数完全匹配）"""
    platform: str = "xhs"
    login_type: str = "cookie"
    crawler_type: str = "search"
    keywords: str
    specified_ids: str = ""
    creator_ids: str = ""
    start_page: int = 1
    max_notes_count: int = 100
    enable_comments: bool = True
    enable_sub_comments: bool = False
    save_option: str = "json"
    cookies: str = ""
    headless: bool = False


@router.post("/start")
async def start_crawler(request: CrawlerStartRequest, background_tasks: BackgroundTasks):
    """启动爬虫任务"""
    try:
        status = crawler_service.get_status()
        if status["status"] == "running":
            crawler_service.stop_crawl()
            import time
            time.sleep(1)

        background_tasks.add_task(
            crawler_service.start_crawl,
            platform=request.platform,
            crawler_type=request.crawler_type,
            keywords=request.keywords,
            max_notes_count=request.max_notes_count,
            enable_comments=request.enable_comments,
            enable_sub_comments=request.enable_sub_comments,
            cookies=request.cookies,
        )

        return {
            "success": True,
            "message": "爬虫任务已启动",
            "task_id": crawler_service.get_task_id()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动爬虫失败: {str(e)}")


@router.post("/stop")
async def stop_crawler():
    """停止爬虫任务"""
    try:
        crawler_service.stop_crawl()
        return {
            "success": True,
            "message": "爬虫任务已停止"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"停止爬虫失败: {str(e)}")


@router.get("/status")
async def get_crawler_status():
    """获取爬虫状态"""
    try:
        return crawler_service.get_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取状态失败: {str(e)}")


@router.get("/logs")
async def get_crawler_logs(limit: int = 100):
    """获取爬虫日志"""
    try:
        logs = crawler_service.get_logs(limit)
        return {
            "logs": logs,
            "total": len(logs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取日志失败: {str(e)}")


@router.get("/logs/stream")
async def stream_crawler_logs():
    """实时日志流（SSE）"""
    async def event_generator():
        log_queue = crawler_service.add_log_listener()

        try:
            existing_logs = crawler_service.get_logs(50)
            for log in existing_logs:
                yield f"data: {json.dumps(log, ensure_ascii=False)}\n\n"

            while True:
                try:
                    log = await asyncio.to_thread(log_queue.get, timeout=30.0)
                    yield f"data: {json.dumps(log, ensure_ascii=False)}\n\n"
                except Exception:
                    yield f": heartbeat\n\n"

        except asyncio.CancelledError:
            pass
        finally:
            crawler_service.remove_log_listener(log_queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
