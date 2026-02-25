import json
from pathlib import Path

def load_notes(file_path):
    """加载小红书笔记数据"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_results(data, output_path):
    """保存分析结果"""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return output_path
