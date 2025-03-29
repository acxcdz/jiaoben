// ==UserScript==
// @name         ABP广告拦截器
// @namespace    https://viayoo.com
// @version      5.12.1
// @description  [增强版] 内置ABP语法规则的广告拦截，支持CSS元素隐藏与网络请求控制，优化浏览体验。
// @author       是小白呀 & ChatGPT & Grok
// @match        *://*/*     
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_deleteValue
// @grant        GM_setClipboard
// @run-at       document-start
// ==/UserScript==

(function(global) {
    'use strict';

    /***************************************
     * 全局配置参数
     ***************************************/
    const CONFIG = {
        RULE_MAX_LENGTH: 120,
        UI_THEME: 'auto',
        DOMAIN_BLOCK_MODE: true,
        MUTATION_DEBOUNCE: 30,
        REMOVE_BLOCKED_ELEMENT: false
    };

    /***************************************
     * 内置规则（采用 ABP 语法，Adblock Plus 2.0 格式）
     ***************************************/
    const BuiltInRules = `[Adblock Plus 2.0]
! Title: ABP广告拦截器内置规则
! Description: 内置ABP语法规则，拦截特定域名与CSS元素，优化浏览体验
! Version: 2025-03-29
! Last modified: 2025-03-29
! --- 域名拦截规则 ---
自己加
! --- CSS元素隐藏规则 ---
自己加
`。split('\n').filter(line => line.trim());

    /***************************************
     * ABP规则辅助函数
     ***************************************/
    class RuleTrie {
        constructor() { this.root = {}; }
        addRule(rule, data) {
            let node = this.root;
            const parts = rule.split('.').reverse();
            for (const part of parts) {
                if (!node[part]) node[part] = {};
                node = node[part];
            }
            node.data = data;
        }
        match(hostname) {
            let node = this.root;
            const parts = hostname.split('.').reverse();
            for (const part of parts) {
                if (node[part]) node = node[part];
                else break;
            }
            return node.data;
        }
    }

    class RuleMatcher {
        constructor() {
            this.domainTrie = new RuleTrie();
            this.elementRules = new Map();
        }
        addDomainRule(rule) {
            const isException = rule.startsWith('@@');
            const cleanRule = isException ? rule.slice(2) : rule;
            const { regex, options, isUrlMatch } = this._compileDomainRule(cleanRule);
            let trieKey = cleanRule.split('$')[0];
            if (trieKey.startsWith('||')) trieKey = trieKey.slice(2);
            if (trieKey.endsWith('^')) trieKey = trieKey.slice(0, -1);
            this.domainTrie.addRule(trieKey, { isException, regex, options, isUrlMatch });
            return true;
        }
        addElementRule(rule) {
            const isException = rule.startsWith('@@');
            const cleanRule = isException ? rule.slice(2) : rule;
            const { domain, selector } = parseElementRule(cleanRule);
            if (!this.elementRules.has(domain)) this.elementRules.set(domain, { block: new Set(), exception: new Set() });
            const ruleSet = this.elementRules.get(domain);
            (isException ? ruleSet.exception : ruleSet.block).add(selector);
        }
        _compileDomainRule(rule) {
            const parts = rule.split('$');
            let pattern = parts[0];
            const options = parts[1] ? parts[1].split(',').map(opt => opt.trim()) : [];
            let isUrlMatch = false;
            if (pattern.startsWith('/') && pattern.endsWith('/')) {
                return { regex: new RegExp(pattern.slice(1, -1)), options, isUrlMatch: true };
            }
            if (pattern.startsWith('|')) {
                isUrlMatch = true;
                const urlPattern = pattern.slice(1).replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\^/g, '[^a-zA-Z0-9_.-]');
                return { regex: new RegExp(`^${urlPattern}`), options, isUrlMatch };
            }
            if (pattern.startsWith('||')) {
                let domain = pattern.slice(2).split('^')[0];
                let regexPattern = domain.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
                return { regex: new RegExp(regexPattern + '$', 'i'), options, isUrlMatch };
            }
            let regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\^/g, '[^a-zA-Z0-9_.-]');
            if (pattern.startsWith('.')) return { regex: new RegExp(`\\${regexPattern}$`, 'i'), options, isUrlMatch };
            if (pattern.includes('/')) {
                isUrlMatch = true;
                return { regex: new RegExp(regexPattern), options, isUrlMatch };
            }
            return { regex: new RegExp(`^${regexPattern}$`, 'i'), options, isUrlMatch };
        }
        matchDomain(urlOrHostname, requestType = '', origin = '', method = '', isThirdParty = false) {
            let hostname, fullUrl;
            try {
                const url = new URL(urlOrHostname, location.href);
                hostname = url.hostname;
                fullUrl = url.href;
            } catch {
                hostname = urlOrHostname;
                fullUrl = urlOrHostname;
            }
            const trieMatch = this.domainTrie.match(hostname);
            if (!trieMatch || trieMatch.isException) return false;
            const { regex, options, isUrlMatch } = trieMatch;
            if (isUrlMatch ? !regex.test(fullUrl) : !regex.test(hostname)) return false;
            if (options.length) {
                const negateTypes = options.filter(opt => opt.startsWith('~')).map(opt => opt.slice(1));
                const positiveTypes = options.filter(opt => !opt.startsWith('~') && !opt.includes('='));
                if (requestType && (negateTypes.includes(requestType) || (positiveTypes.length && !positiveTypes.includes(requestType)))) return false;
                const domainOption = options.find(opt => opt.startsWith('domain='));
                const negateDomains = options.filter(opt => opt.startsWith('domain=~')).map(opt => opt.split('=')[1].slice(1));
                if (domainOption && origin && !origin.includes(domainOption.split('=')[1])) return false;
                if (negateDomains.length && origin && negateDomains.some(d => origin.includes(d))) return false;
                const methodOption = options.find(opt => opt.startsWith('method='));
                if (methodOption && method && method !== methodOption.split('=')[1]) return false;
                if (options.includes('third-party') && !isThirdParty) return false;
                if (options.includes('~third-party') && isThirdParty) return false;
            }
            return true;
        }
        getElementSelectors(hostname) {
            const selectors = new Set();
            const exceptions = new Set();
            for (const [domain, { block, exception }] of this.elementRules) {
                if (!domain || hostname.includes(domain)) {
                    exception.forEach(sel => exceptions.add(sel));
                    block.forEach(sel => selectors.add(sel));
                }
            }
            exceptions.forEach(sel => selectors.delete(sel));
            return selectors;
        }
    }

    function parseElementRule(rule) {
        const parts = rule.split('##');
        return parts.length === 2 ? { domain: parts[0], selector: parts[1] } : { domain: '', selector: rule };
    }

    /***************************************
     * 防抖函数
     ***************************************/
    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    /***************************************
     * 网络请求拦截
     ***************************************/
    function interceptNetworkRequests(matcher) {
        const originHostname = location.hostname;
        if (matcher.matchDomain(location.href, 'document', originHostname)) {
            window.stop();
            displayBlockedPage('域名规则拦截');
            Storage.addLog('domain', `整页拦截: ${location.href}`);
            return;
        }
        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
            const url = typeof input === 'string' ? input : (input.url || String(input));
            const method = init && init.method ? init.method.toUpperCase() : 'GET';
            const isThirdParty = new URL(url, location.href).hostname !== originHostname;
            if (matcher.matchDomain(url, 'fetch', originHostname, method, isThirdParty)) {
                Storage.addLog('domain', `阻止Fetch请求: ${url}`);
                return Promise.reject(new Error('请求被拦截'));
            }
            return originalFetch.call(window, input, init);
        };
        const OriginalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new OriginalXHR();
            const origOpen = xhr.open;
            xhr.open = function(method, url) {
                const isThirdParty = new URL(url, location.href).hostname !== originHostname;
                if (matcher.matchDomain(url, 'xhr', originHostname, method.toUpperCase(), isThirdParty)) {
                    Storage.addLog('domain', `阻止XHR请求: ${url}`);
                    throw new Error('XHR请求被拦截');
                }
                return origOpen.apply(xhr, arguments);
            };
            return xhr;
        };
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            const isThirdParty = new URL(url, location.href).hostname !== originHostname;
            if (matcher.matchDomain(url, 'websocket', originHostname, '', isThirdParty)) {
                Storage.addLog('domain', `阻止WebSocket连接: ${url}`);
                throw new Error(`WebSocket请求被拦截: ${url}`);
            }
            return new OriginalWebSocket(url, protocols);
        };
        if ('serviceWorker' in navigator) {
            const originalRegister = navigator.serviceWorker.register;
            navigator.serviceWorker.register = function(scriptURL, options) {
                const isThirdParty = new URL(scriptURL, location.href).hostname !== originHostname;
                if (matcher.matchDomain(scriptURL, 'serviceworker', originHostname, '', isThirdParty)) {
                    Storage.addLog('domain', `阻止ServiceWorker注册: ${scriptURL}`);
                    throw new Error('ServiceWorker注册被拦截');
                }
                return originalRegister.apply(this, arguments);
            };
        }
    }

    /***************************************
     * CSS注入
     ***************************************/
    function injectCSSForElementRulesEarly(matcher) {
        const style = document.createElement('style');
        style.textContent = Storage.preloadedCSS;
        (document.head || document.documentElement || document).appendChild(style);
        const selectors = matcher.getElementSelectors(location.hostname);
        const cssRules = Array.from(selectors)
            .map(sel => {
                const selLower = sel.trim().toLowerCase();
                if (selLower === 'body' || selLower === 'html') {
                    return `${selLower}:not(.abp-protected) { visibility: hidden !important; height: 100vh; width: 100vw; overflow: hidden; } .abp-protected { visibility: visible !important; position: fixed !important; z-index: 9999 !important; }`;
                } else {
                    return `${sel}:not(.abp-protected) { display: none !important; }`;
                }
            })
            .join('\n');
        if (style.textContent !== cssRules) {
            requestAnimationFrame(() => {
                style.textContent = cssRules;
                selectors.forEach(sel => Storage.addLog('element', `元素拦截: ${location.hostname}##${sel}`));
            });
        }
        return style;
    }

    /***************************************
     * 全页拦截UI
     ***************************************/
    function displayBlockedPage(reason) {
        const isDarkMode = CONFIG.UI_THEME === 'auto' ? matchMedia('(prefers-color-scheme: dark)').matches : CONFIG.UI_THEME === 'dark';
        document.documentElement.innerHTML = `
            <div style="font-family: 'Segoe UI', sans-serif; background: ${isDarkMode ? '#1e1e1e' : '#f7f7f7'}; color: ${isDarkMode ? '#ddd' : '#333'}; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center;">
                <div style="font-size: 64px; margin-bottom: 10px;">🛡️</div>
                <h1 style="font-size: 28px; margin-bottom: 16px;">广告拦截</h1>
                <div style="background: ${isDarkMode ? '#3a3a3a' : '#f0f0f0'}; padding: 16px; border-radius: 4px; margin-bottom: 24px; line-height: 1.6;">
                    <div>拦截原因：${reason}</div>
                    <div style="margin-top:8px;">网址：${location.href}</div>
                </div>
                <div style="display: flex; gap: 16px; margin-bottom: 24px;">
                    <button style="padding: 10px 20px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; background: ${isDarkMode ? '#4a90e2' : '#007bff'}; color: #fff;" onclick="window.history.back()">返回上一页</button>
                    <button style="padding: 10px 20px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; background: ${isDarkMode ? '#666' : '#ddd'}; color: ${isDarkMode ? '#fff' : '#333'};" onclick="location.href='https://viayoo.com/zh-cn/'">拦截首页</button>
                </div>
                <div style="font-size: 12px; color: ${isDarkMode ? '#aaa' : '#666'};">
                    ABP广告拦截器 v5.12.0 · 拦截时间：${new Date().toLocaleString()}
                </div>
            </div>`;
    }

    /***************************************
     * 存储管理模块
     ***************************************/
    const Storage = {
        logs: [],
        userDomainRules: [],
        userElementRules: [],
        preloadedCSS: '',
        logCounters: { domain: {}, element: {} },
        init() {
            this.userDomainRules = GM_getValue('userDomainRules', []);
            this.userElementRules = GM_getValue('userElementRules', []);
            this.preloadedCSS = GM_getValue('preloadedCSS') || this.generatePreloadedCSS();
            this.logs = [];
        },
        addLog(type, detail) {
            if (type !== 'domain' && type !== 'element') return;
            const counter = this.logCounters[type];
            const key = `${type}:${detail}`;
            counter[key] = (counter[key] || 0) + 1;
            const count = counter[key];
            const formattedLog = `${type === 'domain' ? '域名拦截' : '元素拦截'}: ${detail} (${count})`;
            this.logs.push({ type, detail: formattedLog });
        },
        addUserDomainRule(rule, matcher) {
            rule = rule.trim();
            if (this._validateRule(rule) && !this.userDomainRules.includes(rule)) {
                matcher.addDomainRule(rule);
                this.userDomainRules.push(rule);
                GM_setValue('userDomainRules', this.userDomainRules);
                return true;
            }
            return false;
        },
        addUserElementRule(rule, matcher) {
            rule = rule.trim();
            let sel = rule.includes("##") ? parseElementRule(rule).selector : rule;
            try {
                document.querySelector(sel);
            } catch {
                return false;
            }
            if (this._validateRule(rule) && !this.userElementRules.includes(rule)) {
                this.userElementRules.push(rule);
                matcher.addElementRule(rule);
                GM_setValue('userElementRules', this.userElementRules);
                injectCSSForElementRulesEarly(matcher);
                return true;
            }
            return false;
        },
        addRule(rule, matcher) {
            rule = rule.trim();
            return rule.includes('##') ? this.addUserElementRule(rule, matcher) : this.addUserDomainRule(rule, matcher);
        },
        resetDomainRules(matcher) {
            this.userDomainRules = [];
            matcher.domainTrie = new RuleTrie();
            BuiltInRules.forEach(rule => {
                if (!rule.startsWith('!') && !rule.startsWith('[Adblock Plus') && !rule.includes('##')) matcher.addDomainRule(rule);
            });
            GM_setValue('userDomainRules', this.userDomainRules);
        },
        resetElementRules(matcher) {
            this.userElementRules = [];
            matcher.elementRules.clear();
            BuiltInRules.forEach(rule => {
                if (!rule.startsWith('!') && !rule.startsWith('[Adblock Plus') && rule.includes('##')) matcher.addElementRule(rule);
            });
            this.preloadedCSS = this.generatePreloadedCSS();
            GM_setValue('userElementRules', this.userElementRules);
            injectCSSForElementRulesEarly(matcher);
        },
        _validateRule(rule) {
            return rule && rule.length <= CONFIG.RULE_MAX_LENGTH && !/[<>"'`]/.test(rule);
        },
        generatePreloadedCSS() {
            const matcher = new RuleMatcher();
            BuiltInRules.forEach(rule => {
                if (!rule.startsWith('!') && !rule.startsWith('[Adblock Plus') && rule.includes('##')) matcher.addElementRule(rule);
            });
            const css = Array.from(matcher.getElementSelectors(location.hostname))
                .map(sel => {
                    const selLower = sel.trim().toLowerCase();
                    if (selLower === 'body' || selLower === 'html') {
                        return `${selLower}:not(.abp-protected) { visibility: hidden !important; height: 100vh; width: 100vw; overflow: hidden; } .abp-protected { visibility: visible !important; position: fixed !important; z-index: 9999 !important; }`;
                    } else {
                        return `${sel}:not(.abp-protected) { display: none !important; }`;
                    }
                })
                .join('\n');
            GM_setValue('preloadedCSS', css);
            return css;
        }
    };

    /***************************************
     * 模态层管理工具
     ***************************************/
    function ensureBodyVisibility() {
        const body = document.body;
        if (body && getComputedStyle(body).visibility === 'hidden') {
            body.style.visibility = 'visible';
            body.style.opacity = '0';
        }
        const html = document.documentElement;
        if (html && getComputedStyle(html).visibility === 'hidden') {
            html.style.visibility = 'visible';
            html.style.opacity = '0';
        }
    }

    function createModal(content, onClose) {
        ensureBodyVisibility();
        const overlay = document.createElement('div');
        overlay.classList.add('abp-protected');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9998;';
        const modal = document.createElement('div');
        modal.classList.add('abp-protected');
        modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f8f9fa; padding: 20px; border-radius: 8px; z-index: 9999; max-width: 80vw; max-height: 80vh; overflow-y: auto;';
        modal.innerHTML = content;
        document.documentElement.append(overlay, modal);
        overlay.onclick = () => {
            document.documentElement.removeChild(overlay);
            document.documentElement.removeChild(modal);
            if (onClose) onClose();
        };
        return { overlay, modal };
    }

    /***************************************
     * 模态层UI系统
     ***************************************/
    const ModernUI = {
        createStyledElement(tagName, styles) {
            const element = document.createElement(tagName);
            Object.assign(element.style, styles);
            return element;
        },
        showRulesEditor(matcher) {
            if (!document.documentElement) return;
            const content = `
                <div style="font-size: 12px; color: #666; margin-bottom: 10px; white-space: pre-wrap; font-family: monospace;">${BuiltInRules.join('\n')}</div>
                <textarea style="width: 100%; height: 150px; background: #fff; color: #212529; border: 2px solid #4a90e2; border-radius: 4px; padding: 15px; font-family: monospace; font-size: 14px; box-sizing: border-box; margin-bottom: 10px; display: block;">${[...Storage.userDomainRules, ...Storage.userElementRules].join('\n')}</textarea>
                <div style="display: flex; gap: 10px; margin-top: 15px; justify-content: center;">
                    <button id="save-btn" style="padding: 8px 20px; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; background: #4CAF50; white-space: nowrap;">保存</button>
                    <button id="reset-btn" style="padding: 8px 20px; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; background: #f44336; white-space: nowrap;">重置</button>
                    <button id="cancel-btn" style="padding: 8px 20px; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; background: #999; white-space: nowrap;">取消</button>
                </div>`;
            const { overlay, modal } = createModal(content);
            const rulesEditor = modal.querySelector('textarea');
            const saveButton = modal.querySelector('#save-btn');
            const resetButton = modal.querySelector('#reset-btn');
            const cancelButton = modal.querySelector('#cancel-btn');
            saveButton.onclick = () => {
                const newRules = rulesEditor.value.split(/\r?\n/).map(line => line.trim()).filter(line => line);
                Storage.userDomainRules = [];
                Storage.userElementRules = [];
                matcher.domainTrie = new RuleTrie();
                matcher.elementRules.clear();
                BuiltInRules.forEach(rule => {
                    if (!rule.startsWith('!') && !rule.startsWith('[Adblock Plus')) {
                        if (rule.includes('##')) matcher.addElementRule(rule);
                        else matcher.addDomainRule(rule);
                    }
                });
                newRules.forEach(rule => Storage.addRule(rule, matcher));
                Storage.preloadedCSS = Storage.generatePreloadedCSS();
                GM_notification({ title: '✅ 规则已保存', timeout: 1500 });
                document.documentElement.removeChild(overlay);
                document.documentElement.removeChild(modal);
            };
            resetButton.onclick = () => {
                if (confirm('确定清空用户自定义规则？')) {
                    Storage.resetDomainRules(matcher);
                    Storage.resetElementRules(matcher);
                    rulesEditor.value = '';
                    GM_notification({ title: '所有规则已重置', timeout: 1500 });
                }
            };
            cancelButton.onclick = () => {
                document.documentElement.removeChild(overlay);
                document.documentElement.removeChild(modal);
            };
        },
        showLogs() {
            const domainLogs = Storage.logs.filter(log => log.type === 'domain');
            const elementLogs = Storage.logs.filter(log => log.type === 'element');
            const domainRules = domainLogs.map((log, index) => `${index + 1}. ${log.detail.replace(/^域名拦截: /, '')}`);
            const elementRules = elementLogs.map((log, index) => `${index + 1}. ${log.detail.replace(/^元素拦截: /, '')}`);
            const message = `当前页面拦截日志:\n域名拦截:\n${domainRules.length > 0 ? domainRules.join('\n') : '无'}\n\n元素拦截:\n${elementRules.length > 0 ? elementRules.join('\n') : '无'}`;
            alert(message);
        }
    };

    /***************************************
     * 核心拦截系统
     ***************************************/
    const CoreSystem = {
        init() {
            Storage.init();
            const matcher = new RuleMatcher();
            BuiltInRules.forEach(rule => {
                if (rule.startsWith('!') || rule.startsWith('[Adblock Plus')) return;
                if (rule.includes('##')) matcher.addElementRule(rule);
                else matcher.addDomainRule(rule);
            });
            Storage.userDomainRules.forEach(rule => matcher.addDomainRule(rule));
            Storage.userElementRules.forEach(rule => matcher.addElementRule(rule));
            interceptNetworkRequests(matcher);
            const styleElement = injectCSSForElementRulesEarly(matcher);
            if (document.documentElement) this._initialScan(document.documentElement, matcher);
            const startObserver = () => {
                if (!document.documentElement) {
                    setTimeout(startObserver, 10);
                    return;
                }
                this._scanNode(document.documentElement, matcher);
                const observer = new MutationObserver(debounce(mutations => {
                    mutations.forEach(mutation => {
                        mutation.addedNodes.forEach(node => this._scanNode(node, matcher));
                        if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                            this._checkStyle(mutation.target, matcher);
                        }
                    });
                }, CONFIG.MUTATION_DEBOUNCE));
                observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
            };
            startObserver();
            this.matcher = matcher;
            this.styleElement = styleElement;
        },
        _shouldBlockDomain(url, matcher) {
            return matcher.matchDomain(url, 'media', location.hostname);
        },
        _blockMediaElement(el) {
            if (el.classList.contains('abp-protected')) return;
            if (CONFIG.REMOVE_BLOCKED_ELEMENT) el.remove();
            else el.style.display = 'none';
        },
        _initialScan(node, matcher) {
            const elements = node.querySelectorAll('img, video, audio, iframe, script, link[rel="stylesheet"]');
            elements.forEach(el => {
                const src = el.src || el.href || '';
                if (src && this._shouldBlockDomain(src, matcher)) {
                    if (CONFIG.REMOVE_BLOCKED_ELEMENT) el.remove();
                    else el.style.display = 'none';
                }
            });
        },
        _scanNode(node, matcher) {
            if (node.closest && node.closest('.abp-protected')) return;
            if (node.nodeType === 1) {
                const src = node.src || node.href || '';
                if (src && this._shouldBlockDomain(src, matcher)) this._blockMediaElement(node);
                this._checkStyle(node, matcher);
            }
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, {
                acceptNode: n => ['IMG', 'VIDEO', 'AUDIO', 'IFRAME', 'SCRIPT', 'LINK'].includes(n.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
            });
            let currentNode;
            while ((currentNode = walker.nextNode())) {
                const src = currentNode.src || currentNode.href || '';
                if (src && this._shouldBlockDomain(src, matcher)) this._blockMediaElement(currentNode);
            }
        },
        _checkStyle(node, matcher) {
            if (node.classList.contains('abp-protected') || !node.style) return;
            const bgImage = node.style.backgroundImage;
            if (bgImage && bgImage.includes('url(')) {
                const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (urlMatch && urlMatch[1] && this._shouldBlockDomain(urlMatch[1], matcher)) {
                    node.style.backgroundImage = 'none';
                    Storage.addLog('domain', `拦截背景图: ${urlMatch[1]}`);
                }
            }
            const selectors = matcher.getElementSelectors(location.hostname);
            selectors.forEach(sel => {
                if (node.matches(sel) && node.style.display !== 'none') {
                    const selLower = sel.trim().toLowerCase();
                    if (selLower === 'body' || selLower === 'html') {
                        node.style.visibility = 'hidden';
                        node.style.height = '100vh';
                        node.style.width = '100vw';
                        node.style.overflow = 'hidden';
                    } else if (CONFIG.REMOVE_BLOCKED_ELEMENT) {
                        node.remove();
                    } else {
                        node.style.display = 'none';
                    }
                    Storage.addLog('element', `动态样式拦截: ${location.hostname}##${sel}`);
                }
            });
        }
    };

    /***************************************
     * 全局清空日志函数
     ***************************************/
    global.clearLogs = function() {
        Storage.logs = [];
        Storage.logCounters = { domain: {}, element: {} };
        GM_notification({ title: '当前页面拦截日志已清空', timeout: 1500 });
    };

    const protectedClasses = ['abp-protected', 'selector-panel'];

    /***************************************
     * 用户命令系统
     ***************************************/
    function initCommands() {
        GM_registerMenuCommand('编辑规则', () => ModernUI.showRulesEditor(CoreSystem.matcher));
        GM_registerMenuCommand('查看拦截日志', ModernUI.showLogs.bind(ModernUI));
        GM_registerMenuCommand('清空拦截日志', clearLogs);
        GM_registerMenuCommand('添加规则', () => {
            const rule = prompt('请输入规则（例如：||example.com^ 或 ##.ad 或 domain.com##.ad）');
            if (rule && Storage.addRule(rule, CoreSystem.matcher)) {
                GM_notification({ title: '✅ 规则已添加', timeout: 1500 });
            } else if (rule) {
                alert('规则无效或已存在！');
            }
        });
        GM_registerMenuCommand('拦截当前域名', () => {
            const domain = `||${location.hostname}^`;
            if (Storage.addUserDomainRule(domain, CoreSystem.matcher)) {
                GM_notification({ title: `✅ 已拦截: ${domain}`, timeout: 1500 });
                location.reload();
            } else {
                alert('域名已存在或规则无效！');
            }
        });
        GM_registerMenuCommand('选择元素拦截', () => {
            alert('点击页面元素选择（PC: 点击预览，移动端: 长按复制，ESC/取消按钮退出）\n请勿点击控件面板。');
            let selectedElement = null;
            let highlightStyle = null;
            let previewStyle = null;
            let currentSelector = '';
            let isPreviewing = false;
            const selectorCache = new Map();

            const content = `
                <div style="margin-bottom: 10px; padding: 5px; background: #e0e0e0; border-radius: 5px; cursor: pointer; word-break: break-all; min-height: 30px;" id="rule-display" title="点击复制规则">请选择元素</div>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: nowrap; white-space: nowrap; align-items: center;">
                    <button id="expand-btn" style="padding: 6px 12px; background: linear-gradient(#2196F3, #1e88e5); color: white; border: none; border-radius: 5px; cursor: pointer; white-space: nowrap;">扩大</button>
                    <button id="shrink-btn" style="padding: 6px 12px; background: linear-gradient(#FF9800, #f57c00); color: white; border: none; border-radius: 5px; cursor: pointer; white-space: nowrap;">缩小</button>
                    <button id="preview-btn" style="padding: 6px 12px; background: linear-gradient(#4CAF50, #45a049); color: white; border: none; border-radius: 5px; cursor: pointer; white-space: nowrap;">预览</button>
                    <button id="save-btn" style="padding: 6px 12px; background: linear-gradient(#4CAF50, #45a049); color: white; border: none; border-radius: 5px; cursor: pointer; white-space: nowrap;">保存</button>
                    <button id="cancel-btn" style="padding: 6px 12px; background: #999; color: white; border: none; border-radius: 5px; cursor: pointer; white-space: nowrap;">取消</button>
                </div>`;
            const { overlay, modal } = createModal(content, () => cleanup());
            modal.classList.add('selector-panel');
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.display = 'none';
            modal.style.width = 'auto';
            modal.style.minWidth = '330px'; // 调整面板宽度

            const ruleDisplay = modal.querySelector('#rule-display');
            const expandButton = modal.querySelector('#expand-btn');
            const shrinkButton = modal.querySelector('#shrink-btn');
            const previewButton = modal.querySelector('#preview-btn');
            const saveButton = modal.querySelector('#save-btn');
            const cancelButton = modal.querySelector('#cancel-btn');

            let isDragging = false, startX, startY;
            modal.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX - parseInt(modal.style.left || 50);
                startY = e.clientY - parseInt(modal.style.top || 50);
            });
            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    let newLeft = e.clientX - startX;
                    let newTop = e.clientY - startY;
                    const panelWidth = modal.offsetWidth;
                    const panelHeight = modal.offsetHeight;
                    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - panelWidth));
                    newTop = Math.max(0, Math.min(newTop, window.innerHeight - panelHeight));
                    modal.style.left = `${newLeft}px`;
                    modal.style.top = `${newTop}px`;
                    modal.style.transform = 'none';
                }
            });
            document.addEventListener('mouseup', () => isDragging = false);
            modal.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                isDragging = true;
                startX = touch.clientX - parseInt(modal.style.left || 50);
                startY = touch.clientY - parseInt(modal.style.top || 50);
            }, { passive: false });
            document.addEventListener('touchmove', (e) => {
                if (isDragging) {
                    const touch = e.touches[0];
                    let newLeft = touch.clientX - startX;
                    let newTop = touch.clientY - startY;
                    const panelWidth = modal.offsetWidth;
                    const panelHeight = modal.offsetHeight;
                    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - panelWidth));
                    newTop = Math.max(0, Math.min(newTop, window.innerHeight - panelHeight));
                    modal.style.left = `${newLeft}px`;
                    modal.style.top = `${newTop}px`;
                    modal.style.transform = 'none';
                }
            }, { passive: false });
            document.addEventListener('touchend', () => isDragging = false);

            function highlightElement(element) {
                if (protectedClasses.some(cls => element.classList.contains(cls))) return;
                if (highlightStyle) highlightStyle.remove();
                currentSelector = selectorCache.get(element) || getSmartSelector(element);
                selectorCache.set(element, currentSelector);
                highlightStyle = document.createElement('style');
                highlightStyle.textContent = `${currentSelector} { outline: 2px solid red !important; background: rgba(255, 0, 0, 0.1) !important; }`;
                document.head.appendChild(highlightStyle);
                ruleDisplay.textContent = `${location.hostname}##${currentSelector}`;
            }

            function previewBlock() {
                if (isPreviewing) return;
                if (previewStyle) previewStyle.remove();
                previewStyle = document.createElement('style');
                previewStyle.textContent = `${currentSelector}:not(.abp-protected) { display: none !important; }`;
                document.head.appendChild(previewStyle);
                isPreviewing = true;
            }

            function removeHighlight() {
                if (highlightStyle) highlightStyle.remove();
                if (previewStyle) previewStyle.remove();
                highlightStyle = null;
                previewStyle = null;
            }

            function cleanup() {
                removeHighlight();
                if (document.documentElement.contains(overlay)) document.documentElement.removeChild(overlay);
                if (document.documentElement.contains(modal)) document.documentElement.removeChild(modal);
                document.removeEventListener('mouseover', onHover);
                document.removeEventListener('click', onClick);
                document.removeEventListener('keydown', onKeydown);
                document.removeEventListener('touchstart', onTouchStart);
                document.removeEventListener('touchend', onTouchEnd);
            }

            const onHover = debounce((e) => {
                if (e.target.closest('.selector-panel')) return;
                selectedElement = e.target;
                highlightElement(selectedElement);
                modal.style.display = 'block';
            }, 50);

            const onClick = (e) => {
                if (e.target.closest('.selector-panel')) return;
                e.preventDefault();
            };

            const onKeydown = (e) => {
                if (e.key === 'Escape') cleanup();
            };

            let touchTimer;
            const onTouchStart = (e) => {
                if (e.target.closest('.selector-panel')) return;
                e.preventDefault();
                selectedElement = e.touches[0].target;
                highlightElement(selectedElement);
                modal.style.display = 'block';
                touchTimer = setTimeout(() => {
                    const rule = currentSelector;
                    GM_setClipboard(rule);
                    GM_notification({ title: '✅ 规则已复制到剪贴板', timeout: 1500 });
                    ruleDisplay.textContent = `${rule} (已复制)`;
                    setTimeout(() => ruleDisplay.textContent = rule, 2000);
                }, 1000);
            };

            const onTouchEnd = (e) => {
                clearTimeout(touchTimer);
                if (e.target.closest('.selector-panel')) return;
            };

            document.addEventListener('mouseover', onHover, { passive: true });
            document.addEventListener('click', onClick, { once: true });
            document.addEventListener('keydown', onKeydown);
            document.addEventListener('touchstart', onTouchStart, { passive: false });
            document.addEventListener('touchend', onTouchEnd, { passive: true });

            saveButton.onclick = (e) => {
                e.stopPropagation();
                const rule = `${location.hostname}##${currentSelector}`;
                if (Storage.addUserElementRule(rule, CoreSystem.matcher)) {
                    CoreSystem.styleElement.textContent += `\n${currentSelector}:not(.abp-protected) { display: none !important; }`;
                    GM_notification({ title: `✅ 已添加: ${rule}`, timeout: 1500 });
                    cleanup();
                } else {
                    alert('规则无效或已存在！');
                }
            };

            expandButton.onclick = (e) => {
                e.stopPropagation();
                if (selectedElement && selectedElement.parentElement && selectedElement.parentElement !== document.body) {
                    selectedElement = selectedElement.parentElement;
                    highlightElement(selectedElement);
                    if (isPreviewing) previewBlock();
                }
            };

            shrinkButton.onclick = (e) => {
                e.stopPropagation();
                if (selectedElement && selectedElement.children.length > 0) {
                    selectedElement = selectedElement.children[0];
                    highlightElement(selectedElement);
                    if (isPreviewing) previewBlock();
                }
            };

            previewButton.onclick = (e) => {
                e.stopPropagation();
                if (!isPreviewing) {
                    previewBlock();
                    previewButton.textContent = '恢复';
                } else {
                    if (previewStyle) previewStyle.remove();
                    isPreviewing = false;
                    previewButton.textContent = '预览';
                }
            };

            cancelButton.onclick = (e) => {
                e.stopPropagation();
                if (isPreviewing) {
                    if (previewStyle) previewStyle.remove();
                    isPreviewing = false;
                    previewButton.textContent = '预览';
                } else {
                    cleanup();
                }
            };

            ruleDisplay.onclick = (e) => {
                e.stopPropagation();
                const rule = currentSelector;
                GM_setClipboard(rule);
                GM_notification({ title: '✅ 规则已复制到剪贴板', timeout: 1500 });
                ruleDisplay.textContent = `${rule} (已复制)`;
                setTimeout(() => ruleDisplay.textContent = rule, 2000);
            };
        });
    }

    function getSmartSelector(el) {
        if (!el || el === document.body) return '';
        const parts = [];
        let current = el;
        while (current && current !== document.body) {
            let selector = '';
            if (current.id) {
                selector = `#${current.id}`;
                parts.unshift(selector);
                break;
            }
            const className = current.className && current.className.trim();
            if (className) {
                const classes = className.split(/\s+/).join('.');
                selector = `${current.tagName.toLowerCase()}.${classes}`;
            } else {
                selector = current.tagName.toLowerCase();
            }
            parts.unshift(selector);
            current = current.parentElement;
        }
        return parts.join(' > ');
    }

    /***************************************
     * 初始化入口
     ***************************************/
    CoreSystem.init();
    if (typeof GM_registerMenuCommand === 'function') initCommands();

})(typeof window !== 'undefined' ? window : this);
