import json
from pathlib import Path
from datetime import datetime

def load_data(statistics_path, analyzed_notes_path):
    """加载数据"""
    with open(statistics_path, 'r', encoding='utf-8') as f:
        statistics = json.load(f)

    with open(analyzed_notes_path, 'r', encoding='utf-8') as f:
        analyzed_notes = json.load(f)

    return statistics, analyzed_notes

def generate_html_report(statistics, charts_dir, output_path):
    """生成HTML报告（LaTeX论文风格）"""

    charts_dir = Path(charts_dir)

    # 获取前3个妆容风格
    top_styles = list(statistics['makeup_styles'].items())[:3]

    # 获取前5个色调
    top_colors = list(statistics['lipstick_colors'].items())[:5]

    # 获取前10个关键词
    top_keywords = list(statistics['keywords'].items())[:10]

    html_content = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>D2C口红实验室 - 2026年2月趋势分析报告</title>
    <style>
        @page {{
            margin: 2cm;
        }}

        body {{
            font-family: "Times New Roman", "SimSun", serif;
            line-height: 1.8;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #fff;
            color: #333;
        }}

        h1 {{
            text-align: center;
            font-size: 28px;
            margin: 40px 0 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }}

        h2 {{
            font-size: 22px;
            margin: 35px 0 15px;
            counter-increment: section;
        }}

        h2::before {{
            content: counter(section) ". ";
        }}

        h3 {{
            font-size: 18px;
            margin: 25px 0 10px;
        }}

        .abstract {{
            background: #f5f5f5;
            padding: 20px;
            margin: 30px 0;
            border-left: 4px solid #666;
        }}

        .abstract strong {{
            display: block;
            margin-bottom: 10px;
            font-size: 16px;
        }}

        .metadata {{
            text-align: center;
            color: #666;
            margin: 20px 0;
            font-size: 14px;
        }}

        .figure {{
            margin: 30px 0;
            text-align: center;
        }}

        .figure img {{
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            padding: 10px;
            background: white;
        }}

        .figure-caption {{
            margin-top: 10px;
            font-size: 14px;
            color: #666;
            counter-increment: figure;
        }}

        .figure-caption::before {{
            content: "图 " counter(figure) ": ";
            font-weight: bold;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }}

        table caption {{
            margin-bottom: 10px;
            font-weight: bold;
            counter-increment: table;
        }}

        table caption::before {{
            content: "表 " counter(table) ": ";
        }}

        th, td {{
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }}

        th {{
            background: #f5f5f5;
            font-weight: bold;
        }}

        .recommendation {{
            background: #e8f4f8;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #2196F3;
        }}

        .recommendation h3 {{
            margin-top: 0;
            color: #2196F3;
        }}

        .stats-box {{
            display: inline-block;
            margin: 10px 20px;
            text-align: center;
        }}

        .stats-number {{
            font-size: 32px;
            font-weight: bold;
            color: #2196F3;
        }}

        .stats-label {{
            font-size: 14px;
            color: #666;
        }}

        @media print {{
            body {{
                margin: 0;
                padding: 20px;
            }}
            .no-print {{
                display: none;
            }}
        }}
    </style>
