"""
社群相关 DB 读写，返回与现有 community API 一致的数据格式（有 DB 时替代 JSON）。
"""
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from backend.db.models import CommunityGroup, Post, PostComment, UserGroupRead, User, Department
from backend.db.user_helpers import get_avatar_by_author


def _group_to_item(g: CommunityGroup, has_unread: Optional[bool] = None) -> Dict:
    out = {
        "key": g.key,
        "name": g.name,
        "description": g.description or "",
        "color": g.color or "",
        "type": g.group_type,
        "member_departments": g.member_departments or [],
        "members": g.members or [],
    }
    if has_unread is not None:
        out["has_unread"] = has_unread
    return out


def get_group_keys_from_db(db: Session) -> List[str]:
    """返回所有群组 key，用于 API 校验群组是否存在"""
    return [g.key for g in db.query(CommunityGroup.key).all()]


def _user_department_key(db: Session, user_id: str) -> Optional[str]:
    """根据 username 查用户部门 key，未找到返回 None"""
    u = db.query(User).filter(User.username == user_id).first()
    if not u or not u.department_id:
        return None
    d = db.query(Department).filter(Department.id == u.department_id).first()
    return d.key if d else None


def get_groups_from_db(db: Session, user_id: Optional[str] = None, department: Optional[str] = None) -> List[Dict]:
    """群组列表：传 user_id 时只返回该用户所在部门的群。传 department 时优先用请求里的部门过滤。
    部门为 admin 或不在任何群的 member_departments 中时，视为「不按部门过滤」返回全部（管理员默认看全部）；
    若请求里带了具体部门如 product，则按该部门隔离（含 admin 选部门时也隔离）。"""
    all_groups = db.query(CommunityGroup).order_by(CommunityGroup.sort_order, CommunityGroup.id).all()
    dept = (department or "").strip().lower() or None
    if not dept and user_id:
        dept = _user_department_key(db, user_id)
    # 管理员部门 "admin" 不在任何群的 member_departments 中，视为不按部门过滤，看全部
    if dept == "admin":
        dept = None
    if not dept:
        groups = all_groups
    else:
        groups = [g for g in all_groups if (g.member_departments or []) and dept in (g.member_departments or [])]
    # 每个群最新帖时间
    latest_by_group: Dict[str, datetime] = {}
    for p in db.query(Post).all():
        gk = p.group_key or ""
        if not gk:
            continue
        t = p.created_at
        if t and (gk not in latest_by_group or (t and t > latest_by_group[gk])):
            latest_by_group[gk] = t
    # 用户已读时间（有 user_id 时才按用户过滤，否则视为未读）
    user_read: Dict[str, datetime] = {}
    if user_id and (user_id or "").strip():
        for r in db.query(UserGroupRead).filter(UserGroupRead.user_id == user_id).all():
            user_read[r.group_key] = r.last_read_at
    out = []
    for g in groups:
        last_read = user_read.get(g.key)
        latest_post = latest_by_group.get(g.key)
        has_unread = bool(latest_post and (not last_read or latest_post > last_read))
        out.append(_group_to_item(g, has_unread=has_unread))
    return out


def _post_to_api_shape(db: Session, p: Post, comment_list: List[Dict]) -> Dict:
    author_display = p.author_display_name or p.author_username
    avatar = (get_avatar_by_author(db, p.author_username) or
              get_avatar_by_author(db, author_display) or "")
    created = p.created_at
    if created:
        # 保证前端可解析：统一成 ISO 字符串，结尾 Z（避免 +00:00Z 这种无效格式）
        created_iso = created.isoformat().replace("+00:00", "Z") if created.tzinfo else created.isoformat() + "Z"
    else:
        created_iso = ""
    return {
        "id": str(p.id),
        "group_key": p.group_key,
        "author": author_display,
        "author_username": p.author_username or "",
        "avatar": avatar,
        "role": p.role_display or "成员",
        "created_at": created_iso,
        "title": p.title or "",
        "preview": p.preview or "",
        "content": p.content or "",
        "images": p.images or [],
        "likes": p.likes or 0,
        "comments": p.comments_count or 0,
        "shares": p.shares or 0,
        "liked_by": p.liked_by or [],
        "comment_list": comment_list,
        "tags": p.tags or [],
        "attachments": p.attachments or [],
        "type": p.post_type or "text",
    } | ({"analysis_id": p.analysis_id} if (p.analysis_id or "").strip() else {})


