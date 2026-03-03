"""小红书客户端（使用 Playwright + httpx）"""
from pathlib import Path
from typing import Dict, List, Callable, Optional
import json
from playwright.sync_api import sync_playwright
import httpx
from playwright_sign import sign_with_playwright


def _noop_log(msg: str, level: str = "info"):
    print(msg)


class XhsClient:
    """小红书 API 客户端（使用 Playwright 模拟浏览器）"""

    def __init__(
        self,
        cookie: str = None,
        cookie_file: str = None,
        log_fn: Optional[Callable[[str, str], None]] = None,
    ):
        if cookie:
            self.cookie_str = cookie
        elif cookie_file:
            self.cookie_str = Path(cookie_file).read_text().strip()
        else:
            raise ValueError("必须提供 cookie 或 cookie_file")

        self._log = log_fn or _noop_log
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self._init_browser()

    def _init_browser(self):
        """初始化 Playwright 浏览器"""
        self.playwright = sync_playwright().start()
        # channel='chromium' 使用完整 Chromium（playwright install chromium 安装的），
        # 避免 chromium_headless_shell 在 Railway/Nixpacks 环境下缺失
        self.browser = self.playwright.chromium.launch(
            headless=True,
            channel='chromium',
            args=['--disable-blink-features=AutomationControlled']
        )

        # 解析 Cookie 字符串为字典列表
        cookies = []
        for item in self.cookie_str.split('; '):
            if '=' in item:
                name, value = item.split('=', 1)
                cookies.append({
                    'name': name,
                    'value': value,
                    'domain': '.xiaohongshu.com',
                    'path': '/'
                })

        # 创建带 Cookie 的浏览器上下文（模拟真实浏览器）
        self.context = self.browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )

        # 注入 stealth.min.js 防止被检测为爬虫（关键！）
        stealth_js_path = Path(__file__).parent / "stealth.min.js"
        if stealth_js_path.exists():
            self.context.add_init_script(path=str(stealth_js_path))

        self.context.add_cookies(cookies)
        self.page = self.context.new_page()

        # 导航到小红书首页以建立会话
        self.page.goto("https://www.xiaohongshu.com")
        self.page.wait_for_timeout(2000)

    def __del__(self):
        """清理资源"""
        if self.page:
            self.page.close()
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()

    def search_notes(self, keyword: str, page: int = 1, page_size: int = 20, sort: str = "general") -> Dict:
        """搜索笔记 - 通过页面操作触发真实搜索"""
        try:
            # 导航到搜索页面并等待 API 响应
            search_url = f"https://www.xiaohongshu.com/search_result?keyword={keyword}"

            # 等待并拦截 API 响应
            with self.page.expect_response(lambda response: 'api/sns/web/v1/search/notes' in response.url, timeout=10000) as response_info:
                self.page.goto(search_url)

            response = response_info.value
            api_data = response.json()

            self._log(f"API 响应: {api_data.get('code')}, {api_data.get('msg')}")

            if api_data.get('success'):
                return api_data.get('data', {})
            else:
                return {"items": [], "has_more": False}

        except Exception as e:
            self._log(f"搜索失败: {e}", "error")
            return {"items": [], "has_more": False}

    def get_note_comments(self, note_id: str, xsec_token: str = "", cursor: str = "") -> Dict:
        """获取笔记评论 - 使用 httpx + 签名"""
        try:
            # API 参数
            uri = "/api/sns/web/v2/comment/page"
            params = {
                "note_id": note_id,
                "cursor": cursor,
                "top_comment_id": "",
                "image_formats": "jpg,webp,avif",
            }
            if xsec_token:
                params["xsec_token"] = xsec_token

            # 获取 a1 cookie
            cookies_list = self.context.cookies()
            a1 = ""
            cookie_str = ""
            for cookie in cookies_list:
                if cookie['name'] == 'a1':
                    a1 = cookie['value']
                cookie_str += f"{cookie['name']}={cookie['value']}; "

            # 生成签名
            signs = sign_with_playwright(
                page=self.page,
                uri=uri,
                data=params,
                a1=a1,
                method="GET"
            )

            # 构建请求头
            headers = {
                "accept": "application/json, text/plain, */*",
                "accept-language": "zh-CN,zh;q=0.9",
                "content-type": "application/json;charset=UTF-8",
                "origin": "https://www.xiaohongshu.com",
                "referer": "https://www.xiaohongshu.com/",
                "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                "cookie": cookie_str.strip(),
                "x-s": signs["x-s"],
                "x-t": signs["x-t"],
                "x-s-common": signs["x-s-common"],
                "x-b3-traceid": signs["x-b3-traceid"],
            }

            # 发送 GET 请求
            url = f"https://edith.xiaohongshu.com{uri}"
            response = httpx.get(url, params=params, headers=headers, timeout=10)

            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return data.get('data', {})

            return {"comments": [], "has_more": False, "cursor": ""}

        except Exception as e:
            return {"comments": [], "has_more": False, "cursor": ""}

    def get_all_comments(self, note_id: str, xsec_token: str = "", max_count: int = 50) -> List[Dict]:
        """获取所有一级评论"""
        all_comments = []
        cursor = ""
        has_more = True

        while has_more and len(all_comments) < max_count:
            try:
                result = self.get_note_comments(note_id, xsec_token, cursor)
                comments = result.get("comments", [])
                all_comments.extend(comments)

                has_more = result.get("has_more", False)
                cursor = result.get("cursor", "")

                if not comments:
                    break

            except Exception as e:
                break

        return all_comments[:max_count]
