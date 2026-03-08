"""
登录：仅当配置了 DATABASE_URL 时走 DB 校验并返回 JWT，不破坏现有逻辑
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import bcrypt

from backend.config import settings
from backend.db import SessionLocal, is_db_configured
from backend.db.models import User
from backend.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginBody(BaseModel):
    username: str = Field(..., description="用户名（如 admin@d2clip.com）")
    password: str = Field(..., description="密码")
    department: str | None = Field(None, description="登录页选择的部门 key，非 admin 必须与账号所属部门一致才能登录")


@router.post("/login")
async def login(body: LoginBody):
    """登录：校验用户名密码，返回 JWT 与用户信息。未配置 DATABASE_URL 时返回 503。"""
    if not is_db_configured():
        raise HTTPException(status_code=503, detail="Auth not configured (DATABASE_URL not set)")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == body.username).first()
        if not user or user.status != "active":
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        if not bcrypt.checkpw(body.password.encode("utf-8"), user.password_hash.encode("utf-8")):
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        # 部门 key / name（账号在库里的部门）
        dept_key = "product"
        dept_name = "产品部门"
        if user.department_id:
            from backend.db.models import Department
            d = db.query(Department).filter(Department.id == user.department_id).first()
            if d:
                dept_key = d.key
                dept_name = d.name
        # 非 admin：只能以自己所在部门登录，选错部门直接拒绝
        is_admin = (dept_key == "admin" or (user.username or "").lower() == "admin@d2clip.com")
        if not is_admin:
            chosen = (body.department or "").strip().lower()
            if not chosen:
                raise HTTPException(status_code=401, detail="请选择您所在部门后再登录")
            if chosen != dept_key.lower():
                raise HTTPException(
                    status_code=401,
                    detail=f"您只能以所在部门（{dept_name}）登录，无法以其他部门身份进入系统",
                )
        token = create_access_token(data={"sub": str(user.id), "username": user.username})
        # admin 可用登录页选择的部门作为本次身份；非 admin 固定为库里的部门
        if is_admin and (body.department or "").strip():
            chosen = (body.department or "").strip().lower()
            if chosen != dept_key.lower():
                dept_key = chosen
                dept_name = {"product": "产品部门", "rd": "研发部门", "market": "市场部门", "operation": "运营部门", "admin": "管理员"}.get(chosen, chosen)
        user_info = {
            "username": user.username,
            "name": user.name,
            "department": dept_key,
            "departmentName": dept_name,
            "role": user.role,
            "avatar": user.avatar or "",
        }
        return {"token": token, "userInfo": user_info}
    finally:
        db.close()
