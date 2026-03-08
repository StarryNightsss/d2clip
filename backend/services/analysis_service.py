"""
分析服务 - 主流程编排（使用 LangChain Chain）
"""
import json
import asyncio
from pathlib import Path
from typing import List, Dict
from collections import Counter
from datetime import datetime
import uuid

from backend.config import settings
from backend.models.schemas import (
    NoteAnalysisResult, AnalysisStatistics, AnalysisResponse,
    StyleStatistics, ColorStatistics, KeywordStatistics,
    LipstickFeatures, DynamicReport, ReportSection, ChartConfig
)
from backend.services.langchain_service import langchain_service
from backend.prompts.chart_schema import COLOR_SCHEMES, ECHARTS_PIE_SCHEMA, ECHARTS_BAR_SCHEMA, ECHARTS_SCATTER_SCHEMA


class AnalysisService:
    """笔记分析服务"""

    def __init__(self):
        self._analysis_cache = {}
        self._latest_analysis_id = None
        self._current_task_status = "idle"
        self._current_task_id = None
        self._current_progress = 0
        self._total_notes = 0
        self._completed_notes = 0
        self._history_file = settings.DATA_DIR / "analysis_history.json"
        self._analyses_dir = settings.DATA_DIR / "analyses"
        self._analyses_dir.mkdir(parents=True, exist_ok=True)
        self._history = self._load_history()

    def _load_history(self) -> List[Dict]:
        """从文件加载历史记录"""
        if self._history_file.exists():
            try:
                with open(self._history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ 加载历史记录失败: {e}")
        return []

    def _save_history(self):
        """保存历史记录到文件"""
        try:
            self._history_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self._history_file, 'w', encoding='utf-8') as f:
                json.dump(self._history, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"⚠️ 保存历史记录失败: {e}")

    def _add_to_history(self, analysis_id: str, platform: str, data_file: str,
                       total_notes: int, analyzed_notes: int, failed_notes: int, status: str,
                       user_id: str = None):
        """添加一条历史记录；有 DB 时写库（含 user_id 按用户区分），否则写 JSON 文件"""
        history_entry = {
            "analysis_id": analysis_id,
            "created_at": datetime.now().isoformat(),
            "platform": platform,
            "data_file": data_file,
            "total_notes": total_notes,
            "analyzed_notes": analyzed_notes,
            "failed_notes": failed_notes,
            "status": status,
        }
        if user_id is not None:
            history_entry["user_id"] = user_id
        try:
            from backend.db import is_db_configured, SessionLocal
            from backend.db.models import AnalysisTask
            if is_db_configured():
                db = SessionLocal()
                try:
                    db.add(AnalysisTask(
                        analysis_id=analysis_id,
                        user_id=user_id or None,
                        platform=platform,
                        data_file=data_file,
                        total_notes=total_notes,
                        analyzed_notes=analyzed_notes,
                        failed_notes=failed_notes,
                        status=status,
                    ))
                    db.commit()
                finally:
                    db.close()
                    return
        except Exception:
            pass
        self._history.insert(0, history_entry)
        self._history = self._history[:50]
        self._save_history()

    def _save_analysis_to_file(self, response: AnalysisResponse):
        """保存完整分析结果到文件"""
        try:
            file_path = self._analyses_dir / f"{response.analysis_id}.json"

            # 将 AnalysisResponse 转换为可序列化的字典
            data = {
                "analysis_id": response.analysis_id,
                "status": response.status,
                "created_at": response.created_at.isoformat(),
                "results": [
                    {
                        "note_id": r.note_id,
                        "title": r.title,
                        "makeup_style": r.makeup_style,
                        "lipstick_features": {
                            "color": r.lipstick_features.color,
                            "texture": r.lipstick_features.texture,
                            "saturation": r.lipstick_features.saturation,
                            "tone": r.lipstick_features.tone
                        },
                        "keywords": r.keywords,
                        "scene": r.scene
                    }
                    for r in response.results
                ],
                "statistics": {
                    "total_notes": response.statistics.total_notes,
                    "analyzed_notes": response.statistics.analyzed_notes,
                    "failed_notes": response.statistics.failed_notes,
                    "styles": [{"name": s.name, "count": s.count, "percentage": s.percentage} for s in response.statistics.styles],
                    "colors": [{"name": c.name, "count": c.count, "percentage": c.percentage} for c in response.statistics.colors],
                    "keywords": [{"name": k.name, "count": k.count} for k in response.statistics.keywords]
                },
                "report": {
                    "report_title": response.report.report_title,
                    "summary": response.report.summary,
                    "sections": [
                        {
                            "section_id": s.section_id,
                            "title": s.title,
                            "content": s.content,
                            "charts": [
                                {
                                    "chart_type": c.chart_type,
                                    "chart_title": c.chart_title,
                                    "description": c.description,
                                    "echarts_option": c.echarts_option
                                }
                                for c in s.charts
                            ],
                            "order": s.order
                        }
                        for s in response.report.sections
                    ]
                }
            }

            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            print(f"💾 分析结果已保存: {file_path}")
        except Exception as e:
            print(f"⚠️ 保存分析结果失败: {e}")

    def _load_analysis_from_file(self, analysis_id: str) -> AnalysisResponse:
        """从文件加载完整分析结果"""
        try:
            file_path = self._analyses_dir / f"{analysis_id}.json"

            if not file_path.exists():
                return None

            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 重建 AnalysisResponse 对象
            response = AnalysisResponse(
                analysis_id=data["analysis_id"],
                status=data["status"],
                results=[
                    NoteAnalysisResult(
                        note_id=r["note_id"],
                        title=r["title"],
                        makeup_style=r["makeup_style"],
                        lipstick_features=LipstickFeatures(**r["lipstick_features"]),
                        keywords=r["keywords"],
                        scene=r["scene"]
                    )
                    for r in data["results"]
                ],
                statistics=AnalysisStatistics(
                    total_notes=data["statistics"]["total_notes"],
                    analyzed_notes=data["statistics"]["analyzed_notes"],
                    failed_notes=data["statistics"]["failed_notes"],
                    styles=[StyleStatistics(**s) for s in data["statistics"]["styles"]],
                    colors=[ColorStatistics(**c) for c in data["statistics"]["colors"]],
                    keywords=[KeywordStatistics(**k) for k in data["statistics"]["keywords"]]
                ),
                report=DynamicReport(
                    report_title=data["report"]["report_title"],
                    summary=data["report"]["summary"],
                    sections=[
                        ReportSection(
                            section_id=s["section_id"],
                            title=s["title"],
                            content=s["content"],
                            charts=[
                                ChartConfig(
                                    chart_type=c["chart_type"],
                                    chart_title=c["chart_title"],
                                    description=c["description"],
                                    echarts_option=c["echarts_option"]
                                )
                                for c in s["charts"]
                            ],
                            order=s["order"]
                        )
                        for s in data["report"]["sections"]
                    ]
                ),
                charts=None
            )

            # 恢复 created_at 时间
            response.created_at = datetime.fromisoformat(data["created_at"])

            print(f"📂 从文件加载分析结果: {analysis_id}")
            return response

        except Exception as e:
            print(f"⚠️ 加载分析结果失败: {e}")
            return None

    async def analyze_notes(self, data_file: str, limit: int = None, platform: str = "xhs", user_id: str = None) -> AnalysisResponse:
        """分析笔记数据（使用 Chain）"""
        if self._current_task_status == "running":
            return {
                "status": "running",
                "message": "已有分析任务正在运行",
                "task_id": self._current_task_id,
                "progress": self._current_progress,
                "completed": self._completed_notes,
                "total": self._total_notes
            }

        analysis_id = str(uuid.uuid4())
        self._current_task_status = "running"
        self._current_task_id = analysis_id
        self._current_progress = 0
        self._completed_notes = 0

        try:
            # 阶段 1: 读取数据
            notes = self._load_and_merge_data(data_file, platform)
            if limit:
                notes = notes[:limit]

            self._total_notes = len(notes)
            print(f"📊 开始分析 {len(notes)} 条笔记...")

            # 阶段 2: 并行分析所有笔记（使用 note_analysis_chain）
            results, failed_count = await self._analyze_all_notes(notes)

            # 阶段 3: 统计聚合
            statistics = self._calculate_statistics(results, len(notes), failed_count)

            # 阶段 4: 生成报告（分步骤）
            print(f"\n🎨 开始生成报告...")
            report = await self._generate_report(statistics)

            # 构建响应
            response = AnalysisResponse(
                analysis_id=analysis_id,
                status="success" if results else "failed",
                results=results,
                statistics=statistics,
                report=report,
                charts=None
            )

            # 缓存结果到内存
            self._analysis_cache[analysis_id] = response
            self._latest_analysis_id = analysis_id

            # 保存到文件（持久化）
            self._save_analysis_to_file(response)

            if len(self._analysis_cache) > 10:
                oldest_id = list(self._analysis_cache.keys())[0]
                del self._analysis_cache[oldest_id]

            self._current_task_status = "completed"
            self._current_progress = 100

            self._add_to_history(
                analysis_id=analysis_id,
                platform=platform,
                data_file=data_file,
                total_notes=len(notes),
                analyzed_notes=len(results),
                failed_notes=failed_count,
                status="success" if results else "failed",
                user_id=user_id,
            )

            print(f"\n✅ 分析完成！成功: {len(results)}, 失败: {failed_count}")
            return response

        except Exception as e:
            self._current_task_status = "error"
            print(f"\n❌ 分析失败: {e}")
            raise

    async def _analyze_all_notes(self, notes: List[Dict]) -> tuple[List[NoteAnalysisResult], int]:
        """并行分析所有笔记（使用 Chain）"""
        results = []
        failed_count = 0

        for i, note in enumerate(notes):
            print(f"[{i+1}/{len(notes)}] 分析: {note.get('title', '无标题')[:30]}...")

            try:
                # 使用 langchain_service 的 Chain
                analysis = await langchain_service.analyze_note(
                    self._format_note_content(note)
                )

                result = NoteAnalysisResult(
                    note_id=note.get('note_id', str(i)),
                    title=note.get('title', ''),
                    makeup_style=analysis.get('makeup_style', []),
                    lipstick_features=LipstickFeatures(**analysis.get('lipstick_features', {})),
                    keywords=analysis.get('keywords', []),
                    scene=analysis.get('scene', []),
                    comments=note.get('comments', [])
                )

                results.append(result)
                print(f"  ✅ 妆容: {result.makeup_style}, 色调: {result.lipstick_features.color}")

            except Exception as e:
                print(f"  ❌ 失败: {e}")
                failed_count += 1

            self._completed_notes = i + 1
            self._current_progress = int((i + 1) / len(notes) * 100)
            await asyncio.sleep(1)

        return results, failed_count

    async def _generate_report(self, stats: AnalysisStatistics) -> DynamicReport:
        """生成完整报告（分阶段调用 Chain，带容错）"""
        try:
            # 准备统计数据
            stats_dict = {
                "total_notes": stats.total_notes,
                "analyzed_notes": stats.analyzed_notes,
                "failed_notes": stats.failed_notes,
                "styles": [{"name": s.name, "count": s.count, "percentage": s.percentage} for s in stats.styles],
                "colors": [{"name": c.name, "count": c.count, "percentage": c.percentage} for c in stats.colors],
                "keywords": [{"name": k.name, "count": k.count} for k in stats.keywords]
            }

            # 阶段 1: 生成报告骨架（带重试）
            print(f"  ⏳ 生成报告骨架...")
            skeleton = None
            for attempt in range(3):
                try:
                    skeleton = await langchain_service.generate_report_skeleton(stats_dict)
                    print(f"  ✅ 报告骨架生成完成，共 {len(skeleton['sections'])} 个板块")
                    break
                except Exception as e:
                    print(f"  ⚠️ 报告骨架生成失败 (第{attempt+1}次): {e}")
                    if attempt == 2:
                        raise Exception(f"报告骨架生成失败（已重试3次）: {e}")
                    await asyncio.sleep(2)

            # 阶段 2: 并行生成所有板块内容（带容错）
            print(f"  ⏳ 生成板块内容...")
            section_tasks = [
                langchain_service.generate_section_content(
                    section_title=section["title"],
                    section_data=self._extract_section_data(stats, section["data_field"])
                )
                for section in skeleton["sections"]
            ]
            section_contents = await asyncio.gather(*section_tasks, return_exceptions=True)

            # 检查是否有失败的板块
            for i, content in enumerate(section_contents):
                if isinstance(content, Exception):
                    print(f"  ⚠️ 板块 {skeleton['sections'][i]['title']} 内容生成失败: {content}")
                    section_contents[i] = f"【数据分析】{skeleton['sections'][i]['title']}的详细分析正在整理中..."

            print(f"  ✅ 所有板块内容生成完成")

            # 阶段 3: 并行生成所有图表配置（M 次 API 调用）
            print(f"  ⏳ 生成图表配置...")
            chart_tasks = []
            chart_mapping = []  # 记录每个图表属于哪个板块

            for section in skeleton["sections"]:
                for chart_spec in section["charts"]:
                    task = langchain_service.generate_chart_config(
                        chart_type=chart_spec["chart_type"],
                        chart_title=chart_spec["chart_title"],
                        description=chart_spec.get("description", ""),
                        data_summary=self._extract_chart_data(stats, chart_spec["data_field"]),
                        color_scheme=COLOR_SCHEMES["default"],
                        schema=self._get_schema(chart_spec["chart_type"])
                    )
                    chart_tasks.append(task)
                    chart_mapping.append((section["section_id"], chart_spec))

            chart_results = await asyncio.gather(*chart_tasks, return_exceptions=True)
            print(f"  ✅ 所有图表配置生成完成")

            # 阶段 4: 组装完整报告
            sections = []
            for i, section in enumerate(skeleton["sections"]):
                # 填充板块内容
                content = section_contents[i]

                # 收集该板块的图表
                charts = []
                for j, (section_id, chart_spec) in enumerate(chart_mapping):
                    if section_id == section["section_id"]:
                        chart_result = chart_results[j]
                        if isinstance(chart_result, Exception):
                            print(f"  ⚠️ 图表生成失败: {chart_spec['chart_title']}")
                            continue

                        charts.append(ChartConfig(
                            chart_type=chart_spec["chart_type"],
                            chart_title=chart_spec["chart_title"],
                            description=chart_spec.get("description", ""),
                            echarts_option=chart_result
                        ))

                sections.append(ReportSection(
                    section_id=section["section_id"],
                    title=section["title"],
                    content=content,
                    charts=charts,
                    order=section["order"]
                ))

            return DynamicReport(
                report_title=skeleton["report_title"],
                summary=skeleton["summary"],
                sections=sections
            )

        except Exception as e:
            print(f"  ❌ 报告生成失败: {e}")
            # 返回一个基础报告，不影响前面的分析结果
            return DynamicReport(
                report_title="数据分析报告",
                summary=f"本次分析了 {stats.analyzed_notes} 条笔记，发现了丰富的美妆趋势数据。",
                sections=[]
            )

    def _extract_section_data(self, stats: AnalysisStatistics, data_field: str) -> Dict:
        """提取板块相关的统计数据"""
        if data_field == "styles":
            return {
                "total": len(stats.styles),
                "items": [{"name": s.name, "count": s.count, "percentage": s.percentage} for s in stats.styles[:10]]
            }
        elif data_field == "colors":
            return {
                "total": len(stats.colors),
                "items": [{"name": c.name, "count": c.count, "percentage": c.percentage} for c in stats.colors[:10]]
            }
        elif data_field == "keywords":
            return {
                "total": len(stats.keywords),
                "items": [{"name": k.name, "count": k.count} for k in stats.keywords[:20]]
            }
        else:
            return {"items": []}

    def _extract_chart_data(self, stats: AnalysisStatistics, data_field: str) -> Dict:
        """提取图表数据"""
        return self._extract_section_data(stats, data_field)

    def _get_schema(self, chart_type: str) -> str:
        """获取图表 Schema"""
        schema_map = {
            "pie": ECHARTS_PIE_SCHEMA,
            "bar": ECHARTS_BAR_SCHEMA,
            "scatter": ECHARTS_SCATTER_SCHEMA
        }
        return schema_map.get(chart_type, ECHARTS_BAR_SCHEMA)

    def _load_and_merge_data(self, data_file: str, platform: str = "xhs") -> List[Dict]:
        """加载并合并爬虫数据"""
        if platform == "xhs":
            return self._merge_xhs_data(data_file)
        else:
            return self._load_crawler_data(data_file, platform)

    def _merge_xhs_data(self, data_file: str) -> List[Dict]:
        """小红书数据合并策略"""
        print(f"📦 加载小红书数据: {data_file}")
        notes = self._load_crawler_data(data_file, "xhs")
        print(f"   ✅ 加载 {len(notes)} 条帖子")

        if "content" in data_file.lower():
            comments_file = data_file.replace("contents", "comments").replace("content", "comment")
            try:
                all_comments = self._load_crawler_data(comments_file, "xhs")
                print(f"   ✅ 加载 {len(all_comments)} 条评论")

                primary_comments = [c for c in all_comments if c.get('parent_comment_id') == 0 or c.get('parent_comment_id') is None]
                print(f"   ✅ 过滤后 {len(primary_comments)} 条一级评论")

                comments_by_note = {}
                for comment in primary_comments:
                    note_id = comment.get('note_id')
                    if not note_id:
                        continue
                    cid = comment.get('comment_id') or comment.get('id') or str(id(comment))
                    if note_id not in comments_by_note:
                        comments_by_note[note_id] = {}
                    comments_by_note[note_id][cid] = comment  # 按 comment_id 去重，避免重复

                for note_id in comments_by_note:
                    comments_by_note[note_id] = list(comments_by_note[note_id].values())

                merged_count = 0
                total_comments_attached = 0

                for note in notes:
                    note_id = note.get('note_id')
                    if note_id and note_id in comments_by_note:
                        note_comments = comments_by_note[note_id]
                        sorted_comments = sorted(
                            note_comments,
                            key=lambda c: self._parse_count(c.get('like_count', '0')),
                            reverse=True
                        )[:5]

                        note['comments'] = sorted_comments
                        merged_count += 1
                        total_comments_attached += len(sorted_comments)

                print(f"   ✅ 已为 {merged_count} 条帖子关联 {total_comments_attached} 条高赞评论")

            except FileNotFoundError:
                print(f"   ⚠️ 未找到评论文件，仅使用帖子内容")
            except Exception as e:
                print(f"   ⚠️ 评论关联失败: {e}")

        return notes

    def _load_crawler_data(self, data_file: str, platform: str = "xhs") -> List[Dict]:
        """加载单个爬虫数据文件（兼容 / 与 \\，避免 xhs/json 被拼两次）"""
        # 统一为正斜杠，避免 Windows 下 \ 导致判断走错分支
        data_file_normalized = data_file.replace("\\", "/")
        if "/" in data_file_normalized:
            # 已含相对路径，直接拼在 CRAWLER_DATA_DIR 下
            file_path = settings.CRAWLER_DATA_DIR / data_file_normalized
        else:
            platform_dirs = {
                "xhs": "xhs/json",
                "dy": "douyin/json",
                "ks": "kuaishou/json",
                "bili": "bilibili/json",
                "wb": "weibo/json",
                "tieba": "tieba/json",
                "zhihu": "zhihu/json"
            }
            platform_dir = platform_dirs.get(platform, "xhs/json")
            file_path = settings.CRAWLER_DATA_DIR / platform_dir / data_file_normalized

        if not file_path.exists():
            raise FileNotFoundError(f"数据文件不存在: {file_path}")

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and 'data' in data:
            return data['data']
        else:
            raise ValueError("不支持的数据格式")

    def _format_note_content(self, note: Dict) -> str:
        """格式化笔记内容供LLM分析"""
        title = note.get('title', '')
        desc = note.get('desc', '')
        tags = note.get('tag_list', [])
        comments = note.get('comments', [])

        content = f"【帖子标题】{title}\n"
        if desc:
            content += f"【帖子内容】{desc}\n"
        if tags:
            if isinstance(tags, list):
                content += f"【标签】{', '.join(tags)}\n"
            else:
                content += f"【标签】{tags}\n"

        if comments:
            sorted_comments = sorted(
                comments,
                key=lambda c: self._parse_count(c.get('like_count', '0')),
                reverse=True
            )[:5]

            if sorted_comments:
                content += f"\n【高赞评论】\n"
                for i, comment in enumerate(sorted_comments, 1):
                    comment_text = comment.get('content', '')
                    like_count = comment.get('like_count', '0')
                    content += f"{i}. {comment_text} (👍 {like_count})\n"

        return content

    def _parse_count(self, count_str: str) -> int:
        """解析点赞数"""
        if not count_str or count_str == '0':
            return 0
        count_str = str(count_str).strip()
        if '万' in count_str:
            return int(float(count_str.replace('万', '')) * 10000)
        elif 'w' in count_str.lower():
            return int(float(count_str.lower().replace('w', '')) * 10000)
        else:
            try:
                return int(count_str)
            except:
                return 0

    def _calculate_statistics(self, results: List[NoteAnalysisResult], total: int, failed: int) -> AnalysisStatistics:
        """计算统计数据"""
        style_counter = Counter()
        for result in results:
            for style in result.makeup_style:
                if style and style != "未知":
                    style_counter[style] += 1

        styles = [
            StyleStatistics(name=name, count=count, percentage=round(count / len(results) * 100, 2) if results else 0)
            for name, count in style_counter.most_common(10)
        ]

        color_counter = Counter()
        for result in results:
            color = result.lipstick_features.color
            if color and color != "未知":
                color_counter[color] += 1

        colors = [
            ColorStatistics(name=name, count=count, percentage=round(count / len(results) * 100, 2) if results else 0)
            for name, count in color_counter.most_common(10)
        ]

        keyword_counter = Counter()
        for result in results:
            for keyword in result.keywords:
                if keyword and keyword != "未知":
                    keyword_counter[keyword] += 1

        keywords = [
            KeywordStatistics(name=name, count=count)
            for name, count in keyword_counter.most_common(20)
        ]

        return AnalysisStatistics(
            total_notes=total,
            analyzed_notes=len(results),
            failed_notes=failed,
            styles=styles,
            colors=colors,
            keywords=keywords
        )

    def _analysis_belongs_to_user(self, analysis_id: str, user_id: str) -> bool:
        """有 DB 时校验该分析是否属于该用户（user_id 为空或未配置 DB 时视为通过）"""
        if not user_id:
            return True
        try:
            from backend.db import is_db_configured, SessionLocal
            from backend.db.models import AnalysisTask
            if not is_db_configured():
                return True
            db = SessionLocal()
            try:
                t = db.query(AnalysisTask).filter(AnalysisTask.analysis_id == analysis_id).first()
                if not t:
                    return False
                # 未归属的旧数据视为仅管理员可访问（与 backfill_analysis_admin 一致）
                if t.user_id is None:
                    return user_id == "admin@d2clip.com"
                return t.user_id == user_id
            finally:
                db.close()
        except Exception:
            return False

    def get_analysis_results(self, analysis_id: str, user_id: str = None) -> Dict:
        """获取指定分析任务的结果；有 DB 且传 user_id 时校验归属"""
        try:
            if user_id and not self._analysis_belongs_to_user(analysis_id, user_id):
                return None
            # 先从内存缓存获取
            response = self._analysis_cache.get(analysis_id)

            # 如果内存中没有，尝试从文件加载
            if not response:
                response = self._load_analysis_from_file(analysis_id)
                if not response:
                    return None

                # 加载后放入缓存，方便下次访问
                self._analysis_cache[analysis_id] = response

            # 兼容 report 为 None（旧数据或异常情况）
            report_data = None
            if response.report:
                report_data = {
                    "report_title": response.report.report_title,
                    "summary": response.report.summary,
                    "sections": [
                        {
                            "section_id": s.section_id,
                            "title": s.title,
                            "content": s.content,
                            "charts": [
                                {
                                    "chart_type": c.chart_type,
                                    "chart_title": c.chart_title,
                                    "description": c.description,
                                    "echarts_option": c.echarts_option
                                }
                                for c in s.charts
                            ],
                            "order": s.order
                        }
                        for s in response.report.sections
                    ]
                }
            else:
                report_data = {"report_title": "", "summary": "", "sections": []}

            return {
                "analysis_id": response.analysis_id,
                "status": response.status,
                "created_at": response.created_at.isoformat() if response.created_at else "",
                "total": len(response.results),
                "results": [
                    {
                        "note_id": r.note_id,
                        "title": r.title,
                        "style": r.makeup_style,
                        "color": r.lipstick_features.color,
                        "texture": r.lipstick_features.texture,
                        "keywords": r.keywords,
                        "scene": r.scene,
                        "comments": getattr(r, "comments", [])
                    }
                    for r in response.results
                ],
                "statistics": {
                    "total_notes": response.statistics.total_notes,
                    "analyzed_notes": response.statistics.analyzed_notes,
                    "failed_notes": response.statistics.failed_notes,
                    "styles": [{"name": s.name, "count": s.count, "percentage": s.percentage} for s in response.statistics.styles],
                    "colors": [{"name": c.name, "count": c.count, "percentage": c.percentage} for c in response.statistics.colors],
                    "keywords": [{"name": k.name, "count": k.count} for k in response.statistics.keywords]
                },
                "report": report_data
            }
        except Exception as e:
            print(f"⚠️ get_analysis_results 异常: {e}")
            return None

    def get_latest_results(self, limit: int = 100, user_id: str = None) -> Dict:
        """获取最近一次分析的结果；有 DB 且传 user_id 时取该用户最近一次"""
        try:
            from backend.db import is_db_configured, SessionLocal
            from backend.db.models import AnalysisTask
            if is_db_configured() and user_id:
                db = SessionLocal()
                try:
                    t = db.query(AnalysisTask).filter(
                        AnalysisTask.user_id == user_id
                    ).order_by(AnalysisTask.created_at.desc()).first()
                    if t:
                        response = self._analysis_cache.get(t.analysis_id) or self._load_analysis_from_file(t.analysis_id)
                        if response:
                            results = response.results[:limit] if limit else response.results
                            return {
                                "analysis_id": response.analysis_id,
                                "status": response.status,
                                "created_at": response.created_at.isoformat() if response.created_at else "",
                                "total": len(response.results),
                                "limit": limit,
                                "results": [
                                    {"key": r.note_id, "note_id": r.note_id, "title": r.title, "style": r.makeup_style,
                                     "color": r.lipstick_features.color, "texture": r.lipstick_features.texture,
                                     "saturation": r.lipstick_features.saturation, "tone": r.lipstick_features.tone,
                                     "keywords": r.keywords, "scene": r.scene, "comments": getattr(r, "comments", [])}
                                    for r in results
                                ],
                                "statistics": {
                                    "total_notes": response.statistics.total_notes,
                                    "analyzed_notes": response.statistics.analyzed_notes,
                                    "failed_notes": response.statistics.failed_notes,
                                    "styles": [{"name": s.name, "count": s.count, "percentage": s.percentage} for s in response.statistics.styles],
                                    "colors": [{"name": c.name, "count": c.count, "percentage": c.percentage} for c in response.statistics.colors],
                                    "keywords": [{"name": k.name, "count": k.count} for k in response.statistics.keywords]
                                }
                            }
                finally:
                    db.close()
                return None
        except Exception:
            pass
        if not self._latest_analysis_id:
            return None

        response = self._analysis_cache.get(self._latest_analysis_id)
        if not response:
            response = self._load_analysis_from_file(self._latest_analysis_id)
        if not response:
            return None
        results = response.results[:limit] if limit else response.results

        return {
            "analysis_id": response.analysis_id,
            "status": response.status,
            "created_at": response.created_at.isoformat(),
            "total": len(response.results),
            "limit": limit,
            "results": [
                {
                    "key": r.note_id,
                    "note_id": r.note_id,
                    "title": r.title,
                    "style": r.makeup_style,
                    "color": r.lipstick_features.color,
                    "texture": r.lipstick_features.texture,
                    "saturation": r.lipstick_features.saturation,
                    "tone": r.lipstick_features.tone,
                    "keywords": r.keywords,
                    "scene": r.scene,
                    "comments": getattr(r, "comments", [])
                }
                for r in results
            ],
            "statistics": {
                "total_notes": response.statistics.total_notes,
                "analyzed_notes": response.statistics.analyzed_notes,
                "failed_notes": response.statistics.failed_notes
            },
            "charts": response.charts
        }

    def get_task_progress(self):
        """获取当前任务进度"""
        return {
            "status": self._current_task_status,
            "task_id": self._current_task_id,
            "progress": self._current_progress,
            "completed": self._completed_notes,
            "total": self._total_notes
        }

    def get_analysis_history(self, limit: int = 10, offset: int = 0, platform: str = None, user_id: str = None) -> Dict:
        """获取分析历史记录；有 DB 时按 user_id 过滤（未传则返回空），否则从内存/文件"""
        try:
            from backend.db import is_db_configured, SessionLocal
            from backend.db.models import AnalysisTask
            if is_db_configured():
                db = SessionLocal()
                try:
                    # 有 DB 时未传 user_id 则只返回空（不暴露他人历史）
                    if user_id is None:
                        return {"total": 0, "items": []}
                    # 管理员可见「归属自己」+「未归属的旧数据」；其他用户仅可见自己的
                    if user_id == "admin@d2clip.com":
                        from sqlalchemy import or_
                        q = db.query(AnalysisTask).filter(
                            or_(AnalysisTask.user_id == user_id, AnalysisTask.user_id.is_(None))
                        ).order_by(AnalysisTask.created_at.desc())
                    else:
                        q = db.query(AnalysisTask).filter(AnalysisTask.user_id == user_id).order_by(AnalysisTask.created_at.desc())
                    if platform:
                        q = q.filter(AnalysisTask.platform == platform)
                    total = q.count()
                    rows = q.offset(offset).limit(limit).all()
                    items = [
                        {
                            "analysis_id": r.analysis_id,
                            "created_at": r.created_at.isoformat() if r.created_at else "",
                            "platform": r.platform or "",
                            "data_file": r.data_file or "",
                            "total_notes": r.total_notes or 0,
                            "analyzed_notes": r.analyzed_notes or 0,
                            "failed_notes": r.failed_notes or 0,
                            "status": r.status or "",
                        }
                        for r in rows
                    ]
                    return {"total": total, "items": items}
                finally:
                    db.close()
        except Exception:
            pass
        filtered_history = self._history
        if user_id is not None:
            filtered_history = [h for h in filtered_history if h.get("user_id") == user_id]
        if platform:
            filtered_history = [h for h in filtered_history if h.get('platform') == platform]
        total = len(filtered_history)
        items = filtered_history[offset:offset + limit]
        return {"total": total, "items": items}

    def update_report(self, analysis_id: str, updated_report: Dict, user_id: str = None) -> bool:
        """更新指定分析任务的报告内容；有 DB 且传 user_id 时校验归属"""
        try:
            if user_id and not self._analysis_belongs_to_user(analysis_id, user_id):
                return False
            # 1. 从内存或文件加载完整的分析结果
            response = self._analysis_cache.get(analysis_id)
            if not response:
                response = self._load_analysis_from_file(analysis_id)
                if not response:
                    return False

            # 2. 更新报告部分
            response.report.report_title = updated_report.get("report_title", response.report.report_title)
            response.report.summary = updated_report.get("summary", response.report.summary)

            # 3. 更新各个板块
            if "sections" in updated_report:
                for i, updated_section in enumerate(updated_report["sections"]):
                    if i < len(response.report.sections):
                        response.report.sections[i].title = updated_section.get("title", response.report.sections[i].title)
                        response.report.sections[i].content = updated_section.get("content", response.report.sections[i].content)

            # 4. 保存到文件
            self._save_analysis_to_file(response)

            # 5. 更新内存缓存
            self._analysis_cache[analysis_id] = response

            print(f"✅ 报告已更新: {analysis_id}")
            return True

        except Exception as e:
            print(f"❌ 更新报告失败: {e}")
            return False


# 全局单例
analysis_service = AnalysisService()
