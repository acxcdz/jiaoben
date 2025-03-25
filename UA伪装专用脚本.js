// ==UserScript==
// @name         UA伪装专用脚本
// @namespace    https://viayoo.com/
// @version      1.1
// @description  专为移动端优化的用户代理伪装方案，模拟 Chrome 88 + SymbianOS 9.4 + SearchCraft 2.8.2，支持用户自定义匹配域名（默认适配 pd.qq.com）
// @author       是小白呀
// @match        *://pd.qq.com/*        
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const MOBILE_UA = 'Mozilla/5.0 (Linux; SymbianOS/9.4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.93 Mobile Safari/537.36 SearchCraft/2.8.2';
    if (navigator.userAgent !== MOBILE_UA) {
        Object.defineProperty(navigator, 'userAgent', { value: MOBILE_UA, configurable: false, writable: false });
    }
    Object.defineProperty(navigator, 'platform', { value: 'SymbianOS', configurable: false, writable: false });
    Object.defineProperty(window, 'orientation', { value: 0, configurable: false, writable: false });
})();
