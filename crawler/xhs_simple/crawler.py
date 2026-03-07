"""小红书爬虫主程序（使用 xhs 库）"""
import json
import time
from pathlib import Path
from typing import List, Dict, Callable, Optional
from datetime import datetime

from .xhs_client import XhsClient
from .data_formatter import DataFormatter


def _default_log(msg: str):
    print(msg)


class XhsCrawler:
    """小红书爬虫"""

    def __init__(
        self,
        cookie: str = None,
        cookie_file: str = None,
        output_dir: str = None,
        log_fn: Optional[Callable[[str, str], None]] = None,
    ):
        """log_fn(message, level) 用于将日志输出到前端；不传则使用 print"""
        self._log = log_fn or (lambda m, l="info": _default_log(m))
        self.client = XhsClient(cookie=cookie, cookie_file=cookie_file, log_fn=self._log)
        self.formatter = DataFormatter()

        # 默认输出到 backend/data/crawler_output（无需 MediaCrawler 子模块）
        if output_dir is None:
            project_root = Path(__file__).resolve().parents[2]
            output_dir = project_root / "backend" / "data" / "crawler_output" / "xhs" / "json"

        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def crawl_by_keyword(
        self,
        keyword: str,
        max_notes: int = 20,
        max_comments_per_note: int = 30,
        crawl_comments: bool = True,
        should_stop: Optional[Callable[[], bool]] = None,
    ) -> Dict:
        """根据关键词爬取笔记和评论。should_stop() 返回 True 时提前退出。"""
        self._log(f"\n🔍 开始爬取关键词: {keyword}")
        self._log(f"   目标笔记数: {max_notes}")
        self._log(f"   每条笔记评论数: {max_comments_per_note}")

        check_stop = should_stop or (lambda: False)

        # 1. 搜索笔记
        all_notes = []
        page = 1
        page_size = 20

        while len(all_notes) < max_notes:
            if check_stop():
                self._log("   ⏹️ 收到停止信号，提前退出", "warning")
                break
            try:
                self._log(f"\n📄 正在获取第 {page} 页...")
                result = self.client.search_notes(
                    keyword=keyword,
                    page=page,
                    page_size=page_size
                )

                items = result.get("items", [])
                if not items:
                    self._log("   ℹ️ 没有更多笔记了")
                    break

                # 提取笔记数据
                for item in items:
                    if len(all_notes) >= max_notes:
                        break

                    note_card = item.get("note_card", {})
                    if not note_card:
                        continue

                    formatted_note = self.formatter.format_note(item, keyword)
                    all_notes.append(formatted_note)
                    title_display = (formatted_note.get('title') or '（无标题）')[:30]
                    self._log(f"   ✅ [{len(all_notes)}/{max_notes}] {title_display}")

                page += 1
                time.sleep(1)  # 限速

            except Exception as e:
                self._log(f"   ❌ 获取笔记失败: {e}", "error")
                break

        self._log(f"\n✅ 共获取 {len(all_notes)} 条笔记", "success")

        # 2. 爬取评论
        all_comments = []
        if crawl_comments and not check_stop():
            self._log(f"\n💬 开始爬取评论...")
            for i, note in enumerate(all_notes):
                if check_stop():
                    self._log("   ⏹️ 收到停止信号，停止爬取评论", "warning")
                    break
                note_id = note["note_id"]
                title_display = (note.get('title') or '（无标题）')[:30]
                self._log(f"   [{i+1}/{len(all_notes)}] {title_display}")

                try:
                    xsec_token = note.get("xsec_token", "")
                    comments = self.client.get_all_comments(
                        note_id=note_id,
                        xsec_token=xsec_token,
                        max_count=max_comments_per_note
                    )

                    formatted_comments = self.formatter.format_comments_batch(
                        comments, note_id
                    )
                    all_comments.extend(formatted_comments)
                    self._log(f"       ✅ 获取 {len(formatted_comments)} 条评论", "success")

                    time.sleep(1)  # 限速

                except Exception as e:
                    self._log(f"       ❌ 评论获取失败: {e}", "error")

            self._log(f"\n✅ 共获取 {len(all_comments)} 条评论", "success")

        # 3. 保存数据
        date_str = datetime.now().strftime("%Y-%m-%d")
        timestamp_suffix = datetime.now().strftime("%H%M%S")
        output_files = {}

        # 保存笔记
        notes_file = self.output_dir / f"search_contents_{date_str}_{timestamp_suffix}.json"
        with open(notes_file, 'w', encoding='utf-8') as f:
            json.dump(all_notes, f, ensure_ascii=False, indent=2)

        relative_path = f"xhs/json/search_contents_{date_str}_{timestamp_suffix}.json"
        output_files["notes"] = relative_path
        self._log(f"\n💾 笔记已保存: {notes_file}")
        self._log(f"   相对路径: {relative_path}")

        # 保存评论
        if all_comments:
            comments_file = self.output_dir / f"search_comments_{date_str}_{timestamp_suffix}.json"
            with open(comments_file, 'w', encoding='utf-8') as f:
                json.dump(all_comments, f, ensure_ascii=False, indent=2)

            relative_path_comments = f"xhs/json/search_comments_{date_str}_{timestamp_suffix}.json"
            output_files["comments"] = relative_path_comments
            self._log(f"💾 评论已保存: {comments_file}")
            self._log(f"   相对路径: {relative_path_comments}")

        return {
            "notes_count": len(all_notes),
            "comments_count": len(all_comments),
            "output_files": output_files
        }


def main():
    """示例用法"""
    import sys

    # 从项目根的 crawler_config 读取 Cookie（Windows/Mac 兼容）
    project_root = Path(__file__).resolve().parents[2]
    cookie_file = project_root / "crawler_config" / "xhs_cookies_default.txt"

    if not cookie_file.exists():
        print(f"❌ Cookie 文件不存在: {cookie_file}")
        print("   请先创建该文件并填入小红书 Cookie")
        return

    crawler = XhsCrawler(cookie_file=str(cookie_file))

    # 获取关键词
    test_keyword = sys.argv[1] if len(sys.argv) > 1 else "口红测评"

    # 爬取示例
    result = crawler.crawl_by_keyword(
        keyword=test_keyword,
        max_notes=5,
        max_comments_per_note=20,
        crawl_comments=True
    )

    print(f"\n🎉 爬取完成!")
    print(f"   笔记数: {result['notes_count']}")
    print(f"   评论数: {result['comments_count']}")


if __name__ == "__main__":
    main()
