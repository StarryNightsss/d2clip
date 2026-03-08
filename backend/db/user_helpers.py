"""从 DB 返回与现有 community 接口一致的用户列表格式"""
from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from backend.db.models import User, Department


def get_avatar_by_author(db: Session, author: str) -> Optional[str]:
    """按作者（用户名或姓名）查头像；未命中则返回 None（调用方可兜底 dicebear）。"""
    if not (author or "").strip():
        return None
    author = author.strip()
    u = db.query(User).filter(
        (User.username == author) | (User.name == author),
        User.status == "active",
    ).first()
    if u and (u.avatar or "").strip():
        return u.avatar
    return None


def get_users_for_community(db: Session) -> List[Dict]:
    """返回 [{ username, name, avatar, department }]，与 GET /community/users 原格式一致"""
    users = db.query(User).filter(User.status == "active").all()
    result = []
    for u in users:
        dept_key = ""
        if u.department_id:
            d = db.query(Department).filter(Department.id == u.department_id).first()
            if d:
                dept_key = d.key
        result.append({
            "username": u.username,
            "name": u.name,
            "avatar": u.avatar or "",
            "department": dept_key,
        })
    return result
