# 🔍 AI辅助投稿分析工具

> 快速分类 · 智能摘要 · 影响评估 · 一键导出

一个基于国产 AI 模型的投稿分析工具，帮助社区志愿者快速处理投稿内容：自动分类、智能摘要、热度评估，显著减少人工看帖时间。

## ✨ 功能特性

- 🏷️ **自动分类** — AI 智能识别事件类型
- 📝 **智能摘要** — 提取核心事实，3-5 句关键信息
- 📊 **热度评估** — 多维评估事件影响力（1-10 分）
- 📄 **多格式导出** — TXT / Word / PDF 三种报告格式
- 📦 **批量分析** — 上传 CSV/TXT 文件，批量处理
- 🔑 **多模型支持** — DeepSeek / 通义千问 / 智谱GLM / Kimi
- 📊 **数据统计** — 分类分布饼图、7 天趋势折线图
- 📜 **历史记录** — 自动保存分析历史
- ⚙️ **自定义分类** — 自由添加/删除事件分类类别
- 🎨 **暗色主题** — 现代 UI 设计，护眼舒适

## 🚀 快速开始

```bash
git clone https://github.com/hahalongha/ai-submission-analyzer.git
cd ai-submission-analyzer
pip install -r requirements.txt
python app.py
```

Windows 用户可直接双击 `start.bat` 一键启动。

浏览器打开 http://localhost:7860 即可使用。

## 📖 完整文档

- [使用说明](usage_guide.md) — 详细使用指南
- [项目文档](project_doc.md) — 架构设计与技术文档

## 🛠️ 技术栈

Gradio · OpenAI SDK · DeepSeek · 通义千问 · 智谱GLM · Kimi · Pandas · Matplotlib · python-docx · fpdf2

## 📝 License

MIT License