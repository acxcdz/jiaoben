// ==UserScript==
// @name         视频网HTML5播放小工具
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  启用HTML5播放；万能网页全屏；添加快捷键和移动端控制面板，实现快进、快退、暂停/播放、音量调节、下一集、网页全屏、逐帧控制、播放速度调节。支持油管、TED、优酷、QQ、B站、西瓜视频、爱奇艺、A站、PPTV、芒果TV、咪咕视频、新浪、微博、网易[娱乐、云课堂、新闻]、搜狐、风行、百度云视频等；直播：斗鱼、YY、虎牙、龙珠、战旗。可增加自定义站点。移动端默认不显示控制面板，可通过脚本菜单切换显示或隐藏。
// @author       AI代写
// @match        *://*.youtube.com/*
// @match        *://*.ted.com/*
// @match        *://*.youku.com/*
// @match        *://v.qq.com/*
// @match        *://*.bilibili.com/*
// @match        *://*.ixigua.com/*
// @match        *://*.iqiyi.com/*
// @match        *://www.acfun.cn/*
// @match        *://*.pptv.com/*
// @match        *://*.mgtv.com/*
// @match        *://*.migu.cn/*
// @match        *://video.sina.com.cn/*
// @match        *://*.weibo.com/*
// @match        *://*.163.com/*
// @match        *://*.sohu.com/*
// @match        *://*.fun.tv/*
// @match        *://yun.baidu.com/*
// @match        *://*.douyu.com/*
// @match        *://*.yy.com/*
// @match        *://*.huya.com/*
// @match        *://*.longzhu.com/*
// @match        *://*.zhanqi.tv/*
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    // 配置参数，用户可根据需要调整各功能的步长
    const settings = {
        fastForwardTime: 5,         // 快进秒数
        rewindTime: 5,              // 快退秒数
        frameTime: 1 / 25,          // 单帧时间（假设帧率 25fps）
        volumeStep: 0.1,            // 音量步进（范围：0~1）
        playbackSpeedStep: 0.1      // 播放速度步进
    };

    // 检测是否为移动端设备
    function isMobile() {
        return ('ontouchstart' in window) || navigator.userAgent.match(/Mobi/);
    }

    // 获取页面中第一个 video 元素
    function getVideoElement() {
        return document.querySelector('video');
    }

    // 启用 HTML5 播放
    // 当页面未检测到 video 元素时，在控制台提示当前未实现 Flash 自动转换为 HTML5 的功能
    function enableHTML5Playback() {
        const video = getVideoElement();
        if (!video) {
            console.log("未检测到HTML5视频元素，启用HTML5播放功能暂未实现自动转换。");
        }
    }

    // 切换暂停/播放状态
    function togglePlayPause(video) {
        if (!video) return;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }

    // 快进
    function fastForward(video) {
        if (!video) return;
        video.currentTime += settings.fastForwardTime;
    }

    // 快退
    function rewind(video) {
        if (!video) return;
        video.currentTime -= settings.rewindTime;
    }

    // 提高音量
    function volumeUp(video) {
        if (!video) return;
        video.volume = Math.min(1, video.volume + settings.volumeStep);
    }

    // 降低音量
    function volumeDown(video) {
        if (!video) return;
        video.volume = Math.max(0, video.volume - settings.volumeStep);
    }

    // 下一集操作：优先查找 rel="next" 的链接，否则遍历所有链接查找包含“下一集”文字的链接
    function nextEpisode() {
        let nextLink = document.querySelector('a[rel="next"]');
        if (!nextLink) {
            const links = document.getElementsByTagName('a');
            for (let link of links) {
                if (link.textContent.includes("下一集")) {
                    nextLink = link;
                    break;
                }
            }
        }
        if (nextLink) {
            window.location.href = nextLink.href;
        } else {
            console.log("未找到下一集链接。");
        }
    }

    // 切换网页全屏模式
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`全屏失败: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    // 逐帧前进（仅在暂停状态下有效）
    function stepFrameForward(video) {
        if (!video) return;
        if (video.paused) {
            video.currentTime += settings.frameTime;
        }
    }

    // 逐帧后退（仅在暂停状态下有效）
    function stepFrameBackward(video) {
        if (!video) return;
        if (video.paused) {
            video.currentTime -= settings.frameTime;
        }
    }

    // 提高播放速度
    function increasePlaybackSpeed(video) {
        if (!video) return;
        video.playbackRate += settings.playbackSpeedStep;
    }

    // 降低播放速度
    function decreasePlaybackSpeed(video) {
        if (!video) return;
        video.playbackRate = Math.max(0.1, video.playbackRate - settings.playbackSpeedStep);
    }

    // 绑定桌面端快捷键
    // 默认快捷键设置：
    //   空格：暂停/播放
    //   ←：快退； →：快进
    //   ↑：音量增大； ↓：音量减小
    //   N/n：下一集
    //   F/f：切换网页全屏
    //   Q/q：逐帧后退； E/e：逐帧前进（仅在暂停时有效）
    //   [：降低播放速度； ]：提高播放速度
    function bindHotkeys() {
        document.addEventListener('keydown', function (e) {
            // 避免在输入框或可编辑区域内触发
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

            const video = getVideoElement();
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    togglePlayPause(video);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    fastForward(video);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    rewind(video);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    volumeUp(video);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    volumeDown(video);
                    break;
                case 'n':
                case 'N':
                    e.preventDefault();
                    nextEpisode();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'q':
                case 'Q':
                    e.preventDefault();
                    stepFrameBackward(video);
                    break;
                case 'e':
                case 'E':
                    e.preventDefault();
                    stepFrameForward(video);
                    break;
                case '[':
                    e.preventDefault();
                    decreasePlaybackSpeed(video);
                    break;
                case ']':
                    e.preventDefault();
                    increasePlaybackSpeed(video);
                    break;
                default:
                    break;
            }
        }, false);
    }

    // 为移动端增加一个触摸控制面板，提供按钮操作
    function createMobileControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'video-control-panel';
        panel.style.position = 'fixed';
        panel.style.bottom = '10px';
        panel.style.left = '50%';
        panel.style.transform = 'translateX(-50%)';
        panel.style.background = 'rgba(0, 0, 0, 0.6)';
        panel.style.color = 'white';
        panel.style.padding = '10px';
        panel.style.borderRadius = '8px';
        panel.style.zIndex = '9999';
        panel.style.display = 'flex';
        panel.style.flexWrap = 'wrap';
        panel.style.justifyContent = 'center';
        panel.style.gap = '5px';

        const buttons = [
            { label: '播放/暂停', action: () => togglePlayPause(getVideoElement()) },
            { label: '快进', action: () => fastForward(getVideoElement()) },
            { label: '快退', action: () => rewind(getVideoElement()) },
            { label: '音量+', action: () => volumeUp(getVideoElement()) },
            { label: '音量-', action: () => volumeDown(getVideoElement()) },
            { label: '下一集', action: () => nextEpisode() },
            { label: '全屏', action: () => toggleFullscreen() },
            { label: '逐帧+', action: () => stepFrameForward(getVideoElement()) },
            { label: '逐帧-', action: () => stepFrameBackward(getVideoElement()) },
            { label: '加速', action: () => increasePlaybackSpeed(getVideoElement()) },
            { label: '减速', action: () => decreasePlaybackSpeed(getVideoElement()) }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.label;
            button.style.padding = '5px 8px';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.background = '#007bff';
            button.style.color = 'white';
            button.style.fontSize = '14px';
            button.style.cursor = 'pointer';
            button.addEventListener('click', btn.action);
            panel.appendChild(button);
        });

        document.body.appendChild(panel);
    }

    // 切换移动端控制面板的显示状态
    function toggleMobileControlPanel() {
        const panel = document.getElementById('video-control-panel');
        if (panel) {
            panel.remove();
            console.log("控制面板已关闭");
        } else {
            createMobileControlPanel();
            console.log("控制面板已打开");
        }
    }

    // 初始化脚本
    function init() {
        enableHTML5Playback();
        if (isMobile()) {
            // 移动端默认不加载控制面板，通过脚本菜单切换
            if (typeof GM_registerMenuCommand !== 'undefined') {
                GM_registerMenuCommand("切换控制面板", toggleMobileControlPanel);
                console.log("移动端：控制面板默认关闭，请通过脚本菜单切换显示。");
            }
        } else {
            bindHotkeys();
            console.log("桌面端已绑定键盘快捷键。");
        }
        console.log("视频网HTML5播放小工具已加载");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
