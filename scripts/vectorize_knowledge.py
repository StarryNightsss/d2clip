#!/usr/bin/env python3
"""
知识库向量化脚本（使用 uv 运行）

命令：uv run python scripts/vectorize_knowledge.py
将美妆知识库 JSON 文件转换为向量数据库
"""

import json
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from langchain_core.documents import Document
from backend.services.langchain_service import langchain_service
from backend.config import settings

def load_knowledge_json():
    """加载知识库JSON"""
    knowledge_file = settings.KNOWLEDGE_DIR / "makeup_knowledge.json"

    if not knowledge_file.exists():
        # 尝试从 analysis 目录加载
        knowledge_file = settings.BASE_DIR / "analysis" / "output" / "makeup_knowledge.json"

    if not knowledge_file.exists():
        raise FileNotFoundError(f"知识库文件不存在: {knowledge_file}")

    with open(knowledge_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def convert_to_documents(knowledge_data: dict) -> list[Document]:
    """将知识库转换为 LangChain Document 格式"""
    documents = []

    # 遍历知识库的每个类别
    for category, items in knowledge_data.items():
        if category in ["格式说明", "示例"]:
            continue

        for name, details in items.items():
            # 构建文档内容
            content_parts = [f"【{category}】{name}"]

            if isinstance(details, dict):
                # 添加定义
                if "定义" in details:
                    content_parts.append(f"定义：{details['定义']}")

                # 添加其他字段
                for key, value in details.items():
                    if key == "定义":
                        continue

                    if isinstance(value, list):
                        content_parts.append(f"{key}：{', '.join(str(v) for v in value)}")
                    else:
                        content_parts.append(f"{key}：{value}")

            content = "\n".join(content_parts)

            # 创建文档
            doc = Document(
                page_content=content,
                metadata={
                    "category": category,
                    "name": name,
                    "source": "makeup_knowledge"
                }
            )

            documents.append(doc)

    return documents

def main():
    print("🚀 开始向量化知识库...")

    # 1. 加载知识库
    print("\n📖 加载知识库...")
    knowledge_data = load_knowledge_json()

    total_items = sum(
        len(items) for category, items in knowledge_data.items()
        if category not in ["格式说明", "示例"]
    )
    print(f"   共 {total_items} 条知识")

    # 2. 转换为文档
    print("\n📝 转换为文档格式...")
    documents = convert_to_documents(knowledge_data)
    print(f"   生成 {len(documents)} 个文档")

    # 3. 向量化并存储
    print("\n🔢 向量化并存储到 Chroma...")
    vectorstore = langchain_service.create_vectorstore(documents)

    # 4. 测试检索
    print("\n🔍 测试语义检索...")
    test_queries = [
        "适合黄皮的口红色调",
        "哑光质地的特点",
        "日常妆容推荐"
    ]

    for query in test_queries:
        results = langchain_service.similarity_search(query, k=3)
        print(f"\n   查询: {query}")
        print(f"   结果: {results[0].page_content[:100]}..." if results else "   无结果")

    print("\n✅ 向量化完成！")
    print(f"   向量数据库位置: {settings.CHROMA_DB_PATH}")
    print("\n💡 提示：运行 python -m backend.main 启动后端服务")

if __name__ == "__main__":
    main()
