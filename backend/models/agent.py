"""
Agent 相关的数据模型
"""

from typing import List, Dict, Optional, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class StepStatus(str, Enum):
    """步骤状态"""
    PENDING = "pending"      # 待执行
    RUNNING = "running"      # 执行中
    COMPLETED = "completed"  # 已完成
    ERROR = "error"          # 出错
    SKIPPED = "skipped"      # 已跳过


class AgentMode(str, Enum):
    """Agent 模式"""
    ASK = "ask"      # 问答模式
    PLAN = "plan"    # 规划模式
    AGENT = "agent"  # 自动执行模式


class StepNode(BaseModel):
    """DAG 步骤节点"""
    id: str = Field(..., description="节点唯一ID")
    name: str = Field(..., description="节点名称")
    tool: str = Field(..., description="调用的工具名")
    description: str = Field("", description="节点描述")
    dependencies: List[str] = Field(default_factory=list, description="依赖的节点ID列表")
    status: StepStatus = Field(default=StepStatus.PENDING, description="当前状态")
    result: Optional[Dict[str, Any]] = Field(default=None, description="执行结果")
    preview: Optional[Dict[str, Any]] = Field(default=None, description="预览数据（图表配置等）")
    error_message: Optional[str] = Field(default=None, description="错误信息")
    started_at: Optional[datetime] = Field(default=None, description="开始时间")
    completed_at: Optional[datetime] = Field(default=None, description="完成时间")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class AgentSession(BaseModel):
    """Agent 会话"""
    id: str = Field(..., description="会话ID")
    user_id: Optional[str] = Field(default=None, description="用户ID")
    file_path: Optional[str] = Field(default=None, description="数据文件路径")
    mode: AgentMode = Field(default=AgentMode.AGENT, description="会话模式")
    
    # 对话历史
    messages: List[Dict[str, Any]] = Field(default_factory=list, description="对话消息列表")
    
    # 执行计划
    plan: Optional[List[StepNode]] = Field(default=None, description="执行计划DAG")
    
    # 执行状态
    current_step_id: Optional[str] = Field(default=None, description="当前执行步骤ID")
    is_executing: bool = Field(default=False, description="是否正在执行")
    is_paused: bool = Field(default=False, description="是否已暂停")
    
    # 最终结果
    final_report: Optional[Dict[str, Any]] = Field(default=None, description="最终报告")
    
    # 时间戳
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class ChatRequest(BaseModel):
    """聊天请求"""
    message: str = Field(..., description="用户消息")
    mode: AgentMode = Field(default=AgentMode.AGENT, description="模式")
    session_id: Optional[str] = Field(default=None, description="会话ID（新会话可为空）")
    file_path: Optional[str] = Field(default=None, description="数据文件路径")


class ChatResponse(BaseModel):
    """聊天响应"""
    session_id: str = Field(..., description="会话ID")
    message: str = Field(..., description="Agent 回复")
    plan: Optional[List[StepNode]] = Field(default=None, description="生成的执行计划")
    requires_confirmation: bool = Field(default=False, description="是否需要用户确认")


class ExecutePlanRequest(BaseModel):
    """执行计划请求"""
    session_id: str = Field(..., description="会话ID")
    step_ids: Optional[List[str]] = Field(default=None, description="指定执行的步骤ID，None表示全部")


class StepUpdate(BaseModel):
    """步骤更新（WebSocket/回调用）"""
    type: Literal["step_update"] = "step_update"
    session_id: str = Field(..., description="会话ID")
    step_id: str = Field(..., description="步骤ID")
    status: StepStatus = Field(..., description="新状态")
    result: Optional[Dict[str, Any]] = Field(default=None, description="执行结果")
    preview: Optional[Dict[str, Any]] = Field(default=None, description="预览数据")
    progress: int = Field(default=0, description="整体进度 0-100")


class ToolInput(BaseModel):
    """工具输入"""
    tool_name: str = Field(..., description="工具名")
    params: Dict[str, Any] = Field(default_factory=dict, description="参数")


class ToolOutput(BaseModel):
    """工具输出"""
    success: bool = Field(..., description="是否成功")
    data: Optional[Dict[str, Any]] = Field(default=None, description="输出数据")
    error: Optional[str] = Field(default=None, description="错误信息")
    preview: Optional[Dict[str, Any]] = Field(default=None, description="预览数据")
