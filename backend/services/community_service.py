"""
企业社群服务 - 群组与帖子存储（文件存储）
所有帖子、评论、附件引用均持久化到 backend/data，刷新/关闭浏览器后仍存在。
"""
import json
import uuid
import re
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

from backend.config import settings


def _uploads_dir() -> Path:
    """社区上传文件存放目录（按 file_id 存，持久化）"""
    d = settings.DATA_DIR / "community_uploads"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _uploads_index_path() -> Path:
    return _uploads_dir() / "_index.json"


def _load_uploads_index() -> Dict:
    p = _uploads_index_path()
    if not p.exists():
        return {}
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_uploads_index(index: Dict) -> None:
    _uploads_dir()
    with open(_uploads_index_path(), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


def save_uploaded_file(file_content: bytes, original_filename: str) -> Dict:
    """
    保存上传文件，返回 { file_id, name, size }。
    文件名保留原格式，下载时按原格式返回；数据持久化，刷新/关闭后仍在。
    """
    _uploads_dir()
    original_filename = original_filename or "file"
    file_id = str(uuid.uuid4())
    ext = Path(original_filename).suffix or ""
    stored_name = f"{file_id}{ext}"
    path = _uploads_dir() / stored_name
    path.write_bytes(file_content)
    size = len(file_content)
    size_str = f"{size / 1024:.1f}KB" if size < 1024 * 1024 else f"{size / (1024 * 1024):.1f}MB"
    index = _load_uploads_index()
    index[file_id] = {"name": original_filename, "path": stored_name}
    _save_uploads_index(index)
    return {"file_id": file_id, "name": original_filename, "size": size_str}


def get_uploaded_file_path(file_id: str) -> Optional[Path]:
    """根据 file_id 返回已保存文件的路径及原始文件名（用于下载时原样返回格式）。"""
    if not file_id:
        return None
    index = _load_uploads_index()
    info = index.get(file_id)
    if not info:
        return None
    path = _uploads_dir() / info["path"]
    return path if path.exists() else None


def get_uploaded_file_name(file_id: str) -> Optional[str]:
    """返回上传时的原始文件名（用于 Content-Disposition）。"""
    index = _load_uploads_index()
    info = index.get(file_id)
    return info.get("name") if info else None


def _groups_path() -> Path:
    return settings.DATA_DIR / "community_groups.json"


def _posts_path() -> Path:
    return settings.DATA_DIR / "community_posts.json"


def _read_state_path() -> Path:
    """每用户每群的已读时间：{ user_id: { group_key: last_read_at_iso } }"""
    return settings.DATA_DIR / "community_read_state.json"


def _users_path() -> Path:
    """员工/用户列表（含头像），用于发帖、评论时按作者匹配头像"""
    return settings.DATA_DIR / "community_users.json"


def _ensure_data_dir():
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)


def _default_users() -> List[Dict]:
    """默认员工列表：全员均可登录（与 seed 一致，username=姓名全拼@d2clip.com），无「仅发帖」的区分。"""
    base = "https://api.dicebear.com/7.x/avataaars/svg?seed="
    return [
        {"username": "admin@d2clip.com", "name": "管理员", "department": "admin", "avatar": "/kuromi-avatar.png"},
        {"username": "zhangxiaowen@d2clip.com", "name": "张晓雯", "department": "product", "avatar": f"{base}zhang"},
        {"username": "lisi@d2clip.com", "name": "李四", "department": "rd", "avatar": f"{base}lisi"},
        {"username": "wangwu@d2clip.com", "name": "王五", "department": "market", "avatar": f"{base}wangwu"},
        {"username": "zhaoliu@d2clip.com", "name": "赵六", "department": "operation", "avatar": f"{base}zhaoliu"},
        {"username": "liming@d2clip.com", "name": "李明", "department": "product", "avatar": f"{base}liming"},
        {"username": "wangfang@d2clip.com", "name": "王芳", "department": "rd", "avatar": f"{base}wangfang"},
        {"username": "chenyue@d2clip.com", "name": "陈悦", "department": "market", "avatar": f"{base}chenyue"},
        {"username": "liuyang@d2clip.com", "name": "刘洋", "department": "operation", "avatar": f"{base}liuyang"},
        {"username": "zhoumin@d2clip.com", "name": "周敏", "department": "product", "avatar": f"{base}zhoumin"},
        {"username": "zhaolin@d2clip.com", "name": "赵琳", "department": "rd", "avatar": f"{base}zhaolin"},
        {"username": "sunting@d2clip.com", "name": "孙婷", "department": "product", "avatar": f"{base}sunting"},
        {"username": "wuqian@d2clip.com", "name": "吴倩", "department": "operation", "avatar": f"{base}wuqian"},
        {"username": "zhenghao@d2clip.com", "name": "郑浩", "department": "rd", "avatar": f"{base}zhenghao"},
        {"username": "linna@d2clip.com", "name": "林娜", "department": "market", "avatar": f"{base}linna"},
        {"username": "huanglei@d2clip.com", "name": "黄磊", "department": "operation", "avatar": f"{base}huanglei"},
        {"username": "hejing@d2clip.com", "name": "何静", "department": "product", "avatar": f"{base}hejing"},
    ]


