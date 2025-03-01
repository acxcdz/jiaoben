// ==UserScript==
// @name         测试页面加载速度
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  精密加载耗时分析器（毫秒级精度+智能单位+严格截断显示）
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 样式系统
    const styleId = 'load-time-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .load-time-final {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255,255,255,0.96);
                backdrop-filter: blur(8px);
                padding: 10px 22px;
                border-radius: 6px;
                font-family: 'JetBrains Mono', monospace;
                color: #2c3e50;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                z-index: 2147483647;
                border: 1px solid rgba(0,0,0,0.06);
                font-size: 14px;
                white-space: nowrap;
                animation: loadTimeSlide 0.4s ease-out;
            }

            @keyframes loadTimeSlide {
                0% { opacity: 0; transform: translate(-50%, -40%); }
                100% { opacity: 1; transform: translate(-50%, -50%); }
            }
        `;
        document.head.appendChild(style);
    }

    // 核心计时逻辑
    const getLoadDuration = () => {
        // 现代API优先
        try {
            const [navEntry] = performance.getEntriesByType('navigation');
            if (navEntry && navEntry.duration) {
                return navEntry.duration;
            }
        } catch {}

        // 传统API降级
        const timing = performance.timing;
        if (timing && timing.loadEventEnd > 0) {
            return timing.loadEventEnd - timing.navigationStart;
        }

        // 终极降级方案
        return performance.now();
    };

    // 数学截断函数
    const truncateDecimals = (num, decimals) => {
        const factor = Math.pow(10, decimals);
        return Math.floor(num * factor) / factor;
    };

    // 显示控制器
    window.addEventListener('load', () => {
        const duration = getLoadDuration();
        const elem = document.createElement('div');
        elem.className = 'load-time-final';

        // 格式化决策树
        let displayValue;
        if (duration >= 10000) { // ≥10秒显示秒
            const seconds = truncateDecimals(duration / 1000, 2);
            displayValue = `${seconds.toFixed(2)}s`;
        } else { // <10秒显示毫秒
            const ms = truncateDecimals(duration, 2);
            displayValue = `${ms.toFixed(2)}ms`;
        }

        elem.textContent = `加载耗时:${displayValue}`;

        // 动态注入与移除
        document.body.appendChild(elem);
        setTimeout(() => {
            elem.style.opacity = '0';
            setTimeout(() => elem.remove(), 300);
        }, 1500);
    }, { once: true });
})();
