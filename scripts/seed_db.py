#!/usr/bin/env python3
"""
初始化数据库表（7 张核心表）并写入种子数据（部门、职员、社群分组）。
仅在配置了 DATABASE_URL 时执行；不修改任何现有接口。
用法（项目根目录）：uv run python scripts/seed_db.py
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.config import settings
from backend.db.base import Base
from backend.db.models import Department, User, CommunityGroup, Post, UserGroupRead  # UserGroupRead 用于已读表
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import bcrypt

# 统一初始密码
DEFAULT_PASSWORD = "123456"


def main():
    url = getattr(settings, "DATABASE_URL", "") or ""
    if not url or not str(url).strip():
        print("未配置 DATABASE_URL，请先在 .env 中设置（例如 postgresql://postgres:密码@localhost:5432/d2clip）")
        sys.exit(1)

    engine = create_engine(url, pool_pre_ping=True)
    Base.metadata.create_all(engine)

    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = Session()
    password_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        # 部门：设计=研发(rd)，营销=市场(market)，只保留 5 个；先迁移再删旧
        dept_rows = [
            ("admin", "管理员", 0),
            ("product", "产品部门", 1),
            ("rd", "研发部门", 2),
            ("market", "市场部门", 3),
            ("operation", "运营部门", 4),
        ]
        # 若库里还有旧的 design/marketing 部门，先把用户归到 rd/market 再删
        old_to_new = [("design", "rd"), ("marketing", "market")]
        for old_key, new_key in old_to_new:
            old_dept = db.query(Department).filter(Department.key == old_key).first()
            new_dept = db.query(Department).filter(Department.key == new_key).first()
            if old_dept and new_dept:
                db.query(User).filter(User.department_id == old_dept.id).update({User.department_id: new_dept.id})
        db.query(Department).filter(Department.key.in_(["design", "marketing"])).delete(synchronize_session=False)
        db.commit()

        for key, name, order in dept_rows:
            existing = db.query(Department).filter(Department.key == key).first()
            if not existing:
                db.add(Department(key=key, name=name, sort_order=order))
        db.commit()

        key_to_id = {r.key: r.id for r in db.query(Department).all()}

        # 职员：用户名 = 邮箱 姓名全拼@d2clip.com，密码 123456，头像沿用原 mock
        base_avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed="
        users_data = [
            ("admin@d2clip.com", "管理员", "admin", "admin", "/kuromi-avatar.png", "admin@d2clip.com"),
            ("testsss@admin.com", "测试管理员", "admin", "admin", "/kuromi-avatar.png", "testsss@admin.com"),
            ("zhangxiaowen@d2clip.com", "张晓雯", "product", "user", f"{base_avatar}zhang", "zhangxiaowen@d2clip.com"),
            ("lisi@d2clip.com", "李四", "rd", "user", f"{base_avatar}lisi", "lisi@d2clip.com"),
            ("wangwu@d2clip.com", "王五", "market", "user", f"{base_avatar}wangwu", "wangwu@d2clip.com"),
            ("zhaoliu@d2clip.com", "赵六", "operation", "user", f"{base_avatar}zhaoliu", "zhaoliu@d2clip.com"),
            ("liming@d2clip.com", "李明", "product", "user", f"{base_avatar}liming", "liming@d2clip.com"),
            ("wangfang@d2clip.com", "王芳", "rd", "user", f"{base_avatar}wangfang", "wangfang@d2clip.com"),
            ("chenyue@d2clip.com", "陈悦", "market", "user", f"{base_avatar}chenyue", "chenyue@d2clip.com"),
            ("liuyang@d2clip.com", "刘洋", "operation", "user", f"{base_avatar}liuyang", "liuyang@d2clip.com"),
            ("zhoumin@d2clip.com", "周敏", "product", "user", f"{base_avatar}zhoumin", "zhoumin@d2clip.com"),
            ("zhaolin@d2clip.com", "赵琳", "rd", "user", f"{base_avatar}zhaolin", "zhaolin@d2clip.com"),
            ("sunting@d2clip.com", "孙婷", "product", "user", f"{base_avatar}sunting", "sunting@d2clip.com"),
            ("wuqian@d2clip.com", "吴倩", "operation", "user", f"{base_avatar}wuqian", "wuqian@d2clip.com"),
            ("zhenghao@d2clip.com", "郑浩", "rd", "user", f"{base_avatar}zhenghao", "zhenghao@d2clip.com"),
            ("linna@d2clip.com", "林娜", "market", "user", f"{base_avatar}linna", "linna@d2clip.com"),
            ("huanglei@d2clip.com", "黄磊", "operation", "user", f"{base_avatar}huanglei", "huanglei@d2clip.com"),
            ("hejing@d2clip.com", "何静", "product", "user", f"{base_avatar}hejing", "hejing@d2clip.com"),
        ]
        for username, name, dept_key, role, avatar, email in users_data:
            dept_id = key_to_id.get(dept_key)
            existing = db.query(User).filter(User.username == username).first()
            if existing:
                if not (existing.email or "").strip():
                    existing.email = email or username
                # 同步种子里的部门（如设计→研发、营销→市场后，已存在用户也更新过去）
                existing.department_id = dept_id
                continue
            u = User(
                username=username,
                password_hash=password_hash,
                name=name,
                department_id=dept_id,
                role=role,
                email=email or username,
                avatar=avatar or "",
                status="active",
            )
            db.add(u)
        db.commit()

        # 设计=研发、营销=市场：删掉旧的 design/marketing 群组，并把相关帖子归到 rd/market
        for old_key, new_key in [("design", "rd"), ("marketing", "market")]:
            db.query(Post).filter(Post.group_key == old_key).update({Post.group_key: new_key})
        db.query(CommunityGroup).filter(CommunityGroup.key.in_(["design", "marketing"])).delete(synchronize_session=False)
        db.commit()

        # 社群分组（与 community_service._default_groups 一致，供后续从 JSON 迁到 DB 时用）
        default_groups = [
            {"key": "product", "name": "产品部门", "description": "需求分析、趋势报告", "color": "#ff6b9d", "group_type": "department", "member_departments": ["product", "rd", "market", "operation"], "sort_order": 1},
            {"key": "rd", "name": "研发部门", "description": "色彩设计、命名方案、研发协作", "color": "#a29bfe", "group_type": "department", "member_departments": ["product", "rd", "market", "operation"], "sort_order": 2},
            {"key": "market", "name": "市场部门", "description": "虚拟试妆、效果验证、营销推广", "color": "#74b9ff", "group_type": "department", "member_departments": ["product", "rd", "market", "operation"], "sort_order": 3},
            {"key": "operation", "name": "运营部门", "description": "内容生成、宣发推广", "color": "#55efc4", "group_type": "department", "member_departments": ["product", "rd", "market", "operation"], "sort_order": 4},
            {"key": "product_small", "name": "产品小群", "description": "产品部门内部沟通", "color": "#ff6b9d", "group_type": "small", "member_departments": ["product"], "members": [{"name": "张晓雯", "role": "产品经理"}, {"name": "李明", "role": "数据分析师"}, {"name": "王芳", "role": "产品助理"}, {"name": "刘洋", "role": "需求分析师"}], "sort_order": 5},
            {"key": "product_rd", "name": "产品+研发小群", "description": "产品与研发协作", "color": "#a29bfe", "group_type": "small", "member_departments": ["product", "rd"], "members": [{"name": "张晓雯", "role": "产品"}, {"name": "陈工", "role": "研发"}, {"name": "周明", "role": "前端"}], "sort_order": 6},
            {"key": "rd_small", "name": "研发小群", "description": "研发部门内部沟通", "color": "#a29bfe", "group_type": "small", "member_departments": ["rd"], "members": [{"name": "陈工", "role": "后端"}, {"name": "周明", "role": "前端"}, {"name": "赵磊", "role": "测试"}], "sort_order": 7},
            {"key": "market_small", "name": "市场小群", "description": "市场部门内部沟通", "color": "#74b9ff", "group_type": "small", "member_departments": ["market"], "members": [{"name": "林悦", "role": "市场经理"}, {"name": "孙琦", "role": "试妆师"}, {"name": "何露", "role": "推广专员"}], "sort_order": 8},
            {"key": "market_rd", "name": "市场+研发小群", "description": "色号方案到虚拟试妆协作", "color": "#a29bfe", "group_type": "small", "member_departments": ["market", "rd"], "members": [{"name": "林悦", "role": "市场"}, {"name": "陈工", "role": "研发"}, {"name": "孙琦", "role": "试妆"}], "sort_order": 9},
            {"key": "operation_small", "name": "运营小群", "description": "运营部门内部沟通", "color": "#55efc4", "group_type": "small", "member_departments": ["operation"], "members": [{"name": "杨帆", "role": "运营经理"}, {"name": "吴敏", "role": "文案"}, {"name": "郑涛", "role": "设计师"}], "sort_order": 10},
        ]
        for g in default_groups:
            if db.query(CommunityGroup).filter(CommunityGroup.key == g["key"]).first():
                continue
            db.add(CommunityGroup(
                key=g["key"],
                name=g["name"],
                description=g.get("description", ""),
                color=g.get("color", ""),
                group_type=g.get("group_type", "department"),
                member_departments=g.get("member_departments", []),
                members=g.get("members", []),
                sort_order=g.get("sort_order", 0),
            ))
        db.commit()
        print("种子数据写入完成：7 张表已创建；departments、users、community_groups 已写入。")
    except Exception as e:
        db.rollback()
        print(f"写入失败: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
