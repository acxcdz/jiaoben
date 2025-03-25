// ==UserScript==
// @name        清除数据
// @namespace   https://viayoo.com/
// @version     1.0
// @description 清除当前网站的localStorage、sessionStorage和Cookie数据
// @author      是小白呀
// @match       *://*/*
// @grant       GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // 清除所有Cookie
    function clearAllCookies() {
        const hostParts = window.location.hostname.split('.');
        const domains = [
            window.location.hostname,
            ...(hostParts.length > 1 ? [`.${hostParts.slice(-2).join('.')}`] : [])
        ];

        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            domains.forEach(domain => {
                try {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
                } catch(e) {
                    console.error(`删除 Cookie ${name} 失败:`, e);
                }
            });
            try {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            } catch(e) {
                console.error(`删除 Cookie ${name} (无 domain) 失败:`, e);
            }
        });
    }

    // 执行清除操作
    function performClean() {
        if (confirm("确定要清除当前网站的所有存储数据吗？")) {
            try {
                // 清除 localStorage
                localStorage.clear();
                // 清除 sessionStorage
                sessionStorage.clear();
                // 清除 Cookie
                clearAllCookies();
                
                alert("数据清除完成！\n" + 
                     "localStorage: 已清除\n" + 
                     "sessionStorage: 已清除\n" + 
                     "Cookies: 已清除");
            } catch (error) {
                console.error("清除数据时发生错误:", error);
                alert("清除数据时发生错误，请查看控制台详情");
            }
        }
    }

    // 注册菜单命令
    GM_registerMenuCommand('清除网站数据', performClean);
})();
