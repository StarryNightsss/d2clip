"""
独立进程运行爬虫 - 不导入 backend/uvicorn，彻底避免 Playwright 与 asyncio 冲突。
用法: python -m crawler.xhs_simple.run_standalone <project_root> <keywords_json> <notes_per_keyword> <enable_comments> <cookies> <result_file>
"""
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

# 子进程启动时强制 stdout/stderr 使用 UTF-8，避免 Windows 下 gbk 无法编码 emoji
if hasattr(sys.stdout, "buffer"):
    try:
        sys.stdout = open(sys.stdout.fileno(), mode="w", encoding="utf-8", errors="replace")
        sys.stderr = open(sys.stderr.fileno(), mode="w", encoding="utf-8", errors="replace")
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("project_root", help="项目根目录")
    parser.add_argument("keywords_json", help="关键词列表 JSON，如 [\"a\",\"b\"]")
    parser.add_argument("notes_per_keyword", type=int)
    parser.add_argument("enable_comments", type=lambda x: x.lower() == "true")
    parser.add_argument("cookies", help="Cookie 字符串，空则用文件")
    parser.add_argument("result_file", help="结果输出 JSON 文件路径")
    args = parser.parse_args()

    project_root = Path(args.project_root)
    # 确保项目根在 path 中，再导入（直接运行脚本时无包上下文）
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    from crawler.xhs_simple.crawler import XhsCrawler

    keywords_list = json.loads(args.keywords_json)
    cookie_file = project_root / "crawler_config" / "xhs_cookies_default.txt"

    def _log(m: str, _l: str = "info"):
        # 输出到 stdout，父进程可读取并转发；直接写 UTF-8 字节，避免 Windows gbk 无法编码 emoji
        line = f"[LOG]{_l}|{m}\n"
        try:
            sys.stdout.buffer.write(line.encode("utf-8", errors="replace"))
            sys.stdout.buffer.flush()
        except Exception:
            pass

    total_notes = 0
    total_comments = 0
    all_files = []

    try:
        # 只创建一次爬虫，避免多次 sync_playwright().start() 触发 asyncio 冲突
        if args.cookies:
            crawler = XhsCrawler(cookie=args.cookies, log_fn=_log)
        elif cookie_file.exists():
            crawler = XhsCrawler(cookie_file=str(cookie_file), log_fn=_log)
        else:
            raise FileNotFoundError(f"Cookie 文件不存在: {cookie_file}")

        for keyword in keywords_list:
            result = crawler.crawl_by_keyword(
                keyword=keyword,
                max_notes=args.notes_per_keyword,
                max_comments_per_note=30,
                crawl_comments=args.enable_comments,
            )
            total_notes += result["notes_count"]
            total_comments += result["comments_count"]
            all_files.append({
                "notes": result["output_files"].get("notes", ""),
                "comments": result["output_files"].get("comments", ""),
            })

        # 多关键词时合并笔记和评论到单个文件，避免分析时找不到评论文件
        merged_file = ""
        if all_files:
            data_dir = project_root / "backend" / "data" / "crawler_output"
            all_notes = []
            all_comments = []
            for item in all_files:
                notes_path = item.get("notes") if isinstance(item, dict) else item
                if not notes_path:
                    continue
                fp = data_dir / notes_path.replace("\\", "/")
                if fp.exists():
                    try:
                        with open(fp, "r", encoding="utf-8") as f:
                            notes = json.load(f)
                            all_notes.extend(notes if isinstance(notes, list) else [])
                    except Exception:
                        pass
                # 同时加载对应评论文件（notes 与 comments 同时间戳）
                comments_path = (item.get("comments") if isinstance(item, dict) else "") or notes_path.replace("contents", "comments")
                if comments_path:
                    cp = data_dir / comments_path.replace("\\", "/")
                    if cp.exists():
                        try:
                            with open(cp, "r", encoding="utf-8") as f:
                                comments = json.load(f)
                                all_comments.extend(comments if isinstance(comments, list) else [])
                        except Exception:
                            pass
            if all_notes:
                ts = datetime.now().strftime("%Y-%m-%d_%H%M%S")
                merged_rel = f"xhs/json/search_contents_{ts}.json"
                merged_path = data_dir / merged_rel.replace("\\", "/")
                merged_path.parent.mkdir(parents=True, exist_ok=True)
                with open(merged_path, "w", encoding="utf-8") as f:
                    json.dump(all_notes, f, ensure_ascii=False, indent=2)
                merged_file = merged_rel
                # 合并评论并保存，确保分析时能关联到高赞评论
                if all_comments:
                    merged_comments_rel = f"xhs/json/search_comments_{ts}.json"
                    merged_comments_path = data_dir / merged_comments_rel.replace("\\", "/")
                    with open(merged_comments_path, "w", encoding="utf-8") as f:
                        json.dump(all_comments, f, ensure_ascii=False, indent=2)

        out = {
            "success": True,
            "total_notes": total_notes,
            "total_comments": total_comments,
            "all_files": [merged_file] if merged_file else all_files,
        }
    except Exception as e:
        out = {"success": False, "error": str(e)}
        line = f"[LOG]error|爬取出错: {e}\n"
        try:
            sys.stdout.buffer.write(line.encode("utf-8", errors="replace"))
            sys.stdout.buffer.flush()
        except Exception:
            pass

    with open(args.result_file, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)


if __name__ == "__main__":
    main()
