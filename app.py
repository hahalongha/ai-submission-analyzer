import csv
import io
import os

import gradio as gr
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

import config
from ai_engine import analyze_submission, APIKeyError, APIConfigError
from report_generator import generate_markdown_report, export_txt, export_word, export_pdf
from storage import add_record, get_history, get_statistics, delete_record, clear_history, get_categories

matplotlib.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "sans-serif"]
matplotlib.rcParams["axes.unicode_minus"] = False

MAX_CHARS = 5000

PROVIDER_LABELS = {
    "deepseek": "DeepSeek（推荐）",
    "qwen": "通义千问",
    "glm": "智谱GLM（免费额度）",
    "kimi": "Kimi",
}

PROVIDER_CHOICES = [
    f"{k} - {PROVIDER_LABELS.get(k, k)}"
    for k in config.API_CONFIGS.keys()
]


def _parse_provider(label: str) -> str:
    if " - " in label:
        return label.split(" - ")[0]
    return label


def process_submission(text: str, export_format: str, provider_label: str):
    try:
        return _process_submission_impl(text, export_format, provider_label)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"❌ 分析出错：{e}", None, None, None, gr.update(visible=False)


def _process_submission_impl(text: str, export_format: str, provider_label: str):
    if not text.strip():
        return "⚠️ 请输入事件描述内容", None, None, None, gr.update(visible=False)

    if len(text) > MAX_CHARS:
        return f"⚠️ 输入内容超过{MAX_CHARS}字限制，请精简后重试", None, None, None, gr.update(visible=False)

    provider = _parse_provider(provider_label)

    try:
        config.set_provider(provider)
    except ValueError as e:
        msg = f"❌ {e}"
        return msg, None, None, None, gr.update(visible=False)

    try:
        result = analyze_submission(text.strip())
    except APIKeyError as e:
        return f"🔑 **API密钥错误**\n\n{e}", None, None, None, gr.update(visible=False)
    except APIConfigError as e:
        return f"⚙️ **API配置错误**\n\n{e}", None, None, None, gr.update(visible=False)
    except Exception as e:
        return f"❌ 分析失败：{e}", None, None, None, gr.update(visible=False)

    add_record(result)
    md_report = generate_markdown_report(result)

    txt_path = None
    word_path = None
    pdf_path = None
    has_file = False

    if export_format in ["TXT", "两者都导出", "三者都导出"]:
        try:
            txt_path = export_txt(result)
            has_file = True
        except Exception:
            txt_path = None

    if export_format in ["Word", "两者都导出", "三者都导出"]:
        try:
            word_path = export_word(result)
            has_file = True
        except Exception:
            word_path = None

    if export_format in ["PDF", "三者都导出"]:
        try:
            pdf_path = export_pdf(result)
            has_file = True
        except Exception:
            pdf_path = None

    return md_report, txt_path, word_path, pdf_path, gr.update(visible=has_file)
