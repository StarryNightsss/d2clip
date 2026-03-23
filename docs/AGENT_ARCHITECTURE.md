# D2C Agent 架构设计

## 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端 (React)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │      Chat Interface         │    │        Execution Panel              │ │
│  │  ┌───────────────────────┐  │    │  ┌─────────────────────────────┐   │ │
│  │  │ Messages              │  │    │  │ Step List                   │   │ │
│  │  │ • User/Agent bubbles  │  │    │  │ ⭕ load_data                │   │ │
│  │  │ • Quick suggestions   │  │    │  │ ✅ analyze_tone (preview)   │   │ │
│  │  │ • Mode selector       │  │    │  │ ⏳ generate_chart           │   │ │
│  │  └───────────────────────┘  │    │  │ ⭕ generate_report          │   │ │
│  │  ┌───────────────────────┐  │    │  └─────────────────────────────┘   │ │
│  │  │ Input Area            │  │    │  ┌─────────────────────────────┐   │ │
│  │  │ [Mode▼] [Input] [Send]│  │    │  │ Step Preview                │   │ │
│  │  └───────────────────────┘  │    │  │ (Chart/JSON/Text)           │   │ │
│  └─────────────────────────────┘    │  └─────────────────────────────┘   │ │
│                                      └─────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────────────────┐
│                           后端 (FastAPI)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     API Layer                                        │   │
│  │  POST /api/agent/chat        - 用户消息处理                         │   │
│  │  POST /api/agent/plan        - 生成执行计划                         │   │
│  │  POST /api/agent/execute     - 执行计划                             │   │
│  │  POST /api/agent/step/{id}   - 执行单步                             │   │
│  │  GET  /api/agent/status      - 获取执行状态                         │   │
│  │  POST /api/agent/pause       - 暂停执行                             │   │
│  │  POST /api/agent/resume      - 继续执行                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  Agent Core (LangChain)                              │   │
│  │                                                                      │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │   │
│  │  │   Planner   │───▶│  AgentExecutor│──▶│      Step Callbacks     │  │   │
│  │  │   Agent     │    │             │    │  (update status/preview)│  │   │
│  │  └─────────────┘    └─────────────┘    └─────────────────────────┘  │   │
│  │         │                   │                                       │   │
│  │         ▼                   ▼                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                     Tools (Function Calling)                 │   │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │   │
│  │  │  │load_data │ │analyze_  │ │generate_ │ │generate_     │   │   │   │
│  │  │  │          │ │  tone    │ │  chart   │ │  report      │   │   │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                     Memory                                   │   │   │
│  │  │  • ConversationBufferMemory (对话历史)                      │   │   │
│  │  │  • Chroma (知识库检索)                                       │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              Integration with Existing Code                          │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │   │
│  │  │  analysis_service│    │  crawler_service │    │   data_service   │  │   │
│  │  │  (现有分析逻辑)  │    │  (爬虫数据获取)  │    │  (文件读写)      │  │   │
│  │  │                  │    │                  │    │                  │  │   │
│  │  │  • analyze_tone()│    │  • get_data()    │    │  • load_json()   │  │   │
│  │  │  • analyze_style()│   │  • get_comments()│    │  • save_chart()  │  │   │
│  │  │  • generate_report()│  │                  │    │                  │  │   │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           数据层                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Chroma DB  │    │  JSON Files │    │  analyses/  │    │  agent_     │  │
│  │  (向量库)   │    │  (爬虫数据) │    │  (分析报告) │    │  sessions/  │  │
│  │             │    │             │    │             │    │  (会话历史) │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 与现有代码的集成点

### 1. 复用现有分析逻辑

```python
# backend/services/agent_tools.py
from services.analysis_service import AnalysisService
from services.crawler_service import CrawlerService

class AgentTools:
    def __init__(self):
        self.analysis = AnalysisService()
        self.crawler = CrawlerService()
    
    def load_data(self, file_path: str) -> dict:
        """调用现有 crawler_service 加载数据"""
        return self.crawler.load_data_file(file_path)
    
    def analyze_tone(self, data: dict) -> dict:
        """调用现有 analysis_service.analyze_tone"""
        return self.analysis.analyze_tone(data)
    
    def analyze_style(self, data: dict) -> dict:
        """调用现有 analysis_service.analyze_style"""
        return self.analysis.analyze_style(data)
    
    def generate_chart(self, analysis_result: dict, chart_type: str) -> dict:
        """调用现有 chart generation 逻辑"""
        return self.analysis.generate_echarts_option(analysis_result, chart_type)
    
    def generate_report(self, sections: list) -> dict:
        """调用现有 report generation 逻辑"""
        return self.analysis.generate_report_content(sections)
```

### 2. LangChain Agent 配置

