from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ==================== 笔记分析相关 ====================

class NoteAnalysisRequest(BaseModel):
    """笔记分析请求"""
    data_file: str = Field(..., description="数据文件路径（相对于crawler/MediaCrawler/data/）")
    limit: Optional[int] = Field(None, description="分析数量限制，None表示全部")
    platform: str = Field(default="xhs", description="平台: xhs/dy/ks/bili/wb/tieba/zhihu")

class LipstickFeatures(BaseModel):
    """口红特征"""
    color: str = Field(default="未知", description="色调")
    texture: str = Field(default="未知", description="质地")
    saturation: str = Field(default="未知", description="饱和度")
    tone: str = Field(default="未知", description="色温")

class NoteAnalysisResult(BaseModel):
    """单条笔记分析结果"""
    note_id: str
    title: str
    makeup_style: List[str] = Field(default_factory=list, description="妆容风格")
    lipstick_features: LipstickFeatures
    keywords: List[str] = Field(default_factory=list, description="关键词")
    scene: List[str] = Field(default_factory=list, description="使用场景")

class StyleStatistics(BaseModel):
    """妆容风格统计"""
    name: str
    count: int
    percentage: float

class ColorStatistics(BaseModel):
    """色调统计"""
    name: str
    count: int
    percentage: float

class KeywordStatistics(BaseModel):
    """关键词统计"""
    name: str
    count: int

class AnalysisStatistics(BaseModel):
    """分析统计数据"""
    total_notes: int = Field(..., description="总笔记数")
    analyzed_notes: int = Field(..., description="成功分析数")
    failed_notes: int = Field(..., description="失败数")

    # 妆容风格分布
    styles: List[StyleStatistics] = Field(default_factory=list)

    # 色调分布
    colors: List[ColorStatistics] = Field(default_factory=list)

    # 关键词频率
    keywords: List[KeywordStatistics] = Field(default_factory=list)

class EChartsOption(BaseModel):
    """ECharts 完整配置（标准 option 格式）"""
    title: Optional[dict] = Field(None, description="标题配置")
    tooltip: Optional[dict] = Field(None, description="提示框配置")
    legend: Optional[dict] = Field(None, description="图例配置")
    grid: Optional[dict] = Field(None, description="网格配置")
    xAxis: Optional[dict] = Field(None, description="X轴配置")
    yAxis: Optional[dict] = Field(None, description="Y轴配置")
    series: List[dict] = Field(default_factory=list, description="系列数据")
    color: Optional[List[str]] = Field(None, description="调色盘颜色列表")

    class Config:
        extra = "allow"  # 允许额外字段（ECharts 配置很灵活）

class ChartData(BaseModel):
    """图表数据 - 返回完整的 ECharts option"""
    pie_chart: EChartsOption = Field(..., description="饼图完整配置（ECharts option）")
    bar_chart: EChartsOption = Field(..., description="柱状图完整配置（ECharts option）")
    word_cloud: EChartsOption = Field(..., description="词云图完整配置（ECharts option）")

class ChartSpec(BaseModel):
    """图表规格（骨架阶段，不含配置）"""
    chart_type: str = Field(..., description="图表类型：pie/bar/scatter")
    chart_title: str = Field(..., description="图表标题")
    description: str = Field(default="", description="图表说明")
    data_field: str = Field(..., description="使用哪个统计字段：styles/colors/keywords")

class ReportSectionSkeleton(BaseModel):
    """报告章节骨架（不含内容和图表配置）"""
    section_id: str = Field(..., description="章节ID")
    title: str = Field(..., description="章节标题")
    data_field: str = Field(..., description="使用哪个统计字段")
    charts: List[ChartSpec] = Field(default_factory=list, description="图表规格列表")
    order: int = Field(..., description="章节顺序")

class ReportSkeletonOutput(BaseModel):
    """报告骨架输出（用于 OutputParser）"""
    report_title: str
    summary: str
    sections: List[ReportSectionSkeleton]

class ChartConfig(BaseModel):
    """单个图表配置（动态）"""
    chart_type: str = Field(..., description="图表类型：pie/bar/radar/heatmap/sankey/gauge/funnel/line/scatter")
    chart_title: str = Field(..., description="图表标题")
    description: Optional[str] = Field(None, description="图表说明")
    echarts_option: dict = Field(..., description="完整的 ECharts option 配置")

class ReportSection(BaseModel):
    """报告章节（AI 动态生成）"""
    section_id: str = Field(..., description="章节ID")
    title: str = Field(..., description="章节标题")
    content: str = Field(..., description="章节分析文本（AI 撰写）")
    charts: List[ChartConfig] = Field(default_factory=list, description="该章节的图表列表")
    order: int = Field(..., description="章节顺序")

class DynamicReport(BaseModel):
    """动态生成的报告结构"""
    report_title: str = Field(..., description="报告标题（AI 生成）")
    summary: str = Field(..., description="报告摘要（AI 生成）")
    sections: List[ReportSection] = Field(default_factory=list, description="报告章节列表（AI 决定数量和内容）")
    generated_at: datetime = Field(default_factory=datetime.now)

class AnalysisResponse(BaseModel):
    """完整分析响应"""
    analysis_id: str = Field(..., description="分析任务ID")
    status: str = Field(..., description="状态：success/failed")
    created_at: datetime = Field(default_factory=datetime.now)

    # 原始分析结果
    results: List[NoteAnalysisResult] = Field(default_factory=list)

    # 统计数据
    statistics: AnalysisStatistics

    # 动态生成的报告
    report: Optional[DynamicReport] = Field(None, description="AI 动态生成的报告结构")

    # 兼容旧版（可选）
    charts: Optional[dict] = Field(None, description="旧版图表数据（兼容）")

# ==================== 报告生成相关 ====================

class ReportGenerateRequest(BaseModel):
    """报告生成请求"""
    analysis_id: str = Field(..., description="分析任务ID")
    report_type: str = Field(default="full", description="报告类型：full/summary")

class ReportResponse(BaseModel):
    """报告响应"""
    report_id: str
    title: str
    summary: str
    sections: List[ReportSection]
    created_at: datetime = Field(default_factory=datetime.now)
