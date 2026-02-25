import json
from openai import OpenAI
from pathlib import Path

client = OpenAI(
    api_key="sk-guu0pkgYYHPkkNCjOXrnovpwVOQ0Vzw9S91FBPr8bzYnumzr",
    base_url="https://api.chatanywhere.tech/v1"
)

KNOWLEDGE_FILE = "./output/makeup_knowledge.json"

def load_existing_knowledge():
    if Path(KNOWLEDGE_FILE).exists():
        with open(KNOWLEDGE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"妆容风格": {}, "色调知识": {}, "质地知识": {}, "场景知识": {}}

def save_knowledge(data):
    Path(KNOWLEDGE_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(KNOWLEDGE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def generate_batch(batch_num, existing_items):
    existing_list = "\n".join(existing_items) if existing_items else "无"

    prompt = f"""
你是美妆专家。请生成10条美妆知识库条目。

已有条目不要重复：
{existing_list}

严格按照以下JSON格式生成，不能改变任何字段名称，只返回JSON：

{{
  "妆容风格": {{
    "风格名称": {{
      "定义": "50字以内描述",
      "特征": ["特征1", "特征2", "特征3"],
      "口红色调": ["色调1", "色调2"],
      "口红质地": ["质地1", "质地2"],
      "饱和度": "高饱和/中饱和/低饱和",
      "适合肤色": ["黄一白", "黄二白"],
      "适合场景": ["场景1", "场景2"]
    }}
  }},
  "色调知识": {{
    "色调名称": {{
      "定义": "50字以内描述",
      "色温": "暖调/冷调/中性",
      "饱和度": "高/中/低",
      "显白度": "高/中/低",
      "适合肤色": ["黄皮", "白皮"],
      "适合妆容": ["妆容风格1", "妆容风格2"],
      "代表色号": ["品牌 色号", "品牌 色号"]
    }}
  }},
  "质地知识": {{
    "质地名称": {{
      "定义": "50字以内描述",
      "特点": "简短描述",
      "优点": ["优点1", "优点2"],
      "缺点": ["缺点1", "缺点2"],
      "适合场景": ["场景1", "场景2"],
      "适合季节": ["春夏", "秋冬"]
    }}
  }},
  "场景知识": {{
    "场景名称": {{
      "定义": "50字以内描述",
      "特点": "简短描述",
      "推荐妆容": ["妆容风格1"],
      "推荐色调": ["色调1", "色调2"],
      "推荐质地": ["质地1"],
      "推荐饱和度": "高饱和/中饱和/低饱和"
    }}
  }}
}}

要求：
1. 严格生成10条，分配建议：妆容风格3条，色调知识3条，质地知识2条，场景知识2条
2. 使用真实存在的中文美妆术语，基于你的专业知识，不要编造
3. 妆容风格应该是当前流行的风格名称，口红色调应该是实际存在的色号描述
4. 所有字段必须完整填写，不能缺失
5. 字段名称不能更改
6. 每次生成的内容必须不同，充分利用你的美妆领域知识
"""

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "你是专业美妆顾问，精通口红色号、妆容风格、肤色匹配。"},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )

    result = response.choices[0].message.content.strip()

    if result.startswith("```"):
        result = result.split("```")[1]
        if result.startswith("json"):
            result = result[4:]

    return json.loads(result)

def merge_knowledge(existing, new_data):
    for category, items in new_data.items():
        if category not in existing:
            existing[category] = {}
        existing[category].update(items)
    return existing

def get_all_items(data):
    items = []
    for category, entries in data.items():
        items.extend(entries.keys())
    return items

def main():
    print("美妆知识库生成器")

    knowledge = load_existing_knowledge()
    existing_items = get_all_items(knowledge)

    batch_num = len(existing_items) // 10 + 1

    print(f"当前已有 {len(existing_items)} 条知识")
    print(f"开始生成第 {batch_num} 批，共10条")

    new_data = generate_batch(batch_num, existing_items)
    knowledge = merge_knowledge(knowledge, new_data)
    save_knowledge(knowledge)

    print("\n生成完成，新增内容：")
    for category, items in new_data.items():
        if items:
            print(f"\n{category}")
            for name in items.keys():
                print(f"  {name}")

    total = len(get_all_items(knowledge))
    print(f"\n知识库总计：{total} 条")
    print(f"保存位置：{KNOWLEDGE_FILE}")

if __name__ == "__main__":
    main()
