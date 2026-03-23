# 配置文件

# GPT API 配置
API_KEY = "sk-S8EsuBGprC7HfOXtGCfyBkfGApbpwf1bN8k27dKgazQH8Ybm"
API_BASE_URL = "https://api.chatanywhere.tech/v1"
MODEL = "gpt-3.5-turbo"

# 数据路径配置
INPUT_DATA_PATH = "../crawler/MediaCrawler/data/xhs/json/search_contents_2026-02-18.json"
OUTPUT_DIR = "./output"

# 分析配置
BATCH_SIZE = 10  # 每批次分析的笔记数量
REQUEST_INTERVAL = 2  # 请求间隔（秒）
TEMPERATURE = 0.3  # 模型温度参数
