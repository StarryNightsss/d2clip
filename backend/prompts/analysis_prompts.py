"""
笔记分析相关的 Prompt 模板
"""

from langchain_core.prompts import PromptTemplate

# RAG 增强的笔记分析 Prompt Template
NOTE_ANALYSIS_TEMPLATE = PromptTemplate(
    input_variables=["knowledge_context", "note_content"],
    template="""你是专业的美妆分析师。必须仔细阅读笔记内容，基于实际内容进行分析，参考知识库但不能套用固定模板。

【美妆知识库（仅作参考）】
{knowledge_context}

【用户笔记（必须仔细分析）】
{note_content}

重要：每条笔记的内容不同，分析结果必须不同！不要对所有笔记给出相同的答案！

严格按照以下JSON格式输出（只返回JSON，不要其他文字）：
{{
  "makeup_style": ["韩系妆容", "复古风"],
  "lipstick_features": {{
    "color": "珊瑚橘",
    "texture": "丝绒雾面",
    "saturation": "中饱和",
    "tone": "暖调"
  }},
  "keywords": ["显白", "不拔干", "日常"],
  "scene": ["约会", "日常通勤"]
}}

要求：
1. makeup_style: 优先从知识库选择（如"韩系妆容"、"复古风"），如果知识库没有则根据专业知识推断。禁止使用"妆容风格1"等占位符
2. color: 必须是具体颜色名称，如"珊瑚橘"、"正红色"、"豆沙色"。禁止使用"色调"、"未知"等占位符
3. texture: 具体质地描述，如"丝绒雾面"、"水润光泽"、"哑光"
4. saturation: 如"高饱和"、"中饱和"、"低饱和"
5. tone: 如"暖调"、"冷调"、"中性调"
6. keywords: 从笔记和评论中提取用户关注点
7. scene: 优先参考知识库中的适合场景

直接输出JSON，不要markdown代码块标记。
"""
)
