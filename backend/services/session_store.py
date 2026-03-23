"""
Agent 会话持久化层
- 有 REDIS_URL：使用 Redis（redis.asyncio），支持多实例部署（Railway）
- 无 REDIS_URL：降级为内存字典，单实例开发可用
"""
import json
import logging
from typing import Optional, Dict, List, Any

from backend.config import settings

logger = logging.getLogger(__name__)

# ─── Redis 客户端（懒加载）────────────────────────────────────

_redis_client = None


async def _get_redis():
    """获取 Redis 连接（懒加载，仅在配置了 REDIS_URL 时可用）"""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    if not settings.REDIS_URL:
        return None
    try:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
        )
        # 测试连通性
        await _redis_client.ping()
        logger.info("✅ Redis 连接成功: %s", settings.REDIS_URL.split("@")[-1])
        return _redis_client
    except Exception as e:
        logger.warning("⚠️ Redis 连接失败，降级为内存存储: %s", e)
        _redis_client = None
        return None


# ─── 内存降级存储 ─────────────────────────────────────────────

_memory_store: Dict[str, str] = {}   # session_id -> JSON string
_user_sessions: Dict[str, List[str]] = {}  # user_id -> [session_id, ...]


def _session_key(session_id: str) -> str:
    return f"agent:session:{session_id}"


def _user_key(user_id: str) -> str:
    return f"agent:user:{user_id}:sessions"


# ─── 公共接口 ─────────────────────────────────────────────────

async def save_session(session_id: str, data: dict, user_id: Optional[str] = None) -> None:
    """保存会话数据"""
    json_str = json.dumps(data, ensure_ascii=False, default=str)
    redis = await _get_redis()

    if redis:
        try:
            key = _session_key(session_id)
            await redis.setex(key, settings.AGENT_SESSION_TTL, json_str)
            # 维护用户会话列表
            if user_id:
                ukey = _user_key(user_id)
                await redis.lrem(ukey, 0, session_id)   # 去重
                await redis.lpush(ukey, session_id)      # 最新在前
                await redis.ltrim(ukey, 0, 99)           # 最多保留 100 条
                await redis.expire(ukey, settings.AGENT_SESSION_TTL)
            return
        except Exception as e:
            logger.warning("Redis 写入失败，降级内存: %s", e)

    # 内存降级
    _memory_store[_session_key(session_id)] = json_str
    if user_id:
        lst = _user_sessions.setdefault(user_id, [])
        if session_id in lst:
            lst.remove(session_id)
        lst.insert(0, session_id)


async def load_session(session_id: str) -> Optional[dict]:
    """加载会话数据，优先从 Redis/内存，如果没有则从 PostgreSQL 读取"""
    redis = await _get_redis()

    if redis:
        try:
            raw = await redis.get(_session_key(session_id))
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.warning("Redis 读取失败，降级内存: %s", e)

    # 尝试从内存读取
    raw = _memory_store.get(_session_key(session_id))
    if raw:
        return json.loads(raw)
    
    # 如果 Redis/内存都没有，尝试从 PostgreSQL 读取
    try:
        from backend.db import is_db_configured, SessionLocal
        if is_db_configured() and SessionLocal:
            from backend.db.models import AgentSession as DBSession
            db = SessionLocal()
            try:
                db_session = db.query(DBSession).filter(DBSession.id == session_id).first()
                if db_session:
                    return {
                        "id": db_session.id,
                        "user_id": db_session.user_id,
                        "title": db_session.title,
                        "mode": db_session.mode,
                        "status": db_session.status,
                        "messages": db_session.messages or [],
                        "plan": db_session.plan or [],
                        "final_report": db_session.final_report,
                        "file_path": db_session.file_path,
                        "created_at": db_session.created_at.isoformat() if db_session.created_at else None,
                        "updated_at": db_session.updated_at.isoformat() if db_session.updated_at else None,
                    }
            finally:
                db.close()
    except Exception as e:
        logger.warning("从数据库读取会话失败: %s", e)
    
    return None


async def delete_session(session_id: str, user_id: Optional[str] = None) -> bool:
    """删除会话"""
    redis = await _get_redis()

    if redis:
        try:
            deleted = await redis.delete(_session_key(session_id))
            if user_id:
                await redis.lrem(_user_key(user_id), 0, session_id)
            return deleted > 0
        except Exception as e:
            logger.warning("Redis 删除失败，降级内存: %s", e)

    existed = _session_key(session_id) in _memory_store
    _memory_store.pop(_session_key(session_id), None)
    if user_id and user_id in _user_sessions:
        try:
            _user_sessions[user_id].remove(session_id)
        except ValueError:
            pass
    return existed


