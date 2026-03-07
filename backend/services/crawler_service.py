"""爬虫服务 - 调用简化版小红书爬虫"""
import asyncio
import json
import logging
import os
import subprocess
import sys
import tempfile
import queue
import threading
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
import uuid
from collections import deque

logger = logging.getLogger("crawler")
if not logger.handlers:
    h = logging.StreamHandler(sys.stderr)
    h.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(h)
    logger.setLevel(logging.INFO)

# 将爬虫模块路径添加到 sys.path（Windows/Mac 兼容）
_project_root = Path(__file__).resolve().parents[2]
_crawler_path = _project_root / "crawler" / "xhs_simple"
if str(_crawler_path) not in sys.path:
    sys.path.insert(0, str(_crawler_path))


def _run_crawl_via_subprocess(
    project_root: str,
    keywords_list: list,
    notes_per_keyword: int,
    enable_comments: bool,
    cookies: str,
    log_queue=None,
) -> tuple:
    """在独立进程中运行爬虫，避免 Playwright Sync API 与 asyncio 冲突。返回 (total_notes, total_comments, all_files)。"""
    import sys
    pr = Path(project_root)
    crawler_path = pr / "crawler" / "xhs_simple"
    if str(crawler_path) not in sys.path:
        sys.path.insert(0, str(crawler_path))
    from crawler import XhsCrawler

    cookie_file = pr / "crawler_config" / "xhs_cookies_default.txt"

    def _log(m: str, _l: str = "info"):
        if log_queue is not None:
            try:
                log_queue.put((m, _l))
            except Exception:
                pass
        print(f"[爬虫子进程] {m}", flush=True)

    total_notes = 0
    total_comments = 0
    all_files = []

    for keyword in keywords_list:
        if cookies:
            crawler = XhsCrawler(cookie=cookies, log_fn=_log)
        elif cookie_file.exists():
            crawler = XhsCrawler(cookie_file=str(cookie_file), log_fn=_log)
        else:
            raise FileNotFoundError(f"Cookie 文件不存在: {cookie_file}")

        result = crawler.crawl_by_keyword(
            keyword=keyword,
            max_notes=notes_per_keyword,
            max_comments_per_note=30,
            crawl_comments=enable_comments,
        )
        total_notes += result["notes_count"]
        total_comments += result["comments_count"]
        all_files.append(result["output_files"].get("notes", ""))

    return total_notes, total_comments, all_files


