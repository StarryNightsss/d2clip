"""
数据库表模型（仅当配置了 DATABASE_URL 时使用，不影响现有 JSON 逻辑）

核心 7 张表：
1. departments   - 部门
2. users         - 职员/用户
3. community_groups - 社群分组（部门频道、小群）
4. posts         - 社群帖子
5. post_comments - 帖子评论
6. user_group_read - 用户-群组已读时间
7. analysis_tasks - 分析任务/历史
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

from backend.db.base import Base


class Department(Base):
    """1. 部门表"""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(64), nullable=False)
    description = Column(String(256), default="")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class User(Base):
    """2. 职员/用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(64), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    role = Column(String(32), nullable=False, default="user")
    email = Column(String(128), default="")
    avatar = Column(String(512), default="")
    status = Column(String(16), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CommunityGroup(Base):
    """3. 社群分组表（部门频道、小群，对应 community_groups.json）"""
    __tablename__ = "community_groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(64), nullable=False)
    description = Column(String(512), default="")
    color = Column(String(32), default="")
    group_type = Column(String(32), default="department")  # department | small
    member_departments = Column(JSONB, default=list)  # ["product", "rd", ...]
    members = Column(JSONB, default=list)  # [{"name","role"}, ...] 小群成员
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Post(Base):
    """4. 社群帖子表（对应 community_posts.json 单条）"""
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    group_key = Column(String(64), nullable=False, index=True)
    author_username = Column(String(64), nullable=False, index=True)  # 与 users.username 对应
    author_display_name = Column(String(64), default="")  # 展示用姓名
    role_display = Column(String(64), default="")  # 展示用角色，如「产品经理」
    title = Column(String(256), default="")
    preview = Column(String(512), default="")
    content = Column(Text, default="")
    images = Column(JSONB, default=list)  # ["url1", "url2"]
    attachments = Column(JSONB, default=list)  # [{"name","size"}, ...]
    likes = Column(Integer, default=0)
    liked_by = Column(JSONB, default=list)  # [user_id, ...] 用于点赞/取消赞
    comments_count = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    tags = Column(JSONB, default=list)  # ["tag1", "tag2"]
    post_type = Column(String(32), default="text")
    analysis_id = Column(String(64), default="")  # 报告类帖子的分析 ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PostComment(Base):
    """5. 帖子评论表（对应帖子内 comment_list）"""
    __tablename__ = "post_comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    author_username = Column(String(64), nullable=False, index=True)
    author_display_name = Column(String(64), default="")
    content = Column(Text, nullable=False)
    role_display = Column(String(64), default="")  # 展示用角色/部门
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserGroupRead(Base):
    """6. 用户-群组已读时间（对应 community_read_state.json）"""
    __tablename__ = "user_group_read"
    __table_args__ = (UniqueConstraint("user_id", "group_key", name="uq_user_group_read"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=False, index=True)  # username
    group_key = Column(String(64), nullable=False, index=True)
    last_read_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AnalysisTask(Base):
    """7. 分析任务/历史表（按用户区分：同一用户登录任意机器只看自己的历史）"""
    __tablename__ = "analysis_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_id = Column(String(64), unique=True, nullable=False, index=True)  # UUID
    user_id = Column(String(64), nullable=True, index=True)  # 发起分析的用户名，空表示旧数据/未登录
    platform = Column(String(32), default="xhs")
    data_file = Column(String(512), default="")
    total_notes = Column(Integer, default=0)
    analyzed_notes = Column(Integer, default=0)
    failed_notes = Column(Integer, default=0)
    status = Column(String(32), default="completed")  # running | completed | failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AgentSession(Base):
    """8. Agent 会话表（对话历史、执行计划、最终报告）"""
    __tablename__ = "agent_sessions"

    id = Column(String(64), primary_key=True)           # UUID
    user_id = Column(String(64), nullable=True, index=True)
    title = Column(String(256), default="新对话")         # 自动从第一条用户消息生成
    mode = Column(String(16), default="agent")          # ask | plan | agent
    status = Column(String(16), default="pending")      # pending | running | completed | error
    messages = Column(JSONB, default=list)              # 完整对话历史
    plan = Column(JSONB, nullable=True)                 # DAG 执行计划
    final_report = Column(JSONB, nullable=True)         # 最终报告
    file_path = Column(String(512), default="")         # 关联的数据文件
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RdColorSwatch(Base):
    """9. 研发调色板色块（每个用户自己的常用色）"""
    __tablename__ = "rd_color_swatches"

    id = Column(String(64), primary_key=True)           # UUID
    user_id = Column(String(64), nullable=False, index=True)
    hex = Column(String(16), nullable=False)            # #RRGGBB
    label = Column(String(128), default="")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RdSwatch(Base):
    """10. 研发历史色号记录（左侧历史栏）"""
    __tablename__ = "rd_swatches"

    id = Column(String(64), primary_key=True)           # UUID
    user_id = Column(String(64), nullable=False, index=True)
    name = Column(String(128), nullable=False, default="色号")
    hex = Column(String(16), nullable=False)            # #RRGGBB
    texture = Column(String(32), default="哑光")
    opacity = Column(Integer, default=100)
    note = Column(String(512), default="")
    session_id = Column(String(64), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
