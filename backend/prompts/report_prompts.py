"""
报告生成相关的 Prompt 模板
"""

from langchain_core.prompts import PromptTemplate

# 报告骨架生成 Prompt（只生成结构，不生成板块内容）
REPORT_SKELETON_TEMPLATE = PromptTemplate(
    input_variables=["data_summary"],
    template="""你是专业的数据分析报告专家。根据统计数据生成报告骨架（不包含板块内容）。

【统计数据】
{data_summary}

【任务】
1. 自主决定报告需要 3-5 个分析板块
2. 为每个板块选择合适的图表类型（每个板块 1-2 个图表）
3. 生成报告标题和摘要
4. **不要生成板块内容**（content 字段留空）

【可用图表类型】
- pie: 饼图（适合占比分布）
- bar: 柱状图（适合排名对比）
- scatter: 散点图/词云（适合关键词分布）
- radar: 雷达图（适合多维度对比分析）
- heatmap: 热力图（适合交叉分析）
- sankey: 桑基图（适合流转关系展示）
- gauge: 仪表盘（适合单指标展示）
- funnel: 漏斗图（适合层级递减展示）
- line: 折线图（适合趋势分析）

【返回格式（严格 JSON）】
{{
  "report_title": "AI生成的报告标题",
  "summary": "AI生成的摘要段落（3-5句话，总结核心发现）",
  "sections": [
    {{
      "section_id": "section-1",
      "title": "板块标题",
      "data_field": "使用哪个统计字段（styles/colors/keywords）",
      "charts": [
        {{
          "chart_type": "图表类型",
          "chart_title": "图表标题",
          "description": "图表说明",
          "data_field": "使用哪个统计字段"
        }}
      ],
      "order": 1
    }}
  ]
}}

【要求】
1. 只返回 JSON，不要任何其他文字
2. 不要生成 content 字段！板块内容会单独生成
3. 每个板块至少1个图表，最多2个图表
4. 直接输出 JSON，不要 markdown 代码块标记
"""
)

# 板块内容生成 Prompt
SECTION_CONTENT_TEMPLATE = PromptTemplate(
    input_variables=["section_title", "section_data"],
    template="""你是专业的美妆数据分析师。为报告板块生成 2-3 段专业分析文字。

【板块标题】
{section_title}

【相关数据】
{section_data}

【要求】
1. 生成 2-3 段专业分析文字
2. 包含数据洞察、趋势分析、建议
3. 语言专业但易懂
4. 直接输出文本，不要 JSON 格式，不要 markdown 标记
5. 段落之间用两个换行符分隔
"""
)

# 图表配置生成 Prompt
CHART_GENERATION_TEMPLATE = PromptTemplate(
    input_variables=["chart_type", "chart_title", "description", "data_summary", "color_scheme", "schema"],
    template="""你是专业的数据可视化工程师。生成 ECharts {chart_type} 配置。

【图表信息】
- 类型: {chart_type}
- 标题: {chart_title}
- 说明: {description}

【数据】
{data_summary}

【配色】
{color_scheme}

【Schema】
{schema}

【要求】
1. 严格按照 Schema 生成完整的 ECharts option
2. 直接输出完整 JSON，从 {{ 开始到 }} 结束
3. 不要任何解释、注释、markdown 标记
4. 确保 JSON 格式正确且完整
5. 根据图表类型设置合适的样式和交互
6. 禁止使用JavaScript代码（如function、箭头函数=>），只能用静态JSON值
7. series[0].data 必须包含实际数据，不能是空数组[]
8. color配置必须是字符串数组，如["#ff6b9d", "#5f27cd"]，不能是function

请生成配置：
"""
)
