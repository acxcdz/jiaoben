// ==UserScript==
// @name         下拉刷新
// @namespace    https://viayoo.com/
// @version      1.3
// @description  在网页中实现下拉刷新功能，并显示下拉图标，适配不同颜色背景，支持上下滑动取消刷新，提示文字大小缩小
// @author       ChatGPT
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 设置下拉刷新触发的阈值（单位：像素）
    const refreshThreshold = 100;

    // 记录触摸开始时的Y坐标
    let touchStartY = 0;
    let pullDistance = 0;

    // 标记是否正在下拉
    let isPulling = false;
    let isRefreshing = false;  // 防止重复刷新

    // 创建并添加下拉刷新图标
    const refreshIcon = document.createElement('div');
    refreshIcon.style.position = 'fixed';
    refreshIcon.style.top = '0';
    refreshIcon.style.left = '50%';
    refreshIcon.style.transform = 'translateX(-50%)';
    refreshIcon.style.padding = '10px';
    refreshIcon.style.fontSize = '10px';  // 修改文字大小，可根据自己喜好自定义
    refreshIcon.style.visibility = 'hidden'; // 初始时隐藏图标
    refreshIcon.style.transition = 'transform 0.2s';  // 添加动画效果
    refreshIcon.textContent = '↓  下拉刷新';
    document.body.appendChild(refreshIcon);

    // 检测当前系统主题
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 根据主题设置图标颜色
    refreshIcon.style.color = isDarkMode ? 'white' : 'black';

    // 监听触摸开始事件
    document.addEventListener('touchstart', function(e) {
        // 仅在页面顶部时触发
        if (window.scrollY === 0) {
            touchStartY = e.touches[0].clientY;
            isPulling = true;
            refreshIcon.style.visibility = 'visible'; // 显示下拉图标
            refreshIcon.textContent = '↓  下拉刷新';  // 恢复初始状态
        }
    });

    // 监听触摸移动事件
    document.addEventListener('touchmove', function(e) {
        if (isPulling && !isRefreshing) {
            const touchMoveY = e.touches[0].clientY;
            pullDistance = touchMoveY - touchStartY;

            // 只有当下拉距离超过一定值时才处理
            if (pullDistance > 0) {
                // 更新图标的位置
                refreshIcon.style.transform = `translateX(-50%) translateY(${pullDistance / 2}px)`;

                // 如果下拉距离超过阈值，提示松开刷新
                if (pullDistance > refreshThreshold) {
                    refreshIcon.textContent = '↻  松开刷新';
                } else {
                    refreshIcon.textContent = '↓  下拉刷新';
                }
            }
        }
    });

    // 监听触摸结束事件
    document.addEventListener('touchend', function() {
        if (isPulling) {
            // 如果下拉超过阈值，刷新页面
            if (pullDistance > refreshThreshold) {
                isRefreshing = true; // 防止多次刷新
                refreshIcon.textContent = '↻  正在刷新...';
                location.reload();  // 进行页面刷新
            } else {
                // 如果没超过阈值，恢复初始状态
                refreshIcon.style.transform = 'translateX(-50%) translateY(0)';
                refreshIcon.style.visibility = 'hidden';  // 隐藏图标
            }
            isPulling = false;
            pullDistance = 0;
        }
    });

    // 监听向上滑动取消下拉刷新
    document.addEventListener('touchmove', function(e) {
        if (isPulling && pullDistance < 0) {
            // 当用户向上滑动时，取消下拉刷新
            refreshIcon.style.transform = 'translateX(-50%) translateY(0)';
            refreshIcon.style.visibility = 'hidden';  // 隐藏图标
            isPulling = false;
            pullDistance = 0;
        }
    });
})();
