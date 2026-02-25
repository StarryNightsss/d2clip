import json
import matplotlib.pyplot as plt
from wordcloud import WordCloud
from pathlib import Path
import matplotlib
matplotlib.use('Agg')

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'STHeiti']
plt.rcParams['axes.unicode_minus'] = False

def load_statistics(file_path):
    """加载统计数据"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_style_pie_chart(statistics, output_path):
    """生成妆容风格饼图"""
    styles = statistics['makeup_styles']

    labels = list(styles.keys())
    sizes = [data['percentage'] for data in styles.values()]

    fig, ax = plt.subplots(figsize=(10, 8))
    colors = ['#ff9999', '#66b3ff', '#99ff99', '#ffcc99', '#ff99cc', '#c2c2f0']

    wedges, texts, autotexts = ax.pie(
        sizes,
        labels=labels,
        autopct='%1.1f%%',
        colors=colors,
        startangle=90
    )

    for text in texts:
        text.set_fontsize(12)
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_fontsize(10)
        autotext.set_weight('bold')

    ax.set_title('妆容风格分布', fontsize=16, pad=20)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    return output_path

def generate_color_bar_chart(statistics, output_path):
    """生成口红色调柱状图"""
    colors = statistics['lipstick_colors']

    labels = list(colors.keys())
    values = list(colors.values())

    fig, ax = plt.subplots(figsize=(12, 6))

    bars = ax.barh(labels, values, color='#ff6b6b')

    ax.set_xlabel('提及次数', fontsize=12)
    ax.set_title('口红色调热度', fontsize=16, pad=20)
    ax.grid(axis='x', alpha=0.3)

    for bar in bars:
        width = bar.get_width()
        ax.text(width, bar.get_y() + bar.get_height()/2,
                f'{int(width)}',
                ha='left', va='center', fontsize=10)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    return output_path

def generate_wordcloud(statistics, output_path):
    """生成关键词词云"""
    keywords = statistics['keywords']

    wordcloud = WordCloud(
        width=1200,
        height=600,
        background_color='white',
        font_path='./docs/STZHONGS.TTF',
        colormap='Set2',
        relative_scaling=0.5,
        min_font_size=10
    ).generate_from_frequencies(keywords)

    fig, ax = plt.subplots(figsize=(15, 8))
    ax.imshow(wordcloud, interpolation='bilinear')
    ax.axis('off')
    ax.set_title('高频关键词', fontsize=16, pad=20)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    return output_path

def generate_all_charts(statistics_path, output_dir):
    """生成所有图表"""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    statistics = load_statistics(statistics_path)

    charts = {}

    print("生成妆容风格饼图...")
    charts['style_pie'] = generate_style_pie_chart(
        statistics,
        output_dir / "makeup_styles_pie.png"
    )

    print("生成口红色调柱状图...")
    charts['color_bar'] = generate_color_bar_chart(
        statistics,
        output_dir / "lipstick_colors_bar.png"
    )

    print("生成关键词词云...")
    charts['wordcloud'] = generate_wordcloud(
        statistics,
        output_dir / "keywords_wordcloud.png"
    )

    return charts

if __name__ == "__main__":
    charts = generate_all_charts(
        "./output/statistics.json",
        "./output/charts"
    )
    print(f"\n图表生成完成:")
    for name, path in charts.items():
        print(f"  {name}: {path}")
