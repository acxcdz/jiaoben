// ==UserScript==
// @name          16进制颜色预览与查询工具
// @namespace     https://viayoo.com/
// @version       2.7.3.1
// @description   提供16进制颜色预览、调试及全网常见颜色展示。支持单色和双色预览，颜色按分组排序。
// @author        是小白呀
// @match         *://*/*
// @license       MIT
// @grant         GM_registerMenuCommand
// @grant         GM_setClipboard
// @run-at        document-end
// ==/UserScript==

(function() {
    'use strict';

    // ========== 颜色分组数据 ==========
    const colorGroups = [
        {
            group: "红色 🔴",
            colors: [
                { code: "#FF0000", name: "红色" },
                { code: "#DC143C", name: "猩红" },
                { code: "#B22222", name: "火砖红" },
                { code: "#8B0000", name: "深红" },
                { code: "#FF4500", name: "橙红" },
                { code: "#FF6347", name: "番茄红" },
                { code: "#CD5C5C", name: "印度红" },
                { code: "#FF6B6B", name: "浅珊瑚红" },
                { code: "#E32636", name: "茜红" }
            ]
        },
        {
            group: "粉色系 💗",
            colors: [
                { code: "#FFC0CB", name: "粉色" },
                { code: "#F7CAC9", name: "樱花粉" },
                { code: "#FFB6C1", name: "浅粉色" },
                { code: "#FF69B4", name: "热情粉" },
                { code: "#FF1493", name: "深粉" },
                { code: "#C71585", name: "中紫红" },
                { code: "#DB7093", name: "淡玫瑰色" },
                { code: "#FF007F", name: "玫瑰红" },
                { code: "#FA8072", name: "鲑鱼粉" },
                { code: "#B0C7E2", name: "灰雾蓝粉" },
                { code: "#FF99CC", name: "泡泡糖粉" },
                { code: "#FF77FF", name: "霓虹粉" }
            ]
        },
        {
            group: "橙色 🟠",
            colors: [
                { code: "#FFA500", name: "橙色" },
                { code: "#FF8C00", name: "深橙" },
                { code: "#FF7F50", name: "珊瑚橙" },
                { code: "#FFA07A", name: "浅橙" },
                { code: "#FFDAB9", name: "桃橙" },
                { code: "#FF8243", name: "芒果橙" }
            ]
        },
        {
            group: "黄色 🟡",
            colors: [
                { code: "#FFFF00", name: "黄色" },
                { code: "#FFD700", name: "金黄" },
                { code: "#FFFFE0", name: "浅黄色" },
                { code: "#FFFACD", name: "柠檬绸" },
                { code: "#F0E68C", name: "卡其色" },
                { code: "#FFE4B5", name: "鹿皮色" },
                { code: "#FFDAB9", name: "桃色" },
                { code: "#FADA5E", name: "玉米黄" },
                { code: "#FFDB58", name: "芥末黄" }
            ]
        },
        {
            group: "绿色 🟢",
            colors: [
                { code: "#008000", name: "绿色" },
                { code: "#00FF00", name: "酸橙绿" },
                { code: "#228B22", name: "森林绿" },
                { code: "#98FB98", name: "苍绿色" },
                { code: "#90EE90", name: "淡绿色" },
                { code: "#3CB371", name: "海洋绿" },
                { code: "#2E8B57", name: "海绿" },
                { code: "#006400", name: "深绿色" },
                { code: "#00FF7F", name: "春绿" },
                { code: "#C7EDCC", name: "豆沙绿" },
                { code: "#32CD32", name: "酸橙绿 (LimeGreen)" },
                { code: "#9ACD32", name: "黄绿" },
                { code: "#556B2F", name: "橄榄绿" }
            ]
        },
        {
            group: "青色 🔵",
            colors: [
                { code: "#00FFFF", name: "青色" },
                { code: "#E0FFFF", name: "淡青色" },
                { code: "#40E0D0", name: "绿松石" },
                { code: "#48D1CC", name: "中绿松石" },
                { code: "#00CED1", name: "暗绿松石" },
                { code: "#7FFFD4", name: "水绿宝石" },
                { code: "#AFEEEE", name: "碧绿色" },
                { code: "#00FFEF", name: "电青色" },
                { code: "#20B2AA", name: "浅海洋绿" }
            ]
        },
        {
            group: "蓝色 🔷",
            colors: [
                { code: "#0000FF", name: "蓝色" },
                { code: "#4169E1", name: "皇家蓝" },
                { code: "#1E90FF", name: "道奇蓝" },
                { code: "#00BFFF", name: "深天蓝" },
                { code: "#87CEEB", name: "天蓝" },
                { code: "#87CEFA", name: "淡天蓝" },
                { code: "#4682B4", name: "钢蓝" },
                { code: "#ADD8E6", name: "淡蓝色" },
                { code: "#B0E0E6", name: "粉蓝" },
                { code: "#191970", name: "午夜蓝" },
                { code: "#000080", name: "藏青色" },
                { code: "#6A5ACD", name: "石板蓝" },
                { code: "#7B68EE", name: "中石板蓝" }
            ]
        },
        {
            group: "紫色 🟣",
            colors: [
                { code: "#800080", name: "紫色" },
                { code: "#EE82EE", name: "紫罗兰" },
                { code: "#DA70D6", name: "兰花紫" },
                { code: "#DDA0DD", name: "李子紫" },
                { code: "#9370DB", name: "中紫" },
                { code: "#8A2BE2", name: "蓝紫色" },
                { code: "#9400D3", name: "深紫罗兰" },
                { code: "#9932CC", name: "暗兰花紫" },
                { code: "#8B008B", name: "暗品红" },
                { code: "#4B0082", name: "靛蓝" },
                { code: "#BA55D3", name: "中兰花紫" },
                { code: "#D8BFD8", name: "蓟色" },
                { code: "#E6E6FA", name: "薰衣草紫" } // 新增
            ]
        },
        {
            group: "黑白 ⚫⚪",
            colors: [
                { code: "#000000", name: "黑色" },
                { code: "#FFFFFF", name: "白色" },
                { code: "#C0C0C0", name: "银色" },
                { code: "#808080", name: "灰色" },
                { code: "#D3D3D3", name: "浅灰" },
                { code: "#A9A9A9", name: "暗灰" }
            ]
        },
        {
            group: "透明色 🟤",
            colors: [
                { code: "#00000000", name: "透明黑" },
                { code: "#FFFFFF00", name: "透明白" },
                { code: "#00000080", name: "半透明黑" },
                { code: "#FF000080", name: "半透明红" },
                { code: "#00FF0080", name: "半透明绿" }
            ]
        },
        {
            group: "棕色系 🟤",
            colors: [
                { code: "#A52A2A", name: "棕色" },
                { code: "#8B4513", name: "马鞍棕" },
                { code: "#D2691E", name: "巧克力棕" },
                { code: "#CD853F", name: "秘鲁棕" },
                { code: "#DEB887", name: "陶土棕" }
            ]
        }
    ];

    // 累积颜色映射，不去除重复，名称以 " / " 分隔
    const colorMapping = {};
    colorGroups.forEach(group => {
        group.colors.forEach(item => {
            const upperCode = item.code.toUpperCase();
            if (colorMapping[upperCode]) {
                if (!colorMapping[upperCode].includes(item.name)) {
                    colorMapping[upperCode] += " / " + item.name;
                }
            } else {
                colorMapping[upperCode] = item.name;
            }
        });
    });

    // 工具函数：创建元素
    function createElement(tag, className, innerHTML) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (innerHTML) el.innerHTML = innerHTML;
        return el;
    }

    // 添加全局样式
    function addGlobalStyle(css) {
        const head = document.head || document.getElementsByTagName('head')[0];
        if (!head) return;
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    const globalCSS = `
    :root {
      --bg-overlay: rgba(0,0,0,0.7);
      --modal-bg: #fff;
      --modal-text: #333;
      --input-bg: #fff;
      --input-text: #333;
      --border-color: #ccc;
      --button-bg: #007BFF;
      --button-text: #fff;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg-overlay: rgba(0,0,0,0.85);
        --modal-bg: #1e1e1e;
        --modal-text: #e0e0e0;
        --input-bg: #333;
        --input-text: #e0e0e0;
        --border-color: #555;
        --button-bg: #0A84FF;
        --button-text: #fff;
      }
    }
    .theme-light {
      --bg-overlay: rgba(0,0,0,0.7);
      --modal-bg: #fff;
      --modal-text: #333;
      --input-bg: #fff;
      --input-text: #333;
      --border-color: #ccc;
      --button-bg: #007BFF;
      --button-text: #fff;
    }
    .theme-dark {
      --bg-overlay: rgba(0,0,0,0.85);
      --modal-bg: #1e1e1e;
      --modal-text: #e0e0e0;
      --input-bg: #333;
      --input-text: #e0e0e0;
      --border-color: #555;
      --button-bg: #0A84FF;
      --button-text: #fff;
    }
    .color-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--bg-overlay);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    }
    .color-modal {
        background: var(--modal-bg);
        color: var(--modal-text);
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        padding: 20px;
        max-width: 95%;
        max-height: 95%;
        overflow-y: auto;
        position: relative;
    }
    .color-modal h2 {
        margin-top: 0;
        font-size: 26px;
        text-align: center;
        margin-bottom: 20px;
    }
    .theme-toggle {
        position: absolute;
        top: 10px;
        left: 10px;
        padding: 5px 10px;
        border: none;
        border-radius: 5px;
        background: var(--button-bg);
        color: var(--button-text);
        cursor: pointer;
        font-size: 14px;
    }
    .close-button {
        position: absolute;
        top: 10px;
        right: 10px;
        background: var(--modal-text);
        color: var(--modal-bg);
        border: none;
        border-radius: 5px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 14px;
    }
    .mode-toggle {
        text-align: center;
        margin: 10px 0;
    }
    .mode-toggle label {
        margin: 0 10px;
        font-size: 16px;
        cursor: pointer;
    }
    .input-group {
        margin: 10px 0;
        text-align: center;
    }
    .input-group input {
        width: 60%;
        padding: 8px;
        font-size: 16px;
        background: var(--input-bg);
        color: var(--input-text);
        border: 1px solid var(--border-color);
        border-radius: 5px;
        margin-bottom: 5px;
    }
    .input-group button {
        padding: 8px 16px;
        font-size: 16px;
        margin: 5px 5px;
        border: none;
        border-radius: 5px;
        background: var(--button-bg);
        color: var(--button-text);
        cursor: pointer;
    }
    .color-item {
        display: inline-block;
        width: 120px;
        margin: 10px;
        text-align: center;
        position: relative;
    }
    .color-swatch {
        width: 120px;
        height: 120px;
        line-height: 120px;
        border-radius: 8px;
        color: var(--modal-bg);
        font-weight: bold;
        margin-bottom: 5px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        cursor: pointer;
        border: 1px solid var(--border-color);
    }
    .copy-tooltip {
        pointer-events: none;
        opacity: 0.9;
    }
    .error-message {
        color: red;
        font-size: 14px;
        margin-top: 5px;
        text-align: center;
        animation: fadeIn 0.5s ease-in-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    .search-group {
        margin: 10px 0 20px 0;
        text-align: center;
    }
    .search-group input {
        width: 70%;
        padding: 8px;
        font-size: 16px;
        border: 1px solid var(--border-color);
        border-radius: 5px;
        background: var(--input-bg);
        color: var(--input-text);
    }
    .color-group {
        margin-bottom: 20px;
    }
    .group-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
        cursor: pointer;
    }
    .group-title::before {
        content: '▼ ';
        font-size: 14px;
    }
    .group-title.collapsed::before {
        content: '▶ ';
    }
    .color-list {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
    }
    .color-list.hidden {
        display: none;
    }
    @media only screen and (orientation: portrait) {
      .preview-container, .content-container {
        text-align: center !important;
      }
      .close-button {
        position: absolute !important;
        top: 10px !important;
        right: 10px !important;
      }
      .theme-toggle {
        position: absolute !important;
        top: 10px !important;
        left: 10px !important;
      }
    }
    `;
    addGlobalStyle(globalCSS);

    // ========== 主题模式逻辑 ==========
    const themeModes = ["auto", "light", "dark"];
    let currentMode = localStorage.getItem('tmColorPreviewTheme') || "auto";

    function updateTheme(modal, mode) {
        modal.classList.remove("theme-light", "theme-dark");
        if (mode === "light") {
            modal.classList.add("theme-light");
        } else if (mode === "dark") {
            modal.classList.add("theme-dark");
        }
    }

    function createThemeToggleButton(modal) {
        const btn = createElement("button", "theme-toggle", "");
        btn.setAttribute("aria-label", "切换主题");
        function refreshButtonText() {
            btn.innerHTML = "主题: " + (currentMode === "auto" ? "自动" : (currentMode === "light" ? "浅色" : "深色"));
        }
        refreshButtonText();
        updateTheme(modal, currentMode);

        btn.addEventListener('click', () => {
            const idx = themeModes.indexOf(currentMode);
            currentMode = themeModes[(idx + 1) % themeModes.length];
            refreshButtonText();
            updateTheme(modal, currentMode);
            localStorage.setItem('tmColorPreviewTheme', currentMode);
        });
        modal.appendChild(btn);
    }

    // ========== 防抖函数 ==========
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // ========== 复制文本函数 ==========
    function copyText(text) {
        if (typeof GM_setClipboard !== "undefined") {
            try {
                GM_setClipboard(text);
                return Promise.resolve();
            } catch (err) {
                return Promise.reject(err);
            }
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('复制失败', err);
            }
            document.body.removeChild(textarea);
            return Promise.resolve();
        }
    }

    // ========== 颜色代码校验与扩展 ==========
    function normalizeColorCode(code) {
        code = code.trim().toUpperCase();
        if (!code.startsWith("#")) {
            code = "#" + code;
        }
        if (/^#[0-9A-F]{3}$/.test(code)) {
            code = "#" + code.slice(1).split('').map(ch => ch + ch).join('');
        }
        return code;
    }

    function isValidColorCode(code) {
        return /^#[0-9A-F]{6}([0-9A-F]{2})?$/.test(code);
    }

    // ========== 调试16进制颜色预览与调试UI ==========
    function showDebugColorUI() {
        const overlay = createElement('div', 'color-overlay');
        overlay.setAttribute("role", "dialog");
        const modal = createElement('div', 'color-modal');
        overlay.appendChild(modal);

        createThemeToggleButton(modal);

        const closeBtn = createElement('button', 'close-button', '关闭');
        closeBtn.setAttribute("aria-label", "关闭预览窗口");
        closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
        modal.appendChild(closeBtn);

        const title = createElement('h2', '', '16进制颜色预览与调试');
        modal.appendChild(title);

        // ===== 预览模式切换 =====
        const modeToggle = createElement('div', 'mode-toggle');
        modeToggle.innerHTML = `
            <label>
                <input type="radio" name="previewMode" value="single" checked> 单色预览
            </label>
            <label>
                <input type="radio" name="previewMode" value="dual"> 双色预览
            </label>
        `;
        modal.appendChild(modeToggle);

        // 容器：根据模式显示不同的输入区域
        const inputContainer = createElement('div', 'input-container');
        modal.appendChild(inputContainer);

        // 单色输入组（默认显示）
        const singleInputGroup = createElement('div', 'input-group');
        const singleInput = document.createElement('input');
        singleInput.type = 'text';
        singleInput.placeholder = '#C7EDCC 或 #FFF';
        singleInputGroup.appendChild(singleInput);
        inputContainer.appendChild(singleInputGroup);

        // 双色输入组（初始隐藏）
        const dualInputGroup = createElement('div', 'input-group');
        dualInputGroup.style.display = 'none';
        const dualInput1 = document.createElement('input');
        dualInput1.type = 'text';
        dualInput1.placeholder = '#C7EDCC 或 #FFF';
        dualInputGroup.appendChild(dualInput1);
        const dualInput2 = document.createElement('input');
        dualInput2.type = 'text';
        dualInput2.placeholder = '#1E90FF 或 #00F';
        dualInputGroup.appendChild(dualInput2);
        inputContainer.appendChild(dualInputGroup);

        // 生成预览、清空预览按钮区域
        const btnGroup = createElement('div', 'input-group');
        const generateBtn = createElement('button', '', '生成预览');
        generateBtn.setAttribute("aria-label", "生成颜色预览");
        btnGroup.appendChild(generateBtn);
        const clearBtn = createElement('button', '', '清空预览');
        clearBtn.setAttribute("aria-label", "清空颜色预览");
        btnGroup.appendChild(clearBtn);
        modal.appendChild(btnGroup);

        const errorMsg = createElement('div', 'error-message', '');
        errorMsg.setAttribute("aria-live", "assertive");
        modal.appendChild(errorMsg);

        const previewContainer = createElement('div', 'preview-container');
        previewContainer.style.textAlign = 'center';
        modal.appendChild(previewContainer);

        // 预览模式切换事件
        modeToggle.addEventListener('change', (e) => {
            const mode = document.querySelector('input[name="previewMode"]:checked').value;
            if (mode === 'single') {
                singleInputGroup.style.display = '';
                dualInputGroup.style.display = 'none';
            } else {
                singleInputGroup.style.display = 'none';
                dualInputGroup.style.display = '';
            }
            errorMsg.innerHTML = '';
            previewContainer.innerHTML = '';
        });

        // 支持输入框回车触发生成预览（分别对单色与双色）
        singleInput.addEventListener('keydown', (e) => {
            if (e.key === "Enter") {
                generateBtn.click();
            }
        });
        dualInput1.addEventListener('keydown', (e) => {
            if (e.key === "Enter") {
                generateBtn.click();
            }
        });
        dualInput2.addEventListener('keydown', (e) => {
            if (e.key === "Enter") {
                generateBtn.click();
            }
        });

        // 生成预览事件，根据当前预览模式处理
        generateBtn.addEventListener('click', () => {
            previewContainer.innerHTML = '';
            errorMsg.innerHTML = '';
            const mode = document.querySelector('input[name="previewMode"]:checked').value;
            if (mode === 'single') {
                const inputText = singleInput.value.trim();
                if (!inputText) return;
                let code = normalizeColorCode(inputText);
                if (!isValidColorCode(code)) {
                    errorMsg.innerHTML = "无效的颜色代码: " + inputText;
                    return;
                }
                const item = createElement('div', 'color-item');
                const swatch = createElement('div', 'color-swatch', code);
                swatch.style.backgroundColor = code;
                swatch.addEventListener('click', () => {
                    const existingTooltip = item.querySelector('.copy-tooltip');
                    if (existingTooltip) { existingTooltip.remove(); }
                    copyText(code).then(() => {
                        const tooltip = createElement('div', 'copy-tooltip', '已复制');
                        tooltip.style.position = 'absolute';
                        tooltip.style.backgroundColor = 'rgba(0,0,0,0.6)';
                        tooltip.style.color = '#fff';
                        tooltip.style.padding = '2px 5px';
                        tooltip.style.borderRadius = '3px';
                        tooltip.style.fontSize = '12px';
                        tooltip.style.top = '0';
                        tooltip.style.left = '50%';
                        tooltip.style.transform = 'translateX(-50%)';
                        item.appendChild(tooltip);
                        setTimeout(() => { if(item.contains(tooltip)) item.removeChild(tooltip); }, 1000);
                    }).catch(() => {
                        const tooltip = createElement('div', 'copy-tooltip', '复制失败');
                        tooltip.style.position = 'absolute';
                        tooltip.style.backgroundColor = 'rgba(255,0,0,0.6)';
                        tooltip.style.color = '#fff';
                        tooltip.style.padding = '2px 5px';
                        tooltip.style.borderRadius = '3px';
                        tooltip.style.fontSize = '12px';
                        tooltip.style.top = '0';
                        tooltip.style.left = '50%';
                        tooltip.style.transform = 'translateX(-50%)';
                        item.appendChild(tooltip);
                        setTimeout(() => { if(item.contains(tooltip)) item.removeChild(tooltip); }, 1000);
                    });
                });
                item.appendChild(swatch);
                const nameDiv = createElement('div', '', colorMapping[code] || '未知颜色');
                item.appendChild(nameDiv);
                previewContainer.appendChild(item);
            } else { // dual 模式
                const code1 = normalizeColorCode(dualInput1.value.trim());
                const code2 = normalizeColorCode(dualInput2.value.trim());
                let invalid = [];
                if (!isValidColorCode(code1)) { invalid.push(dualInput1.value.trim()); }
                if (!isValidColorCode(code2)) { invalid.push(dualInput2.value.trim()); }
                if (invalid.length > 0) {
                    errorMsg.innerHTML = "无效的颜色代码: " + invalid.join(', ');
                    return;
                }
                // 预览颜色1
                const item1 = createElement('div', 'color-item');
                const swatch1 = createElement('div', 'color-swatch', code1);
                swatch1.style.backgroundColor = code1;
                swatch1.addEventListener('click', () => {
                    const existingTooltip = item1.querySelector('.copy-tooltip');
                    if (existingTooltip) { existingTooltip.remove(); }
                    copyText(code1).then(() => {
                        const tooltip = createElement('div', 'copy-tooltip', '已复制');
                        tooltip.style.position = 'absolute';
                        tooltip.style.backgroundColor = 'rgba(0,0,0,0.6)';
                        tooltip.style.color = '#fff';
                        tooltip.style.padding = '2px 5px';
                        tooltip.style.borderRadius = '3px';
                        tooltip.style.fontSize = '12px';
                        tooltip.style.top = '0';
                        tooltip.style.left = '50%';
                        tooltip.style.transform = 'translateX(-50%)';
                        item1.appendChild(tooltip);
                        setTimeout(() => { if(item1.contains(tooltip)) item1.removeChild(tooltip); }, 1000);
                    }).catch(() => {
                        const tooltip = createElement('div', 'copy-tooltip', '复制失败');
                        tooltip.style.position = 'absolute';
                        tooltip.style.backgroundColor = 'rgba(255,0,0,0.6)';
                        tooltip.style.color = '#fff';
                        tooltip.style.padding = '2px 5px';
                        tooltip.style.borderRadius = '3px';
                        tooltip.style.fontSize = '12px';
                        tooltip.style.top = '0';
                        tooltip.style.left = '50%';
                        tooltip.style.transform = 'translateX(-50%)';
                        item1.appendChild(tooltip);
                        setTimeout(() => { if(item1.contains(tooltip)) item1.removeChild(tooltip); }, 1000);
                    });
                });
                item1.appendChild(swatch1);
                const nameDiv1 = createElement('div', '', colorMapping[code1] || '未知颜色');
                item1.appendChild(nameDiv1);
                previewContainer.appendChild(item1);

                // 预览颜色2
                const item2 = createElement('div', 'color-item');
                const swatch2 = createElement('div', 'color-swatch', code2);
                swatch2.style.backgroundColor = code2;
                swatch2.addEventListener('click', () => {
                    const existingTooltip = item2.querySelector('.copy-tooltip');
                    if (existingTooltip) { existingTooltip.remove(); }
                    copyText(code2).then(() => {
                        const tooltip = createElement('div', 'copy-tooltip', '已复制');
                        tooltip.style.position = 'absolute';
                        tooltip.style.backgroundColor = 'rgba(0,0,0,0.6)';
                        tooltip.style.color = '#fff';
                        tooltip.style.padding = '2px 5px';
                        tooltip.style.borderRadius = '3px';
                        tooltip.style.fontSize = '12px';
                        tooltip.style.top = '0';
                        tooltip.style.left = '50%';
                        tooltip.style.transform = 'translateX(-50%)';
                        item2.appendChild(tooltip);
                        setTimeout(() => { if(item2.contains(tooltip)) item2.removeChild(tooltip); }, 1000);
                    }).catch(() => {
                        const tooltip = createElement('div', 'copy-tooltip', '复制失败');
                        tooltip.style.position = 'absolute';
                        tooltip.style.backgroundColor = 'rgba(255,0,0,0.6)';
                        tooltip.style.color = '#fff';
                        tooltip.style.padding = '2px 5px';
                        tooltip.style.borderRadius = '3px';
                        tooltip.style.fontSize = '12px';
                        tooltip.style.top = '0';
                        tooltip.style.left = '50%';
                        tooltip.style.transform = 'translateX(-50%)';
                        item2.appendChild(tooltip);
                        setTimeout(() => { if(item2.contains(tooltip)) item2.removeChild(tooltip); }, 1000);
                    });
                });
                item2.appendChild(swatch2);
                const nameDiv2 = createElement('div', '', colorMapping[code2] || '未知颜色');
                item2.appendChild(nameDiv2);
                previewContainer.appendChild(item2);
            }
        });

        overlay.addEventListener('keydown', (e) => {
            if (e.key === "Escape") { document.body.removeChild(overlay); }
        });
        overlay.tabIndex = 0;
        overlay.focus();
        document.body.appendChild(overlay);
    }

    // ========== 16进制颜色大全展示UI ==========
    function showColorCollectionUI() {
        const overlay = createElement('div', 'color-overlay');
        overlay.setAttribute("role", "dialog");
        const modal = createElement('div', 'color-modal');
        overlay.appendChild(modal);

        createThemeToggleButton(modal);

        const closeBtn = createElement('button', 'close-button', '关闭');
        closeBtn.setAttribute("aria-label", "关闭颜色展示窗口");
        closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
        modal.appendChild(closeBtn);

        const title = createElement('h2', '', '16进制颜色大全展示');
        modal.appendChild(title);

        const searchGroup = createElement('div', 'search-group');
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '搜索颜色（代码或名称）';
        searchGroup.appendChild(searchInput);
        modal.appendChild(searchGroup);

        const contentContainer = createElement('div', 'content-container');
        modal.appendChild(contentContainer);

        function renderGroups() {
            contentContainer.innerHTML = '';
            colorGroups.forEach(group => {
                const filteredColors = group.colors.filter(item => {
                    const searchTerm = searchInput.value.trim().toLowerCase();
                    if (!searchTerm) return true;
                    if (searchTerm.startsWith('#')) {
                        return item.code.toLowerCase().startsWith(searchTerm);
                    } else if (searchTerm.endsWith('*')) {
                        return item.name.toLowerCase().startsWith(searchTerm.slice(0, -1));
                    } else {
                        return (
                            item.code.toLowerCase().includes(searchTerm) ||
                            item.name.toLowerCase().includes(searchTerm)
                        );
                    }
                });
                if (filteredColors.length === 0) return;

                const groupDiv = createElement('div', 'color-group');
                const groupTitle = createElement('div', 'group-title', group.group);
                groupTitle.addEventListener('click', () => {
                    groupTitle.classList.toggle('collapsed');
                    const colorList = groupDiv.querySelector('.color-list');
                    colorList.classList.toggle('hidden');
                });
                groupDiv.appendChild(groupTitle);

                const colorList = createElement('div', 'color-list');
                filteredColors.forEach(item => {
                    const colorItem = createElement('div', 'color-item');
                    const swatch = createElement('div', 'color-swatch', item.code);
                    swatch.style.backgroundColor = item.code;
                    colorItem.appendChild(swatch);

                    const codeDiv = createElement('div', '', item.code);
                    colorItem.appendChild(codeDiv);

                    const nameDiv = createElement('div', '', item.name);
                    colorItem.appendChild(nameDiv);

                    colorList.appendChild(colorItem);
                });
                groupDiv.appendChild(colorList);

                contentContainer.appendChild(groupDiv);
            });
        }

        searchInput.addEventListener('input', debounce(renderGroups, 300));
        renderGroups();

        overlay.addEventListener('keydown', (e) => {
            if (e.key === "Escape") { document.body.removeChild(overlay); }
        });
        overlay.tabIndex = 0;
        overlay.focus();
        document.body.appendChild(overlay);
    }

    // ========== 注册油猴菜单 ==========
    if (typeof GM_registerMenuCommand !== "undefined") {
        GM_registerMenuCommand("16进制颜色预览与调试", showDebugColorUI);
        GM_registerMenuCommand("16进制颜色大全展示", showColorCollectionUI);
    } else {
        console.error("GM_registerMenuCommand 不可用。");
    }
})();
