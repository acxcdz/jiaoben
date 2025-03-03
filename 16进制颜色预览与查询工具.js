// ==UserScript==
// @name         16进制颜色预览与查询工具
// @namespace    http://tampermonkey.net/
// @version      2.4.2
// @description  提供16进制颜色预览、调试及全网常见颜色展示，颜色按红、粉、橙、黄、绿、青、蓝、紫、黑白、透明分组排序，支持深色/浅色/自动适应系统主题及搜索筛选功能，适配竖屏(移动端)与横屏(PC端)。
// @author       ChatGPT
// @match        *://*/*
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // ========== 颜色分组数据 ==========
    // 新排序：红 → 粉 → 橙 → 黄 → 绿 → 青 → 蓝 → 紫 → 黑白 → 透明
    const colorGroups = [
        {
            group: "红色 🔴",
            colors: [
                { code: "#FF0000", name: "红色" },
                { code: "#DC143C", name: "猩红" },
                { code: "#B22222", name: "火砖红" },
                { code: "#8B0000", name: "深红" },
                { code: "#FF4500", name: "橙红" },
                { code: "#FF6347", name: "番茄红" }
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
                { code: "#B0C7E2", name: "灰雾蓝粉" }
            ]
        },
        {
            group: "橙色 🟠",
            colors: [
                { code: "#FFA500", name: "橙色" },
                { code: "#FF8C00", name: "深橙" },
                { code: "#FF7F50", name: "珊瑚橙" }
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
                { code: "#FFDAB9", name: "桃色" }
            ]
        },
        {
            group: "绿色 🟢",
            colors: [
                { code: "#008000", name: "绿色" },
                { code: "#00FF00", name: "酸橙绿" },
                { code: "#228B22", name: "森林绿" },
                { code: "#32CD32", name: "酸橙绿 (LimeGreen)" },
                { code: "#90EE90", name: "淡绿色" },
                { code: "#3CB371", name: "海洋绿" },
                { code: "#2E8B57", name: "海绿" },
                { code: "#006400", name: "深绿色" },
                { code: "#00FF7F", name: "春绿" },
                { code: "#C7EDCC", name: "豆沙绿" },
                { code: "#98FB98", name: "苍绿色" }
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
                { code: "#AFEEEE", name: "碧绿色" }
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
                { code: "#000080", name: "藏青色" }
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
                { code: "#D8BFD8", name: "蓟色" }
            ]
        },
        {
            group: "黑白 ⚫⚪",
            colors: [
                { code: "#000000", name: "黑色" },
                { code: "#808080", name: "灰色" },
                { code: "#C0C0C0", name: "银色" },
                { code: "#FFFFFF", name: "白色" }
            ]
        },
        {
            group: "透明色 🟤",
            colors: [
                { code: "#00000000", name: "透明黑" },
                { code: "#FFFFFF00", name: "透明白" },
                { code: "#00000080", name: "半透明黑" }
            ]
        }
    ];

    // 将颜色映射成 { "#XXXXXX": "名称" } 结构，供调试功能快速查找
    const colorMapping = {};
    colorGroups.forEach(group => {
        group.colors.forEach(item => {
            colorMapping[item.code.toUpperCase()] = item.name;
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
    /* 自动适配系统深色模式 */
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
    /* 手动浅色模式 */
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
    /* 手动深色模式 */
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
    .color-group {
        margin-bottom: 30px;
    }
    .group-title {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 10px;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 5px;
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
    }
    .toggle-container {
        margin: 10px 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .toggle-container label {
        margin-left: 5px;
        font-size: 16px;
    }
    .close-button:hover,
    .theme-toggle:hover {
        opacity: 0.85;
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
    }
    .input-group button {
        padding: 8px 16px;
        font-size: 16px;
        margin-left: 10px;
        border: none;
        border-radius: 5px;
        background: var(--button-bg);
        color: var(--button-text);
        cursor: pointer;
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
    .copy-tooltip {
        pointer-events: none;
        opacity: 0.9;
    }

    /* 竖屏下：让列表居中 & 保持关闭/主题按钮定位 */
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

    function updateTheme(modal, mode) {
        modal.classList.remove("theme-light", "theme-dark");
        if (mode === "light") {
            modal.classList.add("theme-light");
        } else if (mode === "dark") {
            modal.classList.add("theme-dark");
        }
    }

    function createThemeToggleButton(modal) {
        let currentMode = "auto";
        const btn = createElement("button", "theme-toggle", "主题: 自动");
        btn.addEventListener('click', () => {
            const idx = themeModes.indexOf(currentMode);
            currentMode = themeModes[(idx + 1) % themeModes.length];
            btn.innerHTML = "主题: " + (
                currentMode === "auto" ? "自动" :
                currentMode === "light" ? "浅色" : "深色"
            );
            updateTheme(modal, currentMode);
        });
        modal.appendChild(btn);
    }

    // ========== 调试16进制颜色预览UI ==========
    function showDebugColorUI() {
        const overlay = createElement('div', 'color-overlay');
        const modal = createElement('div', 'color-modal');
        overlay.appendChild(modal);

        createThemeToggleButton(modal);

        const closeBtn = createElement('button', 'close-button', '关闭');
        closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
        modal.appendChild(closeBtn);

        const title = createElement('h2', '', '16进制颜色预览与调试');
        modal.appendChild(title);

        const inputGroup = createElement('div', 'input-group');
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.placeholder = '例如：#C7EDCC';
        inputGroup.appendChild(inputField);

        const generateBtn = createElement('button', '', '生成预览');
        inputGroup.appendChild(generateBtn);

        const clearBtn = createElement('button', '', '清空预览');
        inputGroup.appendChild(clearBtn);

        modal.appendChild(inputGroup);

        const toggleContainer = createElement('div', 'toggle-container');
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = true;
        toggleContainer.appendChild(toggleInput);
        const toggleLabel = createElement('label', '', '显示颜色名称');
        toggleContainer.appendChild(toggleLabel);
        modal.appendChild(toggleContainer);

        const previewContainer = createElement('div', 'preview-container');
        previewContainer.style.textAlign = 'center';
        modal.appendChild(previewContainer);

        generateBtn.addEventListener('click', () => {
            previewContainer.innerHTML = '';
            const inputText = inputField.value.trim();
            if (!inputText) return;
            const codes = inputText.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const regex = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
            codes.forEach(origCode => {
                let code = origCode;
                if (!code.startsWith("#")) {
                    code = "#" + code;
                }
                if (!regex.test(code)) {
                    alert("无效的颜色代码: " + code);
                    return;
                }
                code = code.toUpperCase();

                const item = createElement('div', 'color-item');
                const swatch = createElement('div', 'color-swatch', code);
                swatch.style.backgroundColor = code;

                swatch.addEventListener('click', () => {
                    navigator.clipboard.writeText(code).then(() => {
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
                        setTimeout(() => {
                            item.removeChild(tooltip);
                        }, 1000);
                    });
                });

                item.appendChild(swatch);

                if (toggleInput.checked) {
                    const nameDiv = createElement('div', '', colorMapping[code] || '未知颜色');
                    item.appendChild(nameDiv);
                }

                previewContainer.appendChild(item);
            });
        });

        clearBtn.addEventListener('click', () => {
            previewContainer.innerHTML = '';
        });

        document.body.appendChild(overlay);
    }

    // ========== 16进制颜色大全展示UI ==========
    function showColorCollectionUI() {
        const overlay = createElement('div', 'color-overlay');
        const modal = createElement('div', 'color-modal');
        overlay.appendChild(modal);

        createThemeToggleButton(modal);

        const closeBtn = createElement('button', 'close-button', '关闭');
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
                    return (
                        item.code.toLowerCase().includes(searchTerm) ||
                        item.name.toLowerCase().includes(searchTerm)
                    );
                });
                if (filteredColors.length === 0) return;

                const groupDiv = createElement('div', 'color-group');
                const groupTitle = createElement('div', 'group-title', group.group);
                groupDiv.appendChild(groupTitle);

                filteredColors.forEach(item => {
                    const colorItem = createElement('div', 'color-item');
                    const swatch = createElement('div', 'color-swatch', item.code);
                    swatch.style.backgroundColor = item.code;
                    colorItem.appendChild(swatch);

                    const codeDiv = createElement('div', '', item.code);
                    colorItem.appendChild(codeDiv);

                    const nameDiv = createElement('div', '', item.name);
                    colorItem.appendChild(nameDiv);

                    groupDiv.appendChild(colorItem);
                });

                contentContainer.appendChild(groupDiv);
            });
        }

        renderGroups();
        searchInput.addEventListener('input', renderGroups);

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
