import json
import os
from datetime import datetime, timedelta
from collections import Counter

DATA_DIR = "data"
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")
MAX_HISTORY = 100


def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _load_history() -> list:
    _ensure_dir()
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def _save_history(records: list):
    _ensure_dir()
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def add_record(result: dict):
    records = _load_history()
    impact = result.get("impact", {})
    classification = result.get("classification", {})
    record = {
        "id": datetime.now().strftime("%Y%m%d%H%M%S%f"),
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "title": result.get("title", "未知"),
        "category": classification.get("category", "未知"),
        "confidence": float(classification.get("confidence", 0)),
        "heat_score": int(impact.get("heat_score", 5)),
        "summary": result.get("summary", ""),
        "classification_reason": classification.get("reason", ""),
        "affected_scope": impact.get("affected_scope", ""),
        "spread_potential": impact.get("spread_potential", ""),
        "historical_similarity": impact.get("historical_similarity", ""),
        "emotional_intensity": impact.get("emotional_intensity", ""),
        "overall_reason": impact.get("overall_reason", ""),
    }
    records.insert(0, record)
    records = records[:MAX_HISTORY]
    _save_history(records)
    return record


def get_history() -> list:
    return _load_history()


def clear_history():
    _save_history([])


def delete_record(record_id: str):
    records = _load_history()
    records = [r for r in records if r.get("id") != record_id]
    _save_history(records)
    return len(records)


def get_categories() -> list:
    records = _load_history()
    cats = sorted(set(r.get("category", "未知") for r in records if r.get("category")))
    return cats


def get_statistics() -> dict:
    records = _load_history()
    today_str = datetime.now().strftime("%Y-%m-%d")

    total = len(records)
    today_count = sum(1 for r in records if r.get("time", "").startswith(today_str))
    high_heat = sum(1 for r in records if r.get("heat_score", 0) >= 8)

    categories = [r.get("category", "未知") for r in records]
    cat_counter = Counter(categories)
    category_count = len(cat_counter)

    last_7_days = []
    for i in range(6, -1, -1):
        day = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        count = sum(1 for r in records if r.get("time", "").startswith(day))
        last_7_days.append({"date": day, "count": count})

    return {
        "total": total,
        "today_count": today_count,
        "high_heat_count": high_heat,
        "category_count": category_count,
        "category_distribution": dict(cat_counter),
        "trend_7days": last_7_days,
    }
