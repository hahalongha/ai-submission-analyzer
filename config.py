import os
import re
import json

DATA_DIR = "data"
CATEGORIES_FILE = os.path.join(DATA_DIR, "categories.json")
API_KEYS_FILE = os.path.join(DATA_DIR, "api_keys.json")

API_PROVIDER = os.getenv("AI_PROVIDER", "deepseek")

API_CONFIGS = {
    "deepseek": {
        "name": "DeepSeek",
        "api_key": os.getenv("DEEPSEEK_API_KEY", ""),
        "base_url": "https://api.deepseek.com",
        "model": "deepseek-chat",
        "description": "DeepSeek Chat（推荐，性价比高）",
        "env_var": "DEEPSEEK_API_KEY",
    },
    "qwen": {
        "name": "通义千问",
        "api_key": os.getenv("DASHSCOPE_API_KEY", ""),
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "model": "qwen-turbo",
        "description": "阿里云通义千问 Turbo",
        "env_var": "DASHSCOPE_API_KEY",
    },
    "glm": {
        "name": "智谱GLM",
        "api_key": os.getenv("GLM_API_KEY", ""),
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "model": "glm-4-flash",
        "description": "智谱清言 GLM-4-Flash（免费额度）",
        "env_var": "GLM_API_KEY",
    },
    "kimi": {
        "name": "Kimi",
        "api_key": os.getenv("MOONSHOT_API_KEY", ""),
        "base_url": "https://api.moonshot.cn/v1",
        "model": "moonshot-v1-8k",
        "description": "Moonshot Kimi V1-8K",
        "env_var": "MOONSHOT_API_KEY",
    },
}

DEFAULT_CATEGORIES = {
    "教育": "涉及学校教育、教学改革、教育公平、考试招生、学术问题等",
    "劳动": "涉及劳动者权益、工资薪酬、加班文化、劳动纠纷、职场问题等",
    "校园": "涉及校园生活、学生活动、校园安全、宿舍食堂、校园事件等",
    "社会": "涉及社会民生、公共政策、社区治理、社会公平等",
    "科技": "涉及科技发展、数据隐私、人工智能、互联网平台等",
    "环境": "涉及环境污染、生态保护、气候变化、可持续发展等",
    "医疗": "涉及医疗资源、医患关系、公共卫生、健康问题等",
    "其他": "不属于以上类别的事件",
}

CATEGORIES = list(DEFAULT_CATEGORIES.keys())
CATEGORY_DESCRIPTIONS = dict(DEFAULT_CATEGORIES)


def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _load_custom_categories():
    global CATEGORIES, CATEGORY_DESCRIPTIONS
    _ensure_dir()
    if os.path.exists(CATEGORIES_FILE):
        try:
            with open(CATEGORIES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            CATEGORY_DESCRIPTIONS = data
            CATEGORIES = list(data.keys())
        except (json.JSONDecodeError, IOError):
            pass


def _save_categories():
    _ensure_dir()
    with open(CATEGORIES_FILE, "w", encoding="utf-8") as f:
        json.dump(CATEGORY_DESCRIPTIONS, f, ensure_ascii=False, indent=2)


_load_custom_categories()


def _load_saved_api_keys():
    _ensure_dir()
    if os.path.exists(API_KEYS_FILE):
        try:
            with open(API_KEYS_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
            for provider, key in saved.items():
                if provider in API_CONFIGS:
                    API_CONFIGS[provider]["api_key"] = key
        except (json.JSONDecodeError, IOError):
            pass


def _save_api_keys():
    _ensure_dir()
    saved = {}
    for provider, cfg in API_CONFIGS.items():
        saved[provider] = cfg["api_key"]
    with open(API_KEYS_FILE, "w", encoding="utf-8") as f:
        json.dump(saved, f, ensure_ascii=False, indent=2)


_load_saved_api_keys()


def set_provider(provider: str):
    global API_PROVIDER
    if provider not in API_CONFIGS:
        raise ValueError(f"不支持的模型：{provider}，可选：{list(API_CONFIGS.keys())}")
    API_PROVIDER = provider


def set_api_key(provider: str, api_key: str) -> str:
    if provider not in API_CONFIGS:
        return f"❌ 不支持的模型：{provider}"
    api_key = api_key.strip()
    if not api_key:
        API_CONFIGS[provider]["api_key"] = ""
        _save_api_keys()
        return f"✅ 已清除 {API_CONFIGS[provider]['name']} 的API密钥"
    API_CONFIGS[provider]["api_key"] = api_key
    _save_api_keys()
    return f"✅ 已保存 {API_CONFIGS[provider]['name']} 的API密钥"


def get_api_key(provider: str) -> str:
    if provider not in API_CONFIGS:
        return ""
    return API_CONFIGS[provider].get("api_key", "")


def get_api_key_status(provider: str) -> str:
    if provider not in API_CONFIGS:
        return "❌ 未知模型"
    key = API_CONFIGS[provider].get("api_key", "")
    if not key:
        return "⚠️ 未设置"
    masked = key[:6] + "*" * (len(key) - 10) + key[-4:] if len(key) > 10 else "***"
    return f"✅ 已设置（{masked}）"


def get_all_key_status() -> str:
    lines = ["| 模型 | 状态 | Key |", "|------|------|-----|"]
    for provider, cfg in API_CONFIGS.items():
        status = get_api_key_status(provider)
        marker = "🟢" if cfg.get("api_key") else "🔴"
        lines.append(f"| {marker} {cfg['name']} | {cfg['description']} | {status} |")
    return "\n".join(lines)


def validate_api_key(provider: str) -> str:
    if provider not in API_CONFIGS:
        return f"❌ 不支持的模型：{provider}"
    key = API_CONFIGS[provider].get("api_key", "")
    if not key:
        return f"❌ {API_CONFIGS[provider]['name']} 的API密钥未设置，请先填写Key"
    return f"✅ {API_CONFIGS[provider]['name']} 的API密钥已配置"


def safe_filename(name: str, max_len: int = 10) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|\n\r\t]', '_', name)
    return cleaned[:max_len] if cleaned else "untitled"


def add_category(name: str, description: str) -> str:
    name = name.strip()
    description = description.strip()
    if not name:
        return "❌ 分类名称不能为空"
    if name in CATEGORY_DESCRIPTIONS:
        return f"❌ 分类「{name}」已存在"
    CATEGORY_DESCRIPTIONS[name] = description or f"{name}相关事件"
    CATEGORIES.append(name)
    _save_categories()
    return f"✅ 已添加分类「{name}」"


def remove_category(name: str) -> str:
    if name == "其他":
        return "❌ 系统默认分类「其他」不能删除"
    if name not in CATEGORY_DESCRIPTIONS:
        return f"❌ 分类「{name}」不存在"
    del CATEGORY_DESCRIPTIONS[name]
    if name in CATEGORIES:
        CATEGORIES.remove(name)
    _save_categories()
    return f"✅ 已删除分类「{name}」"


def reset_categories() -> str:
    global CATEGORIES, CATEGORY_DESCRIPTIONS
    CATEGORY_DESCRIPTIONS = dict(DEFAULT_CATEGORIES)
    CATEGORIES = list(DEFAULT_CATEGORIES.keys())
    _save_categories()
    return "✅ 已恢复默认分类"


def get_categories_text() -> str:
    lines = []
    for name, desc in CATEGORY_DESCRIPTIONS.items():
        tag = " (默认)" if name == "其他" else ""
        lines.append(f"**{name}**{tag}：{desc}")
    return "\n".join(lines)