async def list_user_sessions(user_id: Optional[str], limit: int = 20) -> List[dict]:
    """
    获取用户的会话列表（摘要信息），用于历史记录面板
    优先从 Redis/内存读取，如果没有配置 Redis 则从 PostgreSQL 读取
    返回格式：[{id, title, mode, status, created_at, updated_at}, ...]
    """
    results = []
    logger.info(f"[SessionStore] list_user_sessions: user_id={user_id}, _user_sessions keys={list(_user_sessions.keys())}")
    
    # 尝试从 Redis/内存读取
    if not user_id:
        # 未登录时返回内存里所有会话（开发用）
        logger.info(f"[SessionStore] 未登录，返回内存中所有会话: {len(_memory_store)} 条")
        for key, raw in list(_memory_store.items()):
            if key.startswith("agent:session:"):
                try:
                    data = json.loads(raw)
                    results.append(_to_summary(data))
                except Exception:
                    pass
    else:
        logger.info(f"[SessionStore] 已登录用户 {user_id} 的会话: {_user_sessions.get(user_id, [])}")
        redis = await _get_redis()
        session_ids = []

        if redis:
            try:
                session_ids = await redis.lrange(_user_key(user_id), 0, limit - 1)
            except Exception as e:
                logger.warning("Redis 列表读取失败: %s", e)

        if not session_ids:
            session_ids = (_user_sessions.get(user_id) or [])[:limit]

        for sid in session_ids:
            data = await load_session(sid)
            if data:
                results.append(_to_summary(data))

    # 如果 Redis/内存没有数据，尝试从 PostgreSQL 读取
    if not results:
        try:
            from backend.db import is_db_configured, SessionLocal
            if is_db_configured() and SessionLocal:
                from backend.db.models import AgentSession as DBSession
                db = SessionLocal()
                try:
                    query = db.query(DBSession)
                    if user_id:
                        query = query.filter(DBSession.user_id == user_id)
                    db_sessions = query.order_by(DBSession.updated_at.desc()).limit(limit).all()
                    for s in db_sessions:
                        # 构造与 Redis 存储结构兼容的字典，再复用 _to_summary，确保前后端字段完全一致
                        data = {
                            "id": s.id,
                            "mode": s.mode or "agent",
                            "status": s.status or "pending",
                            "created_at": s.created_at.isoformat() if s.created_at else "",
                            "updated_at": s.updated_at.isoformat() if s.updated_at else "",
                            "file_path": s.file_path,  # 关联的数据文件路径
                            "messages": s.messages or [],
                            "final_report": s.final_report or {},
                        }
                        results.append(_to_summary(data))
                finally:
                    db.close()
        except Exception as e:
            logger.warning("从数据库读取会话列表失败: %s", e)

    results.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return results[:limit]


def _to_summary(data: dict) -> dict:
    """从完整会话数据提取摘要，用于历史列表

    这里不会返回完整的 messages，只返回：
    - id / title / mode / status
    - created_at / updated_at
    - final_report 的轻量信息（用于前端判断是否有报告、展示标题）
    """
    messages = data.get("messages", [])
    final_report = data.get("final_report") or {}

    # 兼容不同结构：
    # 1) Chain/Agent 格式：{"report": {"report_title": ...}}
    # 2) 直接扁平：{"report_title": ...}
    report_obj = final_report.get("report") if isinstance(final_report, dict) else None
    report_title = None
    if isinstance(report_obj, dict):
        report_title = report_obj.get("report_title") or report_obj.get("title")
    if not report_title and isinstance(final_report, dict):
        report_title = final_report.get("report_title") or final_report.get("title")

    # 优先使用报告标题，其次是第一条用户消息
    title = "新对话"
    if report_title:
        title = report_title
    else:
        for msg in messages:
            if msg.get("role") == "user":
                content = msg.get("content", "")
                title = content[:30] + ("..." if len(content) > 30 else "")
                break

    # 只保留报告的轻量信息，避免把大 JSON 塞进历史列表
    light_final_report = None
    if isinstance(final_report, dict) and report_title:
        light_final_report = {
            "report_title": report_title,
            "has_report": True,
        }

    return {
        "id": data.get("id", ""),
        "title": title,
        "mode": data.get("mode", "agent"),
        "status": _calc_status(data),
        "created_at": data.get("created_at", ""),
        "updated_at": data.get("updated_at", ""),
        "file_path": data.get("file_path"),  # 关联的数据文件路径
        "final_report": light_final_report,
        "has_report": bool(report_title),
    }


def _calc_status(data: dict) -> str:
    """根据执行计划状态推算会话状态"""
    if data.get("is_executing"):
        return "running"
    plan = data.get("plan") or []
    if not plan:
        return "pending"
    statuses = [s.get("status", "pending") for s in plan]
    if all(s == "completed" for s in statuses):
        return "completed"
    if any(s == "error" for s in statuses):
        return "error"
    if any(s == "running" for s in statuses):
        return "running"
    return "pending"
