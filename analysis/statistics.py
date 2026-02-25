import json
from collections import Counter
from pathlib import Path

def load_analyzed_data(file_path):
    """加载分析结果"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_statistics(analyzed_notes):
    """统计聚合分析"""

    # 统计妆容风格
    makeup_styles = []
    for note in analyzed_notes:
        styles = note['analysis'].get('makeup_style', [])
        makeup_styles.extend(styles)

    style_counter = Counter(makeup_styles)

    # 统计口红色调
    colors = []
    for note in analyzed_notes:
        color = note['analysis']['lipstick_features'].get('color', '')
        if color and color != '未知':
            colors.append(color)

    color_counter = Counter(colors)

    # 统计关键词
    keywords = []
    for note in analyzed_notes:
        kws = note['analysis'].get('keywords', [])
        keywords.extend(kws)

    keyword_counter = Counter(keywords)

    # 统计质地
    textures = []
    for note in analyzed_notes:
        texture = note['analysis']['lipstick_features'].get('texture', '')
        if texture and texture != '未知':
            textures.append(texture)

    texture_counter = Counter(textures)

    # 统计场景
    scenes = []
    for note in analyzed_notes:
        scene_list = note['analysis'].get('scene', [])
        scenes.extend(scene_list)

    scene_counter = Counter(scenes)

    # 生成统计结果
    statistics = {
        "overview": {
            "total_notes": len(analyzed_notes),
            "analysis_date": "2026-02-18",
            "data_source": "小红书"
        },
        "makeup_styles": {
            name: {
                "count": count,
                "percentage": round(count / len(analyzed_notes) * 100, 1)
            }
            for name, count in style_counter.most_common(10)
        },
        "lipstick_colors": {
            name: count
            for name, count in color_counter.most_common(10)
        },
        "keywords": {
            name: count
            for name, count in keyword_counter.most_common(20)
        },
        "textures": {
            name: count
            for name, count in texture_counter.most_common()
        },
        "scenes": {
            name: count
            for name, count in scene_counter.most_common()
        }
    }

    return statistics

def save_statistics(statistics, output_path):
    """保存统计结果"""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(statistics, f, ensure_ascii=False, indent=2)

    return output_path

if __name__ == "__main__":
    # 测试
    analyzed_data = load_analyzed_data("./output/analyzed_notes.json")
    stats = generate_statistics(analyzed_data)
    output = save_statistics(stats, "./output/statistics.json")
    print(f"统计完成，保存到: {output}")
    print(f"共分析 {stats['overview']['total_notes']} 条笔记")
