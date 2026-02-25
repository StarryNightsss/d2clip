from fastapi import APIRouter, HTTPException, Body
from typing import Optional, Dict

from models.schemas import NoteAnalysisRequest, AnalysisResponse
from services.analysis_service import analysis_service

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/analyze")
async def analyze_notes(request: NoteAnalysisRequest):
    """
    分析笔记数据

    - **data_file**: 数据文件路径（相对于 crawler/MediaCrawler/data/）
    - **limit**: 分析数量限制（可选）

    返回：
    - 如果有任务正在运行，返回 {"status": "running", ...}
    - 如果成功开始分析，返回完整的 AnalysisResponse
    """
    try:
        result = await analysis_service.analyze_notes(
            data_file=request.data_file,
            limit=request.limit,
            platform=request.platform
        )
        return result

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")

@router.get("/status")
async def get_status():
    """获取分析服务状态"""
    return {
        "status": "ready",
        "vectorstore_loaded": analysis_service is not None
    }

@router.get("/results/{analysis_id}")
async def get_analysis_results(analysis_id: str):
    """
    获取指定分析任务的详细结果

    返回每条笔记的分析详情，用于数据列表页面展示
    """
    try:
        results = analysis_service.get_analysis_results(analysis_id)
        if not results:
            raise HTTPException(status_code=404, detail=f"未找到分析任务: {analysis_id}")
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取结果失败: {str(e)}")

@router.get("/latest-results")
async def get_latest_results(limit: Optional[int] = 100):
    """
    获取最近一次分析的结果列表

    用于数据列表页面快速展示最新分析数据
    """
    try:
        results = analysis_service.get_latest_results(limit)
        if not results:
            return {
                "total": 0,
                "results": [],
                "message": "暂无分析数据，请先在分析工作台运行分析"
            }
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取结果失败: {str(e)}")

@router.get("/progress")
async def get_analysis_progress():
    """
    获取当前分析任务的进度

    返回任务状态、进度百分比、已完成数量等
    """
    try:
        progress = analysis_service.get_task_progress()
        return progress
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取进度失败: {str(e)}")

@router.get("/history")
async def get_analysis_history(
    limit: Optional[int] = 10,
    offset: Optional[int] = 0,
    platform: Optional[str] = None
):
    """
    获取分析历史记录

    - **limit**: 返回数量限制（默认 10）
    - **offset**: 跳过数量，用于分页（默认 0）
    - **platform**: 平台筛选，如 xhs/dy（可选）

    返回：
    {
        "total": 总记录数,
        "items": [历史记录列表]
    }
    """
    try:
        history = analysis_service.get_analysis_history(limit, offset, platform)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取历史失败: {str(e)}")

@router.put("/report/{analysis_id}")
async def update_report(analysis_id: str, updated_report: Dict = Body(...)):
    """
    更新指定分析任务的报告内容

    - **analysis_id**: 分析任务 ID
    - **updated_report**: 更新后的报告对象（包含 report_title, summary, sections）

    返回：
    {
        "success": true,
        "message": "报告更新成功"
    }
    """
    try:
        success = analysis_service.update_report(analysis_id, updated_report)
        if not success:
            raise HTTPException(status_code=404, detail=f"未找到分析任务: {analysis_id}")
        return {"success": True, "message": "报告更新成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新报告失败: {str(e)}")
