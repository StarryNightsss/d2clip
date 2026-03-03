"""小红书登录助手 - 通过 Playwright 手动登录并保存 Cookie"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json


def _get_default_save_path() -> Path:
    """获取默认 Cookie 保存路径（Windows/Mac 兼容）"""
    project_root = Path(__file__).resolve().parents[2]
    return project_root / "crawler_config" / "xhs_cookies_default.txt"


def manual_login(save_path: str = None):
    """打开浏览器让用户手动登录，然后保存 Cookie"""
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,  # 显示浏览器窗口
            args=['--disable-blink-features=AutomationControlled']
        )

        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )

        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")

        # 访问小红书首页
        page.goto("https://www.xiaohongshu.com")

        print("\n" + "="*60)
        print("请在打开的浏览器中手动登录小红书")
        print("登录成功后，在此终端按 Enter 键继续...")
        print("="*60 + "\n")

        input()

        # 获取保存路径
        if save_path is None:
            save_path = str(_get_default_save_path())

        # 获取登录后的 Cookie
        cookies = context.cookies()
        cookie_str = '; '.join([f"{c['name']}={c['value']}" for c in cookies])

        # 保存 Cookie（确保目录存在）
        save_file = Path(save_path)
        save_file.parent.mkdir(parents=True, exist_ok=True)
        save_file.write_text(cookie_str)

        print(f"\n✅ Cookie 已保存到: {save_file}")
        print(f"Cookie 数量: {len(cookies)}")

        browser.close()

if __name__ == "__main__":
    manual_login()
