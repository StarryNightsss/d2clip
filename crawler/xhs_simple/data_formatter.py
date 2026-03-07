"""数据格式转换器 - 将小红书 API 数据转换为统一格式"""
from typing import Dict, List
import time


class DataFormatter:
    """数据格式化器"""

    @staticmethod
    def format_note(note_item: Dict, keyword: str = "") -> Dict:
        """格式化笔记数据为后端期望的格式"""
        # 提取 note_card 中的数据
        note_card = note_item.get("note_card", {})
        note_id = note_item.get("id", "")
        user_info = note_card.get("user", {})
        interact_info = note_card.get("interact_info", {})

        # 提取图片 URL（从 image_list 中的 info_list 获取）
        image_list = []
        for img in note_card.get("image_list", []):
            for info in img.get("info_list", []):
                if info.get("image_scene") == "WB_DFT":
                    image_list.append(info.get("url", ""))
                    break

        # 标题：优先 display_title，空则用 desc 前80字或 title 字段（部分笔记 display_title 为空）
        display_title = note_card.get("display_title") or note_card.get("title") or ""
        desc = note_card.get("desc", "")
        title = display_title if display_title else (desc[:80] + ("..." if len(desc) > 80 else "") if desc else "")

        return {
            # 基本信息
            "note_id": note_id,
            "type": note_card.get("type", "normal"),
            "title": title,
            "desc": desc,

            # 用户信息
            "user_id": user_info.get("user_id", ""),
            "nickname": user_info.get("nickname", ""),
            "avatar": user_info.get("avatar", ""),
            "ip_location": note_card.get("ip_location", ""),

            # 时间
            "time": int(time.time()),
            "last_update_time": int(time.time()),

            # 互动数据
            "liked_count": interact_info.get("liked_count", "0"),
            "collected_count": interact_info.get("collected_count", "0"),
            "comment_count": interact_info.get("comment_count", "0"),
            "share_count": interact_info.get("shared_count", "0"),

            # 媒体资源
            "image_list": image_list,
            "video_url": note_card.get("video", {}).get("media", {}).get("stream", {}).get("h264", [{}])[0].get("master_url", "") if note_card.get("video") else "",

            # 标签
            "tag_list": [tag.get("name", "") for tag in note_card.get("tag_list", [])],

            # 链接和来源
            "note_url": f"https://www.xiaohongshu.com/explore/{note_id}",
            "source_keyword": keyword,
            "xsec_token": note_item.get("xsec_token", "")
        }

    @staticmethod
    def format_comment(comment_item: Dict, note_id: str) -> Dict:
        """格式化评论数据"""
        user_info = comment_item.get("user_info", {})

        return {
            # 评论基本信息
            "comment_id": comment_item.get("id", ""),
            "note_id": note_id,
            "content": comment_item.get("content", ""),
            "create_time": comment_item.get("create_time", int(time.time())),

            # 用户信息
            "user_id": user_info.get("user_id", ""),
            "nickname": user_info.get("nickname", ""),
            "avatar": user_info.get("image", ""),
            "ip_location": comment_item.get("ip_location", ""),

            # 互动数据
            "like_count": str(comment_item.get("like_count", "0")),
            "sub_comment_count": comment_item.get("sub_comment_count", 0),

            # 父评论 ID (0 表示一级评论)
            "parent_comment_id": comment_item.get("target_comment", {}).get("id", 0) or 0,

            # 图片
            "pictures": comment_item.get("pictures", [])
        }

    @staticmethod
    def format_notes_batch(items: List[Dict], keyword: str = "") -> List[Dict]:
        """批量格式化笔记"""
        return [DataFormatter.format_note(item, keyword) for item in items]

    @staticmethod
    def format_comments_batch(comments: List[Dict], note_id: str) -> List[Dict]:
        """批量格式化评论"""
        return [DataFormatter.format_comment(c, note_id) for c in comments]
