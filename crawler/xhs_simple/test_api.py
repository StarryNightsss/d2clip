"""测试小红书 API 调用"""
import asyncio
import httpx
from pathlib import Path

async def test():
    # 读取 Cookie
    cookie_file = Path(__file__).resolve().parents[2] / "crawler_config" / "xhs_cookies_default.txt"
    cookie = cookie_file.read_text().strip()
    
    print(f"✅ Cookie 长度: {len(cookie)}")
    print(f"前100字符: {cookie[:100]}")
    
    # 测试搜索 API
    url = "https://edith.xiaohongshu.com/api/sns/web/v1/search/notes"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Cookie": cookie,
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Origin": "https://www.xiaohongshu.com",
        "Referer": "https://www.xiaohongshu.com/",
    }
    
    data = {
        "keyword": "口红",
        "page": 1,
        "page_size": 20,
        "search_id": "",
        "sort": "general",
        "note_type": 0
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data, headers=headers, timeout=30)
        
        print(f"\n状态码: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        
        try:
            result = response.json()
            print(f"\n响应内容:")
            print(f"  success: {result.get('success')}")
            print(f"  code: {result.get('code')}")
            print(f"  msg: {result.get('msg')}")
            
            if result.get('data'):
                items = result['data'].get('items', [])
                print(f"  items数量: {len(items)}")
            else:
                print(f"  完整响应: {result}")
        except Exception as e:
            print(f"解析响应失败: {e}")
            print(f"响应文本: {response.text[:500]}")

if __name__ == "__main__":
    asyncio.run(test())