class CrawlerService:
    """爬虫服务（单例）"""

    def __init__(self):
        self._status = "idle"
        self._task_id = None
        self._current_task = None
        self._logs = []
        self._stats = {
            "notes_count": 0,
            "comments_count": 0,
            "start_time": None,
            "end_time": None,
            "output_files": {}
        }
        self._current_stats = None
        self._realtime_logs = deque(maxlen=1000)
        self._log_listeners = []
        self._error_message = None  # 采集失败时的错误信息，供前端展示

    def _add_log(self, message: str, level: str = "info"):
        """添加日志"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message
        }
        self._logs.append(log_entry)

        if len(self._logs) > 1000:
            self._logs = self._logs[-1000:]

        self._realtime_logs.append(log_entry)

        for q in self._log_listeners:
            try:
                q.put_nowait(log_entry)
            except Exception:
                pass

        # 同时输出到 stderr（Windows 默认 gbk 无法编码 emoji 等，直接写 UTF-8 字节绕过）
        line = f"[爬虫] [{level.upper()}] {message}\n"
        try:
            sys.stderr.buffer.write(line.encode("utf-8", errors="replace"))
            sys.stderr.buffer.flush()
        except Exception:
            pass
        try:
            logger.info(f"[{level.upper()}] {message}")
        except Exception:
            pass

    def add_log_listener(self) -> queue.Queue:
        """添加日志监听器（用于SSE）"""
        q = queue.Queue()
        self._log_listeners.append(q)
        return q

    def remove_log_listener(self, q: queue.Queue):
        """移除日志监听器"""
        if q in self._log_listeners:
            self._log_listeners.remove(q)

    async def start_crawl(
        self,
        platform: str,
        crawler_type: str,
        keywords: str,
        max_notes_count: int = 100,
        enable_comments: bool = True,
        enable_sub_comments: bool = False,
        cookies: str = "",
    ):
        """启动爬虫任务"""
        if self._status == "running":
            self._add_log("爬虫任务已在运行中", "warning")
            return

        self._status = "running"
        self._error_message = None
        self._task_id = str(uuid.uuid4())
        self._logs = []
        self._stats = {
            "notes_count": 0,
            "comments_count": 0,
            "start_time": datetime.now().isoformat(),
            "end_time": None,
            "output_files": {}
        }

        keywords_list = [kw.strip() for kw in keywords.split(',') if kw.strip()] if keywords else ["口红"]

        self._add_log(f"[xhs_simple] 开始爬取 {platform} 平台，类型: {crawler_type}")
        self._add_log(f"关键词数量: {len(keywords_list)}，关键词: {', '.join(keywords_list)}")
        self._add_log(f"目标笔记数: {max_notes_count}，评论: {'开启' if enable_comments else '关闭'}")

        try:
            if platform == "xhs" and crawler_type == "search":
                # 使用 subprocess 启动完全独立的 Python 进程，彻底避免 Playwright 与 asyncio 冲突
                notes_per_keyword = max_notes_count // max(1, len(keywords_list))

                def _run_subprocess():
                    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as tf:
                        result_file = tf.name
                    try:
                        # 直接运行脚本（非 -m），-I 隔离模式避免继承主进程环境
                        script_path = _project_root / "crawler" / "xhs_simple" / "run_standalone.py"
                        cmd = [
                            sys.executable, "-I", str(script_path),
                            str(_project_root),
                            json.dumps(keywords_list, ensure_ascii=False),
                            str(notes_per_keyword),
                            str(enable_comments).lower(),
                            cookies or "",
                            result_file,
                        ]
                        env = os.environ.copy()
                        env["PYTHONIOENCODING"] = "utf-8"
                        env["PYTHONUTF8"] = "1"  # 强制 UTF-8
                        proc = subprocess.Popen(
                            cmd,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            encoding="utf-8",
                            errors="replace",
                            cwd=str(_project_root),
                            env=env,
                        )
                        for line in proc.stdout:
                            line = line.rstrip()
                            if line.startswith("[LOG]"):
                                parts = line[5:].split("|", 1)
                                lvl = parts[0] if len(parts) > 1 else "info"
                                msg = parts[1] if len(parts) > 1 else line
                                self._add_log(msg, lvl)
                            elif line:
                                self._add_log(line, "info")
                        proc.wait()
                        if proc.returncode != 0:
                            raise RuntimeError(f"子进程退出码: {proc.returncode}")
                        with open(result_file, "r", encoding="utf-8") as f:
                            out = json.load(f)
                        if not out.get("success"):
                            raise RuntimeError(out.get("error", "爬取失败"))
                        return out["total_notes"], out["total_comments"], out["all_files"]
                    finally:
                        try:
                            os.unlink(result_file)
                        except Exception:
                            pass

                total_notes, total_comments, all_files = await asyncio.to_thread(_run_subprocess)

                self._stats["notes_count"] = total_notes
                self._stats["comments_count"] = total_comments
                self._stats["output_files"] = {"notes": all_files[0] if all_files else ""}

                self._current_stats = {
                    "notes_count": total_notes,
                    "comments_count": total_comments,
                    "total_notes": total_notes,  # 兼容前端
                    "total_comments": total_comments,  # 兼容前端
                    "data_file": all_files[0] if all_files else "",
                    "keyword": ', '.join(keywords_list),
                    "all_files": all_files
                }
            else:
                raise ValueError(f"暂不支持: {platform}/{crawler_type}")

            # 若为手动停止，保持 stopped；否则标记完成
            if self._status == "running":
                self._status = "idle"
            self._stats["end_time"] = datetime.now().isoformat()
            self._add_log("✅ 爬取任务完成", "success")

        except Exception as e:
            self._status = "error"
            self._error_message = str(e)
            self._stats["end_time"] = datetime.now().isoformat()
            self._add_log(f"❌ 爬取失败: {self._error_message}", "error")
            raise

    def _run_crawl_loop_sync(
        self,
        keywords_list: list,
        max_notes_count: int,
        enable_comments: bool,
        cookies: str,
    ) -> tuple:
        """同步爬取循环（在线程中运行，不阻塞事件循环）。返回 (total_notes, total_comments, all_files)。"""
        total_notes = 0
        total_comments = 0
        all_files = []
        notes_per_keyword = max_notes_count // max(1, len(keywords_list))

        for i, keyword in enumerate(keywords_list):
            if self._status != "running":
                self._add_log("   ⏹️ 收到停止信号，终止爬取", "warning")
                break
            self._add_log(f"\n📍 [{i+1}/{len(keywords_list)}] 正在处理关键词: {keyword}")
            result = self._crawl_xhs_sync(
                keyword,
                notes_per_keyword,
                enable_comments,
                cookies,
                should_stop=lambda: self._status != "running",
            )
            total_notes += result["notes_count"]
            total_comments += result["comments_count"]
            all_files.append(result["output_files"].get("notes", ""))

        return total_notes, total_comments, all_files

    def _crawl_xhs_sync(
        self,
        keyword: str,
        max_notes_count: int,
        enable_comments: bool,
        cookies: str = "",
        should_stop=None,
    ) -> Dict:
        """爬取小红书数据（同步版本）"""
        try:
            self._add_log(f"   📂 爬虫模块路径: {_crawler_path.resolve()}")
            from crawler import XhsCrawler

            cookie_file = _project_root / "crawler_config" / "xhs_cookies_default.txt"
            log_fn = lambda msg, level="info": self._add_log(msg, level)

            if cookies:
                self._add_log("   📝 使用自定义 Cookie")
                crawler = XhsCrawler(cookie=cookies, log_fn=log_fn)
            elif cookie_file.exists():
                self._add_log(f"   📄 使用 Cookie 文件: {cookie_file.name}")
                crawler = XhsCrawler(cookie_file=str(cookie_file), log_fn=log_fn)
            else:
                raise FileNotFoundError(f"Cookie 文件不存在: {cookie_file}")

            self._add_log(f"   🔍 开始搜索: {keyword}")
            result = crawler.crawl_by_keyword(
                keyword=keyword,
                max_notes=max_notes_count,
                max_comments_per_note=30,
                crawl_comments=enable_comments,
                should_stop=should_stop,
            )

            self._add_log(f"   ✅ 笔记: {result['notes_count']} 条", "success")
            if enable_comments:
                self._add_log(f"   ✅ 评论: {result['comments_count']} 条", "success")

            return result

        except Exception as e:
            self._add_log(f"   ❌ 爬取出错: {e}", "error")
            raise

    def stop_crawl(self):
        """停止爬虫任务"""
        if self._status == "running":
            self._status = "stopped"
            self._stats["end_time"] = datetime.now().isoformat()
            self._add_log("爬虫任务已手动停止", "warning")
        else:
            self._add_log("没有正在运行的爬虫任务", "warning")

    def get_status(self) -> Dict:
        """获取爬虫状态（前端期望格式）"""
        result = {
            "status": self._status,
            "task_id": self._task_id,
            "stats": self._stats,
            "log_count": len(self._logs)
        }
        if self._status == "error" and self._error_message:
            result["error_message"] = self._error_message
        if self._current_stats and self._status in ("idle", "stopped"):
            result["current_stats"] = self._current_stats
        return result

    def get_logs(self, limit: int = 100) -> List[Dict]:
        """获取日志"""
        return self._logs[-limit:]

    def get_task_id(self) -> Optional[str]:
        """获取当前任务 ID"""
        return self._task_id


crawler_service = CrawlerService()
