import json
import config
from openai import OpenAI, APIError, AuthenticationError, RateLimitError, APIConnectionError


class APIKeyError(Exception):
    pass


class APIConfigError(Exception):
    pass


def _get_client():
    if config.API_PROVIDER not in config.API_CONFIGS:
        raise APIConfigError(
            f"不支持的模型：{config.API_PROVIDER}，"
            f"可选模型：{', '.join(config.API_CONFIGS.keys())}"
        )

    cfg = config.API_CONFIGS[config.API_PROVIDER]

    if not cfg.get("api_key"):
        raise APIKeyError(
            f"未配置 {cfg['name']} 的API密钥！\n\n"
            f"请按以下步骤操作：\n"
            f"1. 在「⚙️ 系统设置」→「🔑 API密钥管理」中填写 {cfg['name']} 的Key\n"
            f"2. 或设置环境变量：set {cfg['env_var']}=your_key\n\n"
            f"获取Key的地址：\n"
            f"- DeepSeek: https://platform.deepseek.com/api_keys\n"
            f"- 通义千问: https://dashscope.console.aliyun.com/apiKey\n"
            f"- 智谱GLM: https://open.bigmodel.cn/usercenter/apikeys\n"
            f"- Kimi: https://platform.moonshot.cn/console/api-keys"
        )

    if not cfg.get("base_url"):
        raise APIConfigError(f"{cfg['name']} 的 base_url 未配置")

    return OpenAI(api_key=cfg["api_key"], base_url=cfg["base_url"]), cfg["model"]


def _chat(system_prompt: str, user_prompt: str) -> str:
    try:
        client, model = _get_client()
    except APIKeyError:
        raise
    except Exception as e:
        raise APIConfigError(f"初始化客户端失败：{e}")

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except AuthenticationError:
        provider_name = config.API_CONFIGS[config.API_PROVIDER]["name"]
        raise APIKeyError(
            f"{provider_name} 的API密钥无效或已过期！\n\n"
            f"请检查：\n"
            f"1. Key是否正确复制（注意前后空格）\n"
            f"2. Key是否已过期或被禁用\n"
            f"3. 账户余额是否充足\n\n"
            f"请在「⚙️ 系统设置」→「🔑 API密钥管理」中重新设置。"
        )
    except RateLimitError:
        provider_name = config.API_CONFIGS[config.API_PROVIDER]["name"]
        raise APIKeyError(
            f"{provider_name} 的API调用频率超限！\n\n"
            f"可能原因：\n"
            f"1. 免费额度已用完\n"
            f"2. 短时间内请求过多\n\n"
            f"建议：稍后重试，或切换到其他模型。"
        )
    except APIConnectionError:
        provider_name = config.API_CONFIGS[config.API_PROVIDER]["name"]
        raise APIConfigError(
            f"无法连接 {provider_name} 的API服务！\n\n"
            f"可能原因：\n"
            f"1. 网络连接异常\n"
            f"2. API服务暂时不可用\n"
            f"3. 需要代理访问\n\n"
            f"建议：检查网络连接后重试。"
        )
    except APIError as e:
        provider_name = config.API_CONFIGS[config.API_PROVIDER]["name"]
        raise APIConfigError(
            f"{provider_name} API返回错误：{e}\n\n"
            f"建议：切换其他模型重试，或稍后再试。"
        )
    except Exception as e:
        raise APIConfigError(f"分析过程出错：{e}")


def _safe_float(val, default=0.0):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _safe_int(val, default=5):
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def classify(text: str) -> dict:
    cat_list = "\n".join(f"- {k}：{v}" for k, v in config.CATEGORY_DESCRIPTIONS.items())
    system = (
        "你是一个专业的事件分类分析师。根据用户提交的事件描述，精准判断它所属的类别。\n\n"
        f"可选类别如下：\n{cat_list}\n\n"
        "分类原则：\n"
        "1. 优先选择最具体、最匹配的类别，而非笼统归类\n"
        "2. 如果事件涉及多个领域，选择其核心矛盾所在领域\n"
        "3. 只有在确实无法归入任何具体类别时才归为「其他」\n\n"
        "置信度评估标准（必须根据分类的确定程度给出不同值，不要固定给高分）：\n"
        "- 0.90-1.00：事件描述非常清晰，与某类别完全吻合，毫无歧义\n"
        "- 0.75-0.89：事件较明显属于某类别，但存在少量模糊之处\n"
        "- 0.55-0.74：事件可能属于某类别，但存在明显的不确定因素或跨类别特征\n"
        "- 0.30-0.54：事件特征模糊，难以确定归属，勉强归入某类别\n"
        "- 0.00-0.29：完全无法判断，信息严重不足\n\n"
        "示例：\n"
        "- \"某高校学生因论文查重被拒毕业\" → category: 教育学术, confidence: 0.88\n"
        "- \"某地发生疑似食物中毒事件\" → category: 食品安全, confidence: 0.72\n"
        "- \"网上流传一段不明来源的视频\" → category: 其他, confidence: 0.35\n\n"
        '请严格以JSON格式返回：{"category": "类别名", "confidence": 置信度0-1, "reason": "分类理由（简述为何归入此类别，指出事件的核心特征）"}\n'
        "只返回JSON，不要其他内容。"
    )
    raw = _chat(system, text)
    try:
        start = raw.index("{")
        end = raw.rindex("}") + 1
        data = json.loads(raw[start:end])
        data["confidence"] = _safe_float(data.get("confidence"), 0.5)
        return data
    except (ValueError, json.JSONDecodeError):
        return {"category": "其他", "confidence": 0.5, "reason": "分类解析失败，已归为其他"}


