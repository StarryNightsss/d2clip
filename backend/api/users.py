"""
职员管理 CRUD（从数据库读写；未配置 DATABASE_URL 时不应挂此路由，由 main 按需 include）
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import bcrypt

from backend.db import SessionLocal, get_db, is_db_configured
from backend.db.models import User, Department
from sqlalchemy.orm import Session

router = APIRouter(prefix="/users", tags=["users"])

DEPARTMENT_NAME_MAP = {
    "product": "产品部门",
    "rd": "研发部门",
    "market": "市场部门",
    "operation": "运营部门",
    "admin": "管理员",
    "design": "研发部门",  # 兼容旧数据：设计=研发
    "marketing": "市场部门",  # 兼容旧数据：营销=市场
}


def _user_to_item(user: User, db: Session) -> dict:
    dept_key = ""
    dept_name = ""
    if user.department_id:
        d = db.query(Department).filter(Department.id == user.department_id).first()
        if d:
            dept_key = d.key
            dept_name = d.name
    return {
        "id": user.id,
        "key": str(user.id),
        "username": user.username,
        "name": user.name,
        "department": dept_key,
        "departmentName": dept_name or DEPARTMENT_NAME_MAP.get(dept_key, dept_key),
        "role": user.role,
        "email": user.email or "",
        "status": user.status,
        "avatar": user.avatar or "",
    }


class UserCreate(BaseModel):
    username: str = Field(..., description="用户名")
    name: str = Field(..., description="姓名")
    department: str = Field(..., description="部门 key")
    role: str = Field(default="user", description="角色")
    email: str = Field(default="", description="邮箱")
    password: str = Field(default="123456", description="密码")


class UserUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None


@router.get("", response_model=List[dict])
def list_users(db: Session = Depends(get_db)):
    """职员列表（与前端表格格式一致）"""
    users = db.query(User).order_by(User.id).all()
    return [_user_to_item(u, db) for u in users]


@router.post("", status_code=201)
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    """新增职员"""
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    dept = db.query(Department).filter(Department.key == body.department).first()
    dept_id = dept.id if dept else None
    password_hash = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = User(
        username=body.username,
        password_hash=password_hash,
        name=body.name,
        department_id=dept_id,
        role=body.role or "user",
        email=body.email or "",
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_to_item(user, db)


@router.put("/{user_id}")
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db)):
    """更新职员"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if body.name is not None:
        user.name = body.name
    if body.department is not None:
        dept = db.query(Department).filter(Department.key == body.department).first()
        user.department_id = dept.id if dept else None
    if body.role is not None:
        user.role = body.role
    if body.email is not None:
        user.email = body.email
    if body.status is not None:
        user.status = body.status
    if body.password is not None and body.password.strip():
        user.password_hash = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db.commit()
    db.refresh(user)
    return _user_to_item(user, db)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """删除职员"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    db.delete(user)
    db.commit()
    return None
