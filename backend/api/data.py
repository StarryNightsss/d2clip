"""数据文件 API"""
from fastapi import APIRouter, Query, HTTPException
from pathlib import Path
import json
from typing import Optional

from backend.config import settings

router = APIRouter(prefix="/data", tags=["data"])

# 使用配置中的爬虫数据目录（无需 MediaCrawler 子模块）
DATA_DIR = settings.CRAWLER_DATA_DIR


@router.get("/files")
async def get_data_files(
    file_type: Optional[str] = Query(None, description="文件类型过滤 (json/csv)")
):
    """获取可用的数据文件列表"""
    files = []

    xhs_dir = DATA_DIR / "xhs"
    if xhs_dir.exists():
        if not file_type or file_type == "json":
            json_dir = xhs_dir / "json"
            if json_dir.exists():
                for file in json_dir.glob("*.json"):
                    relative_path = f"xhs/json/{file.name}"
                    files.append({
                        "path": relative_path,
                        "name": file.name,
                        "size": file.stat().st_size,
                        "modified": file.stat().st_mtime,
                        "type": "json"
                    })

        if not file_type or file_type == "csv":
            csv_dir = xhs_dir / "csv"
            if csv_dir.exists():
                for file in csv_dir.glob("*.csv"):
                    relative_path = f"xhs/csv/{file.name}"
                    files.append({
                        "path": relative_path,
                        "name": file.name,
                        "size": file.stat().st_size,
                        "modified": file.stat().st_mtime,
                        "type": "csv"
                    })

    files.sort(key=lambda x: x["modified"], reverse=True)
    return {"files": files, "total": len(files)}


@router.get("/files/{file_path:path}")
async def get_file_content(
    file_path: str,
    preview: bool = Query(True, description="是否预览模式"),
    limit: int = Query(100, description="预览行数限制")
):
    """获取文件内容"""
    # 统一路径分隔符（Windows 兼容）
    file_path_normalized = file_path.replace("\\", "/")
    full_path = DATA_DIR / file_path_normalized

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")

    if not full_path.is_file():
        raise HTTPException(status_code=400, detail="不是有效的文件")

    try:
        if file_path.endswith(".json"):
            with open(full_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            if preview and isinstance(data, list):
                data = data[:limit]

            return {
                "content": data,
                "total": len(data) if isinstance(data, list) else 1,
                "preview": preview
            }
        else:
            with open(full_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            if preview:
                lines = lines[:limit]

            return {
                "content": lines,
                "total": len(lines),
                "preview": preview
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取文件失败: {str(e)}")


@router.get("/stats")
async def get_data_stats():
    """获取数据统计"""
    stats = {
        "total_files": 0,
        "total_notes": 0,
        "total_comments": 0,
        "platforms": {}
    }

    xhs_json_dir = DATA_DIR / "xhs" / "json"
    if xhs_json_dir.exists():
        for file in xhs_json_dir.glob("*.json"):
            stats["total_files"] += 1
            try:
                with open(file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                if "contents" in file.name or "search_contents" in file.name:
                    count = len(data) if isinstance(data, list) else 0
                    stats["total_notes"] += count
                elif "comments" in file.name:
                    count = len(data) if isinstance(data, list) else 0
                    stats["total_comments"] += count
            except Exception:
                pass

    stats["platforms"]["xhs"] = {
        "notes": stats["total_notes"],
        "comments": stats["total_comments"]
    }

    return stats
