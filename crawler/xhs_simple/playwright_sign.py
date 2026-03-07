"""Playwright 签名生成（参考 MediaCrawler）"""
import hashlib
import json
import time
from typing import Dict, Optional, Union
from urllib.parse import quote

from .xhs_sign import b64_encode, encode_utf8, get_trace_id, mrc


def _build_sign_string(uri: str, data: Optional[Union[Dict, str]] = None, method: str = "POST") -> str:
    """构建待签名字符串"""
    if method.upper() == "POST":
        c = uri
        if data is not None:
            if isinstance(data, dict):
                c += json.dumps(data, separators=(",", ":"), ensure_ascii=False)
            elif isinstance(data, str):
                c += data
        return c
    else:
        # GET 请求
        if not data or (isinstance(data, dict) and len(data) == 0):
            return uri

        if isinstance(data, dict):
            params = []
            for key in data.keys():
                value = data[key]
                if isinstance(value, list):
                    value_str = ",".join(str(v) for v in value)
                elif value is not None:
                    value_str = str(value)
                else:
                    value_str = ""
                value_str = quote(value_str, safe='')
                params.append(f"{key}={value_str}")
            return f"{uri}?{'&'.join(params)}"
        elif isinstance(data, str):
            return f"{uri}?{data}"
        return uri


def _md5_hex(s: str) -> str:
    """计算 MD5"""
    return hashlib.md5(s.encode("utf-8")).hexdigest()


def _build_xs_payload(x3_value: str, data_type: str = "object") -> str:
    """构建 x-s 签名"""
    s = {
        "x0": "4.2.1",
        "x1": "xhs-pc-web",
        "x2": "Mac OS",
        "x3": x3_value,
        "x4": data_type,
    }
    return "XYS_" + b64_encode(encode_utf8(json.dumps(s, separators=(",", ":"))))


def _build_xs_common(a1: str, b1: str, x_s: str, x_t: str) -> str:
    """构建 x-s-common 请求头"""
    payload = {
        "s0": 3,
        "s1": "",
        "x0": "1",
        "x1": "4.2.2",
        "x2": "Mac OS",
        "x3": "xhs-pc-web",
        "x4": "4.74.0",
        "x5": a1,
        "x6": x_t,
        "x7": x_s,
        "x8": b1,
        "x9": mrc(x_t + x_s + b1),
        "x10": 154,
        "x11": "normal",
    }
    return b64_encode(encode_utf8(json.dumps(payload, separators=(",", ":"))))


def get_b1_from_localstorage(page) -> str:
    """从 localStorage 获取 b1"""
    try:
        local_storage = page.evaluate("() => window.localStorage")
        return local_storage.get("b1", "")
    except Exception:
        return ""


def call_mnsv2(page, sign_str: str, md5_str: str) -> str:
    """调用 window.mnsv2 函数生成签名"""
    sign_str_escaped = sign_str.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    md5_str_escaped = md5_str.replace("\\", "\\\\").replace("'", "\\'")

    try:
        result = page.evaluate(f"window.mnsv2('{sign_str_escaped}', '{md5_str_escaped}')")
        return result if result else ""
    except Exception:
        return ""


def sign_with_playwright(
    page,
    uri: str,
    data: Optional[Union[Dict, str]] = None,
    a1: str = "",
    method: str = "POST",
) -> Dict[str, str]:
    """使用 Playwright 生成完整签名"""
    b1 = get_b1_from_localstorage(page)

    # 生成 x-s
    sign_str = _build_sign_string(uri, data, method)
    md5_str = _md5_hex(sign_str)
    x3_value = call_mnsv2(page, sign_str, md5_str)
    data_type = "object" if isinstance(data, (dict, list)) else "string"
    x_s = _build_xs_payload(x3_value, data_type)

    # 生成 x-t
    x_t = str(int(time.time() * 1000))

    return {
        "x-s": x_s,
        "x-t": x_t,
        "x-s-common": _build_xs_common(a1, b1, x_s, x_t),
        "x-b3-traceid": get_trace_id(),
    }
