"""测试爬虫功能"""
import asyncio
from pathlib import Path

from crawler import XhsCrawler


async def test_crawl():
    """测试爬取功能"""
    print("=" * 60)
    print("开始测试小红书爬虫")
    print("=" * 60)

    # Cookie 文件路径
    project_root = Path(__file__).resolve().parents[2]
    cookie_file = project_root / "crawler_config" / "xhs_cookies_default.txt"

    if not cookie_file.exists():
        print(f"❌ Cookie 文件不存在: {cookie_file}")
        print("请先创建该文件并填入小红书 Cookie")
        return

    print(f"✅ Cookie 文件: {cookie_file}")

    # 初始化爬虫
    crawler = XhsCrawler(cookie_file=str(cookie_file))
    print(f"✅ 输出目录: {crawler.output_dir}")

    # 爬取数据（测试用小数量）
    import sys
    test_keyword = sys.argv[1] if len(sys.argv) > 1 else "口红测评"

    print(f"\n开始爬取数据...")
    print(f"测试关键词: {test_keyword}")
    result = await crawler.crawl_by_keyword(
        keyword=test_keyword,
        max_notes=3,
        max_comments_per_note=5,
        crawl_comments=True
    )

    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)
    print(f"✅ 笔记数: {result['notes_count']}")
    print(f"✅ 评论数: {result['comments_count']}")
    print(f"\n数据文件:")
    for key, path in result['output_files'].items():
        print(f"  {key}: {path}")


if __name__ == "__main__":
    asyncio.run(test_crawl())
