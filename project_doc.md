# AI辅助投稿分析工具 - 项目文档

## 📐 项目结构

```
ai-submission-analyzer/
├── app.py                    # Gradio Web界面入口
├── ai_engine.py              # AI核心引擎
├── report_generator.py       # 报告生成与导出
├── config.py                 # 全局配置与模型定义
├── storage.py                # 历史记录持久化
├── requirements.txt          # Python包依赖
├── start.bat                 # Windows一键启动
├── usage_guide.md            # 使用说明
└── tampermonkey-collector.js # 油猴采集脚本
```

## 🏗️ 分层架构

```
表现层 → 业务逻辑层 → AI服务层 → 数据输出层

┌──────────────────────────────────┐
│ app.py (Gradio UI + CSS主题)      │
├──────────────────────────────────┤
│ ai_engine.py (标题→分类→摘要→评估) │
├──────────────────────────────────┤
│ config.py + OpenAI SDK           │
│ DeepSeek/通义千问/智谱GLM/Kimi    │
├──────────────────────────────────┤
│ report_generator.py              │
│ (Markdown/TXT/Word/PDF导出)        │
└──────────────────────────────────┘
```

## 核心函数

| 函数 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `generate_title(text)` | 事件文本 | 标题字符串 | 生成≤20字标题 |
| `classify(text)` | 事件文本 | `{category, confidence, reason}` | 8类分类 |
| `summarize(text)` | 事件文本 | 摘要字符串 | 3-5句关键信息 |
| `assess_impact(text)` | 事件文本 | `{heat_score, ...}` | 热度1-10 + 四维评估 |
| `analyze_submission(text)` | 事件文本 | 完整分析结果dict | 编排以上4步 |

## 模型配置

```python
API_CONFIGS = {
    "deepseek": { base_url: "https://api.deepseek.com", model: "deepseek-chat" },
    "qwen":     { base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-turbo" },
    "glm":      { base_url: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash" },
    "kimi":     { base_url: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
}
```

## 数据流

```
粘贴文本 → process_submission() → Markdown报告 → 页面展示
              ├── generate_title()   → 事件标题
              ├── classify()         → 类别+置信度
              ├── summarize()        → 3-5句摘要
              └── assess_impact()    → 热度分+四维评估
                    ├── export_txt()  → *.txt
                    └── export_word() → *.docx
```

## 分类体系

```
事件分类 (8类)
├── 教育 ── 学校教育、教学改革、教育公平
├── 劳动 ── 劳动者权益、工资薪酬
├── 校园 ── 校园生活、学生活动
├── 社会 ── 社会民生、公共政策
├── 科技 ── 科技发展、数据隐私
├── 环境 ── 环境污染、生态保护
├── 医疗 ── 医疗资源、医患关系
└── 其他 ── 不属于以上类别
```

## UI设计规范

| 属性 | 值 |
|------|-----|
| 主题 | 暖色调模式 |
| 主色 | oklch(0.48 0.09 155) 森林绿 |
| 背景 | #faf7f2 (羊皮纸) |
| 卡片 | #ffffff |
| 字体 | Inter + Playfair Display |
| 热度色 | 🔴红(8-10) / 🟡橙(5-7) / 🟢绿(1-4) |
