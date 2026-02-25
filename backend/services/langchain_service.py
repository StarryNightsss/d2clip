"""
LangChain 服务 - 使用标准 Chain 架构
"""
import json
from typing import List, Dict
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import settings
from models.schemas import NoteAnalysisResult, LipstickFeatures, ReportSkeletonOutput
from prompts.analysis_prompts import NOTE_ANALYSIS_TEMPLATE
from prompts.report_prompts import (
    REPORT_SKELETON_TEMPLATE,
    SECTION_CONTENT_TEMPLATE,
    CHART_GENERATION_TEMPLATE
)


class LangChainService:
    """LangChain 服务 - 管理所有 Chain"""

    def __init__(self):
        # 初始化 LLM（基础任务用 3.5-turbo）
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=settings.OPENAI_TEMPERATURE,
            max_tokens=4000,
            openai_api_key=settings.OPENAI_API_KEY,
            openai_api_base=settings.OPENAI_API_BASE
        )

        # 初始化图表专用 LLM（复杂结构化输出用 4o）
        self.chart_llm = ChatOpenAI(
            model=settings.OPENAI_CHART_MODEL,
            temperature=settings.OPENAI_TEMPERATURE,
            max_tokens=4000,
            openai_api_key=settings.OPENAI_API_KEY,
            openai_api_base=settings.OPENAI_API_BASE
        )

        # 向量数据库
        self.vectorstore = None
        self._init_vectorstore()

        # 构建所有 Chain
        self.note_analysis_chain = self._build_note_analysis_chain()
        self.report_skeleton_chain = self._build_report_skeleton_chain()
        self.section_content_chain = self._build_section_content_chain()
        self.chart_generation_chain = self._build_chart_generation_chain()

        # 打印模型配置
        print(f"🤖 LangChain 服务初始化完成")
        print(f"  - 基础任务: {settings.OPENAI_MODEL}")
        print(f"  - 图表生成: {settings.OPENAI_CHART_MODEL}")

    def _init_vectorstore(self):
        """初始化向量数据库"""
        try:
            embedding_model = OpenAIEmbeddings(
                openai_api_key=settings.OPENAI_API_KEY,
                openai_api_base=settings.OPENAI_API_BASE
            )

            self.vectorstore = Chroma(
                persist_directory=settings.CHROMA_DB_PATH,
                embedding_function=embedding_model
            )

            count = self.vectorstore._collection.count()
            print(f"✅ 已加载向量数据库，共 {count} 条记录")

        except Exception as e:
            print(f"⚠️ 向量数据库初始化失败: {e}")
            self.vectorstore = None

    def _build_note_analysis_chain(self):
        """构建笔记分析 Chain"""
        return (
            NOTE_ANALYSIS_TEMPLATE
            | self.llm
            | JsonOutputParser()
        )

    def _build_report_skeleton_chain(self):
        """构建报告骨架 Chain"""
        return (
            REPORT_SKELETON_TEMPLATE
            | self.llm
            | JsonOutputParser(pydantic_object=ReportSkeletonOutput)
        )

    def _build_section_content_chain(self):
        """构建板块内容 Chain"""
        return (
            SECTION_CONTENT_TEMPLATE
            | self.llm
            | StrOutputParser()
        )

    def _build_chart_generation_chain(self):
        """构建图表生成 Chain（使用 4o 模型，带重试）"""
        return (
            CHART_GENERATION_TEMPLATE
            | self.chart_llm  # 使用更强的模型处理复杂结构化输出
            | JsonOutputParser()
        )

    def similarity_search(self, query: str, k: int = 5) -> List[Document]:
        """语义检索"""
        if not self.vectorstore:
            return []
        return self.vectorstore.similarity_search(query, k=k)

    def _validate_and_get_errors(self, result: Dict) -> list:
        """验证分析结果，返回错误列表"""
        errors = []

        # 检查 makeup_style
        if result.get("makeup_style"):
            for style in result["makeup_style"]:
                if "妆容风格" in style and any(char.isdigit() for char in style):
                    errors.append(f"makeup_style使用了占位符'{style}'，应该是具体妆容名称如'韩系妆容'")

        # 检查 lipstick_features
        features = result.get("lipstick_features", {})
        if features.get("color") in ["色调", "未知", "color"]:
            errors.append(f"color是'{features.get('color')}'，应该是具体颜色如'珊瑚橘'、'正红色'")
        if features.get("texture") in ["质地", "未知", "texture"]:
            errors.append(f"texture是'{features.get('texture')}'，应该是具体质地如'丝绒雾面'")
        if features.get("saturation") in ["饱和度", "未知", "saturation"]:
            errors.append(f"saturation是'{features.get('saturation')}'，应该是'高饱和'、'中饱和'、'低饱和'")
        if features.get("tone") in ["色温", "未知", "tone"]:
            errors.append(f"tone是'{features.get('tone')}'，应该是'暖调'、'冷调'、'中性调'")

        return errors

    async def analyze_note(self, note_content: str) -> Dict:
        """使用 RAG 增强分析单条笔记（带自我修正）"""
        # 1. 检索相关知识
        relevant_knowledge = self.similarity_search(note_content, k=5)

        # 2. 构建知识上下文
        if relevant_knowledge:
            knowledge_context = "\n\n".join([
                f"【知识{i+1}】{doc.page_content[:100]}..."  # 打印前100字符便于调试
                for i, doc in enumerate(relevant_knowledge)
            ])
        else:
            knowledge_context = "无相关知识"

        # 3. 调用 Chain（最多3次，带自我修正）
        result = None
        previous_errors = []

        for attempt in range(3):
            try:
                # 构建prompt（如果有错误反馈，添加到prompt中）
                prompt_context = knowledge_context
                if previous_errors:
                    error_feedback = "\n\n【上次生成的错误反馈】\n" + "\n".join([f"- {err}" for err in previous_errors])
                    error_feedback += "\n\n请基于上次的结果修正这些错误，重新输出正确的JSON。"
                    prompt_context = knowledge_context + error_feedback

                result = await self.note_analysis_chain.ainvoke({
                    "knowledge_context": prompt_context,
                    "note_content": note_content
                })

                # 验证结果
                errors = self._validate_and_get_errors(result)
                if not errors:
                    # 没有错误，返回结果
                    return result
                else:
                    # 有错误，记录并重试
                    previous_errors = errors
                    print(f"  ⚠️ 分析结果有问题 (第{attempt+1}次)，错误: {errors[:2]}")  # 只打印前2个错误
                    if attempt == 2:
                        # 最后一次了，接受有瑕疵的结果
                        print(f"  ⚠️ 已重试3次，接受当前结果")
                        return result

            except Exception as e:
                print(f"  ❌ 笔记分析失败 (第{attempt+1}次): {e}")
                if attempt == 2:
                    return {
                        "makeup_style": [],
                        "lipstick_features": {
                            "color": "无法判断",
                            "texture": "无法判断",
                            "saturation": "无法判断",
                            "tone": "无法判断"
                        },
                        "keywords": [],
                        "scene": []
                    }

        return result

    async def generate_report_skeleton(self, statistics: Dict) -> Dict:
        """生成报告骨架（带自我修正）"""
        previous_result = None
        previous_errors = []

        for attempt in range(3):
            try:
                # 构建prompt（如果有错误反馈，添加）
                prompt_data = json.dumps(statistics, ensure_ascii=False, indent=2)
                if previous_errors and previous_result:
                    error_feedback = "\n\n【上次生成的错误】\n" + "\n".join([f"- {err}" for err in previous_errors])
                    error_feedback += f"\n\n【上次的结果】\n{json.dumps(previous_result, ensure_ascii=False, indent=2)}"
                    error_feedback += "\n\n请修正这些错误，重新输出正确的JSON。"
                    prompt_data = prompt_data + error_feedback

                result = await self.report_skeleton_chain.ainvoke({
                    "data_summary": prompt_data
                })

                # 验证结果
                errors = []
                if not result.get("report_title"):
                    errors.append("缺少report_title字段")
                if not result.get("sections") or len(result["sections"]) == 0:
                    errors.append("缺少sections或sections为空")

                if not errors:
                    return result
                else:
                    previous_result = result
                    previous_errors = errors
                    print(f"  ⚠️ 报告骨架有问题 (第{attempt+1}次): {errors}")
                    if attempt == 2:
                        return result

            except Exception as e:
                print(f"  ❌ 报告骨架生成失败 (第{attempt+1}次): {e}")
                if attempt == 2:
                    raise

        return result

    async def generate_section_content(self, section_title: str, section_data: Dict) -> str:
        """生成单个板块的分析文字（带自我修正）"""
        previous_content = None
        previous_errors = []

        for attempt in range(3):
            try:
                # 构建prompt
                data_str = json.dumps(section_data, ensure_ascii=False, indent=2)
                if previous_errors and previous_content:
                    error_feedback = "\n\n【上次生成的内容有以下问题】\n" + "\n".join([f"- {err}" for err in previous_errors])
                    error_feedback += f"\n\n【上次的内容】\n{previous_content}"
                    error_feedback += "\n\n请基于上次内容修正问题，生成更专业的分析。"
                    data_str = data_str + error_feedback

                content = await self.section_content_chain.ainvoke({
                    "section_title": section_title,
                    "section_data": data_str
                })
                content = content.strip()

                # 验证内容
                errors = []
                if len(content) < 50:
                    errors.append(f"内容太短（{len(content)}字），应该2-3段专业分析")
                if "正在整理中" in content or "暂无" in content:
                    errors.append("内容是占位符，需要真实分析")

                if not errors:
                    return content
                else:
                    previous_content = content
                    previous_errors = errors
                    if attempt == 2:
                        return content

            except Exception as e:
                print(f"  ❌ 板块内容生成失败 (第{attempt+1}次): {e}")
                if attempt == 2:
                    return f"【数据分析】{section_title}相关数据正在整理中..."

        return content

    async def generate_chart_config(
        self,
        chart_type: str,
        chart_title: str,
        description: str,
        data_summary: Dict,
        color_scheme: List[str],
        schema: str
    ) -> Dict:
        """生成图表配置（带自我修正）"""
        previous_result = None
        previous_errors = []

        for attempt in range(3):
            try:
                # 构建prompt
                data_str = json.dumps(data_summary, ensure_ascii=False, indent=2)
                if previous_errors and previous_result:
                    error_feedback = "\n\n【上次生成的配置有问题】\n" + "\n".join([f"- {err}" for err in previous_errors])
                    error_feedback += f"\n\n【上次的配置】\n{json.dumps(previous_result, ensure_ascii=False, indent=2)}"
                    error_feedback += "\n\n请修正这些错误，重新生成完整的ECharts配置。"
                    data_str = data_str + error_feedback

                result = await self.chart_generation_chain.ainvoke({
                    "chart_type": chart_type,
                    "chart_title": chart_title,
                    "description": description,
                    "data_summary": data_str,
                    "color_scheme": str(color_scheme),
                    "schema": schema
                })

                # 验证结果
                errors = []
                result_str = str(result)

                # 检查是否包含JavaScript代码（JSON不支持）
                if "function" in result_str or "=>" in result_str:
                    errors.append("配置中包含JavaScript代码（如function），JSON不支持！必须用静态值替代")
                elif not result:
                    errors.append("返回结果为空")
                elif "series" not in result:
                    errors.append("缺少必需的series字段")
                elif not result["series"] or len(result["series"]) == 0:
                    errors.append("series数组为空")
                elif not result["series"][0].get("data"):
                    errors.append("series[0].data字段缺失或为None")
                elif isinstance(result["series"][0].get("data"), list) and len(result["series"][0]["data"]) == 0:
                    errors.append("series[0].data是空数组，必须包含实际数据点")

                if not errors:
                    print(f"  ✅ 图表配置生成成功: {chart_title} (第{attempt+1}次)")
                    return result
                else:
                    previous_result = result
                    previous_errors = errors
                    print(f"  ⚠️ 图表配置有问题 (第{attempt+1}次): {errors[0]}")
                    if attempt == 2:
                        # 最后一次，返回默认配置
                        return {
                            "title": {"text": chart_title, "left": "center"},
                            "series": [{"type": chart_type, "data": []}]
                        }

            except Exception as e:
                print(f"  ❌ 图表生成失败 (第{attempt+1}次): {e}")
                if attempt == 2:
                    return {
                        "title": {"text": chart_title, "left": "center"},
                        "series": [{"type": chart_type, "data": []}]
                    }

        return result


# 全局单例
langchain_service = LangChainService()
