# D2C 口红实验室 - 系统架构

当前实际使用的架构，不含已废弃的 MediaCrawler、独立 8080 爬虫等。

---

## 1. 详细系统架构图

下图展示从用户到前端、后端、RAG、爬虫与存储的完整模块与依赖关系。可在 [Mermaid Live](https://mermaid.live) 或 VS Code（Mermaid 插件）中查看渲染效果。

```mermaid
flowchart TB
    subgraph UserLayer["👤 用户层"]
        User["用户浏览器"]
    end

    subgraph Frontend["🖥️ 前端 · React + Vite :5173"]
        direction TB
        subgraph Pages["页面"]
            P1["/login 登录"]
            P2["/ 分析工作台"]
            P3["/report 趋势报告"]
            P4["/data 数据表"]
            P5["/users 职员管理"]
            P6["/rd 色彩设计"]
            P7["/market 虚拟试色"]
            P8["/operation 内容生成"]
            P9["/community 企业社群"]
        end
        subgraph FrontCore["前端核心"]
            Layout["Layout 布局"]
            APIJS["services/api.js"]
            Router["React Router 7"]
        end
        Pages --> Layout
        Router --> Pages
        APIJS --> Router
    end

    subgraph Gateway["🔗 统一入口"]
        CORS["CORS"]
        APIBase["/api · FastAPI :8000"]
    end

    subgraph Backend["⚙️ 后端 · FastAPI"]
        direction TB
        subgraph Routes["API 路由"]
            R1["/auth 登录·JWT"]
            R2["/analysis 分析·报告·历史"]
            R3["/community 社群·帖子·评论"]
            R4["/crawler 爬虫启停·日志"]
            R5["/data 文件列表·预览"]
            R6["/users 职员 CRUD"]
        end
        subgraph Services["服务层"]
            S1["langchain_service"]
            S2["crawler_service"]
            S3["analysis 业务逻辑"]
        end
        Routes --> Services
    end

    subgraph RAG["🧠 AI / RAG 管线"]
        direction LR
        K1["knowledge/raw\n美妆知识 JSON"]
        V["vectorize_knowledge.py"]
        K2["Chroma 向量库"]
        LC["LangChain\n检索+编排"]
        O["OpenAI\nGPT-4o-mini/4o"]
        K1 --> V --> K2
        LC --> K2
        LC --> O
    end

    subgraph Crawler["🕷️ 爬虫 · xhs_simple"]
        direction TB
        CS["crawler_service\n子进程调度"]
        PW["Playwright\nChromium 无头"]
        HX["httpx\n带签名请求"]
        XS["xhs_sign\nplaywright_sign"]
        CO["crawler_output\nxhs/json/*.json"]
        CS --> PW
        CS --> HX
        PW --> XS
        HX --> XS
        PW --> CO
        HX --> CO
    end

    subgraph Storage["💾 存储"]
        PG[("PostgreSQL\n用户·部门·社群·分析任务")]
        OUT[("crawler_output/\n笔记·评论 JSON")]
        UPLOAD[("community_uploads/\n上传文件")]
    end

    User --> Frontend
    Frontend --> CORS --> APIBase
    APIBase --> Routes
    R2 --> S1
    R2 --> S3
    R4 --> S2
    R5 --> OUT
    S1 --> RAG
    S3 --> RAG
    S2 --> Crawler
    Routes --> PG
    Routes --> UPLOAD
    Crawler --> OUT
```

### 数据流总览（请求从前端到存储）

```mermaid
flowchart LR
    subgraph 请求方向
        A["前端\napi.js"] -->|"HTTPS/HTTP"| B["FastAPI\n/api"]
        B --> C["路由\nauth/analysis/..."]
        C --> D["服务层\nLangChain/Crawler/..."]
        D --> E["存储\nPG / 文件"]
    end
```

---

## 2. 整体架构（简化）

```mermaid
flowchart TB
    subgraph Client["客户端"]
        SPA["React SPA (Vite :5173)"]
    end

    subgraph Backend["后端 FastAPI :8000"]
        API["REST /api"]
        Auth["auth"]
        Analysis["analysis"]
        Community["community"]
        Crawler["crawler"]
        Data["data"]
        Users["users"]
        API --> Auth & Analysis & Community & Crawler & Data & Users
    end

    subgraph AI["AI / RAG"]
        LC["LangChain"]
        Chroma["Chroma"]
        OpenAI["OpenAI"]
        LC --> Chroma & OpenAI
    end

    subgraph Storage["存储"]
        PG[("PostgreSQL")]
        Out["crawler_output/"]
        Uploads["community_uploads/"]
    end

    subgraph CrawlerProc["爬虫 xhs_simple"]
        Playwright["Playwright"]
        Httpx["httpx"]
        Sign["xhs_sign / playwright_sign"]
        Playwright --> Sign
        Httpx --> Sign
        CrawlerProc --> Out
    end

    SPA --> API
    Analysis --> LC
    Backend --> PG & Out & Uploads
    Crawler --> CrawlerProc
    Data --> Out
```

- 前端只连一个后端地址（8000），爬虫与分析共用该服务。
- 爬虫为 xhs_simple：Playwright 负责搜索与签名生成，httpx 负责带签名请求评论；结果写入 `backend/data/crawler_output/`。

---

## 3. 笔记分析数据流

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as React 前端
    participant API as FastAPI
    participant RAG as LangChain RAG
    participant C as Chroma
    participant O as OpenAI

    U->>F: 选择数据 / 发起分析
    F->>API: POST /api/analysis/analyze
    API->>API: 读取 crawler_output JSON
    API->>RAG: 笔记 + 知识库检索
    RAG->>C: 向量检索
    C-->>RAG: 相关文档
    RAG->>O: 提取 + 报告
    O-->>RAG: 结果
    RAG-->>API: 分析/报告
    API->>API: 持久化（DB / 结果文件）
    API-->>F: 结果
    F->>F: ECharts 展示
```

---

## 4. 爬虫调用链

```mermaid
flowchart LR
    A["前端 启动爬虫"] --> B["POST /api/crawler/start"]
    B --> C["crawler_service"]
    C --> D["xhs_simple 子进程"]
    D --> E["Playwright 搜索笔记"]
    D --> F["httpx + 签名 拉评论"]
    E --> G["crawler_output/xhs/json/"]
    F --> G
    G --> H["/api/data 文件列表"]
    H --> I["分析工作台 选择文件"]
```

---

## 5. 部署架构（Railway + Vercel）

```mermaid
flowchart LR
    User["用户"] --> Vercel["Vercel 前端"]
    Vercel -->|VITE_ANALYSIS_API_BASE| Railway["Railway 后端 :8000"]
    Railway --> PG[("PostgreSQL")]
    Railway --> OpenAI["OpenAI API"]
```

- Vercel：托管 frontend 静态资源（Vite build）。
- Railway：运行主后端（含 xhs_simple 爬虫），通过 `DATABASE_URL` 连 PostgreSQL。

---

## 6. 技术难点

### 6.1 爬虫与反爬（xhs_simple）

- **签名与风控**：小红书接口依赖前端生成的签名（如 x-s、x-t 等），算法混淆且常更新；需在 Playwright 里复现页面 JS（如 `window.mnsv2()`）或逆向为纯 Python（xhs_sign），并随平台更新维护。
- **稳定性**：Cookie 过期、限流、封 IP 会导致抓取失败，需要登录刷新、重试与限速策略，并对用户有明确提示。
- **进程模型**：Playwright 同步 API 与 FastAPI 的 asyncio 冲突，当前用**子进程**跑爬虫，进程间通过队列传日志/状态，设计与调试都比同进程异步复杂。

### 6.2 RAG 与 AI 管线

- **效果**：检索是否命中、Prompt 设计、模型选型（4o-mini / 4o）会直接影响分析质量与报告可读性；需反复调知识库切分、向量维度、Top-K 与提示词。
- **成本与延迟**：大量笔记 + 长上下文会拉高 Token 消耗与响应时间，需要摘要、分片、缓存或异步任务，避免超时与费用激增。
- **结构化输出**：让 LLM 稳定输出 JSON（如 ECharts 配置、报告结构）需要约束格式（schema、示例），并做解析失败时的降级或重试。

### 6.3 前后端与部署

- **跨域与鉴权**：生产环境需正确配置 CORS（如 `FRONTEND_ORIGIN`）与 JWT 校验，避免未授权访问与跨域报错。
- **环境差异**：本地与 Railway/Vercel 在端口、环境变量、文件系统（无持久盘）上不一致；爬虫在 Railway 上需 Playwright Chromium 及依赖，镜像体积与构建时间会上升。
- **前端体验**：分析/爬虫为长耗时操作，需轮询或 SSE（如 `/crawler/logs/stream`）展示进度与日志，并处理断网、刷新后的状态恢复。

### 6.4 数据与一致性

- **多源数据**：分析结果可能写 DB（分析任务、历史）与本地文件（如详细结果 JSON），需约定「哪份为准」、清理策略与备份方式。
- **大结果集**：报告、图表数据较大时，接口需分页或流式返回，避免单次响应过大导致超时或前端卡顿。

### 6.5 安全与合规

- **密钥**：`OPENAI_API_KEY`、`JWT_SECRET`、`DATABASE_URL` 不能进前端或日志，需用环境变量并在生产环境严格配置。
- **爬虫合规**：遵守目标站点 robots.txt 与使用条款，控制频率与用途，避免法律与伦理风险。