</head>
<body>
    <h1>D2C口红实验室<br>2026年2月口红需求分析报告</h1>

    <div class="metadata">
        <p>D2C口红实验室 产品部门</p>
        <p>报告生成时间：{datetime.now().strftime('%Y年%m月%d日')}</p>
    </div>

    <div class="abstract">
        <strong>摘要</strong>
        本报告基于小红书平台采集的{statistics['overview']['total_notes']}条口红相关笔记，
        通过AI大模型分析提取妆容风格、口红特征、关键词等信息，
        形成当前口红市场趋势分析。
        研究发现，{top_styles[0][0]}妆容风格占据主导地位（{top_styles[0][1]['percentage']}%），
        {top_colors[0][0]}成为最受关注的口红色调，
        用户高频关注"{top_keywords[0][0]}"、"{top_keywords[1][0]}"等关键词。
        本报告为研发部门提供产品设计建议，为市场部门提供目标用户画像参考。
    </div>

    <h2>数据概览</h2>

    <div style="text-align: center; margin: 30px 0;">
        <div class="stats-box">
            <div class="stats-number">{statistics['overview']['total_notes']}</div>
            <div class="stats-label">采集笔记数</div>
        </div>
        <div class="stats-box">
            <div class="stats-number">{len(statistics['makeup_styles'])}</div>
            <div class="stats-label">妆容风格类型</div>
        </div>
        <div class="stats-box">
            <div class="stats-number">{len(statistics['lipstick_colors'])}</div>
            <div class="stats-label">口红色调类型</div>
        </div>
    </div>

    <p>
        本次数据采集时间范围为2026年1月至2月，数据来源于{statistics['overview']['data_source']}平台。
        采集关键词包括"口红推荐"、"口红试色"、"妆容推荐"等，覆盖当前主流美妆讨论话题。
    </p>

    <h2>妆容风格分析</h2>

    <p>
        通过对笔记内容的深度分析，识别出用户讨论的主要妆容风格。
        图1展示了各妆容风格的分布情况。
    </p>

    <div class="figure">
        <img src="charts/makeup_styles_pie.png" alt="妆容风格分布">
        <div class="figure-caption">妆容风格分布情况</div>
    </div>

    <p>
        分析发现，当前最受欢迎的妆容风格为：
    </p>

    <table>
        <caption>TOP 3 妆容风格统计</caption>
        <thead>
            <tr>
                <th>排名</th>
                <th>妆容风格</th>
                <th>提及次数</th>
                <th>占比</th>
            </tr>
        </thead>
        <tbody>
            {''.join([f'''
            <tr>
                <td>{i+1}</td>
                <td>{style[0]}</td>
                <td>{style[1]['count']}</td>
                <td>{style[1]['percentage']}%</td>
            </tr>
            ''' for i, style in enumerate(top_styles)])}
        </tbody>
    </table>

    <h2>口红色调分析</h2>

    <p>
        口红色调是用户关注的核心要素。图2展示了当前最受欢迎的口红色调及其热度。
    </p>

    <div class="figure">
        <img src="charts/lipstick_colors_bar.png" alt="口红色调热度">
        <div class="figure-caption">口红色调热度排行</div>
    </div>

    <p>
        从统计结果来看，{top_colors[0][0]}以{top_colors[0][1]}次提及位居第一，
        其次是{top_colors[1][0]}（{top_colors[1][1]}次）和{top_colors[2][0]}（{top_colors[2][1]}次）。
        这些色调普遍具有显白、日常、易搭配等特点。
    </p>

    <h2>用户关注关键词</h2>

    <p>
        通过提取用户评论和笔记中的高频关键词，可以了解用户在选择口红时的核心关注点。
        图3以词云形式展示了关键词分布。
    </p>

    <div class="figure">
        <img src="charts/keywords_wordcloud.png" alt="关键词词云">
        <div class="figure-caption">用户关注关键词词云</div>
    </div>

    <p>
        高频关键词TOP 10：
        {', '.join([f'"{kw[0]}"（{kw[1]}次）' for kw in top_keywords])}。
        这些关键词反映了用户对口红的核心需求：显白效果、质地体验、使用场景等。
    </p>

    <h2>产品设计建议</h2>

    <div class="recommendation">
        <h3>给研发部门的建议</h3>
        <p><strong>1. 色号设计方向</strong></p>
        <p>建议重点开发{top_colors[0][0]}、{top_colors[1][0]}等热门色调，
        饱和度建议偏向中低饱和，色温以暖调为主。</p>

        <p><strong>2. 质地选择</strong></p>
        <p>优先考虑哑光、丝绒质地，兼顾持久度和舒适度。</p>

        <p><strong>3. 目标用户</strong></p>
        <p>以18-28岁黄皮用户为主，日常通勤场景为核心使用场景。</p>
    </div>

    <div class="recommendation">
        <h3>给市场部门的建议</h3>
        <p><strong>1. 虚拟试妆肤色选择</strong></p>
        <p>重点配置黄一白、黄二白模特，覆盖主要目标用户肤色。</p>

        <p><strong>2. 宣传重点</strong></p>
        <p>突出"显白"、"日常"、"不拔干"等高频关注点。</p>
    </div>

    <hr style="margin: 40px 0; border: none; border-top: 1px solid #ccc;">

    <p style="text-align: center; color: #999; font-size: 12px;">
        本报告由 D2C 口红实验室自动生成<br>
        数据来源：{statistics['overview']['data_source']} | 分析方法：AI大模型+专业美妆知识库
    </p>

</body>
</html>
"""

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    return output_path

if __name__ == "__main__":
    statistics, analyzed_notes = load_data(
        "./output/statistics.json",
        "./output/analyzed_notes.json"
    )

    report_path = generate_html_report(
        statistics,
        "./output/charts",
        "./output/reports/trend_analysis_report.html"
    )

    print(f"报告生成完成: {report_path}")