def _load_users() -> List[Dict]:
    """加载员工列表；若文件不存在则写入默认列表并返回"""
    p = _users_path()
    if not p.exists():
        _ensure_data_dir()
        users = _default_users()
        with open(p, "w", encoding="utf-8") as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
        return users
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return _default_users()


def get_user_avatar(author: str) -> Optional[str]:
    """按作者（用户名或姓名）查员工头像；支持 username（登录名）或 name（评论/帖子里的名字）。未配置时用 dicebear 7.x(seed=author) 兜底。"""
    if not author:
        return None
    author = (author or "").strip()
    users = _load_users()
    for u in users:
        if (u.get("username") or "").strip() == author or (u.get("name") or "").strip() == author:
            av = (u.get("avatar") or "").strip()
            return av or None
    return f"https://api.dicebear.com/7.x/avataaars/svg?seed={author}"


def list_users() -> List[Dict]:
    """返回员工列表（含 username, name, avatar），供前端按作者展示头像等。"""
    return _load_users()


def _load_read_state() -> Dict:
    """读取全局已读状态：{ user_id: { group_key: last_read_at } }"""
    p = _read_state_path()
    if not p.exists():
        return {}
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_read_state(state: Dict) -> None:
    _ensure_data_dir()
    with open(_read_state_path(), "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def mark_group_read(user_id: str, group_key: str) -> None:
    """标记某用户在某群已读（持久化，刷新后仍生效）"""
    if not user_id or not group_key:
        return
    state = _load_read_state()
    now = datetime.utcnow().isoformat() + "Z"
    if user_id not in state:
        state[user_id] = {}
    state[user_id][group_key] = now
    _save_read_state(state)


def load_groups(user_id: Optional[str] = None, department: Optional[str] = None) -> List[Dict]:
    """加载群组列表。传 department 时只返回该部门可见的群（产品人只看产品/产品小群/产品+研发等）。传 user_id 时附带 has_unread。"""
    groups = _default_groups()
    if department:
        dept = (department or "").strip().lower()
        groups = [g for g in groups if (g.get("member_departments") or []) and dept in (g.get("member_departments") or [])]
    if not user_id:
        return groups
    posts = load_posts()
    read_state = _load_read_state()
    user_read = read_state.get(user_id) or {}
    # 每个群的最新帖时间
    latest_by_group: Dict[str, str] = {}
    for p in posts:
        gk = p.get("group_key") or ""
        if not gk:
            continue
        t = p.get("created_at") or ""
        if gk not in latest_by_group or t > latest_by_group[gk]:
            latest_by_group[gk] = t
    for g in groups:
        gk = g.get("key") or ""
        last_read = user_read.get(gk) or ""
        latest_post = latest_by_group.get(gk) or ""
        # 有未读：该群有帖子 且 （从未读过 或 最新帖时间晚于已读时间）
        g["has_unread"] = bool(latest_post and (not last_read or latest_post > last_read))
    return groups


def _default_groups() -> List[Dict]:
    """部门频道 + 小群（飞书式：部门信息 + 群聊）。member_departments 表示可见的部门，前端按当前用户部门过滤。"""
    return [
        # 部门频道（全员可见）
        {"key": "product", "name": "产品部门", "description": "需求分析、趋势报告", "color": "#ff6b9d", "type": "department", "member_departments": ["product", "rd", "market", "operation"]},
        {"key": "rd", "name": "研发部门", "description": "色彩设计、命名方案、研发协作", "color": "#a29bfe", "type": "department", "member_departments": ["product", "rd", "market", "operation"]},
        {"key": "market", "name": "市场部门", "description": "虚拟试妆、效果验证、营销推广", "color": "#74b9ff", "type": "department", "member_departments": ["product", "rd", "market", "operation"]},
        {"key": "operation", "name": "运营部门", "description": "内容生成、宣发推广", "color": "#55efc4", "type": "department", "member_departments": ["product", "rd", "market", "operation"]},
        # 小群（按部门可见，members 为群成员列表，前端用于展示）
        {"key": "product_small", "name": "产品小群", "description": "产品部门内部沟通", "color": "#ff6b9d", "type": "small", "member_departments": ["product"], "members": [{"name": "张晓雯", "role": "产品经理"}, {"name": "李明", "role": "数据分析师"}, {"name": "王芳", "role": "产品助理"}, {"name": "刘洋", "role": "需求分析师"}]},
        {"key": "product_rd", "name": "产品+研发小群", "description": "产品与研发协作", "color": "#a29bfe", "type": "small", "member_departments": ["product", "rd"], "members": [{"name": "张晓雯", "role": "产品"}, {"name": "陈工", "role": "研发"}, {"name": "周明", "role": "前端"}]},
        {"key": "rd_small", "name": "研发小群", "description": "研发部门内部沟通", "color": "#a29bfe", "type": "small", "member_departments": ["rd"], "members": [{"name": "陈工", "role": "后端"}, {"name": "周明", "role": "前端"}, {"name": "赵磊", "role": "测试"}]},
    ]


def save_groups(groups: List[Dict]) -> None:
    _ensure_data_dir()
    with open(_groups_path(), "w", encoding="utf-8") as f:
        json.dump(groups, f, ensure_ascii=False, indent=2)


def load_posts() -> List[Dict]:
    """加载全部帖子"""
    _ensure_data_dir()
    p = _posts_path()
    if not p.exists():
        seed = _seed_posts()
        save_posts(seed)
        return seed
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_posts(posts: List[Dict]) -> None:
    _ensure_data_dir()
    with open(_posts_path(), "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)


def _seed_posts() -> List[Dict]:
    """用原有前端假数据做种子（保留 4 个部门那几条漂亮内容）"""
    now = datetime.utcnow()
    base_time = now.isoformat().replace("+00:00", "") + "Z"

    return [
        {
            "id": "1",
            "group_key": "product",
            "author": "张晓雯",
            "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=zhang",
            "role": "产品经理",
            "created_at": base_time,
            "title": "【趋势分析】\"地母系\"妆容流行趋势报告",
            "preview": "根据最新分析的60条小红书笔记，「地母系」风格占比达到45%...",
            "content": "根据最新分析的60条小红书笔记，「地母系」风格占比达到45%，用户更倾向于裸色系雾面质地。\n\n关键发现：\n• 显白(32次) - 用户更关注的功能点\n• 不拔干(28次) - 质地需求明显\n• 日常(25次) - 适用场景偏好\n\n建议设计部门重点关注低饱和度、雾面质地的色号开发。",
            "images": ["https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=300&fit=crop", "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=300&fit=crop"],
            "likes": 28,
            "comments": 12,
            "shares": 5,
            "tags": ["趋势分析", "需求文档", "地母系"],
            "attachments": [{"name": "化妆风格分析报告.pdf", "size": "2.3MB"}],
            "type": "text",
        },
        {
            "id": "2",
            "group_key": "product",
            "author": "李明",
            "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=liming",
            "role": "数据分析师",
            "created_at": base_time,
            "title": "本周口红色号需求统计",
            "preview": "珊瑚橘(18%)、豆沙色(15%)、正红(12%)...",
            "content": "本周数据统计结果：\n\n色号占比：\n• 裸色系：25%\n• 珊瑚橘：18%\n• 豆沙色：15%\n• 正红：12%\n• 番茄色：10%\n• 其他：20%\n\n用户对低饱和度色系的需求持续上升，建议研发重点关注。",
            "images": ["https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=300&fit=crop", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop"],
            "likes": 15,
            "comments": 8,
            "shares": 3,
            "tags": ["数据分析", "色号统计"],
            "attachments": [],
            "type": "text",
            "comment_list": [
                {"author": "周敏", "content": "裸色系占比好高，下季主推可以侧重这块。", "role": "产品部门", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=zhoumin"},
                {"author": "赵琳", "content": "豆沙色数据很稳，研发可以多出几个色号。", "role": "研发部门", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=zhaolin"},
                {"author": "孙婷", "content": "收到，已同步给设计做色卡参考。", "role": "产品部门", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=sunting"},
            ],
        },
        {
            "id": "3",
            "group_key": "rd",
            "author": "王芳",
            "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang",
            "role": "色彩设计师",
            "created_at": base_time,
            "title": "【新品配色】「桃夭」系列色卡方案",
            "preview": "基于产品部门的趋势分析，设计了16款裸色系配色方案...",
            "content": (
                "基于产品部门的趋势分析，设计了16款裸色系配色方案。\n\n"
                "主打色号：\n• #E8B4A0（桃夭）- 温柔裸粉\n• #D4A59A（灼华）- 豆沙橘调\n• #C9A18B（芳菲）- 奶茶裸色\n\n"
                "色彩来源：《诗经·桃夭》「桃之夭夭，灼灼其华」\n\n"
                "已完成多层叠加测试，色彩稳定性良好。建议市场部门尽快安排试妆验证。"
            ),
            "images": ["https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop", "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=300&fit=crop", "https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=400&h=300&fit=crop"],
            "likes": 42,
            "comments": 18,
            "shares": 9,
            "tags": ["色彩方案", "诗经命名", "新品"],
            "attachments": [{"name": "桃夭系列色卡.sketch", "size": "8.7MB"}],
            "type": "text",
            "comment_list": [
                {"author": "陈悦", "content": "灼华那个色号我们试过了，上嘴很自然，市场会主推。", "role": "市场部门", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=chenyue"},
                {"author": "刘洋", "content": "诗经命名太有质感了，宣发文案可以直接用这句。", "role": "运营部门", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=liuyang"},
                {"author": "张晓雯", "content": "芳菲适合做日常款，建议优先打样给试妆组。", "role": "产品经理", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=zhang"},
            ],
        },
        {
            "id": "4",
            "group_key": "market",
            "author": "陈悦",
            "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=chenyue",
            "role": "市场专员",
            "created_at": base_time,
"title": "【试妆效果】「桃夭」多肤色适配测试",
          "preview": "已完成黄一白、粉二白、黄黑皮三种肤色的虚拟试妆...",
          "content": "已完成「桃夭」系列三种肤色的虚拟试妆验证。\n\n测试结果：\n• 黄一白：效果最佳，显白度++\n• 粉二白：效果良好，自然感强\n• 黄黑皮：需调整饱和度+5%\n\n目标人群建议：\n20-35岁亚洲肤色女性，特别适合办公室白领日常妆容。\n\n已同步给运营部门，可以开始准备宣发素材。",
            "images": ["https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=400&h=300&fit=crop", "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=300&fit=crop"],
            "likes": 35,
            "comments": 14,
            "shares": 7,
            "tags": ["试妆报告", "肤色适配", "桃夭"],
            "attachments": [],
            "type": "text",
            "comment_list": [
                {"author": "刘洋", "content": "黄一白效果图能先发我们吗？做首图用。", "role": "运营部门", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=liuyang"},
                {"author": "王芳", "content": "粉二白那组数据很实用，已记入色彩报告。", "role": "研发部门", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang"},
                {"author": "李明", "content": "饱和度+5% 的调整建议收到，下周会出修订版色卡。", "role": "产品部门", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=liming"},
            ],
        },
        {
            "id": "5",
            "group_key": "operation",
            "author": "刘洋",
            "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=liuyang",
            "role": "内容运营",
            "created_at": base_time,
"title": "【推广文案】「桃夭」小红书发布内容",
          "preview": "已生成3套宣发文案，配图素材已准备完毕...",
          "content": "已生成3套宣发文案，配图素材已准备完毕。\n\n文案示例（方案A）：\n「桃之夭夭，灼灼其华 🌸\n这支#桃夭#真的太绝了\n裸色系但不会显得没气色\n黄皮亲妈色号！日常通勤必备💄」\n\n发布计划：\n• 时间：本周三 10:00\n• 平台：小红书、抖音、微博\n• 目标：曝光10w+，互动率>5%\n\n请市场部门确认试妆图片是否可以用于推广。",
            "images": ["https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=300&fit=crop", "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop"],
            "likes": 23,
            "comments": 9,
            "shares": 11,
            "tags": ["推广文案", "小红书", "待发布"],
            "attachments": [{"name": "桃夭推广方案.docx", "size": "1.2MB"}],
            "type": "text",
            "comment_list": [
                {"author": "陈悦", "content": "方案A的文案可以直接用，我们周三准时发。试妆图市场确认了。", "role": "市场部门", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=chenyue"},
                {"author": "张晓雯", "content": "抖音那边排期也好了，和微博同天发。", "role": "产品经理", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=zhang"},
                {"author": "王芳", "content": "首图用桃夭主色那张，已导出给运营。", "role": "研发部门", "created_at": base_time, "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang"},
            ],
        },
    ]


def get_posts_by_group(group_key: str) -> List[Dict]:
    """按群组取帖子，按时间倒序"""
    posts = load_posts()
    filtered = [p for p in posts if p.get("group_key") == group_key]
    filtered.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    return filtered


def create_post(
    group_key: str,
    *,
    title: str,
    content: str,
    author: str = "系统用户",
    role: str = "成员",
    avatar: Optional[str] = None,
    preview: Optional[str] = None,
    images: Optional[List[str]] = None,
    tags: Optional[List[str]] = None,
    attachments: Optional[List[Dict]] = None,
    type: str = "text",
    analysis_id: Optional[str] = None,
) -> Dict:
    """发帖（文本或报告）。头像优先用传入的 avatar，否则按作者从员工列表查。"""
    posts = load_posts()
    post_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat() + "Z"
    preview_text = preview or (content[:120] + "..." if len(content) > 120 else content)
    post_avatar = (avatar or "").strip() or get_user_avatar(author) or ""

    new_post = {
        "id": post_id,
        "group_key": group_key,
        "author": author,
        "avatar": post_avatar,
        "role": role,
        "created_at": created_at,
        "title": title,
        "preview": preview_text,
        "content": content,
        "images": images or [],
        "likes": 0,
        "comments": 0,
        "shares": 0,
        "liked_by": [],
        "comment_list": [],
        "tags": tags or [],
        "attachments": attachments or [],
        "type": type,
    }
    if analysis_id is not None:
        new_post["analysis_id"] = analysis_id
    posts.append(new_post)
    save_posts(posts)
    return new_post


def _find_post(post_id: str):
    """按 id 查找帖子，返回 (posts, index) 或 (None, -1)"""
    posts = load_posts()
    for i, p in enumerate(posts):
        if p.get("id") == post_id:
            return posts, i
    return None, -1


def like_post(post_id: str, user_id: str = "") -> Optional[Dict]:
    """点赞/取消赞：根据 user_id 是否已在 liked_by 中切换，并更新 likes 计数。返回更新后的帖子。"""
    posts, idx = _find_post(post_id)
    if idx < 0:
        return None
    p = posts[idx]
    liked_by = list(p.get("liked_by") or [])
    if user_id in liked_by:
        liked_by.remove(user_id)
        p["likes"] = max(0, (p.get("likes") or 0) - 1)
    else:
        if user_id:
            liked_by.append(user_id)
        p["likes"] = (p.get("likes") or 0) + 1
    p["liked_by"] = liked_by
    save_posts(posts)
    return p


def share_post(post_id: str) -> Optional[Dict]:
    """转发：帖子 shares +1，返回更新后的帖子"""
    posts, idx = _find_post(post_id)
    if idx < 0:
        return None
    posts[idx]["shares"] = (posts[idx].get("shares") or 0) + 1
    save_posts(posts)
    return posts[idx]


def add_comment_to_post(post_id: str, author: str, content: str, role: str = "成员", avatar: Optional[str] = None) -> Optional[Dict]:
    """给帖子添加一条评论，comments 计数 +1，返回更新后的帖子。头像优先用传入的 avatar，否则按作者从员工列表查。"""
    posts, idx = _find_post(post_id)
    if idx < 0:
        return None
    p = posts[idx]
    comment_list = p.get("comment_list") or []
    comment_avatar = (avatar or "").strip() or get_user_avatar(author)
    comment_list.append({
        "author": author,
        "content": content,
        "role": role,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "avatar": comment_avatar or None,
    })
    p["comment_list"] = comment_list
    p["comments"] = len(comment_list)
    save_posts(posts)
    return p


def delete_comment(post_id: str, comment_index: int) -> Optional[Dict]:
    """删除帖子下第 comment_index 条评论（0 起），返回更新后的帖子"""
    posts, idx = _find_post(post_id)
    if idx < 0:
        return None
    p = posts[idx]
    comment_list = list(p.get("comment_list") or [])
    if comment_index < 0 or comment_index >= len(comment_list):
        return None
    comment_list.pop(comment_index)
    p["comment_list"] = comment_list
    p["comments"] = len(comment_list)
    save_posts(posts)
    return p


def delete_post(post_id: str) -> bool:
    """删除帖子，返回是否成功"""
    posts = load_posts()
    for i, p in enumerate(posts):
        if p.get("id") == post_id:
            posts.pop(i)
            save_posts(posts)
            return True
    return False


def update_post(
    post_id: str,
    *,
    title: Optional[str] = None,
    content: Optional[str] = None,
    preview: Optional[str] = None,
) -> Optional[Dict]:
    """更新帖子标题、正文、预览；仅改这三项，不触碰 avatar、images、comment_list 等，返回完整帖子"""
    posts, idx = _find_post(post_id)
    if idx < 0:
        return None
    p = posts[idx]
    if title is not None:
        p["title"] = title
    if content is not None:
        p["content"] = content
    if preview is not None:
        p["preview"] = preview
    elif content is not None:
        p["preview"] = content[:120] + "..." if len(content) > 120 else content
    save_posts(posts)
    return p


def forward_post_to_group(post_id: str, target_group_key: str, author: str = "系统用户", role: str = "成员") -> Optional[Dict]:
    """将帖子转发到目标群组（复制一条到目标群）"""
    posts, idx = _find_post(post_id)
    if idx < 0:
        return None
    groups = load_groups()
    keys = [g["key"] for g in groups]
    if target_group_key not in keys:
        return None
    src = posts[idx]
    # 复制到目标群，标题前加「转发」
    new_title = f"【转发】{src.get('title', '')}"
    return create_post(
        target_group_key,
        title=new_title,
        content=src.get("content", ""),
        author=author,
        role=role,
        avatar=src.get("avatar"),
        preview=(src.get("preview") or "")[:200],
        images=src.get("images") or [],
        tags=(["转发"] + list(src.get("tags") or []))[:8],
        attachments=src.get("attachments") or [],
        type=src.get("type", "text"),
        analysis_id=src.get("analysis_id"),
    )
