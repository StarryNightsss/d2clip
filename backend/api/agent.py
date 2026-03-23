"""
Agent API 路由层
提供 Agent 聊天、执行计划、会话管理、WebSocket 实时推送
"""
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from backend.auth import decode_token
from backend.models.agent import (
    ChatRequest, ChatResponse, ExecutePlanRequest,
    AgentMode, StepNode
)
from backend.services.agent_service import agent_service

router = APIRouter(prefix="/agent", tags=["agent"])


def _current_username(request: Request) -> Optional[str]:
    """从 Authorization header 解析用户名"""
    auth = request.headers.get("Authorization") or ""
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:].strip()
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    return (payload.get("username") or payload.get("sub") or "").strip() or None


# ─── 会话管理 ───────────────────────────────────────────────

@router.post("/session")
async def create_session(request: Request):
    """创建新 Agent 会话"""
    try:
        body = await request.json()
    except Exception:
        body = {}
    user_id = _current_username(request)
    file_path = body.get("file_path")
    mode = body.get("mode", "agent")

    try:
        agent_mode = AgentMode(mode)
    except ValueError:
        agent_mode = AgentMode.AGENT

    session = await agent_service.create_session(
        user_id=user_id,
        file_path=file_path,
        mode=agent_mode
    )
    return {
        "session_id": session.id,
        "mode": session.mode,
        "created_at": session.created_at.isoformat()
    }


@router.get("/sessions")
async def list_sessions(request: Request, limit: int = 20, file_path: Optional[str] = None):
    """
    获取当前用户的 Agent 会话列表（历史记录）
    - file_path: 可选，筛选特定数据文件关联的会话
    """
    user_id = _current_username(request)
    print(f"[API] list_sessions: user_id={user_id}, file_path={file_path}")
    sessions = await agent_service.list_sessions(user_id=user_id, limit=limit)
    print(f"[API] list_sessions: 返回 {len(sessions)} 条会话")
    
    # 如果指定了 file_path，筛选关联的会话
    if file_path:
        sessions = [s for s in sessions if s.get("file_path") == file_path]
        print(f"[API] list_sessions: 筛选后剩余 {len(sessions)} 条会话")
    
    return {"sessions": sessions}


@router.get("/session/{session_id}")
async def get_session(session_id: str, request: Request):
    """获取指定会话详情（用于恢复历史记录）"""
    session = await agent_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    return session.dict()


@router.delete("/session/{session_id}")
async def delete_session(session_id: str, request: Request):
    """删除会话"""
    user_id = _current_username(request)
    ok = await agent_service.delete_session(session_id, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="会话不存在或无权限")
    return {"ok": True}


@router.get("/session/{session_id}/data")
async def get_session_data(session_id: str, request: Request):
    """
    获取会话的分析数据（供 DataTable 使用）
    从 Agent 会话的 final_report 中提取结果
    """
    user_id = _current_username(request)
    
    session = await agent_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    # Agent 会话的 final_report 即分析任务结果
    final_report = session.final_report or {}
    # 注意：generate_report 返回的结构中，results 字段在最外层
    results = final_report.get("results", [])
    
    return {
        "session_id": session_id,
        "results": results,
        "statistics": final_report.get("statistics", {}),
        "total": len(results)
    }


@router.patch("/session/{session_id}/report")
async def update_session_report(session_id: str, request: Request):
    """更新 Agent 会话的最终报告（用户编辑后保存）"""
    user_id = _current_username(request)
    try:
        body = await request.json()
    except Exception:
        body = {}
    session = await agent_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    if user_id and session.user_id and session.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权限修改此会话")
    # 更新 final_report 里的 report 字段
    if session.final_report is None:
        session.final_report = {}
    session.final_report["report"] = body
    session.updated_at = datetime.now()
    await agent_service._save(session)
    import asyncio
    asyncio.create_task(agent_service._sync_to_db(session))
    return {"ok": True}


# ─── 聊天 & 执行 ────────────────────────────────────────────

@router.post("/chat")
async def chat(request: Request, body: ChatRequest):
    """
    发送消息给 Agent
    - ASK 模式：直接回答，不生成计划
    - PLAN 模式：生成 DAG 计划，等待用户确认
    - AGENT 模式：生成计划并自动执行
    """
    user_id = _current_username(request)
    # 将 user_id 注入请求（若前端未传）
    if not body.session_id:
        pass  # 让 agent_service 在 chat 里创建新会话

    try:
        response: ChatResponse = await agent_service.chat(body, user_id=user_id)
        return response.dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent 处理失败: {str(e)}")


@router.post("/execute")
async def execute_plan(request: Request, body: ExecutePlanRequest):
    """
    执行计划（PLAN 模式用户确认后调用）
    - session_id: 会话 ID
    - step_ids: 指定步骤 ID 列表（None 表示全部）
    """
    session = await agent_service.get_session(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    if not session.plan:
        raise HTTPException(status_code=400, detail="该会话没有执行计划")

    # 异步执行（通过 WebSocket 推送状态）
    import asyncio
    asyncio.create_task(
        agent_service.execute_plan(body.session_id, body.step_ids)
    )
    return {"ok": True, "message": "开始执行计划"}


@router.post("/session/{session_id}/plan")
async def update_plan(session_id: str, request: Request, body: dict):
    """更新执行计划（用户在 PLAN 模式下调整步骤后调用）"""
    steps_data = body.get("steps", [])
    try:
        steps = [StepNode(**s) for s in steps_data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"步骤格式错误: {e}")

    await agent_service.update_plan(session_id, steps)
    return {"ok": True}


@router.post("/session/{session_id}/pause")
async def pause_execution(session_id: str):
    """暂停执行"""
    await agent_service.pause_execution(session_id)
    return {"ok": True}


@router.post("/session/{session_id}/resume")
async def resume_execution(session_id: str):
    """继续执行"""
    await agent_service.resume_execution(session_id)
    return {"ok": True}


# ─── WebSocket 实时推送 ──────────────────────────────────────

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket 实时推送步骤执行状态
    前端连接后，Agent 执行每个步骤时推送 StepUpdate
    """
    print(f"[WebSocket] 新连接: session_id={session_id}")
    await websocket.accept()
    print(f"[WebSocket] 连接已接受: session_id={session_id}")

    # 注册 WebSocket 到 agent_service
    await agent_service.register_websocket(session_id, websocket)
    print(f"[WebSocket] 已注册到 agent_service: session_id={session_id}")

    try:
        # 保持连接，等待前端消息（如 ping/close）
        while True:
            data = await websocket.receive_text()
            # 支持前端发送 ping 保活
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        await agent_service.unregister_websocket(session_id, websocket)


# ─── 快速模板 ────────────────────────────────────────────────

@router.get("/templates")
async def get_templates():
    """获取预定义的分析模板"""
    return {
        "templates": [
            {
                "key": "tone",
                "label": "分析口红色调趋势",
                "description": "分析口红色调分布，生成饼图和分析文案",
                "default_message": "帮我分析一下口红色调的趋势，生成色调分布饼图和分析报告"
            },
            {
                "key": "style",
                "label": "对比不同妆容风格",
                "description": "分析妆容风格占比，生成柱状图对比",
                "default_message": "对比一下不同妆容风格的占比，生成风格分布图表"
            },
            {
                "key": "full",
                "label": "生成完整趋势报告",
                "description": "包含色调、风格、关键词的完整分析报告",
                "default_message": "帮我生成一份完整的口红趋势分析报告，包含色调分布、风格对比和关键词分析"
            }
        ]
    }
