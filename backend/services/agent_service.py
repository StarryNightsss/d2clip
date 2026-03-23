"""
Agent Service - LangChain Agent 编排核心
会话持久化：优先 Redis，降级内存
历史记录：写入 PostgreSQL agent_sessions 表（可选）
WebSocket：每个 session 可注册多个 ws 连接接收实时推送
"""

import uuid
import asyncio
import json
import logging
from typing import List, Dict, Any, Optional, Set
from datetime import datetime

from fastapi import WebSocket
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from backend.config import settings
from backend.models.agent import (
    AgentSession, StepNode, StepStatus, AgentMode,
    ChatRequest, ChatResponse, StepUpdate
)
from backend.services.agent_tools import AgentTools
from backend.services import session_store

logger = logging.getLogger(__name__)


class AgentService:
    """Agent 服务 - 管理会话、规划、执行"""

    def __init__(self):
        self.tools = AgentTools()
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=0.7,
            openai_api_key=settings.OPENAI_API_KEY,
            openai_api_base=settings.OPENAI_API_BASE,
        )
        # WebSocket 连接池: session_id -> Set[WebSocket]
        self._ws_connections: Dict[str, Set[WebSocket]] = {}
        # 每个 session 的数据缓存: session_id -> data_cache
        self._session_data_cache: Dict[str, Dict[str, Any]] = {}

    # ─── 会话管理 ─────────────────────────────────────────────

    async def create_session(
        self,
        user_id: Optional[str] = None,
        file_path: Optional[str] = None,
        mode: AgentMode = AgentMode.AGENT,
    ) -> AgentSession:
        """创建新会话并持久化"""
        session_id = str(uuid.uuid4())
        now = datetime.now()
        session = AgentSession(
            id=session_id,
            user_id=user_id,
            file_path=file_path,
            mode=mode,
            created_at=now,
            updated_at=now,
        )
        await self._save(session)
        # 创建时立即同步到 PostgreSQL，确保历史记录能显示
        asyncio.create_task(self._sync_to_db(session))
        return session

    async def get_session(self, session_id: str) -> Optional[AgentSession]:
        """加载会话"""
        data = await session_store.load_session(session_id)
        if not data:
            return None
        return self._from_dict(data)

    async def list_sessions(
        self, user_id: Optional[str], limit: int = 20
    ) -> List[dict]:
        """获取用户会话摘要列表"""
        return await session_store.list_user_sessions(user_id, limit)

    async def delete_session(
        self, session_id: str, user_id: Optional[str] = None
    ) -> bool:
        # 清理该 session 的数据缓存
        self._session_data_cache.pop(session_id, None)
        return await session_store.delete_session(session_id, user_id)

    async def update_plan(
        self, session_id: str, new_plan: List[StepNode]
    ) -> None:
        session = await self.get_session(session_id)
        if session:
            session.plan = new_plan
            session.updated_at = datetime.now()
            await self._save(session)

    async def pause_execution(self, session_id: str) -> None:
        session = await self.get_session(session_id)
        if session:
            session.is_paused = True
            await self._save(session)

    async def resume_execution(self, session_id: str) -> None:
        session = await self.get_session(session_id)
        if session:
            session.is_paused = False
            await self._save(session)
            asyncio.create_task(self.execute_plan(session_id))

    # ─── 聊天主逻辑 ───────────────────────────────────────────

    async def chat(
        self, request: ChatRequest, user_id: Optional[str] = None
    ) -> ChatResponse:
        """处理用户消息，根据模式返回不同结果"""
        # 获取或创建会话
        if request.session_id:
            session = await self.get_session(request.session_id)
            if not session:
                raise ValueError(f"会话不存在: {request.session_id}")
        else:
            session = await self.create_session(
                user_id=user_id,
                file_path=request.file_path,
                mode=request.mode,
            )

        # 添加用户消息
        session.messages.append({
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now().isoformat(),
        })
        # 更新模式（允许切换）
        session.mode = request.mode
        # 若前端传入了 file_path，且与当前 session 的不同，则更新并清空旧分析结果
        if request.file_path and request.file_path != session.file_path:
            logger.info(f"Session {session.id}: 数据文件从 {session.file_path} 切换到 {request.file_path}，清空旧分析结果")
            session.file_path = request.file_path
            # 清空旧的分析结果和报告（因为数据变了）
            session.final_report = None
            session.data_summary = None
            # 清空工具的数据缓存
            if session.id in self._session_data_cache:
                del self._session_data_cache[session.id]
        elif request.file_path and not session.file_path:
            # 首次设置 file_path
            session.file_path = request.file_path

        # 根据模式处理
        if request.mode == AgentMode.ASK:
            response_text = await self._handle_ask(session, request.message)
            requires_confirmation = False
            plan = None

        elif request.mode == AgentMode.PLAN:
            plan = await self._generate_plan(session, request.message)
            session.plan = plan
            response_text = self._format_plan(plan)
            requires_confirmation = True

        else:  # AGENT
            plan = await self._generate_plan(session, request.message)
            session.plan = plan
            response_text = "已为您规划好执行步骤，开始自动执行..."
            requires_confirmation = False
            asyncio.create_task(self._run_plan(session.id))

        # 添加 Agent 回复
        session.messages.append({
            "role": "agent",
            "content": response_text,
            "timestamp": datetime.now().isoformat(),
        })
        session.updated_at = datetime.now()
        await self._save(session)

        # 同步写入 PostgreSQL（可选，捕获异常不影响主流程）
        asyncio.create_task(self._sync_to_db(session))

        return ChatResponse(
            session_id=session.id,
            message=response_text,
            plan=plan,
            requires_confirmation=requires_confirmation,
        )

    # ─── ASK 模式 ─────────────────────────────────────────────

    async def _get_file_vectorstore(self, session_id: str, file_path: str):
        """
        为指定文件获取/构建内存向量索引。
        同一会话内只构建一次，结果缓存在 _session_data_cache['_vectorstore'].
        """
        cache = self._session_data_cache.setdefault(session_id, {})
        if "_vectorstore" in cache:
            return cache["_vectorstore"]

        try:
            import json as _json
            from pathlib import Path
            from langchain_openai import OpenAIEmbeddings
            from langchain_chroma import Chroma
            from langchain_core.documents import Document

            fp = Path(file_path)
            if not fp.is_absolute():
                # 尝试多个可能的路径
                possible_paths = [
                    Path(settings.BASE_DIR) / file_path,
                    Path(settings.CRAWLER_DATA_DIR) / file_path,
                    Path(settings.CRAWLER_DATA_DIR) / 'xhs' / 'json' / file_path.name if hasattr(file_path, 'name') else Path(file_path).name,
                ]
                for p in possible_paths:
                    if p.exists():
                        fp = p
                        break
                else:
                    # 如果都不存在，使用第一个路径（保持原行为）
                    fp = possible_paths[0]
            if not fp.exists():
                logger.warning(f"ASK 模式：文件不存在: {fp}")
                return None

            raw = fp.read_text(encoding="utf-8")
            data = _json.loads(raw)
            items = data if isinstance(data, list) else data.get("items", data.get("data", []))
            if not isinstance(items, list) or not items:
                return None

            # 每条笔记转为 Document，字段平铺为文本
            docs = []
            for i, item in enumerate(items):
                text = " | ".join(
                    f"{k}: {v}" for k, v in item.items()
                    if isinstance(v, (str, int, float)) and v
                )[:1000]
                docs.append(Document(page_content=text, metadata={"index": i}))

            embedding_model = OpenAIEmbeddings(
                openai_api_key=settings.OPENAI_API_KEY,
                openai_api_base=settings.OPENAI_API_BASE
            )
            # 内存模式 Chroma（不持久化，随进程消亡）
            vs = await asyncio.get_event_loop().run_in_executor(
                None, lambda: Chroma.from_documents(docs, embedding_model)
            )
            cache["_vectorstore"] = vs
            cache["_total"] = len(items)
            cache["_filename"] = fp.name
            logger.info("ASK 向量库建建完成: %s 条笔记 -> %s", len(docs), fp.name)
            return vs
        except Exception as e:
            logger.warning("ASK 模式构建向量库失败: %s", e)
            return None

    async def _handle_ask(self, session: AgentSession, message: str) -> str:
        file_context = ""
        if session.file_path:
            vs = await self._get_file_vectorstore(session.id, session.file_path)
            cache = self._session_data_cache.get(session.id, {})
            total = cache.get("_total", "?")
            filename = cache.get("_filename", session.file_path)

            if vs:
                try:
                    # 用用户问题语义检索最相关的 Top-8 条
                    hits = await asyncio.get_event_loop().run_in_executor(
                        None, lambda: vs.similarity_search(message, k=8)
                    )
                    snippets = "\n---\n".join(h.page_content for h in hits)
                    file_context = (
                        f"\n\n以下是数据文件 `{filename}`（共 {total} 条）中与当前问题最相关的内容：\n{snippets}"
                    )
                except Exception as e:
                    logger.debug("ASK 语义检索失败: %s", e)
                    file_context = f"\n\n（已选文件：{filename}，检索失败）"
            else:
                file_context = f"\n\n（已选文件：{filename}，嵌入失败）"

        system = (
            "你是 D2C 口红实验室的 AI 助手，专注于美妆数据分析领域。\n"
            "你可以回答关于口红、妆容、趋势分析的问题，也可以根据提供的数据文件内容回答用户问题。\n"
            "如果用户问'这个文件是关于什么的'，请根据提供的数据内容总结文件的主题和内容。\n"
            "如果用户想生成可视化报告，请引导他们切换到 Plan 或 Agent 模式。\n"
            + file_context
        )
        messages = [SystemMessage(content=system)]
        for msg in session.messages[-10:]:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "agent":
                messages.append(AIMessage(content=msg["content"]))
        response = await self.llm.ainvoke(messages)
        return response.content

    # ─── 计划生成 ─────────────────────────────────────────────

    async def _generate_plan(
        self, session: AgentSession, message: str
    ) -> List[StepNode]:
        system = """你是 D2C 口红实验室的 AI 规划师。根据用户需求生成数据分析执行计划。

可用工具：
1. load_data - 加载数据（必须第一步）
2. analyze_tone - 分析口红色调
3. analyze_style - 分析妆容风格
4. generate_chart - 生成图表（支持 pie/bar/line 等9种）
5. generate_text - 生成分析文案
6. critic - 质量检查（可选）
7. generate_report - 组装最终报告（必须最后）

依赖规则：
- analyze_tone / analyze_style 必须依赖 load_data
- generate_chart / generate_text 依赖对应的 analyze_*
- generate_report 依赖所有 generate_chart 和 generate_text

以 JSON 格式返回，不要有多余文字：
{"steps": [{"tool": "load_data", "name": "加载数据", "deps": []}, ...]}"""

        intent = (
            f"用户需求: {message}\n"
            f"数据文件: {session.file_path or '未指定'}\n\n"
            "请生成执行计划 JSON："
        )
        try:
            resp = await self.llm.ainvoke([
                SystemMessage(content=system),
                HumanMessage(content=intent),
            ])
            import re
            match = re.search(r"\{.*\}", resp.content, re.DOTALL)
            if match:
                plan_data = json.loads(match.group())
                return self._build_steps(plan_data.get("steps", []))
        except Exception as e:
            logger.warning("LLM 规划失败，使用默认计划: %s", e)
        return self._default_plan(message)

    def _build_steps(self, raw_steps: list) -> List[StepNode]:
        steps = []
        tool_to_id: Dict[str, str] = {}
        for i, s in enumerate(raw_steps):
            sid = f"step-{i + 1}"
            tool_to_id[s["tool"]] = sid
            deps = [tool_to_id[d] for d in s.get("deps", []) if d in tool_to_id]
            steps.append(StepNode(
                id=sid,
                name=s.get("name", s["tool"]),
                tool=s["tool"],
                description=s.get("description", ""),
                dependencies=deps,
            ))
        return steps

    def _default_plan(self, message: str) -> List[StepNode]:
        # 判断分析类型并保存到结果中
        analysis_type = "full"  # 默认完整分析
        if "色调" in message or "颜色" in message or "重点分析口红色调" in message:
            analysis_type = "tone"
        elif "风格" in message or "妆容" in message or "重点分析妆容风格" in message:
            analysis_type = "style"
        
        # 返回计划时带上分析类型标记
        if analysis_type == "tone":
            return [
                StepNode(id="step-1", name="加载数据", tool="load_data", dependencies=[], description="tone"),
                StepNode(id="step-2", name="分析色调", tool="analyze_tone", dependencies=["step-1"], description="tone"),
                StepNode(id="step-3", name="生成色调图表", tool="generate_chart", dependencies=["step-2"], description="tone"),
                StepNode(id="step-4", name="生成分析文案", tool="generate_text", dependencies=["step-2"], description="tone"),
                StepNode(id="step-5", name="组装报告", tool="generate_report", dependencies=["step-3", "step-4"], description="tone"),
            ]
        elif analysis_type == "style":
            return [
                StepNode(id="step-1", name="加载数据", tool="load_data", dependencies=[], description="style"),
                StepNode(id="step-2", name="分析风格", tool="analyze_style", dependencies=["step-1"], description="style"),
                StepNode(id="step-3", name="生成风格图表", tool="generate_chart", dependencies=["step-2"], description="style"),
                StepNode(id="step-4", name="生成分析文案", tool="generate_text", dependencies=["step-2"], description="style"),
                StepNode(id="step-5", name="组装报告", tool="generate_report", dependencies=["step-3", "step-4"], description="style"),
            ]
        else:
            return [
                StepNode(id="step-1", name="加载数据", tool="load_data", dependencies=[], description="full"),
                StepNode(id="step-2", name="分析色调", tool="analyze_tone", dependencies=["step-1"], description="full"),
                StepNode(id="step-3", name="分析风格", tool="analyze_style", dependencies=["step-1"], description="full"),
                StepNode(id="step-4", name="生成色调图表", tool="generate_chart", dependencies=["step-2"], description="full"),
                StepNode(id="step-5", name="生成风格图表", tool="generate_chart", dependencies=["step-3"], description="full"),
                StepNode(id="step-6", name="生成色调文案", tool="generate_text", dependencies=["step-2"], description="full"),
                StepNode(id="step-7", name="生成风格文案", tool="generate_text", dependencies=["step-3"], description="full"),
                StepNode(id="step-8", name="组装报告", tool="generate_report", dependencies=["step-4", "step-5", "step-6", "step-7"], description="full"),
            ]

    def _format_plan(self, plan: List[StepNode]) -> str:
        lines = ["已为您生成执行计划：\n"]
        for i, step in enumerate(plan, 1):
            lines.append(f"⭕ {i}. {step.name}")
        lines.append("\n您可以调整步骤或点击「开始执行」。")
        return "\n".join(lines)

    # ─── 计划执行（DAG 拓扑排序 + 并行）────────────────────────

    async def execute_plan(
        self,
        session_id: str,
        step_ids: Optional[List[str]] = None,
    ) -> None:
        session = await self.get_session(session_id)
        if not session or not session.plan:
            return

        session.is_executing = True
        await self._save(session)

        try:
            to_run = set(step_ids) if step_ids else {s.id for s in session.plan}
            executed: Set[str] = set()

            while len(executed) < len(to_run):
                # 找到依赖已满足且尚未执行的步骤
                ready = [
                    s for s in session.plan
                    if s.id in to_run
                    and s.id not in executed
                    and all(d in executed for d in s.dependencies)
                ]
                if not ready:
                    break  # 防止死循环（依赖错误时）

                # 并行执行就绪步骤
                await asyncio.gather(*[
                    self._run_step(session, step) for step in ready
                ])
                for step in ready:
                    executed.add(step.id)

                # 重新加载 session（防止并发覆盖）
                session = await self.get_session(session_id)
                if not session or session.is_paused:
                    break

        finally:
            if session:
                session.is_executing = False
                # 检查是否有 generate_report 步骤的结果，保存到 final_report
                if session.plan:
                    report_step = next((s for s in session.plan if s.tool == "generate_report"), None)
                    if report_step and report_step.result and report_step.result.get("success"):
                        # 必须保存完整的 data（包含 report 字段），不是 preview
                        report_data = report_step.result.get("data")
                        if report_data and report_data.get("report"):
                            session.final_report = report_data
                            logger.info("计划执行完成，已保存 final_report: %s", report_data.get("analysis_id"))
                        else:
                            logger.warning("generate_report 成功但 data 格式不正确: %s", report_data.keys() if report_data else None)
                await self._save(session)
                # 同步到 PostgreSQL
                asyncio.create_task(self._sync_to_db(session))
            # 广播完成事件
            await self._broadcast(session_id, {
                "type": "completed",
                "session_id": session_id,
            })

    async def _run_plan(self, session_id: str) -> None:
        """AGENT 模式异步任务入口"""
        await self.execute_plan(session_id)

    async def _run_step(self, session: AgentSession, step: StepNode) -> None:
        """执行单个步骤，推送状态变化"""
        logger.info(f"[Agent] 开始执行步骤: {step.id} ({step.name})")
        step.status = StepStatus.RUNNING
        step.started_at = datetime.now()
        session.current_step_id = step.id
        await self._save(session)
        update_msg = self._make_update(session, step)
        logger.info(f"[Agent] 广播步骤状态更新: {update_msg}")
        await self._broadcast(session.id, update_msg)

        try:
            tool_func = getattr(self.tools, step.tool, None)
            if not tool_func:
                raise ValueError(f"未知工具: {step.tool}")

            # 恢复该 session 的数据缓存到 tools
            # 使用 setdefault 确保 session 的缓存被正确初始化和保存
            cached_data = self._session_data_cache.setdefault(session.id, {})
            self.tools.data_cache = cached_data
            logger.info("步骤 %s 恢复数据缓存: keys=%s", step.id, list(cached_data.keys()))

            # 收集依赖步骤的执行结果作为上下文
            dep_results = {}
            if session.plan:
                for dep_id in step.dependencies:
                    dep_step = next((s for s in session.plan if s.id == dep_id), None)
                    if dep_step and dep_step.result:
                        dep_results[dep_step.tool] = dep_step.result

            # 根据工具类型传入合适参数
            kwargs = dict(dep_results=dep_results)
            if step.tool == "load_data":
                kwargs["file_path"] = session.file_path or ""
            elif step.tool == "generate_chart":
                # 根据步骤名称或依赖推断图表类型
                step_name_lower = step.name.lower()
                if "色调" in step_name_lower or "颜色" in step_name_lower or "color" in step_name_lower:
                    kwargs.update({"chart_type": "pie", "title": "口红色调分布", "data_field": "tone"})
                elif "风格" in step_name_lower or "style" in step_name_lower:
                    kwargs.update({"chart_type": "bar", "title": "妆容风格占比", "data_field": "style"})
                else:
                    # 根据依赖判断：如果依赖 analyze_tone 则是色调图，否则风格图
                    has_tone_dep = any("analyze_tone" in dep_id for dep_id in step.dependencies)
                    if has_tone_dep:
                        kwargs.update({"chart_type": "pie", "title": "口红色调分布", "data_field": "tone"})
                    else:
                        kwargs.update({"chart_type": "bar", "title": "妆容风格占比", "data_field": "style"})
            elif step.tool == "generate_text":
                # 根据步骤名称推断文案类型
                step_name_lower = step.name.lower()
                if "色调" in step_name_lower or "颜色" in step_name_lower:
                    kwargs.update({"section_title": "色调分析", "data_field": "tone"})
                elif "风格" in step_name_lower or "style" in step_name_lower:
                    kwargs.update({"section_title": "风格分析", "data_field": "style"})
                else:
                    # 根据依赖判断
                    has_tone_dep = any("analyze_tone" in dep_id for dep_id in step.dependencies)
                    if has_tone_dep:
                        kwargs.update({"section_title": "色调分析", "data_field": "tone"})
                    else:
                        kwargs.update({"section_title": "风格分析", "data_field": "style"})
            elif step.tool == "critic":
                last_result = list(dep_results.values())[-1] if dep_results else {}
                kwargs.update({"step_name": step.name, "step_result": last_result})

            result = await tool_func(**kwargs)

            # 保存该 session 的数据缓存
            # 注意：由于使用了 setdefault，self.tools.data_cache 和 _session_data_cache[session.id] 是同一个对象
            # 但为了保险起见，仍然保存一份拷贝，避免并发问题
            self._session_data_cache[session.id] = self.tools.data_cache.copy()
            logger.info("步骤 %s 保存数据缓存: keys=%s, note_analysis_results=%d 条", 
                       step.id, list(self.tools.data_cache.keys()),
                       len(self.tools.data_cache.get('note_analysis_results', [])))
            step.result = result
            step.preview = result.get("preview")
            step.status = StepStatus.COMPLETED if result.get("success") else StepStatus.ERROR
            if not result.get("success"):
                step.error_message = result.get("error", "未知错误")
        except Exception as e:
            step.status = StepStatus.ERROR
            step.error_message = str(e)
            logger.error("步骤 %s 执行失败: %s", step.id, e)

        step.completed_at = datetime.now()
        await self._save(session)
        await self._broadcast(session.id, self._make_update(session, step))

    def _make_update(self, session: AgentSession, step: StepNode) -> dict:
        total = len(session.plan) if session.plan else 1
        completed = sum(1 for s in (session.plan or []) if s.status == StepStatus.COMPLETED)
        return {
            "type": "step_update",
            "session_id": session.id,
            "step_id": step.id,
            "status": step.status.value,
            "result": step.result,
            "preview": step.preview,
            "error": step.error_message,
            "progress": int(completed / total * 100),
        }

    # ─── WebSocket 管理 ───────────────────────────────────────

    async def register_websocket(self, session_id: str, ws: WebSocket) -> None:
        self._ws_connections.setdefault(session_id, set()).add(ws)

    async def unregister_websocket(self, session_id: str, ws: WebSocket) -> None:
        conns = self._ws_connections.get(session_id, set())
        conns.discard(ws)

    async def _broadcast(self, session_id: str, data: dict) -> None:
        """向该 session 所有 WebSocket 连接广播消息"""
        conns = self._ws_connections.get(session_id, set()).copy()  # 复制集合避免迭代时修改
        logger.info(f"[Agent] 广播消息到 session {session_id}, 连接数: {len(conns)}, 消息类型: {data.get('type')}")
        dead = set()
        for ws in conns:
            try:
                await ws.send_text(json.dumps(data, ensure_ascii=False, default=str))
                logger.info(f"[Agent] 消息已发送到 WebSocket")
            except Exception as e:
                logger.warning(f"[Agent] WebSocket 发送失败: {e}")
                dead.add(ws)
        # 从原始集合中移除死连接
        if session_id in self._ws_connections:
            self._ws_connections[session_id] -= dead

    # ─── 持久化辅助 ───────────────────────────────────────────

    async def _save(self, session: AgentSession) -> None:
        """将 session 序列化后存入 Redis / 内存"""
        data = session.dict()
        await session_store.save_session(
            session.id,
            data,
            user_id=session.user_id,
        )

    @staticmethod
    def _from_dict(data: dict) -> AgentSession:
        """从字典恢复 AgentSession 对象"""
        # plan 字段需要转换为 StepNode 列表
        plan_raw = data.get("plan")
        if plan_raw and isinstance(plan_raw, list):
            data["plan"] = [
                s if isinstance(s, StepNode) else StepNode(**s)
                for s in plan_raw
            ]
        return AgentSession(**data)

    # ─── PostgreSQL 同步（可选）──────────────────────────────

    async def _sync_to_db(self, session: AgentSession) -> None:
        """异步写入 PostgreSQL，失败不影响主流程"""
        logger.info("开始同步 session %s 到数据库", session.id)
        try:
            from backend.db import is_db_configured, SessionLocal
            if not is_db_configured() or SessionLocal is None:
                logger.warning("数据库未配置，跳过同步")
                return
            from backend.db.models import AgentSession as DBSession

            title = "新对话"
            for msg in session.messages:
                if msg.get("role") == "user":
                    c = msg.get("content", "")
                    title = c[:30] + ("..." if len(c) > 30 else "")
                    break

            plan_data = None
            if session.plan:
                # 自定义序列化，处理 datetime 对象
                def serialize_step(step):
                    data = step.dict()
                    # 将 datetime 转换为 ISO 格式字符串
                    for key in ['started_at', 'completed_at']:
                        if data.get(key) and hasattr(data[key], 'isoformat'):
                            data[key] = data[key].isoformat()
                    return data
                plan_data = [serialize_step(s) for s in session.plan]

            status = "running" if session.is_executing else (
                "completed" if (
                    session.plan and all(
                        s.status == StepStatus.COMPLETED for s in session.plan
                    )
                ) else "pending"
            )

            db = SessionLocal()
            try:
                existing = db.query(DBSession).filter(DBSession.id == session.id).first()
                if existing:
                    existing.title = title
                    existing.mode = session.mode.value if hasattr(session.mode, "value") else session.mode
                    existing.status = status
                    existing.messages = session.messages
                    existing.plan = plan_data
                    existing.final_report = session.final_report
                else:
                    db.add(DBSession(
                        id=session.id,
                        user_id=session.user_id,
                        title=title,
                        mode=session.mode.value if hasattr(session.mode, "value") else session.mode,
                        status=status,
                        messages=session.messages,
                        plan=plan_data,
                        final_report=session.final_report,
                        file_path=session.file_path or "",
                    ))
                db.commit()
                logger.info("Session %s 同步到数据库成功", session.id)
            finally:
                db.close()
        except Exception as e:
            logger.error("同步 DB 失败（非致命）: %s", e, exc_info=True)


# 全局单例
agent_service = AgentService()
