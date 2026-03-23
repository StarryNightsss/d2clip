"""
Agent Tools - 包装现有服务为 LangChain Tools
"""

import json
import os
import asyncio
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

from backend.config import settings
from backend.services.crawler_service import CrawlerService
from backend.services.langchain_service import langchain_service

logger = logging.getLogger(__name__)


class AgentTools:
    """Agent 工具集"""
    
    def __init__(self):
        self.crawler_service = CrawlerService()
        self.data_cache: Dict[str, Any] = {}  # 缓存加载的数据
    
    async def load_data(self, file_path: str = "", **kwargs) -> Dict[str, Any]:
        """
        加载爬虫数据文件
        对应原 Chain 的数据加载阶段
        """
        # 加载新数据时清空之前的分析结果缓存，避免数据混乱
        self.data_cache.pop('note_analysis_results', None)
        self.data_cache.pop('note_results', None)
        self.data_cache.pop('tone_analysis', None)
        self.data_cache.pop('style_analysis', None)
        self.data_cache.pop('keywords', None)
        logger.info("load_data: 清空之前的分析结果缓存")
        try:
            # 使用 settings.CRAWLER_DATA_DIR（与现有配置一致）
            from pathlib import Path
            data_dir = Path(settings.CRAWLER_DATA_DIR)
            
            if file_path:
                # 支持相对路径和绝对路径
                candidate = Path(file_path)
                if not candidate.is_absolute():
                    candidate = data_dir / file_path
                full_path = candidate
            else:
                # 未指定文件时自动找最新的 JSON
                json_dir = data_dir / "xhs" / "json"
                if not json_dir.exists():
                    json_dir = data_dir
                files = sorted(json_dir.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True)
                if not files:
                    return {"success": False, "error": "暂无可用数据文件", "preview": None}
                full_path = files[0]
            
            if not full_path.exists():
                return {
                    "success": False,
                    "error": f"文件不存在: {file_path}",
                    "preview": None
                }
            
            # 加载数据
            with open(full_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 尝试加载对应的评论文件
            comments_file = full_path.name.replace('contents', 'comments')
            comments_path = full_path.parent / comments_file
            comments_data = []
            if comments_path.exists():
                try:
                    with open(comments_path, 'r', encoding='utf-8') as f:
                        comments_data = json.load(f)
                    logger.info(f"load_data: 加载评论文件 {comments_path}, 共 {len(comments_data)} 条评论")
                except Exception as e:
                    logger.warning(f"load_data: 加载评论文件失败: {e}")
            
            # 将评论数据合并到笔记中
            if comments_data and isinstance(data, list):
                # 按 note_id 分组评论
                comments_by_note = {}
                for comment in comments_data:
                    note_id = comment.get('note_id')
                    if note_id:
                        if note_id not in comments_by_note:
                            comments_by_note[note_id] = []
                        comments_by_note[note_id].append(comment)
                
                # 合并评论到笔记
                for note in data:
                    note_id = note.get('note_id')
                    if note_id and note_id in comments_by_note:
                        note['comments'] = comments_by_note[note_id][:10]  # 最多保留10条评论
                        note['comment_list'] = note['comments']  # 兼容字段
            
            # 加载新数据时清空之前的分析结果缓存，避免数据混乱
            self.data_cache.pop('note_analysis_results', None)
            self.data_cache.pop('note_results', None)
            self.data_cache.pop('tone_analysis', None)
            self.data_cache.pop('style_analysis', None)
            self.data_cache.pop('keywords', None)
            
            # 缓存数据供后续步骤使用
            self.data_cache['raw_data'] = data
            self.data_cache['file_path'] = str(full_path)
            
            total_notes = len(data) if isinstance(data, list) else 0
            
            return {
                "success": True,
                "data": {
                    "file_path": str(full_path),
                    "total_notes": total_notes,
                    "sample_titles": [note.get('title', '')[:30] for note in data[:3]] if isinstance(data, list) else []
                },
                "preview": {
                    "type": "data_summary",
                    "total_notes": total_notes,
                    "message": f"成功加载 {total_notes} 条笔记数据"
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"数据加载失败: {str(e)}",
                "preview": None
            }
    
    async def analyze_tone(self, dep_results=None, **kwargs) -> Dict[str, Any]:
        """
        用 LLM 批量分析笔记，聚合出口红色调分布
        复用 langchain_service.analyze_note（RAG 增强）
        """
        try:
            raw_data = self.data_cache.get('raw_data', [])
            if not raw_data:
                return {"success": False, "error": "没有加载数据，请先执行 load_data", "preview": None}

            # 取前 30 条并发分析（避免超时，实际生产可调大）
            sample = raw_data[:30]
            
            tasks = [
                langchain_service.analyze_note(
                    f"{n.get('title', '')} {n.get('content', '') or n.get('desc', '')}"[:800]
                )
                for n in sample
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 统计结果
            success_count = sum(1 for r in results if isinstance(r, dict))
            error_count = sum(1 for r in results if isinstance(r, Exception))
            logger.info("analyze_tone: 总样本=%d, 成功=%d, 失败=%d", len(results), success_count, error_count)

            # 聚合色调和关键词
            tone_counts: Dict[str, int] = {}
            keyword_counts: Dict[str, int] = {}
            for r in results:
                if isinstance(r, Exception) or not isinstance(r, dict):
                    continue
                # 提取色调
                color = r.get('lipstick_features', {}).get('color', '')
                if color and color not in ('无法判断', '未知', ''):
                    tone_counts[color] = tone_counts.get(color, 0) + 1
                # 提取关键词
                keywords = r.get('keywords', [])
                for kw in keywords:
                    if kw and kw not in ('未知', ''):
                        keyword_counts[kw] = keyword_counts.get(kw, 0) + 1

            if not tone_counts:
                logger.error("analyze_tone 失败: 未能提取色调信息。样本数=%d, 结果样例=%s", 
                            len(results), results[:2] if results else "无")
                return {"success": False, "error": "LLM 未能从数据中提取色调信息", "preview": None}

            total = sum(tone_counts.values())
            tone_distribution = [
                {"name": name, "count": count, "percentage": round(count / total * 100, 1)}
                for name, count in sorted(tone_counts.items(), key=lambda x: x[1], reverse=True)
            ]

            # 保存色调分析结果
            self.data_cache['tone_analysis'] = tone_distribution
            logger.info("analyze_tone 完成，保存 tone_analysis=%d 条", len(tone_distribution))

            # 保存关键词（如果还没有保存过）
            if keyword_counts and 'keywords' not in self.data_cache:
                sorted_keywords = [
                    {"name": name, "count": count}
                    for name, count in sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)
                ]
                self.data_cache['keywords'] = sorted_keywords

            # 保存单条笔记的详细分析结果（供 DataTable 使用）
            # 直接覆盖，不合并，避免数据混乱
            self.data_cache['note_analysis_results'] = []
            
            for i, (note, analysis) in enumerate(zip(sample, results)):
                if isinstance(analysis, dict):
                    note_id = note.get('note_id') or f'note_{i}'
                    # 兼容多种字段名：title / note_title / desc
                    title = note.get('title') or note.get('note_title') or note.get('desc', '')[:100] or '无标题'
                    # 兼容多种字段名：content / note_content / desc
                    content = note.get('content') or note.get('note_content') or note.get('desc', '')[:200]
                    # 高赞评论：优先用已解析的评论列表，否则用 comment_list
                    comments_data = note.get('comments') or note.get('comment_list') or []
                    
                    self.data_cache['note_analysis_results'].append({
                        "note_id": note_id,
                        "title": title[:100] if isinstance(title, str) else str(title)[:100],
                        "content": content[:200] if isinstance(content, str) else str(content)[:200],
                        "makeup_style": analysis.get('makeup_style', []),
                        "lipstick_features": analysis.get('lipstick_features', {}),
                        "keywords": analysis.get('keywords', []),
                        "scene": analysis.get('scene', []),
                        "author": note.get('author') or note.get('nickname') or note.get('user_name') or '未知',
                        "likes": note.get('likes') or note.get('liked_count') or note.get('like_count') or 0,
                        "comments": comments_data if isinstance(comments_data, list) else [],
                        "comments_count": note.get('comment_count') or note.get('comments_count') or (len(comments_data) if isinstance(comments_data, list) else 0),
                        "publish_time": note.get('publish_time') or note.get('create_time') or note.get('note_create_time') or '',
                    })
            
            logger.info("analyze_tone 保存 note_analysis_results=%d 条", len(self.data_cache['note_analysis_results']))

            return {
                "success": True,
                "data": {"tone_distribution": tone_distribution, "total_analyzed": len(sample)},
                "preview": {
                    "type": "tone_analysis",
                    "chart_type": "pie",
                    "title": "口红色调分布",
                    "data": tone_distribution
                }
            }
        except Exception as e:
            logger.error("analyze_tone 失败: %s", e, exc_info=True)
            return {"success": False, "error": f"色调分析失败: {str(e)}", "preview": None}
    
    async def analyze_style(self, dep_results=None, **kwargs) -> Dict[str, Any]:
        """
        用 LLM 批量分析笔记，聚合出妆容风格分布
        复用 langchain_service.analyze_note（RAG 增强）
        """
        try:
            raw_data = self.data_cache.get('raw_data', [])
            if not raw_data:
                return {"success": False, "error": "没有加载数据，请先执行 load_data", "preview": None}

            # 取前 30 条分析
            sample = raw_data[:30]
            
            # 检查是否需要清空之前的结果（如果数据不一致）
            existing_results = self.data_cache.get('note_analysis_results', [])
            if existing_results:
                first_existing_id = existing_results[0].get('note_id', '')
                first_sample_id = sample[0].get('note_id', '') if sample else ''
                if first_existing_id and first_sample_id and first_existing_id != first_sample_id:
                    logger.warning("analyze_style: 检测到数据不一致，清空之前的结果")
                    self.data_cache['note_analysis_results'] = []
            
            # 优先复用 tone 分析已跑过的结果（如两个 analyze 并行执行时共享缓存）
            cached_note_results = self.data_cache.get('note_results')
            if cached_note_results is None:
                sample = raw_data[:30]
                tasks = [
                    langchain_service.analyze_note(
                        f"{n.get('title', '')} {n.get('content', '') or n.get('desc', '')}"[:800]
                    )
                    for n in sample
                ]
                cached_note_results = await asyncio.gather(*tasks, return_exceptions=True)
                self.data_cache['note_results'] = cached_note_results
            else:
                sample = raw_data[:30]

            # 聚合妆容风格和关键词
            style_counts: Dict[str, int] = {}
            keyword_counts: Dict[str, int] = {}
            valid_results = 0
            empty_styles = 0
            for r in cached_note_results:
                if isinstance(r, Exception) or not isinstance(r, dict):
                    continue
                valid_results += 1
                # 提取风格
                styles = r.get('makeup_style', [])
                if not styles or all(s in ('未知', '') for s in styles):
                    empty_styles += 1
                for s in styles:
                    if s and s not in ('未知', ''):
                        style_counts[s] = style_counts.get(s, 0) + 1
                # 提取关键词
                keywords = r.get('keywords', [])
                for kw in keywords:
                    if kw and kw not in ('未知', ''):
                        keyword_counts[kw] = keyword_counts.get(kw, 0) + 1

            logger.info("analyze_style: 有效结果=%d, 空风格=%d, 提取风格=%d", 
                       valid_results, empty_styles, len(style_counts))
            
            if not style_counts:
                logger.error("analyze_style 失败: 未能提取风格。样本 makeup_style: %s", 
                           [r.get('makeup_style') for r in cached_note_results[:3] if isinstance(r, dict)])
                return {"success": False, "error": "LLM 未能从数据中提取风格信息", "preview": None}

            total = sum(style_counts.values())
            style_distribution = [
                {"name": name, "count": count, "percentage": round(count / total * 100, 1)}
                for name, count in sorted(style_counts.items(), key=lambda x: x[1], reverse=True)
            ]

            # 保存风格分析结果
            self.data_cache['style_analysis'] = style_distribution
            logger.info("analyze_style 完成，保存 style_analysis=%d 条", len(style_distribution))

            # 保存关键词（如果还没有保存过）
            if keyword_counts and 'keywords' not in self.data_cache:
                sorted_keywords = [
                    {"name": name, "count": count}
                    for name, count in sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)
                ]
                self.data_cache['keywords'] = sorted_keywords

            # 保存单条笔记的详细分析结果（供 DataTable 使用）
            # 如果 note_analysis_results 已存在，更新 makeup_style；否则创建新的
            existing_results = self.data_cache.get('note_analysis_results', [])
            if existing_results and len(existing_results) == len(sample):
                # 按索引更新 makeup_style
                for i, analysis in enumerate(cached_note_results):
                    if isinstance(analysis, dict) and i < len(existing_results):
                        existing_results[i]['makeup_style'] = analysis.get('makeup_style', [])
                logger.info("analyze_style 更新 %d 条记录的 makeup_style", len(existing_results))
            else:
                # note_analysis_results 不存在或长度不匹配，创建新的记录
                logger.info("analyze_style: 创建新的 note_analysis_results，共 %d 条", len(sample))
                self.data_cache['note_analysis_results'] = []
                for i, (note, analysis) in enumerate(zip(sample, cached_note_results)):
                    if isinstance(analysis, dict):
                        note_id = note.get('note_id') or f'note_{i}'
                        title = note.get('title') or note.get('note_title') or note.get('desc', '')[:100] or '无标题'
                        content = note.get('content') or note.get('note_content') or note.get('desc', '')[:200]
                        comments_data = note.get('comments') or note.get('comment_list') or []
                        
                        self.data_cache['note_analysis_results'].append({
                            "note_id": note_id,
                            "title": title[:100] if isinstance(title, str) else str(title)[:100],
                            "content": content[:200] if isinstance(content, str) else str(content)[:200],
                            "makeup_style": analysis.get('makeup_style', []),
                            "lipstick_features": analysis.get('lipstick_features', {}),
                            "keywords": analysis.get('keywords', []),
                            "scene": analysis.get('scene', []),
                            "author": note.get('author') or note.get('nickname') or note.get('user_name') or '未知',
                            "likes": note.get('likes') or note.get('liked_count') or note.get('like_count') or 0,
                            "comments": comments_data if isinstance(comments_data, list) else [],
                            "comments_count": note.get('comment_count') or note.get('comments_count') or (len(comments_data) if isinstance(comments_data, list) else 0),
                            "publish_time": note.get('publish_time') or note.get('create_time') or note.get('note_create_time') or '',
                        })

            return {
                "success": True,
                "data": {"style_distribution": style_distribution, "total_analyzed": len(sample)},
                "preview": {
                    "type": "style_analysis",
                    "chart_type": "bar",
                    "title": "妆容风格占比",
                    "data": style_distribution
                }
            }
        except Exception as e:
            logger.error("analyze_style 失败: %s", e, exc_info=True)
            return {"success": False, "error": f"风格分析失败: {str(e)}", "preview": None}
    
    async def generate_chart(self, chart_type: str = "pie", title: str = "", data_field: str = "tone", dep_results=None, **kwargs) -> Dict[str, Any]:
        """
        调用 langchain_service.generate_chart_config 生成 ECharts 配置
        支持3种图表类型：pie/bar/line/scatter/radar/heatmap/sankey/gauge/funnel
        """
        from backend.prompts.chart_schema import (
            COLOR_SCHEMES,
            ECHARTS_PIE_SCHEMA, ECHARTS_BAR_SCHEMA, ECHARTS_SCATTER_SCHEMA,
            ECHARTS_RADAR_SCHEMA, ECHARTS_HEATMAP_SCHEMA, ECHARTS_SANKEY_SCHEMA,
            ECHARTS_GAUGE_SCHEMA, ECHARTS_FUNNEL_SCHEMA, ECHARTS_LINE_SCHEMA
        )
        schema_map = {
            "pie": ECHARTS_PIE_SCHEMA,
            "bar": ECHARTS_BAR_SCHEMA,
            "scatter": ECHARTS_SCATTER_SCHEMA,
            "radar": ECHARTS_RADAR_SCHEMA,
            "heatmap": ECHARTS_HEATMAP_SCHEMA,
            "sankey": ECHARTS_SANKEY_SCHEMA,
            "gauge": ECHARTS_GAUGE_SCHEMA,
            "funnel": ECHARTS_FUNNEL_SCHEMA,
            "line": ECHARTS_LINE_SCHEMA,
        }
        try:
            # 获取分析数据
            if data_field == "tone":
                data = self.data_cache.get('tone_analysis', [])
                chart_title = title or "口红色调分布"
                description = "展示口红色调占比分布"
            elif data_field == "style":
                data = self.data_cache.get('style_analysis', [])
                chart_title = title or "妆容风格占比"
                description = "展示妆容风格占比分布"
            else:
                data = kwargs.get('data', [])
                chart_title = title or "数据图表"
                description = "数据可视化"

            if not data:
                return {"success": False, "error": f"没有 {data_field} 分析数据，请先执行对应分析步骤", "preview": None}

            schema = schema_map.get(chart_type, ECHARTS_BAR_SCHEMA)
            color_scheme = COLOR_SCHEMES.get("pink_purple", ["#ff6b9d", "#5f27cd", "#00d2d3", "#feca57"])
            data_summary = {"distribution": data[:12], "total": len(data)}

            echarts_option = await langchain_service.generate_chart_config(
                chart_type=chart_type,
                chart_title=chart_title,
                description=description,
                data_summary=data_summary,
                color_scheme=color_scheme,
                schema=schema
            )

            return {
                "success": True,
                "data": {"chart_type": chart_type, "title": chart_title, "echarts_option": echarts_option},
                "preview": {"type": "chart", "chart_type": chart_type, "title": chart_title, "echarts_option": echarts_option}
            }
        except Exception as e:
            return {"success": False, "error": f"图表生成失败: {str(e)}", "preview": None}

    def _build_pie_chart(self, title: str, data: List[Dict], colors: List[str]) -> Dict:
        """饼图 - 适合占比分布"""
        return {
            "title": {"text": title, "left": "center", "top": 20},
            "tooltip": {"trigger": "item", "formatter": "{b}: {c} ({d}%)"},
            "legend": {"orient": "vertical", "left": "left", "top": "center"},
            "series": [{
                "type": "pie",
                "radius": ["40%", "70%"],
                "center": ["60%", "50%"],
                "avoidLabelOverlap": False,
                "itemStyle": {"borderRadius": 10, "borderColor": "#fff", "borderWidth": 2},
                "label": {"show": True, "formatter": "{b}\n{d}%"},
                "emphasis": {
                    "label": {"show": True, "fontSize": 16, "fontWeight": "bold"},
                    "itemStyle": {"shadowBlur": 10, "shadowOffsetX": 0, "shadowColor": "rgba(0, 0, 0, 0.5)"}
                },
                "data": [{"value": d.get("count", d.get("value", 0)), "name": d.get("name", "")} for d in data[:10]]
            }],
            "color": colors
        }

    def _build_bar_chart(self, title: str, data: List[Dict], colors: List[str]) -> Dict:
        """柱状图 - 适合排名对比"""
        return {
            "title": {"text": title, "left": "center"},
            "tooltip": {"trigger": "axis", "axisPointer": {"type": "shadow"}},
            "grid": {"left": "3%", "right": "4%", "bottom": "3%", "containLabel": True},
            "xAxis": {
                "type": "category",
                "data": [d.get("name", "") for d in data[:12]],
                "axisLabel": {"interval": 0, "rotate": 30 if len(data) > 6 else 0},
                "axisTick": {"alignWithLabel": True}
            },
            "yAxis": {"type": "value"},
            "series": [{
                "type": "bar",
                "barWidth": "60%",
                "data": [d.get("count", d.get("value", 0)) for d in data[:12]],
                "itemStyle": {"borderRadius": [4, 4, 0, 0]},
                "label": {"show": True, "position": "top"}
            }],
            "color": colors
        }

    def _build_line_chart(self, title: str, data: List[Dict], colors: List[str]) -> Dict:
        """折线图 - 适合趋势分析"""
        return {
            "title": {"text": title, "left": "center"},
            "tooltip": {"trigger": "axis"},
            "grid": {"left": "3%", "right": "4%", "bottom": "3%", "containLabel": True},
            "xAxis": {
                "type": "category",
                "boundaryGap": False,
                "data": [d.get("name", "") for d in data[:12]]
            },
            "yAxis": {"type": "value"},
            "series": [{
                "type": "line",
                "smooth": True,
                "data": [d.get("count", d.get("value", 0)) for d in data[:12]],
                "areaStyle": {"opacity": 0.3},
                "symbol": "circle",
                "symbolSize": 8,
                "lineStyle": {"width": 3}
            }],
            "color": colors
        }

    def _build_scatter_chart(self, title: str, data: List[Dict], colors: List[str]) -> Dict:
        """散点图/词云效果 - 适合关键词分布"""
        # 生成散点位置模拟词云效果
        scatter_data = []
        for i, d in enumerate(data[:20]):
            value = d.get("count", d.get("value", 0))
            scatter_data.append({
                "value": [i % 5, i // 5, value, d.get("name", "")],
                "symbolSize": min(20 + value * 2, 80),
                "name": d.get("name", "")
            })

        return {
            "title": {"text": title, "left": "center"},
            "tooltip": {
                "formatter": lambda params: params.data.name + ": " + str(params.data.value[2])
            },
            "grid": {"left": "5%", "right": "5%", "top": "15%", "bottom": "10%"},
            "xAxis": {"show": False, "min": -1, "max": 5},
            "yAxis": {"show": False, "min": -1, "max": 4},
            "series": [{
                "type": "scatter",
                "data": scatter_data,
                "label": {
                    "show": True,
                    "formatter": lambda params: params.data.name,
                    "fontSize": 12
                },
                "itemStyle": {"opacity": 0.8}
            }],
            "color": colors
        }

    def _build_radar_chart(self, title: str, data: List[Dict], colors: List[str]) -> Dict:
        """雷达图 - 适合多维度对比分析"""
        # 取前6个维度
        indicators = [{"name": d.get("name", ""), "max": max(d.get("count", d.get("value", 0)) * 1.2, 10)} for d in data[:6]]
        values = [d.get("count", d.get("value", 0)) for d in data[:6]]

        return {
            "title": {"text": title, "left": "center"},
            "tooltip": {},
            "legend": {"data": ["数据"], "bottom": 10},
            "radar": {
                "indicator": indicators,
                "radius": "65%",
                "center": ["50%", "50%"]
            },
            "series": [{
                "type": "radar",
                "data": [{
                    "value": values,
                    "name": "数据",
                    "areaStyle": {"opacity": 0.3},
                    "lineStyle": {"width": 2}
                }]
            }],
            "color": colors
        }

    def _build_heatmap_chart(self, title: str, data: List[Dict], colors: List[str]) -> Dict:
        """热力图 - 适合交叉分析"""
        # 构建热力图数据（模拟交叉分析）
        categories = [d.get("name", "") for d in data[:8]]
        heatmap_data = []
        for i, d in enumerate(data[:8]):
            for j in range(5):
                heatmap_data.append([i, j, d.get("count", d.get("value", 0)) * (0.5 + j * 0.2)])

        return {
            "title": {"text": title, "left": "center"},
            "tooltip": {"position": "top"},
            "grid": {"height": "50%", "top": "15%"},
            "xAxis": {"type": "category", "data": categories, "splitArea": {"show": True}},
            "yAxis": {"type": "category", "data": ["低", "中低", "中", "中高", "高"], "splitArea": {"show": True}},
            "visualMap": {
                "min": 0,
                "max": max([d[2] for d in heatmap_data]) if heatmap_data else 100,
                "calculable": True,
                "orient": "horizontal",
                "left": "center",
                "bottom": "15%",
                "inRange": {"color": ["#e0f3f8", "#abd9e9", "#74add1", "#4575b4", "#313695"]}
            },
            "series": [{
                "type": "heatmap",
                "data": heatmap_data,
                "label": {"show": True},
                "emphasis": {"itemStyle": {"shadowBlur": 10, "shadowColor": "rgba(0, 0, 0, 0.5)"}}
            }]
        }

    def _build_sankey_chart(self, title: str, data: List[Dict], colors: List[str]) -> Dict:
        """桑基图 - 适合流转关系分析"""
        # 构建桑基图节点和连接
        nodes = [{"name": d.get("name", "")} for d in data[:6]]
        links = []
        for i in range(len(nodes) - 1):
            links.append({
                "source": nodes[i]["name"],
                "target": nodes[i + 1]["name"],
                "value": data[i].get("count", data[i].get("value", 0))
            })

        return {
            "title": {"text": title, "left": "center"},
            "tooltip": {"trigger": "item", "triggerOn": "mousemove"},
            "series": [{
                "type": "sankey",
                "layout": "none",
                "emphasis": {"focus": "adjacency"},
                "data": nodes,
                "links": links,
                "lineStyle": {"color": "gradient", "curveness": 0.5},
                "label": {"fontSize": 12}
            }],
            "color": colors
        }

    def _build_gauge_chart(self, title: str, data: List[Dict], colors: List[str]) -> Dict:
        """仪表盘 - 适合单指标展示"""
        # 取第一个数据作为指标值
        value = data[0].get("count", data[0].get("value", 0)) if data else 50
        max_val = max(value * 2, 100)

        return {
            "title": {"text": title, "left": "center"},
            "series": [{
                "type": "gauge",
                "center": ["50%", "55%"],
                "radius": "70%",
                "min": 0,
                "max": max_val,
                "splitNumber": 10,
                "axisLine": {
                    "lineStyle": {
                        "width": 10,
                        "color": [[0.3, "#67e0e3"], [0.7, "#37a2da"], [1, "#fd666d"]]
                    }
                },
                "pointer": {"itemStyle": {"color": "auto"}},
                "axisTick": {"distance": -10, "length": 8, "lineStyle": {"color": "#fff", "width": 2}},
                "splitLine": {"distance": -10, "length": 15, "lineStyle": {"color": "#fff", "width": 3}},
                "axisLabel": {"color": "auto", "distance": 20, "fontSize": 12},
                "detail": {
                    "valueAnimation": True,
                    "formatter": "{value}",
                    "color": "auto",
                    "fontSize": 30,
                    "offsetCenter": [0, "70%"]
                },
                "data": [{"value": value, "name": data[0].get("name", "指标") if data else "指标"}]
            }]
        }

    def _build_funnel_chart(self, title: str, data: List[Dict], colors: List[str]) -> Dict:
        """漏斗图 - 适合层级递减分析"""
        funnel_data = [{"value": d.get("count", d.get("value", 0)), "name": d.get("name", "")} for d in data[:8]]

        return {
            "title": {"text": title, "left": "center"},
            "tooltip": {"trigger": "item", "formatter": "{b}: {c}"},
            "legend": {"data": [d.get("name", "") for d in data[:8]], "bottom": 10},
            "series": [{
                "type": "funnel",
                "left": "10%",
                "top": 60,
                "bottom": 60,
                "width": "80%",
                "min": 0,
                "max": max([d["value"] for d in funnel_data]) if funnel_data else 100,
                "minSize": "0%",
                "maxSize": "100%",
                "sort": "descending",
                "gap": 2,
                "label": {"show": True, "position": "inside"},
                "labelLine": {"length": 10, "lineStyle": {"width": 1, "type": "solid"}},
                "itemStyle": {"borderColor": "#fff", "borderWidth": 1},
                "emphasis": {"label": {"fontSize": 20}},
                "data": funnel_data
            }],
            "color": colors
        }
    
    async def generate_text(self, section_title: str = "", data_field: str = "tone", dep_results=None, **kwargs) -> Dict[str, Any]:
        """
        调用 langchain_service.generate_section_content 生成专业分析文案
        直接传入已聚合的分布数据，由 LLM 生成 2-3 段专业分析
        """
        try:
            if data_field == "tone":
                data = self.data_cache.get('tone_analysis', [])
                title = section_title or "口红色调分析"
            elif data_field == "style":
                data = self.data_cache.get('style_analysis', [])
                title = section_title or "妆容风格分析"
            else:
                # 尝试从 dep_results 中找到最近一次分析结果
                data = []
                if dep_results:
                    for key in ('analyze_tone', 'analyze_style'):
                        dep = dep_results.get(key, {})
                        dist = (dep.get('data') or {}).get('tone_distribution') or \
                               (dep.get('data') or {}).get('style_distribution', [])
                        if dist:
                            data = dist
                            break
                title = section_title or "数据分析"

            if not data:
                return {"success": False, "error": f"没有可用的 {data_field} 分析数据，请先执行对应分析步骤", "preview": None}

            # 调用 LLM 生成专业文案
            section_data = {
                "分布数据": data[:10],   # 最多传 10 条，避免 token 过长
                "数据总量": len(data),
                "TOP1": data[0] if data else {},
            }
            content = await langchain_service.generate_section_content(title, section_data)

            return {
                "success": True,
                "data": {"title": title, "content": content},
                "preview": {"type": "text", "title": title, "content": content}
            }
        except Exception as e:
            return {"success": False, "error": f"文案生成失败: {str(e)}", "preview": None}
    
    async def critic(self, step_name: str, step_result: Dict, **kwargs) -> Dict[str, Any]:
        """
        质量检查
        新增：检查上一步输出质量
        """
        try:
            # 简单的质量检查逻辑
            issues = []
            score = 100
            
            # 检查结果是否有数据
            if not step_result.get("data"):
                issues.append("结果数据为空")
                score -= 30
            
            # 检查是否有错误
            if step_result.get("error"):
                issues.append(f"执行出错: {step_result['error']}")
                score -= 50
            
            # 检查预览数据
            preview = step_result.get("preview")
            if preview and preview.get("type") == "chart":
                # 检查图表数据
                chart_data = preview.get("data", [])
                if len(chart_data) < 2:
                    issues.append("图表数据点过少")
                    score -= 20
            
            passed = score >= 70
            
            return {
                "success": True,
                "data": {
                    "step_name": step_name,
                    "score": score,
                    "passed": passed,
                    "issues": issues
                },
                "preview": {
                    "type": "critic",
                    "score": score,
                    "passed": passed,
                    "message": "质量检查通过" if passed else f"发现问题: {', '.join(issues)}"
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"质量检查失败: {str(e)}",
                "preview": None
            }
    
    async def generate_report(self, dep_results=None, **kwargs) -> Dict[str, Any]:
        """
        完全对齐 Chain 版报告生成逻辑：
        1. 生成报告骨架（skeleton）
        2. 并行生成每个板块文案
        3. 并行生成每个板块的图表（与 Chain 版完全相同的结构）
        4. 组装为 DynamicReport 字典，能直接由 TrendReport 页面渲染
        """
        logger.info("=" * 50)
        logger.info("generate_report 被调用！dep_results=%s", dep_results)
        from backend.prompts.chart_schema import (
            COLOR_SCHEMES,
            ECHARTS_PIE_SCHEMA, ECHARTS_BAR_SCHEMA, ECHARTS_SCATTER_SCHEMA,
            ECHARTS_RADAR_SCHEMA, ECHARTS_HEATMAP_SCHEMA, ECHARTS_SANKEY_SCHEMA,
            ECHARTS_GAUGE_SCHEMA, ECHARTS_FUNNEL_SCHEMA, ECHARTS_LINE_SCHEMA
        )
        try:
            tone_analysis  = self.data_cache.get('tone_analysis', [])
            style_analysis = self.data_cache.get('style_analysis', [])
            keywords       = self.data_cache.get('keywords', [])
            
            logger.info("generate_report 读取数据: tone=%d, style=%d, keywords=%d", 
                       len(tone_analysis), len(style_analysis), len(keywords))
            logger.info("data_cache keys: %s", list(self.data_cache.keys()))

            if not tone_analysis and not style_analysis:
                logger.error("generate_report 失败: 没有分析数据")
                return {"success": False, "error": "没有分析数据，请先执行 analyze_tone 或 analyze_style", "preview": None}

            # 与 Chain 版完全相同的统计字典
            # 根据可用数据构建，如果只有色调数据，就只包含 colors
            stats_dict = {
                "total_notes": len(self.data_cache.get('raw_data', [])),
                "analyzed_notes": len(self.data_cache.get('raw_data', [])),
                "failed_notes": 0,
            }
            
            # 只包含有数据的字段，这样 LLM 会根据可用数据生成对应的报告结构
            if tone_analysis:
                stats_dict["colors"] = [{"name": d["name"], "count": d["count"], "percentage": d["percentage"]} for d in tone_analysis[:10]]
            if style_analysis:
                stats_dict["styles"] = [{"name": d["name"], "count": d["count"], "percentage": d["percentage"]} for d in style_analysis[:10]]
            if keywords:
                stats_dict["keywords"] = [{"name": d["name"], "count": d.get("count", 1)} for d in keywords[:20]]
            
            logger.info("generate_report 构建的 stats_dict 字段: %s", list(stats_dict.keys()))

            # 阶段 1：生成报告骨架（带重试）
            skeleton = None
            for attempt in range(3):
                try:
                    skeleton = await langchain_service.generate_report_skeleton(stats_dict)
                    logger.info("LLM 返回的骨架: %s", skeleton)
                    break
                except Exception as e:
                    logger.error("骨架生成尝试 %d 失败: %s", attempt + 1, e)
                    if attempt == 2:
                        raise Exception(f"报告骨架生成失败: {e}")
                    await asyncio.sleep(2)

            sections_meta = skeleton.get("sections", []) if skeleton else []
            logger.info("解析出的 sections_meta: %s", sections_meta)
            
            # 防御：如果 sections 为空，根据可用数据创建默认板块
            if not sections_meta:
                logger.warning("LLM 返回的 sections 为空，根据可用数据创建默认板块")
                sections_meta = []
                order = 1
                
                if tone_analysis:
                    sections_meta.append({
                        "section_id": "section-1",
                        "title": "口红色调分析",
                        "data_field": "colors",
                        "charts": [{"chart_type": "pie", "chart_title": "色调分布", "description": "", "data_field": "colors"}],
                        "order": order
                    })
                    order += 1
                
                if style_analysis:
                    sections_meta.append({
                        "section_id": f"section-{order}", 
                        "title": "妆容风格分析",
                        "data_field": "styles",
                        "charts": [{"chart_type": "bar", "chart_title": "风格占比", "description": "", "data_field": "styles"}],
                        "order": order
                    })
                    order += 1
                
                if keywords:
                    sections_meta.append({
                        "section_id": f"section-{order}", 
                        "title": "关键词分析",
                        "data_field": "keywords",
                        "charts": [{"chart_type": "scatter", "chart_title": "关键词词云", "description": "", "data_field": "keywords"}],
                        "order": order
                    })

            # 阶段 2：并行生成每个板块文案
            def _section_data(data_field: str) -> Dict:
                """data_field -> 与 Chain 版 _extract_section_data 完全相同"""
                if data_field == "colors":
                    return {"total": len(tone_analysis), "items": [{"name": d["name"], "count": d["count"], "percentage": d["percentage"]} for d in tone_analysis[:10]]}
                elif data_field == "styles":
                    return {"total": len(style_analysis), "items": [{"name": d["name"], "count": d["count"], "percentage": d["percentage"]} for d in style_analysis[:10]]}
                elif data_field == "keywords":
                    return {"total": len(keywords), "items": [{"name": d["name"], "count": d.get("count",1)} for d in keywords[:20]]}
                return {"items": []}

            content_tasks = [
                langchain_service.generate_section_content(
                    section_title=sec.get("title", ""),
                    section_data=_section_data(sec.get("data_field", "colors"))
                )
                for sec in sections_meta
            ]
            section_contents = await asyncio.gather(*content_tasks, return_exceptions=True)
            for i, c in enumerate(section_contents):
                if isinstance(c, Exception):
                    section_contents[i] = f"【数据分析】{sections_meta[i].get('title','')} 的详细分析正在整理中..."

            # 阶段 3：并行生成各板块图表（与 Chain 版完全相同）
            schema_map = {
                "pie": ECHARTS_PIE_SCHEMA,
                "bar": ECHARTS_BAR_SCHEMA,
                "scatter": ECHARTS_SCATTER_SCHEMA,
                "radar": ECHARTS_RADAR_SCHEMA,
                "heatmap": ECHARTS_HEATMAP_SCHEMA,
                "sankey": ECHARTS_SANKEY_SCHEMA,
                "gauge": ECHARTS_GAUGE_SCHEMA,
                "funnel": ECHARTS_FUNNEL_SCHEMA,
                "line": ECHARTS_LINE_SCHEMA,
            }
            chart_tasks = []
            chart_mapping = []  # (section_id, chart_spec)
            for sec in sections_meta:
                for chart_spec in sec.get("charts", []):
                    chart_tasks.append(
                        langchain_service.generate_chart_config(
                            chart_type=chart_spec["chart_type"],
                            chart_title=chart_spec["chart_title"],
                            description=chart_spec.get("description", ""),
                            data_summary=_section_data(chart_spec.get("data_field", sec.get("data_field", "colors"))),
                            color_scheme=COLOR_SCHEMES["default"],
                            schema=schema_map.get(chart_spec["chart_type"], ECHARTS_BAR_SCHEMA)
                        )
                    )
                    chart_mapping.append((sec["section_id"], chart_spec))
            chart_results = await asyncio.gather(*chart_tasks, return_exceptions=True)

            # 阶段 4：组装，与 Chain 版 _generate_report 输出完全一致
            sections_out = []
            logger.info("组装报告: sections_meta=%d, section_contents=%d, chart_results=%d", 
                       len(sections_meta), len(section_contents), len(chart_results))
            for i, sec in enumerate(sections_meta):
                charts_out = []
                for j, (sec_id, cspec) in enumerate(chart_mapping):
                    if sec_id == sec["section_id"]:
                        cr = chart_results[j]
                        if isinstance(cr, Exception):
                            logger.warning("图表 %s 生成失败: %s", cspec.get("chart_title"), cr)
                            continue
                        charts_out.append({
                            "chart_type":  cspec["chart_type"],
                            "chart_title": cspec["chart_title"],
                            "description": cspec.get("description", ""),
                            "echarts_option": cr
                        })
                sections_out.append({
                    "section_id": sec["section_id"],
                    "title":      sec["title"],
                    "content":    section_contents[i] if i < len(section_contents) else "",
                    "charts":     charts_out,
                    "order":      sec.get("order", i + 1)
                })
            logger.info("组装完成: sections_out=%d", len(sections_out))

            # 构建与 Chain 版完全一致的报告结构 (AnalysisResponse 格式)
            # 注意：Agent 报告使用 agent_ 前缀的 ID，与 Chain 的 analysis_id 区分
            import uuid
            agent_report_id = f"agent_{uuid.uuid4().hex[:12]}"

            # 构建 results 列表（优先使用 LLM 分析结果）
            note_analysis_results = self.data_cache.get('note_analysis_results', [])
            if note_analysis_results:
                # 使用 LLM 分析后的详细结果（返回所有分析过的笔记，不限于50条）
                results_list = note_analysis_results
                logger.info("generate_report 使用 note_analysis_results=%d 条", len(results_list))
            else:
                # 降级：从原始数据中提取（兼容旧逻辑）
                raw_data = self.data_cache.get('raw_data', [])
                results_list = []
                for i, note in enumerate(raw_data):
                    results_list.append({
                        "note_id": note.get('note_id', f'note_{i}'),
                        "title": note.get('title', '')[:100],
                        "makeup_style": note.get('makeup_style', []),
                        "lipstick_features": {
                            "color": note.get('lipstick_color', '无法判断'),
                            "texture": note.get('lipstick_texture', '无法判断'),
                            "saturation": "无法判断",
                            "tone": "无法判断"
                        },
                        "keywords": note.get('keywords', []),
                        "scene": note.get('scene', [])
                    })
                logger.info("generate_report 降级使用 raw_data=%d 条", len(results_list))

            # 根据分析的数据类型生成报告标题
            if tone_analysis and not style_analysis:
                default_title = "口红色调趋势分析报告"
            elif style_analysis and not tone_analysis:
                default_title = "妆容风格对比分析报告"
            elif tone_analysis and style_analysis:
                default_title = "口红趋势与妆容风格综合分析报告"
            else:
                default_title = "数据分析报告"
            
            # 构建 DynamicReport 结构
            dynamic_report = {
                "report_title": skeleton.get("report_title", default_title) if skeleton else default_title,
                "summary":      skeleton.get("summary", "") if skeleton else "",
                "sections":     sections_out,
                "generated_at": datetime.now().isoformat()
            }
            logger.info("构建 dynamic_report: title=%s, sections=%d", 
                       dynamic_report["report_title"], len(dynamic_report["sections"]))

            # 构建完整的 AnalysisResponse 格式（与 Chain 版一致）
            full_report = {
                "analysis_id": agent_report_id,
                "status": "success",
                "created_at": datetime.now().isoformat(),
                "results": results_list,
                "statistics": stats_dict,
                "report": dynamic_report
            }

            self.data_cache['final_report'] = full_report

            logger.info("generate_report 成功！sections=%d", len(sections_out))
            logger.info("=" * 50)
            return {
                "success": True,
                "data": full_report,
                "preview": {
                    "type": "report",
                    "title": dynamic_report["report_title"],
                    "summary": dynamic_report["summary"],
                    "section_count": len(sections_out),
                    "sections": sections_out  # 添加 sections 数组供前端预览使用
                }
            }
        except Exception as e:
            logger.error("generate_report 异常: %s", e, exc_info=True)
            logger.info("=" * 50)
            return {"success": False, "error": f"报告生成失败: {str(e)}", "preview": None}


# 工具函数映射
TOOL_MAPPING = {
    "load_data": AgentTools.load_data,
    "analyze_tone": AgentTools.analyze_tone,
    "analyze_style": AgentTools.analyze_style,
    "generate_chart": AgentTools.generate_chart,
    "generate_text": AgentTools.generate_text,
    "critic": AgentTools.critic,
    "generate_report": AgentTools.generate_report,
}