def get_posts_by_group_from_db(db: Session, group_key: str) -> List[Dict]:
    """某群帖子列表，按时间倒序，与 get_posts_by_group 返回格式一致"""
    posts = (
        db.query(Post)
        .filter(Post.group_key == group_key)
        .order_by(Post.created_at.desc())
        .all()
    )
    result = []
    for p in posts:
        comments = (
            db.query(PostComment)
            .filter(PostComment.post_id == p.id)
            .order_by(PostComment.sort_order, PostComment.created_at)
            .all()
        )
        comment_list = []
        for c in comments:
            cav = get_avatar_by_author(db, c.author_username) or get_avatar_by_author(db, c.author_display_name) or ""
            comment_list.append({
                "author": c.author_display_name or c.author_username,
                "content": c.content or "",
                "role": c.role_display or "成员",
                "created_at": (c.created_at.isoformat().replace("+00:00", "Z") if c.created_at.tzinfo else c.created_at.isoformat() + "Z") if c.created_at else "",
                "avatar": cav,
            })
        result.append(_post_to_api_shape(db, p, comment_list))
    return result


def _find_post_by_id(db: Session, post_id: str) -> Optional[Post]:
    try:
        pid = int(post_id)
    except (TypeError, ValueError):
        return None
    return db.query(Post).filter(Post.id == pid).first()


