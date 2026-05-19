// ==UserScript==
// @name         AI投稿分析 - 网页热点事件采集助手
// @namespace    ai-submission-analyzer
// @version      3.0.0
// @description  一键提取网页热点事件内容，深度抓取热搜详情，可导出至AI投稿分析工具
// @author       AI Submission Analyzer
// @match        *://weibo.com/*
// @match        *://www.weibo.com/*
// @match        *://m.weibo.cn/*
// @match        *://www.zhihu.com/*
// @match        *://zhihu.com/*
// @match        *://top.baidu.com/*
// @match        *://www.baidu.com/s*
// @match        *://www.douyin.com/*
// @match        *://www.xiaohongshu.com/*
// @match        *://www.bilibili.com/*
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function () {
    "use strict";

    const TOOL_URL = "http://localhost:7860";
    const MAX_HOT_ITEMS = 10;
    const FETCH_DELAY = 800;
    const MAX_DETAIL_LENGTH = 500;

    const NOISE_SELECTORS = [
        "script", "style", "noscript", "iframe", "svg", "canvas",
        "nav", "header", "footer",
        ".ad", ".ads", ".advert", ".advertisement", ".sponsor",
        ".sidebar", ".side-bar", ".aside",
        ".comment", ".comments", ".comment-list",
        ".share", ".social-share", ".share-bar",
        ".related", ".recommend", ".recommend-list",
        ".popup", ".modal", ".dialog", ".overlay",
        ".cookie", ".cookie-banner", ".privacy",
        ".login", ".register", ".sign-in",
        ".toolbar", ".breadcrumb", ".pagination",
        ".notification", ".toast", ".alert",
        "[class*='banner']", "[class*='float']",
        "[class*='sticky']", "[class*='fixed']",
        "[id*='ad']", "[id*='sponsor']",
    ];

    const NOISE_PATTERNS = [
        /点击(?:查看|下载|关注|领取|购买)/g,
        /扫码(?:关注|下载|领取)/g,
        /关注(?:公众号|微博|抖音|视频号)/g,
        /更多(?:精彩|内容|视频)/g,
        /(?:长按|右键)(?:保存|识别|复制)/g,
        /(?:下载|打开)(?:APP|App|应用|客户端)/g,
        /查看(?:原文|更多|详情|完整)/g,
        /(?:来源|编辑|责编|作者)[:：]\s*/g,
        /(?:责任编辑|实习编辑|校对)[:：]\s*\S*/g,
        /(?:阅读|查看)(?:原文|更多)\s*[»>]/g,
        /^\s*(?:分享|收藏|点赞|评论)\s*$/gm,
        /^\s*\d+\s*(?:人|次|个)(?:赞同|喜欢|收藏|评论|转发|阅读)\s*$/gm,
        /^(?:上一篇|下一篇|返回)\s*$/gm,
        /^\s*(?:首页|上一页|下一页|末页)\s*$/gm,
        /(?:举报|投诉|反馈|意见)\s*$/gm,
        /^\s*[-—]{2,}\s*$/gm,
        /^\s*={2,}\s*$/gm,
    ];

    const SITE_CONFIGS = {
        "weibo.com": {
            name: "微博",
            selectors: {
                title: "h1, .detail_wbtext_4CRf3, .wbpro-text, .detail-text",
                content: ".detail_wbtext_4CRf3, .wbpro-text, .detail-text, .content",
                author: ".user-name, .name, .wbpro-nickname",
                hotList: ".hot-topic-list li, .wbpro-side-hot li, [class*='hot'] li, [class*='trend'] li",
            },
            detail: {
                title: "h1, .detail_wbtext_4CRf3, .wbpro-text",
                content: ".detail_wbtext_4CRf3, .wbpro-text, .detail-text, .content, .wbtext",
                author: ".user-name, .name, .wbpro-nickname",
            },
            linkSelector: "a[href*='/search'], a[href*='/topic'], a[href*='/detail'], a",
        },
        "m.weibo.cn": {
            name: "微博(移动)",
            selectors: {
                title: ".weibo-top, .m-text-box h3",
                content: ".weibo-text, .m-text-box",
                author: ".m-text-box .m-text-cut",
                hotList: ".card-wrap .card-group",
            },
            detail: {
                title: ".weibo-top, .m-text-box h3",
                content: ".weibo-text, .m-text-box",
                author: ".m-text-box .m-text-cut",
            },
            linkSelector: "a[href*='/detail'], a[href*='/search'], a",
        },
        "zhihu.com": {
            name: "知乎",
            selectors: {
                title: ".QuestionHeader-title, .ContentItem-title, h1",
                content: ".RichContent-inner, .Post-RichTextContainer, .RichText",
                author: ".AuthorInfo-name, .UserLink-link",
                hotList: ".HotList-list .HotItem",
            },
            detail: {
                title: ".QuestionHeader-title, h1, .ContentItem-title",
                content: ".RichContent-inner, .RichText, .Post-RichTextContainer",
                author: ".AuthorInfo-name, .UserLink-link",
            },
            linkSelector: "a[href*='/question/'], a[href*='/p/'], a",
        },
        "top.baidu.com": {
            name: "百度热搜",
            selectors: {
                title: ".c-single-text-ellipsis, .title-1qJcX, h1, .title",
                content: ".content_1YHmk, .desc, .content, .detail",
                author: ".source_1YHmk, .source",
                hotList: ".list_1EDla li, .hot-list li, [class*='list'] li",
            },
            detail: {
                title: "h1, .title, .c-single-text-ellipsis",
                content: ".content, .detail, .desc, article, .article-content",
                author: ".source, .author",
            },
            linkSelector: "a[href*='/s?'], a[href*='/detail'], a",
        },
        "douyin.com": {
            name: "抖音",
            selectors: {
                title: ".video-title, .title, h1",
                content: ".video-desc, .desc, .description",
                author: ".author-card .name, .author-name",
                hotList: ".trending-list li, [class*='hot'] li, [class*='trend'] li",
            },
            detail: {
                title: ".video-title, .title, h1",
                content: ".video-desc, .desc, .description",
                author: ".author-card .name, .author-name",
            },
            linkSelector: "a[href*='/video/'], a[href*='/trending'], a",
        },
        "xiaohongshu.com": {
            name: "小红书",
            selectors: {
                title: ".title, #detail-title, h1",
                content: ".desc, #detail-desc, .note-text, .content",
                author: ".author-wrapper .name, .user-name",
                hotList: ".hot-list li, [class*='hot'] li, [class*='trend'] li",
            },
            detail: {
                title: ".title, #detail-title, h1",
                content: ".desc, #detail-desc, .note-text, .content",
                author: ".author-wrapper .name, .user-name",
            },
            linkSelector: "a[href*='/explore/'], a[href*='/discovery/'], a",
        },
        "bilibili.com": {
            name: "B站",
            selectors: {
                title: ".video-title, h1.video-title, h1",
                content: ".desc-info-text, .basic-desc-info, .desc",
                author: ".up-name, .username",
                hotList: ".rank-list li, [class*='rank'] li, [class*='hot'] li",
            },
            detail: {
                title: ".video-title, h1, .title",
                content: ".desc-info-text, .basic-desc-info, .desc, .article-content",
                author: ".up-name, .username",
            },
            linkSelector: "a[href*='/video/'], a[href*='/read/'], a",
        },
    };

    function getSiteConfig() {
        const host = location.hostname;
        for (const [domain, cfg] of Object.entries(SITE_CONFIGS)) {
            if (host.includes(domain)) return cfg;
        }
        return null;
    }

    function removeNoise(container) {
        NOISE_SELECTORS.forEach((sel) => {
            try {
                container.querySelectorAll(sel).forEach((el) => el.remove());
            } catch (e) {}
        });
        container.querySelectorAll("[style]").forEach((el) => {
            const s = el.getAttribute("style") || "";
            if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/.test(s)) {
                el.remove();
            }
        });
        container.querySelectorAll("a, span, div").forEach((el) => {
            if (el.children.length === 0) {
                const t = el.textContent.trim();
                if (t.length <= 2 && !/[\u4e00-\u9fff]/.test(t)) {
                    el.remove();
                }
            }
        });
    }

    function cleanText(text) {
        let t = text;
        NOISE_PATTERNS.forEach((pat) => {
            t = t.replace(pat, "");
        });
        t = t.replace(/\n{3,}/g, "\n\n");
        t = t.replace(/[ \t]{4,}/g, "  ");
        t = t.split("\n")
            .map((line) => line.trim())
            .filter((line) => {
                if (!line) return false;
                if (/^\d+$/.test(line) && line.length <= 4) return false;
                if (/^[^\w\u4e00-\u9fff]+$/.test(line) && line.length <= 3) return false;
                return true;
            })
            .join("\n");
        return t.trim();
    }

    function extractTextFromContainer(container, selector) {
        const els = container.querySelectorAll(selector);
        if (!els.length) return "";
        const texts = [];
        els.forEach((el) => {
            const clone = el.cloneNode(true);
            removeNoise(clone);
            const t = clone.innerText.trim();
            if (t && t.length > 3) texts.push(t);
        });
        return texts.join("\n");
    }

    function extractText(selector) {
        const els = document.querySelectorAll(selector);
        if (!els.length) return "";
        const texts = [];
        els.forEach((el) => {
            const clone = el.cloneNode(true);
            removeNoise(clone);
            const t = clone.innerText.trim();
            if (t && t.length > 3) texts.push(t);
        });
        return texts.join("\n");
    }

    function extractCurrentPage() {
        const cfg = getSiteConfig();
        const result = {
            url: location.href,
            site: cfg ? cfg.name : "通用网页",
            title: "",
            content: "",
            author: "",
            timestamp: new Date().toLocaleString("zh-CN"),
        };

        if (cfg) {
            result.title = extractText(cfg.selectors.title).split("\n")[0] || "";
            result.content = extractText(cfg.selectors.content);
            result.author = extractText(cfg.selectors.author).split("\n")[0] || "";
        }

        if (!result.title) {
            result.title = document.title
                ? document.title.replace(/[-_|–].*/g, "").trim()
                : "未知标题";
        }
        if (!result.content) {
            const body = document.body.cloneNode(true);
            removeNoise(body);
            result.content = cleanText(body.innerText);
        }

        result.content = cleanText(result.content);
        return result;
    }

    function extractHotList() {
        const cfg = getSiteConfig();
        if (!cfg || !cfg.selectors.hotList) return [];

        const items = document.querySelectorAll(cfg.selectors.hotList);
        const hotItems = [];

        items.forEach((item, index) => {
            if (index >= MAX_HOT_ITEMS) return;
            const clone = item.cloneNode(true);
            removeNoise(clone);
            const text = clone.innerText.trim();
            if (!text) return;

            let link = "";
            const anchor = item.closest("a") || item.querySelector("a");
            if (anchor) {
                const href = anchor.getAttribute("href") || "";
                if (href && !href.startsWith("javascript")) {
                    link = href.startsWith("http") ? href : new URL(href, location.origin).href;
                }
            }

            hotItems.push({
                rank: index + 1,
                text: text.replace(/\n+/g, " ").substring(0, 200),
                link: link,
            });
        });

        return hotItems;
    }

    function fetchPage(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                timeout: 10000,
                headers: {
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "zh-CN,zh;q=0.9",
                },
                onload: (resp) => {
                    if (resp.status >= 200 && resp.status < 400) {
                        resolve(resp.responseText);
                    } else {
                        reject(new Error(`HTTP ${resp.status}`));
                    }
                },
                onerror: (err) => reject(err),
                ontimeout: () => reject(new Error("Timeout")),
            });
        });
    }

    function parseHTML(html) {
        const parser = new DOMParser();
        return parser.parseFromString(html, "text/html");
    }

    function extractDetailFromDoc(doc, url) {
        const cfg = getSiteConfig();
        const result = { title: "", content: "", author: "", url: url };

        if (cfg && cfg.detail) {
            result.title = extractTextFromContainer(doc, cfg.detail.title).split("\n")[0] || "";
            result.content = extractTextFromContainer(doc, cfg.detail.content);
            result.author = extractTextFromContainer(doc, cfg.detail.author).split("\n")[0] || "";
        }

        if (!result.title) {
            const titleEl = doc.querySelector("h1, title");
            result.title = titleEl
                ? titleEl.textContent.trim().replace(/[-_|–].*/g, "").trim()
                : "";
        }

        if (!result.content) {
            const body = doc.body;
            if (body) {
                const clone = body.cloneNode(true);
                removeNoise(clone);
                result.content = cleanText(clone.innerText);
            }
        }

        result.content = cleanText(result.content);
        return result;
    }

    async function deepExtractHotList(onProgress) {
        const hotItems = extractHotList();
        if (!hotItems.length) return [];

        const results = [];
        for (let i = 0; i < hotItems.length; i++) {
            const item = hotItems[i];
            onProgress(`正在抓取第 ${i + 1}/${hotItems.length} 条：${item.text.substring(0, 30)}...`);

            if (item.link) {
                try {
                    const html = await fetchPage(item.link);
                    const doc = parseHTML(html);
                    const detail = extractDetailFromDoc(doc, item.link);
                    results.push({
                        ...item,
                        detailTitle: detail.title || item.text,
                        detailContent: detail.content.substring(0, MAX_DETAIL_LENGTH),
                        detailAuthor: detail.author,
                    });
                } catch (e) {
                    results.push({
                        ...item,
                        detailTitle: item.text,
                        detailContent: "",
                        detailAuthor: "",
                    });
                }
            } else {
                results.push({
                    ...item,
                    detailTitle: item.text,
                    detailContent: "",
                    detailAuthor: "",
                });
            }

            if (i < hotItems.length - 1) {
                await new Promise((r) => setTimeout(r, FETCH_DELAY));
            }
        }

        onProgress(`✅ 深度提取完成，共 ${results.length} 条`);
        return results;
    }

    function buildEventDescription(data) {
        let desc = "";
        if (data.title) desc += `【${data.title}】\n`;
        if (data.author) desc += `来源：${data.author} | `;
        desc += `平台：${data.site}\n`;
        desc += `时间：${data.timestamp}\n`;
        desc += `链接：${data.url}\n\n`;
        if (data.content) {
            const maxLen = 4500;
            desc +=
                data.content.length > maxLen
                    ? data.content.substring(0, maxLen) + "\n...(内容过长已截断)"
                    : data.content;
        }
        return desc;
    }

    function buildHotListDescription(hotItems) {
        if (!hotItems.length) return "当前页面未检测到热搜列表";
        let desc = `【${location.hostname} 热搜榜单】\n`;
        desc += `采集时间：${new Date().toLocaleString("zh-CN")}\n\n`;
        hotItems.forEach((item) => {
            desc += `${item.rank}. ${item.text}\n`;
        });
        return desc;
    }

    function buildDeepHotListDescription(results) {
        if (!results.length) return "当前页面未检测到热搜列表";
        let desc = `【${location.hostname} 热搜深度报告】\n`;
        desc += `采集时间：${new Date().toLocaleString("zh-CN")}\n`;
        desc += `共提取 ${results.length} 条热搜详情\n`;
        desc += `${"═".repeat(40)}\n\n`;

        results.forEach((item) => {
            desc += `━━━ 第${item.rank}条 ━━━\n`;
            desc += `📌 标题：${item.detailTitle}\n`;
            if (item.detailAuthor) desc += `👤 来源：${item.detailAuthor}\n`;
            if (item.link) desc += `🔗 链接：${item.link}\n`;
            if (item.detailContent) {
                desc += `📰 内容摘要：\n${item.detailContent}\n`;
            } else {
                desc += `📰 内容摘要：未能提取到详情内容\n`;
            }
            desc += "\n";
        });

        return desc;
    }

    let panelVisible = false;
    let panel = null;

    function createPanel() {
        if (panel) {
            panel.remove();
            panel = null;
        }

        panel = document.createElement("div");
        panel.id = "ai-analyzer-panel";
        panel.innerHTML = `
            <div class="ai-panel-header">
                <span class="ai-panel-title">🔍 投稿采集助手</span>
                <button class="ai-panel-close" id="ai-panel-close">✕</button>
            </div>
            <div class="ai-panel-body">
                <div class="ai-section">
                    <div class="ai-section-title">📌 当前页面内容</div>
                    <textarea id="ai-extracted-content" rows="10" placeholder="点击下方按钮提取内容..."></textarea>
                </div>
                <div class="ai-section">
                    <div class="ai-section-title">📋 操作</div>
                    <div class="ai-btn-group">
                        <button class="ai-btn ai-btn-primary" id="ai-btn-extract">📄 提取当前页</button>
                        <button class="ai-btn ai-btn-secondary" id="ai-btn-hotlist">🔥 热搜列表</button>
                    </div>
                    <div class="ai-btn-group" style="margin-top:8px">
                        <button class="ai-btn ai-btn-deep" id="ai-btn-deep">🔎 深度提取热搜</button>
                    </div>
                    <div class="ai-btn-group" style="margin-top:8px">
                        <button class="ai-btn ai-btn-outline" id="ai-btn-copy">📋 复制内容</button>
                        <button class="ai-btn ai-btn-outline" id="ai-btn-export-txt">💾 导出TXT</button>
                    </div>
                    <div class="ai-btn-group" style="margin-top:8px">
                        <button class="ai-btn ai-btn-accent" id="ai-btn-send">🚀 发送到分析工具</button>
                    </div>
                </div>
                <div class="ai-section">
                    <div class="ai-section-title">📊 提取状态</div>
                    <div id="ai-status" class="ai-status">就绪</div>
                    <div id="ai-progress-wrap" class="ai-progress-wrap" style="display:none">
                        <div id="ai-progress-bar" class="ai-progress-bar"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        document.getElementById("ai-panel-close").addEventListener("click", hidePanel);

        document.getElementById("ai-btn-extract").addEventListener("click", () => {
            const data = extractCurrentPage();
            const desc = buildEventDescription(data);
            document.getElementById("ai-extracted-content").value = desc;
            updateStatus("✅ 当前页面内容已提取");
        });

        document.getElementById("ai-btn-hotlist").addEventListener("click", () => {
            const items = extractHotList();
            const desc = buildHotListDescription(items);
            document.getElementById("ai-extracted-content").value = desc;
            updateStatus(
                items.length
                    ? `✅ 已提取 ${items.length} 条热搜标题`
                    : "⚠️ 未检测到热搜列表"
            );
        });

        document.getElementById("ai-btn-deep").addEventListener("click", async () => {
            const btn = document.getElementById("ai-btn-deep");
            btn.disabled = true;
            btn.textContent = "⏳ 提取中...";
            showProgress();

            try {
                const results = await deepExtractHotList((msg) => {
                    updateStatus(msg);
                    const match = msg.match(/第\s*(\d+)\/(\d+)\s*条/);
                    if (match) {
                        setProgress(parseInt(match[1]) / parseInt(match[2]) * 100);
                    }
                });
                const desc = buildDeepHotListDescription(results);
                document.getElementById("ai-extracted-content").value = desc;
                const successCount = results.filter((r) => r.detailContent).length;
                updateStatus(
                    `✅ 深度提取完成：共${results.length}条，成功提取${successCount}条详情`
                );
            } catch (e) {
                updateStatus("❌ 深度提取失败：" + e.message);
            } finally {
                btn.disabled = false;
                btn.textContent = "🔎 深度提取热搜";
                setTimeout(hideProgress, 2000);
            }
        });

        document.getElementById("ai-btn-copy").addEventListener("click", () => {
            const content = document.getElementById("ai-extracted-content").value;
            if (!content) {
                updateStatus("⚠️ 没有可复制的内容");
                return;
            }
            navigator.clipboard.writeText(content).then(() => {
                updateStatus("✅ 已复制到剪贴板");
            });
        });

        document.getElementById("ai-btn-send").addEventListener("click", () => {
            const content = document.getElementById("ai-extracted-content").value;
            if (!content) {
                updateStatus("⚠️ 没有可发送的内容");
                return;
            }
            GM_setValue("pending_submission", content);
            const w = window.open(TOOL_URL, "_blank");
            if (w) {
                updateStatus("✅ 已在新标签页打开分析工具");
            } else {
                updateStatus("⚠️ 弹窗被拦截，请手动打开 " + TOOL_URL);
            }
        });

        document.getElementById("ai-btn-export-txt").addEventListener("click", () => {
            const content = document.getElementById("ai-extracted-content").value;
            if (!content) {
                updateStatus("⚠️ 没有可导出的内容");
                return;
            }
            const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `投稿采集_${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            updateStatus("✅ TXT文件已下载");
        });
    }

    function updateStatus(msg) {
        const el = document.getElementById("ai-status");
        if (el) el.textContent = msg;
    }

    function showProgress() {
        const wrap = document.getElementById("ai-progress-wrap");
        if (wrap) wrap.style.display = "block";
        setProgress(0);
    }

    function hideProgress() {
        const wrap = document.getElementById("ai-progress-wrap");
        if (wrap) wrap.style.display = "none";
    }

    function setProgress(pct) {
        const bar = document.getElementById("ai-progress-bar");
        if (bar) bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
    }

    function showPanel() {
        if (!panel) createPanel();
        panel.classList.add("ai-panel-visible");
        panelVisible = true;
    }

    function hidePanel() {
        if (panel) panel.classList.remove("ai-panel-visible");
        panelVisible = false;
    }

    function togglePanel() {
        if (panelVisible) hidePanel();
        else showPanel();
    }

    GM_addStyle(`
        #ai-analyzer-panel {
            position: fixed;
            top: 50%;
            right: -420px;
            transform: translateY(-50%);
            width: 400px;
            max-height: 80vh;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.04);
            z-index: 999999;
            font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
            transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            color: #0f172a;
        }
        #ai-analyzer-panel.ai-panel-visible {
            right: 20px;
        }
        .ai-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 18px;
            background: linear-gradient(135deg, #2563eb, #3b82f6);
        }
        .ai-panel-title {
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
        }
        .ai-panel-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: #ffffff;
            font-size: 15px;
            cursor: pointer;
            padding: 2px 8px;
            border-radius: 6px;
            transition: background 0.15s;
        }
        .ai-panel-close:hover {
            background: rgba(255, 255, 255, 0.35);
        }
        .ai-panel-body {
            padding: 16px;
            overflow-y: auto;
            max-height: calc(80vh - 50px);
        }
        .ai-section {
            margin-bottom: 14px;
        }
        .ai-section-title {
            font-size: 12px;
            font-weight: 700;
            color: #475569;
            margin-bottom: 8px;
            letter-spacing: 0.04em;
        }
        #ai-extracted-content {
            width: 100%;
            min-height: 160px;
            padding: 10px 12px;
            background: #f8fafc;
            border: 1.5px solid #e2e8f0;
            border-radius: 10px;
            color: #0f172a;
            font-size: 13px;
            line-height: 1.6;
            resize: vertical;
            font-family: inherit;
            box-sizing: border-box;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        #ai-extracted-content:focus {
            outline: none;
            border-color: #60a5fa;
            box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
            background: #ffffff;
        }
        #ai-extracted-content::placeholder {
            color: #94a3b8;
        }
        .ai-btn-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .ai-btn {
            padding: 9px 12px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid #e2e8f0;
            background: #ffffff;
            color: #2563eb;
            transition: all 0.15s ease;
            text-align: center;
        }
        .ai-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(37,99,235,0.12);
            border-color: #bfdbfe;
        }
        .ai-btn:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: none;
        }
        .ai-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .ai-btn-primary {
            background: #2563eb;
            border-color: #2563eb;
            color: #ffffff;
        }
        .ai-btn-primary:hover:not(:disabled) {
            background: #1d4ed8;
            border-color: #1d4ed8;
            box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        }
        .ai-btn-secondary {
            background: #f97316;
            border-color: #f97316;
            color: #ffffff;
        }
        .ai-btn-secondary:hover:not(:disabled) {
            background: #ea580c;
            border-color: #ea580c;
            box-shadow: 0 4px 12px rgba(249,115,22,0.3);
        }
        .ai-btn-deep {
            background: #7c3aed;
            border-color: #7c3aed;
            color: #ffffff;
            grid-column: span 2;
            box-shadow: 0 2px 8px rgba(124,58,237,0.25);
        }
        .ai-btn-deep:hover:not(:disabled) {
            background: #6d28d9;
            border-color: #6d28d9;
            box-shadow: 0 4px 14px rgba(124,58,237,0.35);
        }
        .ai-btn-outline {
            background: #ffffff;
            border-color: #e2e8f0;
            color: #475569;
        }
        .ai-btn-outline:hover:not(:disabled) {
            border-color: #93c5fd;
            color: #2563eb;
            background: #eff6ff;
        }
        .ai-btn-accent {
            background: #2563eb;
            border-color: #2563eb;
            color: #ffffff;
            grid-column: span 2;
            box-shadow: 0 2px 8px rgba(37,99,235,0.25);
        }
        .ai-btn-accent:hover:not(:disabled) {
            background: #1d4ed8;
            border-color: #1d4ed8;
            box-shadow: 0 4px 16px rgba(37,99,235,0.35);
        }
        .ai-status {
            padding: 8px 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 12px;
            color: #475569;
        }
        .ai-progress-wrap {
            margin-top: 8px;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
        }
        .ai-progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #2563eb, #7c3aed);
            border-radius: 3px;
            transition: width 0.3s ease;
        }
    `);

    const floatingBtn = document.createElement("div");
    floatingBtn.id = "ai-analyzer-fab";
    floatingBtn.innerHTML = "🔍";
    floatingBtn.title = "AI投稿采集助手";
    floatingBtn.addEventListener("click", togglePanel);
    document.body.appendChild(floatingBtn);

    GM_addStyle(`
        #ai-analyzer-fab {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: #2563eb;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            cursor: pointer;
            z-index: 999998;
            box-shadow: 0 2px 12px rgba(37,99,235,0.35);
            transition: all 0.2s ease;
            border: none;
            user-select: none;
        }
        #ai-analyzer-fab:hover {
            background: #1d4ed8;
            transform: scale(1.08);
            box-shadow: 0 4px 20px rgba(37,99,235,0.45);
        }
        #ai-analyzer-fab:active {
            transform: scale(0.95);
        }
    `);

    GM_registerMenuCommand("🔍 打开采集助手", showPanel);
    GM_registerMenuCommand("📄 提取当前页面", () => {
        const data = extractCurrentPage();
        const desc = buildEventDescription(data);
        GM_setClipboard(desc, "text");
        alert("页面内容已提取并复制到剪贴板！\n\n可粘贴到AI投稿分析工具中使用。");
    });
    GM_registerMenuCommand("🔥 提取热搜榜单", () => {
        const items = extractHotList();
        if (items.length) {
            const desc = buildHotListDescription(items);
            GM_setClipboard(desc, "text");
            alert(`已提取 ${items.length} 条热搜并复制到剪贴板！`);
        } else {
            alert("当前页面未检测到热搜列表。");
        }
    });
})();
