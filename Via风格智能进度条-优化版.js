// ==UserScript==
// @name         Via风格智能进度条-优化版
// @namespace    https://viayoo.com/
// @version      2.2
// @description  [更新说明] 1.滚动隐藏延迟设为1000ms 2.保持其他功能不变
// @author       人工智能
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    /* 新版中和配色方案 */
    const VIA_THEME = {
        PRIMARY: '#FFB6C1',    // 中和后的浅粉色
        SECONDARY: '#87CEEB',  // 中和后的天蓝色
        DURATION: 380,         // 动画时长
        HEIGHT: 3,             // 进度条高度
        LOAD_HIDE_DELAY: 200,  // 加载完成隐藏延迟
        SCROLL_HIDE_DELAY: 1000 // 滚动停止隐藏延迟[已更新]
    };

    // 🛠 创建进度条通用函数
    const createProgressBar = (id, isLoader) => {
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const bar = document.createElement('div');
        bar.id = id;
        Object.assign(bar.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '0%',
            height: `${VIA_THEME.HEIGHT}px`,
            zIndex: '99999',
            background: `linear-gradient(135deg,
                ${VIA_THEME。PRIMARY} 30%,
                ${VIA_THEME。SECONDARY} 50%,
                ${VIA_THEME。PRIMARY} 70%
            )`，
            backgroundSize: '300% 100%',
            transition: `width ${VIA_THEME.DURATION}ms ease-out,
                        opacity ${VIA_THEME。DURATION / 2}ms ease-in`,
            pointerEvents: 'none'
        });
        
        document.documentElement.appendChild(bar);
        return bar;
    };

    class ProgressSystem {
        constructor() {
            this.loadingBar = createProgressBar('via-loader', true);
            this.scrollBar = createProgressBar('via-scroll', false);
            this.pageLoadStatus = false;
            this.scrollTimer = null;  // 新增滚动计时器
            this.initSystems();
        }

        initSystems() {
            this.setupLoadingSimulator();
            this.setupScrollTracker();
            this.setupSPAListener();
            this.setupPerformanceTweaks();
        }

        // 🔄 加载模拟器
        setupLoadingSimulator() {
            let progress = 0;
            const baseSpeed = 0.05;
            let networkFactor = navigator.connection 
                ? Math.min(navigator.connection.downlink / 5, 1) 
                : 1;

            const animate = () => {
                if (this.pageLoadStatus) return;
                
                const dynamicSpeed = baseSpeed * 
                                   Math.pow(1 - progress / 100, 0.7) *
                                   (0.8 + Math.random() * 0.4) * 
                                   networkFactor;
                
                progress = Math.min(progress + dynamicSpeed * 100, 99.9);
                this.loadingBar.style.width = `${progress}%`;
                this.loadingBar.style.backgroundPositionX = `${progress * 3}%`;
                
                requestAnimationFrame(animate);
            };
            
            animate();

            const completeHandler = () => {
                this.pageLoadStatus = true;
                this.loadingBar.style.width = '100%';
                setTimeout(() => {
                    this.loadingBar.style.opacity = '0';
                    setTimeout(() => {
                        this.loadingBar.remove();
                        this.scrollBar.style.opacity = '1';
                    }, VIA_THEME.DURATION);
                }, VIA_THEME.LOAD_HIDE_DELAY);
            };

            window.addEventListener('load', completeHandler, { once: true });
            document.addEventListener('DOMContentLoaded', () => {
                if (!this.pageLoadStatus) setTimeout(completeHandler, 1500);
            });
        }

        // 🖱 滚动追踪（更新隐藏延迟）
        setupScrollTracker() {
            let lastPos = 0, isScrolling;
            const calcProgress = () => {
                const scrollY = window.scrollY;
                const maxScroll = document.documentElement.scrollHeight - innerHeight;
                const progress = maxScroll > 0 
                    ? (scrollY / maxScroll) * 100 
                    : 0;

                // 显示并更新滚动条
                this.scrollBar.style.opacity = '1';
                this.scrollBar.style.width = `${progress}%`;
                this.scrollBar.style.backgroundPositionX = `${progress * 3}%`;

                // 设置1秒隐藏延迟
                clearTimeout(this.scrollTimer);
                this.scrollTimer = setTimeout(() => {
                    this.scrollBar.style.opacity = '0';
                }, VIA_THEME.SCROLL_HIDE_DELAY);  // 使用新配置项
            };

            const scroller = () => {
                cancelAnimationFrame(isScrolling);
                isScrolling = requestAnimationFrame(calcProgress);
            };
            
            window.addEventListener('scroll', scroller, { passive: true });
            window.addEventListener('resize', scroller);
        }

        // 🔗 SPA路由监听
        setupSPAListener() {
            const resetLoader = () => {
                if (this.pageLoadStatus) {
                    this.pageLoadStatus = false;
                    this.loadingBar = createProgressBar('via-loader', true);
                    this.scrollBar.style.opacity = '0';
                    this.setupLoadingSimulator();
                }
            };

            const wrapHistory = (method) => {
                const orig = history[method];
                return function() {
                    const result = orig.apply(this, arguments);
                    resetLoader();
                    return result;
                };
            };
            history.pushState = wrapHistory('pushState');
            history.replaceState = wrapHistory('replaceState');
            window.addEventListener('popstate', resetLoader);
        }

        // ⚡ 性能优化
        setupPerformanceTweaks() {
            document.addEventListener('visibilitychange', () => {
                this.loadingBar.style.transition = 
                    document.visibilityState === 'visible' 
                    ? `width ${VIA_THEME.DURATION}ms ease-out`
                    : 'none';
            });
        }
    }

    // 🚦 启动系统
    const init = () => {
        ['via-loader', 'via-scroll'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        new ProgressSystem();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('readystatechange', () => {
            if (document.readyState === 'interactive') init();
        }, { once: true });
    } else {
        setTimeout(init, 0);
    }
})();