def create_post_in_db(
    db: Session,
    group_key: str,
    *,
    title: str,
    content: str,
    author: str = "系统用户",
    role: str = "成员",
    avatar: Optional[str] = None,
    preview: Optional[str] = None,
    images: Optional[List] = None,
    tags: Optional[List] = None,
    attachments: Optional[List] = None,
    post_type: str = "text",
    analysis_id: Optional[str] = None,
) -> Dict:
    """发帖，返回 API 格式的帖子"""
    preview_text = preview or (content[:120] + "..." if len(content) > 120 else content)
    post_avatar = (avatar or "").strip() or get_avatar_by_author(db, author) or ""
    # author 可能是姓名或 username，存两份便于查头像
    author_username = author
    author_display_name = author
    u = db.query(User).filter((User.username == author) | (User.name == author)).first()
    if u:
        author_username = u.username
        author_display_name = u.name
        if not post_avatar and u.avatar:
            post_avatar = u.avatar
    p = Post(
        group_key=group_key,
        author_username=author_username,
        author_display_name=author_display_name,
        role_display=role,
        title=title,
        preview=preview_text,
        content=content,
        images=images or [],
        attachments=attachments or [],
        tags=tags or [],
        post_type=post_type,
        analysis_id=analysis_id or "",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _post_to_api_shape(db, p, [])


def like_post_in_db(db: Session, post_id: str, user_id: str) -> Optional[Dict]:
    """点赞/取消赞，返回更新后的帖子"""
    p = _find_post_by_id(db, post_id)
    if not p:
        return None
    liked_by = list(p.liked_by or [])
    if user_id in liked_by:
        liked_by.remove(user_id)
        p.likes = max(0, (p.likes or 0) - 1)
    else:
        if user_id:
            liked_by.append(user_id)
        p.likes = (p.likes or 0) + 1
    p.liked_by = liked_by
    db.commit()
    db.refresh(p)
    comments = db.query(PostComment).filter(PostComment.post_id == p.id).order_by(PostComment.sort_order, PostComment.created_at).all()
    cl = [{"author": c.author_display_name or c.author_username, "content": c.content or "", "role": c.role_display or "", "created_at": (c.created_at.isoformat().replace("+00:00", "Z") if c.created_at.tzinfo else c.created_at.isoformat() + "Z") if c.created_at else "", "avatar": get_avatar_by_author(db, c.author_username) or ""} for c in comments]
    return _post_to_api_shape(db, p, cl)


def share_post_in_db(db: Session, post_id: str) -> Optional[Dict]:
    p = _find_post_by_id(db, post_id)
    if not p:
        return None
    p.shares = (p.shares or 0) + 1
    db.commit()
    db.refresh(p)
    comments = db.query(PostComment).filter(PostComment.post_id == p.id).order_by(PostComment.sort_order, PostComment.created_at).all()
    cl = [{"author": c.author_display_name or c.author_username, "content": c.content or "", "role": c.role_display or "", "created_at": (c.created_at.isoformat().replace("+00:00", "Z") if c.created_at.tzinfo else c.created_at.isoformat() + "Z") if c.created_at else "", "avatar": get_avatar_by_author(db, c.author_username) or ""} for c in comments]
    return _post_to_api_shape(db, p, cl)


def add_comment_in_db(
    db: Session,
    post_id: str,
    author: str,
    content: str,
    role: str = "成员",
    avatar: Optional[str] = None,
) -> Optional[Dict]:
    p = _find_post_by_id(db, post_id)
    if not p:
        return None
    comment_avatar = (avatar or "").strip() or get_avatar_by_author(db, author) or ""
    author_username = author
    author_display_name = author
    u = db.query(User).filter((User.username == author) | (User.name == author)).first()
    if u:
        author_username = u.username
        author_display_name = u.name
    max_order = db.query(PostComment).filter(PostComment.post_id == p.id).count()
    c = PostComment(
        post_id=p.id,
        author_username=author_username,
        author_display_name=author_display_name,
        content=content,
        role_display=role,
        sort_order=max_order,
    )
    db.add(c)
    p.comments_count = (p.comments_count or 0) + 1
    db.commit()
    db.refresh(p)
    comments = db.query(PostComment).filter(PostComment.post_id == p.id).order_by(PostComment.sort_order, PostComment.created_at).all()
    cl = [{"author": x.author_display_name or x.author_username, "content": x.content or "", "role": x.role_display or "", "created_at": (x.created_at.isoformat().replace("+00:00", "Z") if x.created_at.tzinfo else x.created_at.isoformat() + "Z") if x.created_at else "", "avatar": get_avatar_by_author(db, x.author_username) or ""} for x in comments]
    return _post_to_api_shape(db, p, cl)


def delete_comment_in_db(db: Session, post_id: str, comment_index: int) -> Optional[Dict]:
    p = _find_post_by_id(db, post_id)
    if not p:
        return None
    comments = list(db.query(PostComment).filter(PostComment.post_id == p.id).order_by(PostComment.sort_order, PostComment.created_at).all())
    if comment_index < 0 or comment_index >= len(comments):
        return None
    to_del = comments[comment_index]
    db.delete(to_del)
    p.comments_count = max(0, (p.comments_count or 0) - 1)
    db.commit()
    db.refresh(p)
    comments = db.query(PostComment).filter(PostComment.post_id == p.id).order_by(PostComment.sort_order, PostComment.created_at).all()
    cl = [{"author": c.author_display_name or c.author_username, "content": c.content or "", "role": c.role_display or "", "created_at": (c.created_at.isoformat().replace("+00:00", "Z") if c.created_at.tzinfo else c.created_at.isoformat() + "Z") if c.created_at else "", "avatar": get_avatar_by_author(db, c.author_username) or ""} for c in comments]
    return _post_to_api_shape(db, p, cl)


def delete_post_in_db(db: Session, post_id: str) -> bool:
    p = _find_post_by_id(db, post_id)
    if not p:
        return False
    db.delete(p)
    db.commit()
    return True


def update_post_in_db(
    db: Session,
    post_id: str,
    *,
    title: Optional[str] = None,
    content: Optional[str] = None,
    preview: Optional[str] = None,
) -> Optional[Dict]:
    p = _find_post_by_id(db, post_id)
    if not p:
        return None
    if title is not None:
        p.title = title
    if content is not None:
        p.content = content
    if preview is not None:
        p.preview = preview
    elif content is not None:
        p.preview = content[:120] + "..." if len(content) > 120 else content
    db.commit()
    db.refresh(p)
    comments = db.query(PostComment).filter(PostComment.post_id == p.id).order_by(PostComment.sort_order, PostComment.created_at).all()
    cl = [{"author": c.author_display_name or c.author_username, "content": c.content or "", "role": c.role_display or "", "created_at": (c.created_at.isoformat().replace("+00:00", "Z") if c.created_at.tzinfo else c.created_at.isoformat() + "Z") if c.created_at else "", "avatar": get_avatar_by_author(db, c.author_username) or ""} for c in comments]
    return _post_to_api_shape(db, p, cl)


def forward_post_in_db(
    db: Session,
    post_id: str,
    target_group_key: str,
    author: str = "系统用户",
    role: str = "成员",
) -> Optional[Dict]:
    src = _find_post_by_id(db, post_id)
    if not src:
        return None
    if db.query(CommunityGroup).filter(CommunityGroup.key == target_group_key).first() is None:
        return None
    new_title = f"【转发】{src.title or ''}"
    return create_post_in_db(
        db,
        target_group_key,
        title=new_title,
        content=src.content or "",
        author=author,
        role=role,
        avatar=None,
        preview=(src.preview or "")[:200],
        images=src.images or [],
        tags=(["转发"] + list(src.tags or []))[:8],
        attachments=src.attachments or [],
        post_type=src.post_type or "text",
        analysis_id=src.analysis_id or None,
    )


def _parse_iso_datetime(s: Optional[str]):
    """把 ISO 时间串解析为 timezone-aware datetime，解析失败返回 None"""
    if not (s or "").strip():
        return None
    s = (s or "").strip().replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None


def _resolve_author(db: Session, display_name: str) -> Tuple[str, str]:
    """根据展示名查 User，返回 (username, display_name)。未找到则 username 用展示名。"""
    if not (display_name or "").strip():
        return "系统用户", "系统用户"
    u = db.query(User).filter(User.name == (display_name or "").strip()).first()
    if u:
        return u.username, u.name
    return (display_name or "系统用户"), (display_name or "系统用户")


def import_post_from_json(db: Session, post_dict: Dict) -> Optional[Post]:
    """把 JSON 里的一条帖子（含 comment_list）导入到 posts + post_comments 表。返回创建的 Post。"""
    group_key = (post_dict.get("group_key") or "").strip()
    if not group_key:
        return None
    if db.query(CommunityGroup).filter(CommunityGroup.key == group_key).first() is None:
        return None
    author_display = (post_dict.get("author") or "").strip() or "系统用户"
    author_username, author_display_name = _resolve_author(db, author_display)
    role_display = (post_dict.get("role") or "").strip()[:64] or "成员"
    title = (post_dict.get("title") or "")[:256]
    preview = (post_dict.get("preview") or "")[:512]
    if not preview and (post_dict.get("content") or ""):
        preview = (post_dict.get("content") or "")[:120] + ("..." if len(post_dict.get("content") or "") > 120 else "")
    content = post_dict.get("content") or ""
    images = post_dict.get("images") if isinstance(post_dict.get("images"), list) else []
    attachments = post_dict.get("attachments") if isinstance(post_dict.get("attachments"), list) else []
    likes = int(post_dict.get("likes") or 0)
    liked_by = post_dict.get("liked_by") if isinstance(post_dict.get("liked_by"), list) else []
    shares = int(post_dict.get("shares") or 0)
    tags = post_dict.get("tags") if isinstance(post_dict.get("tags"), list) else []
    post_type = (post_dict.get("type") or "text")[:32]
    analysis_id = (post_dict.get("analysis_id") or "")[:64]
    created_at = _parse_iso_datetime(post_dict.get("created_at"))
    if not created_at:
        from datetime import timezone
        created_at = datetime.now(timezone.utc)
    p = Post(
        group_key=group_key,
        author_username=author_username,
        author_display_name=author_display_name,
        role_display=role_display,
        title=title,
        preview=preview,
        content=content,
        images=images,
        attachments=attachments,
        likes=likes,
        liked_by=liked_by,
        comments_count=0,
        shares=shares,
        tags=tags,
        post_type=post_type,
        analysis_id=analysis_id,
        created_at=created_at,
    )
    db.add(p)
    db.flush()  # 拿到 p.id
    comment_list = post_dict.get("comment_list") if isinstance(post_dict.get("comment_list"), list) else []
    for idx, c in enumerate(comment_list):
        c_author_display = (c.get("author") or "").strip() or "系统用户"
        c_username, c_display = _resolve_author(db, c_author_display)
        c_content = (c.get("content") or "").strip() or ""
        c_role = (c.get("role") or "").strip()[:64] or "成员"
        c_created = _parse_iso_datetime(c.get("created_at"))
        if not c_created:
            from datetime import timezone
            c_created = datetime.now(timezone.utc)
        db.add(PostComment(
            post_id=p.id,
            author_username=c_username,
            author_display_name=c_display,
            content=c_content,
            role_display=c_role,
            sort_order=idx,
            created_at=c_created,
        ))
    p.comments_count = len(comment_list)
    return p


def get_read_state_from_db(db: Session, user_id: str) -> Dict[str, str]:
    """返回 { group_key: last_read_at_iso }"""
    rows = db.query(UserGroupRead).filter(UserGroupRead.user_id == user_id).all()
    return {r.group_key: r.last_read_at.isoformat() + "Z" for r in rows if r.last_read_at}


def mark_group_read_in_db(db: Session, user_id: str, group_key: str) -> None:
    from datetime import timezone
    now = datetime.now(timezone.utc)
    r = db.query(UserGroupRead).filter(
        UserGroupRead.user_id == user_id,
        UserGroupRead.group_key == group_key,
    ).first()
    if r:
        r.last_read_at = now
        r.updated_at = now
    else:
        db.add(UserGroupRead(user_id=user_id, group_key=group_key, last_read_at=now))
    db.commit()