```python
# backend/services/agent_service.py
from langchain.agents import OpenAIFunctionsAgent, AgentExecutor
from langchain.memory import ConversationBufferMemory
from langchain.schema import SystemMessage

class ReportAgent:
    def __init__(self):
        self.tools = self._setup_tools()
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        self.agent = self._create_agent()
    
    def _setup_tools(self):
        """将现有功能包装为 LangChain Tools"""
        return [
            Tool(
                name="load_data",
                func=AgentTools().load_data,
                description="加载爬虫数据文件"
            ),
            Tool(
                name="analyze_tone",
                func=AgentTools().analyze_tone,
                description="分析口红色调分布"
            ),
            Tool(
                name="analyze_style",
                func=AgentTools().analyze_style,
                description="分析妆容风格占比"
            ),
            Tool(
                name="generate_chart",
                func=AgentTools().generate_chart,
                description="生成数据可视化图表"
            ),
            Tool(
                name="generate_report",
                func=AgentTools().generate_report,
                description="生成分析报告文本"
            ),
        ]
    
    def _create_agent(self):
        """创建 OpenAI Functions Agent"""
        system_message = SystemMessage(content="""
        你是 D2C 口红实验室的 AI 报告助手。
        你的任务是根据用户请求，生成数据分析报告。
        
        可用工具：
        1. load_data - 加载数据
        2. analyze_tone - 分析口红色调
        3. analyze_style - 分析妆容风格
        4. generate_chart - 生成图表
        5. generate_report - 生成报告
        
        执行策略：
        - Plan 模式：只生成计划，不执行
        - Agent 模式：生成计划并自动执行
        - Ask 模式：直接回答，不使用工具
        """)
        
        agent = OpenAIFunctionsAgent.from_llm_and_tools(
            llm=ChatOpenAI(model="gpt-4"),
            tools=self.tools,
            system_message=system_message
        )
        
        return AgentExecutor.from_agent_and_tools(
            agent=agent,
            tools=self.tools,
            memory=self.memory,
            verbose=True,
            callbacks=[StepCallbackHandler()]  # 自定义回调更新前端状态
        )
```

### 3. 前端与后端交互流程

```
用户输入
  │
  ▼
POST /api/agent/chat
  │
  ▼
┌─────────────────┐
│ 判断模式        │
│ • Ask → 直接回答│
│ • Plan → 生成计划│
│ • Agent → 执行  │
└─────────────────┘
  │
  ▼ (Agent/Plan 模式)
生成执行计划 (JSON)
  │
  ▼ WebSocket 推送
前端显示步骤列表
  │
  ▼ 用户点击"开始执行"
POST /api/agent/execute
  │
  ▼
逐步骤执行
  │
  ├─▶ load_data ──▶ 回调前端更新状态
  ├─▶ analyze_tone ──▶ 回调前端显示预览
  ├─▶ generate_chart ──▶ 回调前端显示图表
  └─▶ generate_report ──▶ 回调前端显示文本
  │
  ▼
执行完成
  │
  ▼
前端显示"查看报告"按钮
```

### 4. 数据流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  爬虫数据    │────▶│  Agent工具  │────▶│  分析结果    │
│  JSON文件   │     │  (复用现有)  │     │  (中间数据)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                       ┌────────────────────────┘
                       ▼
              ┌─────────────────┐
              │   步骤预览存储   │
              │  agent_sessions/│
              │  step_results/  │
              └────────┬────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
  ┌─────────┐    ┌─────────┐    ┌─────────┐
  │  ECharts │    │  JSON   │    │ Markdown│
  │  图表    │    │  数据   │    │  报告   │
  └─────────┘    └─────────┘    └─────────┘
```

### 5. 关键接口定义

```python
# API 请求/响应模型

class ChatRequest(BaseModel):
    message: str
    mode: Literal["ask", "plan", "agent"]
    session_id: str
    file_path: Optional[str]

class PlanResponse(BaseModel):
    session_id: str
    plan: List[Step]
    
class Step(BaseModel):
    id: str
    name: str
    type: Literal["load_data", "analyze_tone", "analyze_style", 
                   "generate_chart", "generate_report"]
    status: Literal["pending", "running", "completed", "error"]
    result: Optional[dict]
    preview: Optional[dict]  # 用于前端预览

class ExecuteRequest(BaseModel):
    session_id: str
    step_ids: Optional[List[str]]  # 指定执行哪些步骤，None 表示全部

# WebSocket 消息
class StepUpdate(BaseModel):
    type: "step_update"
    step_id: str
    status: str
    preview: Optional[dict]
```

## 与现有代码的改动点

### 需要新增的文件
```
backend/
├── api/
│   └── agent.py              # Agent API 路由
├── services/
│   ├── agent_service.py      # LangChain Agent 封装
│   ├── agent_tools.py        # 工具函数（包装现有逻辑）
│   └── agent_callbacks.py    # 步骤执行回调
├── models/
│   └── agent.py              # Agent 相关数据模型
└── db/
    └── agent_db.py           # 会话历史存储

frontend/src/pages/
└── ReportAgent.jsx           # 已存在，需要重构布局
```

### 需要修改的现有文件
```
backend/services/
├── analysis_service.py       # 暴露更多内部方法给 Agent
└── crawler_service.py        # 添加数据加载接口

frontend/src/services/
└── api.js                    # 添加 Agent 相关 API
```

### 不需要改动的文件
```
backend/services/
├── llm_service.py            # 完全复用
├── knowledge_service.py      # 完全复用
└── chart_service.py          # 完全复用

crawler/                      # 完全复用
└── MediaCrawler/
```

## 总结

**核心思路**：
1. **Agent 是编排层**，不是替代层 - 复用所有现有分析逻辑
2. **LangChain 负责**：计划生成、工具选择、对话记忆
3. **现有代码负责**：具体的数据分析、图表生成、报告撰写
4. **前端负责**：展示对话、执行计划、步骤预览

**优势**：
- 不破坏现有功能
- 渐进式改造
- 用户可选择使用 Chain 或 Agent