def summarize(text: str) -> str:
    system = (
        "你是一个专业的事件摘要分析师。请将用户提交的事件描述浓缩为3-5句话的关键信息摘要。\n\n"
        "摘要要求：\n"
        "1. 保留核心事实：谁（主体）、什么事（核心行为）、何时（时间）、何地（地点）、为何（原因）\n"
        "2. 保留关键数据：涉及人数、金额、影响范围等量化信息\n"
        "3. 去除冗余和情绪化表达，保持客观中立\n"
        "4. 语言简洁精炼，每句话不超过40字\n"
        "5. 按重要性排序：先核心事实，后补充细节\n\n"
        "直接输出摘要，不要加标题或前缀。"
    )
    return _chat(system, text)


def assess_impact(text: str) -> dict:
    system = (
        "你是一个专业的社会事件影响评估分析师。根据事件描述，全面评估其热度和社会影响。\n\n"
        "评估维度与标准：\n\n"
        "1. 影响范围（affected_scope）：\n"
        "   - 评估受影响人群的规模和层次\n"
        "   - 个人层面：仅涉及个别人员\n"
        "   - 群体层面：涉及特定群体（如某校学生、某公司员工）\n"
        "   - 社会层面：涉及广泛社会群体或公共利益\n\n"
        "2. 传播潜力（spread_potential）：\n"
        "   - 评估事件在社交媒体上的传播可能性\n"
        "   - 考虑因素：话题性、争议性、共鸣度、信息可传播性\n"
        "   - 低：话题平淡，难以引发关注\n"
        "   - 中：有一定话题性，可能在小范围传播\n"
        "   - 高：话题性强，容易引发广泛讨论和转发\n\n"
        "3. 历史相似度（historical_similarity）：\n"
        "   - 指出是否有类似先例事件及其处理结果\n"
        "   - 如有相似事件，简述其发展和结局\n\n"
        "4. 情感强度（emotional_intensity）：\n"
        "   - 评估事件引发公众情绪共鸣的程度\n"
        "   - 低：理性讨论为主\n"
        "   - 中：有一定情绪表达\n"
        "   - 高：容易引发强烈情绪反应（愤怒、同情、恐慌等）\n\n"
        "5. 热度评分（heat_score）：1-10整数\n"
        "   - 1-3：低热度，影响有限，公众关注度低\n"
        "   - 4-6：中热度，有一定影响和关注度\n"
        "   - 7-8：高热度，社会影响较大，公众关注度高\n"
        "   - 9-10：极高热度，可能引发社会舆论风暴或政策变化\n\n"
        '请严格以JSON格式返回：\n'
        '{\n'
        '  "heat_score": 热度分1-10整数,\n'
        '  "affected_scope": "影响范围描述（包含规模和层次）",\n'
        '  "spread_potential": "传播潜力描述（包含原因分析）",\n'
        '  "historical_similarity": "历史相似事件（如有则说明结果）",\n'
        '  "emotional_intensity": "情感强度描述（包含情绪类型）",\n'
        '  "overall_reason": "综合评估理由（整合各维度分析，给出总体判断依据）"\n'
        '}\n'
        "只返回JSON，不要其他内容。"
    )
    raw = _chat(system, text)
    try:
        start = raw.index("{")
        end = raw.rindex("}") + 1
        data = json.loads(raw[start:end])
        data["heat_score"] = _safe_int(data.get("heat_score"), 5)
        return data
    except (ValueError, json.JSONDecodeError):
        return {
            "heat_score": 5,
            "affected_scope": "解析失败",
            "spread_potential": "解析失败",
            "historical_similarity": "解析失败",
            "emotional_intensity": "解析失败",
            "overall_reason": "评估解析失败，默认5分",
        }


def generate_title(text: str) -> str:
    system = (
        "你是一个专业的事件标题生成助手。根据事件描述，生成一个简洁有力的事件标题。\n\n"
        "标题要求：\n"
        "1. 不超过20个字\n"
        "2. 突出事件核心要素（主体+行为+对象）\n"
        "3. 客观中立，不含主观评价\n"
        "4. 避免使用夸张或煽动性词语\n"
        "5. 便于快速理解事件性质\n\n"
        "直接输出标题，不要加引号或其他符号。"
    )
    return _chat(system, text)


def analyze_submission(text: str) -> dict:
    title = generate_title(text)
    classification = classify(text)
    summary = summarize(text)
    impact = assess_impact(text)
    return {
        "title": title,
        "classification": classification,
        "summary": summary,
        "impact": impact,
    }
