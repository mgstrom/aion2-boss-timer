class BossTimerApp {
    constructor() {
        this.bosses = JSON.parse(localStorage.getItem('bosses')) || [];
        this.editingBossId = null;
        this.alertTriggered = new Set();
        
        // 小游戏闹钟相关
        this.minigameAlarmEnabled = JSON.parse(localStorage.getItem('minigameAlarmEnabled')) || false;
        this.minigameAlarmTriggered = false;
        this.minigameAlarmInterval = null;
        this.minigameAudioContext = null;
        this.minigameStartTime = null;
        this.minigameUpdateInterval = null;
        
        this.bossTemplates = [
            { name: '學者拉兀拉', respawnTime: 120 * 60 * 1000 },
            { name: '追擊者塔兀羅', respawnTime: 120 * 60 * 1000 },
            { name: '森林戰士烏剌姆', respawnTime: 240 * 60 * 1000 },
            { name: '黑色觸手拉瓦', respawnTime: 240 * 60 * 1000 },
            { name: '百夫長戴米羅斯', respawnTime: 240 * 60 * 1000 },
            { name: '神聖的安薩斯', respawnTime: 360 * 60 * 1000 },
            { name: '監視兵器克納許', respawnTime: 240 * 60 * 1000 },
            { name: '研究官塞特蘭', respawnTime: 360 * 60 * 1000 },
            { name: '幻夢卡西亞', respawnTime: 360 * 60 * 1000 },
            { name: '沉默塔爾坦', respawnTime: 360 * 60 * 1000 },
            { name: '靈魂支配者卡沙帕', respawnTime: 360 * 60 * 1000 },
            { name: '軍團長拉格塔', respawnTime: 720 * 60 * 1000 },
            { name: '永恆卡爾吐亞', respawnTime: 720 * 60 * 1000 }
        ];
        
        this.init();
    }

    init() {
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
        this.renderBosses();
        this.updateBossSelect();
        this.setupEventListeners();
        this.updateNextAlarmTime();
        this.updateNextEntryCountdown();
        document.getElementById('minigameToggle').checked = this.minigameAlarmEnabled;
        this.updateToggleLabel();
        this.setupBackgroundRunning();
        this.initDemoControls();
        this.initTopmostToggle();
    }
    
    initTopmostToggle() {
        // 加载保存的置顶设置
        const isTopmost = JSON.parse(localStorage.getItem('isTopmost')) || false;
        document.getElementById('topmostToggle').checked = isTopmost;
        
        // 初始化置顶状态
        if (window.electronAPI) {
            window.electronAPI.toggleAlwaysOnTop(isTopmost);
        }
        
        // 添加事件监听
        document.getElementById('topmostToggle').addEventListener('change', (e) => {
            const isTopmost = e.target.checked;
            localStorage.setItem('isTopmost', JSON.stringify(isTopmost));
            if (window.electronAPI) {
                window.electronAPI.toggleAlwaysOnTop(isTopmost);
            }
        });
        
        // 监听置顶状态变化
        if (window.electronAPI) {
            window.electronAPI.onAlwaysOnTopToggled((isAlwaysOnTop) => {
                document.getElementById('topmostToggle').checked = isAlwaysOnTop;
                localStorage.setItem('isTopmost', JSON.stringify(isAlwaysOnTop));
            });
        }
    }

    setupBackgroundRunning() {
        // 使用 Page Visibility API 检测页面是否在前台
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('应用进入后台运行模式');
                // 在后台时，使用更可靠的检查方式
                this.startBackgroundCheck();
            } else {
                console.log('应用回到前台');
                this.stopBackgroundCheck();
            }
        });

        // 使用 requestAnimationFrame 确保在前台时更新
        this.keepAlive();
    }

    startBackgroundCheck() {
        // 在后台时，使用 setTimeout 而不是 setInterval，更可靠
        if (this.backgroundCheckInterval) {
            clearInterval(this.backgroundCheckInterval);
        }
        
        this.backgroundCheckInterval = setInterval(() => {
            this.updateBossCountdowns();
            this.checkMinigameAlarm();
        }, 1000);
    }

    stopBackgroundCheck() {
        if (this.backgroundCheckInterval) {
            clearInterval(this.backgroundCheckInterval);
            this.backgroundCheckInterval = null;
        }
    }

    keepAlive() {
        // 确保应用保持活跃
        if (!document.hidden) {
            requestAnimationFrame(() => this.keepAlive());
        }
    }

    toggleDemoControls() {
        const demoControls = document.querySelector('.demo-controls');
        const toggleBtn = document.getElementById('toggleDemoBtn');
        
        if (demoControls.classList.contains('hidden')) {
            // 显示调试按钮
            demoControls.classList.remove('hidden');
            toggleBtn.textContent = '👁️ 隐藏调试按钮';
            localStorage.setItem('demoControlsVisible', 'true');
        } else {
            // 隐藏调试按钮
            demoControls.classList.add('hidden');
            toggleBtn.textContent = '👁️ 显示调试按钮';
            localStorage.setItem('demoControlsVisible', 'false');
        }
    }

    initDemoControls() {
        // 初始化调试按钮显示状态
        const isVisible = localStorage.getItem('demoControlsVisible') !== 'false';
        const demoControls = document.querySelector('.demo-controls');
        const toggleBtn = document.getElementById('toggleDemoBtn');
        
        if (!isVisible) {
            demoControls.classList.add('hidden');
            toggleBtn.textContent = '👁️ 显示调试按钮';
        }
    }

    setupEventListeners() {
        document.getElementById('addBossBtn').addEventListener('click', () => this.addBoss());
        document.getElementById('saveBossBtn').addEventListener('click', () => this.saveBossEdit());
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.closeEditModal());
        
        // 点击弹窗外部关闭
        document.getElementById('editBossModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('editBossModal')) {
                this.closeEditModal();
            }
        });
        

        
        // 演示小游戏提醒按钮
        document.getElementById('demoMinigameBtn').addEventListener('click', () => {
            this.triggerMinigameAlarm();
        });
        
        // 切换调试按钮显示/隐藏
        document.getElementById('toggleDemoBtn').addEventListener('click', () => {
            this.toggleDemoControls();
        });
        
        document.getElementById('minigameToggle').addEventListener('change', (e) => {
            this.minigameAlarmEnabled = e.target.checked;
            localStorage.setItem('minigameAlarmEnabled', JSON.stringify(this.minigameAlarmEnabled));
            this.updateToggleLabel();
            this.updateNextAlarmTime();
            this.updateNextEntryCountdown();
        });
        
        document.getElementById('stopMinigameAlarmBtn').addEventListener('click', () => {
            this.stopMinigameAlarm();
        });
        
        // 小游戏弹窗外部点击关闭
        document.getElementById('minigameModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('minigameModal')) {
                this.stopMinigameAlarm();
            }
        });
        
        // 文字输入框事件监听
        const bossNameInput = document.getElementById('bossNameInput');
        bossNameInput.addEventListener('input', () => this.handleBossNameInput());
        bossNameInput.addEventListener('blur', () => {
            setTimeout(() => {
                this.hideBossSuggestions();
            }, 200);
        });
        bossNameInput.addEventListener('keydown', (e) => this.handleBossNameKeydown(e));
        
        // 添加BOSS按钮事件监听
        document.getElementById('addBossByNameBtn').addEventListener('click', () => this.addBossByName());
        
        // 剪贴板事件监听器
        document.addEventListener('paste', (e) => {
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedText = clipboardData.getData('text');
            this.handlePastedText(pastedText);
        });
    }
    
    handlePastedText(text) {
        // 检查是否包含 BOSS 名称和时间信息
        const bossTemplates = this.bossTemplates;
        
        // 检查是否包含 BOSS 名称
        let bossName = null;
        for (const template of bossTemplates) {
            if (text.includes(template.name)) {
                bossName = template.name;
                break;
            }
        }
        
        // 检查名称映射
        if (!bossName) {
            for (const [variant, standardName] of Object.entries(this.nameMappings)) {
                if (text.includes(variant)) {
                    bossName = standardName;
                    break;
                }
            }
        }
        
        // 检查是否包含时间信息
        if (bossName && text.includes('剩餘時間')) {
            // 自动填入快速添加 BOSS 框
            document.getElementById('bossNameInput').value = text;
            // 触发自动识别
            this.handleBossNameInput();
        }
    }
    
    handleBossNameInput() {
        const input = document.getElementById('bossNameInput');
        const value = input.value.trim();
        
        if (value.length === 0) {
            this.hideBossSuggestions();
            document.getElementById('bossTimeInputs').style.display = 'none';
            return;
        }
        
        // 尝试从输入中解析时间
        const timeInfo = this.parseTimeString(value);
        if (timeInfo) {
            // 如果解析到时间，提取boss名称部分
            const bossNamePart = value.replace(timeInfo.fullMatch, '').trim();
            if (bossNamePart) {
                const suggestions = this.getBossSuggestions(bossNamePart);
                if (suggestions.length > 0) {
                    // 自动选择第一个建议并添加BOSS
                    const selectedBoss = suggestions[0];
                    this.addBossWithTime(selectedBoss.name, timeInfo.hours, timeInfo.minutes, timeInfo.seconds);
                    // 清空输入框
                    input.value = '';
                    this.hideBossSuggestions();
                } else {
                    this.hideBossSuggestions();
                }
            }
        } else {
            const suggestions = this.getBossSuggestions(value);
            if (suggestions.length > 0) {
                this.showBossSuggestions(suggestions);
            } else {
                this.hideBossSuggestions();
            }
        }
    }
    
    parseTimeString(input) {
        // 匹配不同格式的时间：
        // 1. 剩餘時間 2小時54分50秒
        // 2. 剩餘時間 54分50秒
        // 3. 剩餘時間 50秒
        // 4. 剩餘時間 6 小時 10 分 53 秒（带空格）
        
        // 匹配完整格式：剩餘時間 2小時54分50秒 或 剩餘時間 6 小時 10 分 53 秒
        const fullTimeRegex = /剩餘時間\s*(\d+)\s*小時\s*(\d+)\s*分\s*(\d+)\s*秒/;
        const fullMatch = input.match(fullTimeRegex);
        if (fullMatch) {
            return {
                fullMatch: fullMatch[0],
                hours: parseInt(fullMatch[1]),
                minutes: parseInt(fullMatch[2]),
                seconds: parseInt(fullMatch[3])
            };
        }
        
        // 匹配只有分钟和秒的格式：剩餘時間 54分50秒 或 剩餘時間 10 分 53 秒
        const minSecRegex = /剩餘時間\s*(\d+)\s*分\s*(\d+)\s*秒/;
        const minSecMatch = input.match(minSecRegex);
        if (minSecMatch) {
            return {
                fullMatch: minSecMatch[0],
                hours: 0,
                minutes: parseInt(minSecMatch[1]),
                seconds: parseInt(minSecMatch[2])
            };
        }
        
        // 匹配只有秒的格式：剩餘時間 50秒 或 剩餘時間 53 秒
        const secRegex = /剩餘時間\s*(\d+)\s*秒/;
        const secMatch = input.match(secRegex);
        if (secMatch) {
            return {
                fullMatch: secMatch[0],
                hours: 0,
                minutes: 0,
                seconds: parseInt(secMatch[1])
            };
        }
        
        return null;
    }
    
    // 获取标准化的 BOSS 名称
    getStandardBossName(input) {
        const inputStr = input.trim();
        
        // 处理相似名称的映射
        const nameMappings = {
            // 森林戰士烏剌姆 相关变体
            '森林戰士烏刺姆': '森林戰士烏剌姆',
            '森林战士乌刺姆': '森林戰士烏剌姆',
            '森林战士乌拉姆': '森林戰士烏剌姆',
            '森林戰士乌拉姆': '森林戰士烏剌姆',
            '森林战士烏剌姆': '森林戰士烏剌姆',
            '森林戰士乌剌姆': '森林戰士烏剌姆',
            
            // 學者拉兀拉 相关变体
            '学者拉兀拉': '學者拉兀拉',
            '学者拉乌拉': '學者拉兀拉',
            '學者拉乌拉': '學者拉兀拉',
            '学者拉兀拉': '學者拉兀拉',
            '學者拉兀拉': '學者拉兀拉',
            
            // 追擊者塔兀羅 相关变体
            '追击者塔兀羅': '追擊者塔兀羅',
            '追击者塔乌罗': '追擊者塔兀羅',
            '追擊者塔乌罗': '追擊者塔兀羅',
            '追击者塔兀羅': '追擊者塔兀羅',
            '追擊者塔兀罗': '追擊者塔兀羅',
            
            // 黑色觸手拉瓦 相关变体
            '黑色触手拉瓦': '黑色觸手拉瓦',
            '黑色觸手拉瓦': '黑色觸手拉瓦',
            '黑色触手拉瓦': '黑色觸手拉瓦',
            
            // 百夫長戴米羅斯 相关变体
            '百夫长戴米羅斯': '百夫長戴米羅斯',
            '百夫长戴米罗斯': '百夫長戴米羅斯',
            '百夫長戴米罗斯': '百夫長戴米羅斯',
            '百夫长戴米羅斯': '百夫長戴米羅斯',
            '百夫長戴米羅斯': '百夫長戴米羅斯',
            
            // 神聖的安薩斯 相关变体
            '神圣的安薩斯': '神聖的安薩斯',
            '神圣的安萨斯': '神聖的安薩斯',
            '神聖的安萨斯': '神聖的安薩斯',
            '神圣的安薩斯': '神聖的安薩斯',
            '神聖的安薩斯': '神聖的安薩斯',
            
            // 監視兵器克納許 相关变体
            '监视兵器克納許': '監視兵器克納許',
            '监视兵器克纳什': '監視兵器克納許',
            '監視兵器克纳什': '監視兵器克納許',
            '监视兵器克納許': '監視兵器克納許',
            '監視兵器克納許': '監視兵器克納許',
            
            // 研究官塞特蘭 相关变体
            '研究官塞特兰': '研究官塞特蘭',
            '研究官塞特蘭': '研究官塞特蘭',
            '研究官塞特兰': '研究官塞特蘭',
            
            // 幻夢卡西亞 相关变体
            '幻梦卡西亚': '幻夢卡西亞',
            '幻夢卡西亞': '幻夢卡西亞',
            '幻梦卡西亞': '幻夢卡西亞',
            
            // 沉默塔爾坦 相关变体
            '沉默塔尔坦': '沉默塔爾坦',
            '沉默塔爾坦': '沉默塔爾坦',
            '沉默塔尔坦': '沉默塔爾坦',
            
            // 靈魂支配者卡沙帕 相关变体
            '灵魂支配者卡沙帕': '靈魂支配者卡沙帕',
            '靈魂支配者卡沙帕': '靈魂支配者卡沙帕',
            '灵魂支配者卡沙帕': '靈魂支配者卡沙帕',
            
            // 軍團長拉格塔 相关变体
            '军团长拉格塔': '軍團長拉格塔',
            '軍團長拉格塔': '軍團長拉格塔',
            '军团长拉格塔': '軍團長拉格塔',
            
            // 永恆卡爾吐亞 相关变体
            '永恒卡尔吐亚': '永恆卡爾吐亞',
            '永恆卡尔吐亚': '永恆卡爾吐亞',
            '永恒卡爾吐亞': '永恆卡爾吐亞',
            '永恆卡爾吐亚': '永恆卡爾吐亞'
        };
        
        // 检查是否有精确映射
        if (nameMappings[inputStr]) {
            return nameMappings[inputStr];
        }
        
        // 模糊匹配：移除所有非中文字符和数字，然后进行匹配
        const cleanInput = inputStr.replace(/[^\u4e00-\u9fa5\d]/g, '');
        if (cleanInput) {
            const matchedBoss = this.bossTemplates.find(boss => {
                const cleanBossName = boss.name.replace(/[^\u4e00-\u9fa5\d]/g, '');
                return cleanBossName.includes(cleanInput) || cleanInput.includes(cleanBossName);
            });
            if (matchedBoss) {
                return matchedBoss.name;
            }
        }
        
        // 常规匹配
        const lowercaseInput = inputStr.toLowerCase();
        const matchedBoss = this.bossTemplates.find(boss => {
            const lowercaseBossName = boss.name.toLowerCase();
            return lowercaseBossName.includes(lowercaseInput) || lowercaseInput.includes(lowercaseBossName);
        });
        if (matchedBoss) {
            return matchedBoss.name;
        }
        
        return null;
    }
    
    getBossSuggestions(input) {
        let inputStr = input.trim();
        
        // 从输入中移除时间信息，只保留 BOSS 名称部分
        const timeMatch = inputStr.match(/剩餘時間.*$/);
        if (timeMatch) {
            inputStr = inputStr.replace(timeMatch[0], '').trim();
        }
        
        const standardName = this.getStandardBossName(inputStr);
        
        if (standardName) {
            return this.bossTemplates.filter(boss => boss.name === standardName);
        }
        
        // 如果没有找到标准名称，返回空数组
        return [];
    }
    
    showBossSuggestions(suggestions) {
        const suggestionsContainer = document.getElementById('bossNameSuggestions');
        suggestionsContainer.innerHTML = '';
        
        const input = document.getElementById('bossNameInput');
        const value = input.value.trim();
        const timeInfo = this.parseTimeString(value);
        
        suggestions.forEach(boss => {
            const item = document.createElement('div');
            item.className = 'boss-suggestion-item';
            item.textContent = boss.name;
            item.addEventListener('click', () => {
                // 如果输入中包含时间信息，直接添加到倒计时列表
                if (timeInfo) {
                    this.addBossWithTime(boss.name, timeInfo.hours, timeInfo.minutes, timeInfo.seconds);
                    // 清空输入框
                    input.value = '';
                    this.hideBossSuggestions();
                } else {
                    // 没有时间信息，显示时间输入框
                    document.getElementById('bossNameInput').value = boss.name;
                    this.hideBossSuggestions();
                    document.getElementById('bossTimeInputs').style.display = 'flex';
                }
            });
            suggestionsContainer.appendChild(item);
        });
        
        suggestionsContainer.style.display = 'block';
    }
    
    addBossWithTime(bossName, hours, minutes, seconds, updateType = '手动') {
        if (!bossName) {
            alert('请输入BOSS名称');
            return;
        }
        
        const bossTemplate = this.bossTemplates.find(b => b.name === bossName);
        if (!bossTemplate) {
            alert('输入的BOSS名称不在BOSS列表中');
            return;
        }
        
        const respawnTime = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
        
        // 检查是否已存在同名 BOSS
        const existingBoss = this.bosses.find(boss => boss.name === bossName);
        
        if (existingBoss) {
            // 更新现有 BOSS 的计时时间
            existingBoss.respawnTime = respawnTime;
            existingBoss.nextSpawn = Date.now() + respawnTime;
            existingBoss.justRespawned = false;
            existingBoss.lastUpdated = Date.now();
            existingBoss.updateType = updateType;
            this.alertTriggered.delete(existingBoss.id);
            
            // 播放声音提示
            this.playAlarmSound();
        } else {
            // 添加新的 BOSS
            const boss = {
                id: Date.now(),
                name: bossName,
                respawnTime: respawnTime,
                nextSpawn: Date.now() + respawnTime,
                alertEnabled: true,
                alertMinutes: 5,
                justRespawned: false,
                lastUpdated: Date.now(),
                updateType: updateType
            };
            this.bosses.push(boss);
        }
        
        this.saveBosses();
        this.renderBosses();
        this.updateBossSelect();
    }
    
    hideBossSuggestions() {
        document.getElementById('bossNameSuggestions').style.display = 'none';
    }
    
    handleBossNameKeydown(e) {
        const suggestionsContainer = document.getElementById('bossNameSuggestions');
        const suggestionItems = suggestionsContainer.querySelectorAll('.boss-suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const selected = suggestionsContainer.querySelector('.selected');
            const next = selected ? selected.nextElementSibling : suggestionItems[0];
            if (next) {
                if (selected) selected.classList.remove('selected');
                next.classList.add('selected');
                next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const selected = suggestionsContainer.querySelector('.selected');
            const prev = selected ? selected.previousElementSibling : suggestionItems[suggestionItems.length - 1];
            if (prev) {
                if (selected) selected.classList.remove('selected');
                prev.classList.add('selected');
                prev.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = suggestionsContainer.querySelector('.selected');
            if (selected) {
                selected.click();
            } else if (suggestionItems.length > 0) {
                suggestionItems[0].click();
            }
        }
    }
    
    addBossByName() {
        const bossName = document.getElementById('bossNameInput').value.trim();
        const hours = parseInt(document.getElementById('bossInputHours').value) || 0;
        const minutes = parseInt(document.getElementById('bossInputMinutes').value) || 0;
        const seconds = parseInt(document.getElementById('bossInputSeconds').value) || 0;
        
        if (!bossName) {
            alert('请输入BOSS名称');
            return;
        }
        
        if (hours === 0 && minutes === 0 && seconds === 0) {
            alert('请设置倒计时时间');
            return;
        }
        
        // 获取标准化的 BOSS 名称
        const standardBossName = this.getStandardBossName(bossName);
        if (!standardBossName) {
            alert('输入的BOSS名称不在BOSS列表中');
            return;
        }
        
        const bossTemplate = this.bossTemplates.find(b => b.name === standardBossName);
        if (!bossTemplate) {
            alert('输入的BOSS名称不在BOSS列表中');
            return;
        }
        
        const respawnTime = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
        
        // 检查是否已存在同名 BOSS
        const existingBoss = this.bosses.find(boss => boss.name === standardBossName);
        
        if (existingBoss) {
            // 更新现有 BOSS 的计时时间
            existingBoss.respawnTime = respawnTime;
            existingBoss.nextSpawn = Date.now() + respawnTime;
            existingBoss.justRespawned = false;
            existingBoss.lastUpdated = Date.now();
            existingBoss.updateType = '手动';
            this.alertTriggered.delete(existingBoss.id);
            alert('已更新 ' + standardBossName + ' 的刷新时间');
        } else {
            // 添加新的 BOSS
            const boss = {
                id: Date.now(),
                name: standardBossName,
                respawnTime: respawnTime,
                nextSpawn: Date.now() + respawnTime,
                alertEnabled: true,
                alertMinutes: 5,
                justRespawned: false,
                lastUpdated: Date.now(),
                updateType: '手动'
            };
            this.bosses.push(boss);
        }
        
        this.saveBosses();
        this.renderBosses();
        this.updateBossSelect();
        
        // 清空输入框
        document.getElementById('bossNameInput').value = '';
        document.getElementById('bossInputHours').value = '';
        document.getElementById('bossInputMinutes').value = '';
        document.getElementById('bossInputSeconds').value = '';
        document.getElementById('bossTimeInputs').style.display = 'none';
        this.hideBossSuggestions();
    }





    updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('currentTime').textContent = timeString;
        this.updateBossCountdowns();
        this.checkMinigameAlarm();
        this.updateNextEntryCountdown();
    }

    addBoss() {
        const bossSelect = document.getElementById('bossSelect');
        const bossName = bossSelect.value;
        if (!bossName) return;
        
        const bossTemplate = this.bossTemplates.find(b => b.name === bossName);
        if (!bossTemplate) return;
        
        const boss = {
            id: Date.now(),
            name: bossName,
            respawnTime: bossTemplate.respawnTime,
            nextSpawn: Date.now() + bossTemplate.respawnTime,
            alertEnabled: true,
            alertMinutes: 5,
            justRespawned: false
        };
        
        this.bosses.push(boss);
        this.saveBosses();
        this.renderBosses();
        this.updateBossSelect();
        bossSelect.value = '';
    }

    deleteBoss(id) {
        const boss = this.bosses.find(b => b.id === id);
        if (!boss) return;
        
        if (confirm(`确定要删除 ${boss.name} 的倒计时吗？`)) {
            this.bosses = this.bosses.filter(boss => boss.id !== id);
            this.alertTriggered.delete(id);
            this.saveBosses();
            this.renderBosses();
            this.updateBossSelect();
        }
    }

    resetBossTimer(id) {
        const boss = this.bosses.find(boss => boss.id === id);
        if (!boss) return;
        
        if (confirm(`确定要重置 ${boss.name} 的倒计时吗？`)) {
            const now = Date.now();
            boss.lastKilled = now;
            boss.nextSpawn = now + boss.respawnTime;
            this.alertTriggered.delete(id);
            this.saveBosses();
            this.renderBosses();
        }
    }

    openEditModal(id) {
        const boss = this.bosses.find(b => b.id === id);
        if (!boss) return;
        
        this.editingBossId = id;
        const now = Date.now();
        const timeLeft = Math.max(0, boss.nextSpawn - now);
        
        document.getElementById('editBossName').textContent = boss.name;
        document.getElementById('editHours').value = Math.floor(timeLeft / (1000 * 60 * 60));
        document.getElementById('editMinutes').value = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('editSeconds').value = Math.floor((timeLeft % (1000 * 60)) / 1000);
        document.getElementById('enableAlert').checked = boss.alertEnabled !== false;
        document.getElementById('alertMinutes').value = boss.alertMinutes || 5;
        
        document.getElementById('editBossModal').style.display = 'flex';
    }

    closeEditModal() {
        document.getElementById('editBossModal').style.display = 'none';
        this.editingBossId = null;
        
        requestAnimationFrame(() => {
            document.getElementById('editHours').value = '';
            document.getElementById('editMinutes').value = '';
            document.getElementById('editSeconds').value = '';
        });
    }

    saveBossEdit() {
        if (!this.editingBossId) return;
        const boss = this.bosses.find(b => b.id === this.editingBossId);
        if (!boss) return;
        
        const bossId = this.editingBossId;
        
        const hours = parseInt(document.getElementById('editHours').value) || 0;
        const minutes = parseInt(document.getElementById('editMinutes').value) || 0;
        const seconds = parseInt(document.getElementById('editSeconds').value) || 0;
        const alertEnabled = document.getElementById('enableAlert').checked;
        const alertMinutes = parseInt(document.getElementById('alertMinutes').value) || 5;
        
        document.getElementById('editBossModal').style.display = 'none';
        this.editingBossId = null;
        
        const totalMs = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
        const now = Date.now();
        boss.nextSpawn = now + totalMs;
        boss.alertEnabled = alertEnabled;
        boss.alertMinutes = alertMinutes;
        
        this.alertTriggered.delete(bossId);
        this.saveBosses();
        this.renderBosses();
    }

    updateBossCountdowns() {
        const now = Date.now();
        
        this.bosses.forEach(boss => {
            const timeLeft = boss.nextSpawn - now;
            
            // 检查是否需要触发提醒 - 扩大时间窗口到5秒，防止后台节流导致错过
            if (boss.alertEnabled && timeLeft > 0) {
                const alertTime = boss.nextSpawn - (boss.alertMinutes * 60 * 1000);
                // 使用5秒窗口，并确保只触发一次
                if (now >= alertTime && now < alertTime + 5000 && !this.alertTriggered.has(boss.id)) {
                    this.notifyBossAlert(boss);
                    this.alertTriggered.add(boss.id);
                }
            }
            
            // BOSS刷新 - 自动重新开始倒计时（增加1分钟击杀时间）
            if (now >= boss.nextSpawn) {
                this.notifyBossSpawn(boss);
                
                const killTime = 60 * 1000;
                boss.lastKilled = now;
                
                // 查找BOSS模板中的固定刷新时间
                const bossTemplate = this.bossTemplates.find(b => b.name === boss.name);
                if (bossTemplate) {
                    // 使用模板中的固定时间
                    boss.respawnTime = bossTemplate.respawnTime;
                    boss.nextSpawn = now + bossTemplate.respawnTime + killTime;
                } else {
                    // 如果找不到模板，使用当前的respawnTime
                    boss.nextSpawn = now + boss.respawnTime + killTime;
                }
                
                boss.justRespawned = true;
                boss.lastUpdated = now;
                boss.updateType = '自动';
                
                this.alertTriggered.delete(boss.id);
                
                setTimeout(() => {
                    boss.justRespawned = false;
                    this.renderBosses();
                }, 3000);
            }
        });
        
        this.saveBosses();
        this.renderBosses();
    }

    renderBosses() {
        const container = document.getElementById('bossesContainer');
        const noBosses = document.getElementById('noBosses');
        
        if (this.bosses.length === 0) {
            noBosses.style.display = 'block';
            container.innerHTML = '';
            return;
        }
        
        noBosses.style.display = 'none';
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        const now = Date.now();
        // 按剩余时间排序，时间少的排在前面
        const sortedBosses = [...this.bosses].sort((a, b) => {
            const timeLeftA = Math.max(0, a.nextSpawn - now);
            const timeLeftB = Math.max(0, b.nextSpawn - now);
            return timeLeftA - timeLeftB;
        });
        
        sortedBosses.forEach(boss => {
            const timeLeft = Math.max(0, boss.nextSpawn - now);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            const timeLeftString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            const alertStatus = boss.alertEnabled !== false ? '🔔' : '🔕';
            const alertInfo = boss.alertEnabled !== false ? `(${boss.alertMinutes || 5}分钟提醒)` : '';
            const respawnedMark = boss.justRespawned ? '<span class="respawned-mark">✨ 已刷新</span>' : '';
            
            // 计算上次更新时间
            let updateInfo = '';
            if (boss.lastUpdated) {
                const now = Date.now();
                const timeDiff = now - boss.lastUpdated;
                const minutesAgo = Math.floor(timeDiff / (1000 * 60));
                const updateType = boss.updateType || '手动';
                if (minutesAgo < 1) {
                    updateInfo = `(刚刚${updateType}更新)`;
                } else if (minutesAgo < 60) {
                    updateInfo = `(${minutesAgo}分钟前${updateType}更新)`;
                } else {
                    const hoursAgo = Math.floor(minutesAgo / 60);
                    updateInfo = `(${hoursAgo}小时前${updateType}更新)`;
                }
            }
            
            const bossElement = document.createElement('div');
            bossElement.className = 'boss-item';
            const totalTime = boss.respawnTime;
            const progress = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
            bossElement.innerHTML = `
                <div class="boss-item-content">
                    <div class="boss-info">
                        <div class="boss-name">${boss.name} ${alertStatus} ${respawnedMark}</div>
                        <div class="boss-alert-info">${alertInfo} ${updateInfo}</div>
                    </div>
                    <div class="boss-time-left">${timeLeftString}</div>
                    <div class="boss-actions">
                        <button class="btn btn-secondary" onclick="app.openEditModal(${boss.id})">
                            编辑
                        </button>
                        <button class="btn btn-secondary" onclick="app.resetBossTimer(${boss.id})">
                            重置
                        </button>
                        <button class="btn btn-danger" onclick="app.deleteBoss(${boss.id})">
                            删除
                        </button>
                    </div>
                </div>
                <div class="boss-progress">
                    <div class="boss-progress-bar" style="width: ${progress}%"></div>
                </div>
            `;
            fragment.appendChild(bossElement);
        });
        
        container.appendChild(fragment);
    }

    saveBosses() {
        localStorage.setItem('bosses', JSON.stringify(this.bosses));
    }

    updateBossSelect() {
        const bossSelect = document.getElementById('bossSelect');
        const activeBossNames = new Set(this.bosses.map(boss => boss.name));
        
        const bossGroups = {
            '2小时': this.bossTemplates.filter(b => b.respawnTime === 120 * 60 * 1000),
            '3小时': this.bossTemplates.filter(b => b.respawnTime === 180 * 60 * 1000),
            '4小时': this.bossTemplates.filter(b => b.respawnTime === 240 * 60 * 1000),
            '6小时': this.bossTemplates.filter(b => b.respawnTime === 360 * 60 * 1000),
            '12小时': this.bossTemplates.filter(b => b.respawnTime === 720 * 60 * 1000)
        };
        
        let html = '<option value="">选择BOSS</option>';
        
        for (const [groupName, bosses] of Object.entries(bossGroups)) {
            const availableBosses = bosses.filter(boss => !activeBossNames.has(boss.name));
            if (availableBosses.length > 0) {
                html += `<optgroup label="${groupName}">`;
                availableBosses.forEach(boss => {
                    const hours = boss.respawnTime / (60 * 60 * 1000);
                    html += `<option value="${boss.name}">${boss.name} (${hours}小时)</option>`;
                });
                html += '</optgroup>';
            }
        }
        
        bossSelect.innerHTML = html;
    }

    notifyBossAlert(boss) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('BOSS即将刷新', {
                body: `${boss.name} 将在 ${boss.alertMinutes} 分钟后刷新！`,
                icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNNTAgMGMtMTIuNSAwLTI1IDUuNS0yNSAyNSAwIDEyLjUgNS41IDI1IDI1IDI1czI1LTUuNSAyNS0yNSAwLTEyLjUtNS41LTI1LTI1LTI1em0wIDgwYy0xNS41IDAtMjAtLTMtMjAtMTBzNC41LTEwIDIwLTEwIDIwIDUgMjAgMTAtNC41IDEwLTIwIDEwem0tMTAtMzBjLTcgMC0xNS01LTE1LTE1czgtMTUgMTUtMTUgMTUgNSAxNSAxNS04IDE1LTE1LTE1eiIvPjxwYXRoIGQ9Ik0xMCAxMGg4MHY4MGgtODB6bTEwIDQwaDEwdjEwaC0xMHpNMzAgNDBoMTB2MTBoLTEwem0yMCA0MGgxMHYxMGgtMTB6bTIwIDQwaDEwdjEwaC0xMHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='
            });
        }
        this.playAlarmSound();
    }

    notifyBossSpawn(boss) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('BOSS已刷新', {
                body: `${boss.name} 已经刷新！`,
                icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNNTAgMGMtMTIuNSAwLTI1IDUuNS0yNSAyNSAwIDEyLjUgNS41IDI1IDI1IDI1czI1LTUuNSAyNS0yNSAwLTEyLjUtNS41LTI1LTI1LTI1em0wIDgwYy0xNS41IDAtMjAtLTMtMjAtMTBzNC41LTEwIDIwLTEwIDIwIDUgMjAgMTAtNC41IDEwLTIwIDEwem0tMTAtMzBjLTcgMC0xNS01LTE1LTE1czgtMTUgMTUtMTUgMTUgNSAxNSAxNS04IDE1LTE1LTE1eiIvPjxwYXRoIGQ9Ik0xMCAxMGg4MHY4MGgtODB6bTEwIDQwaDEwdjEwaC0xMHpNMzAgNDBoMTB2MTBoLTEwem0yMCA0MGgxMHYxMGgtMTB6bTIwIDQwaDEwdjEwaC0xMHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='
            });
        }
        this.playAlarmSound();
    }

    playAlarmSound() {
        try {
            if (!this.minigameAudioContext) {
                this.minigameAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = this.minigameAudioContext.createOscillator();
            const gainNode = this.minigameAudioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.minigameAudioContext.destination);
            
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.3;
            
            oscillator.start();
            setTimeout(() => {
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.minigameAudioContext.currentTime + 0.5);
                setTimeout(() => {
                    oscillator.stop();
                }, 500);
            }, 200);
        } catch (error) {
            console.log('播放声音失败:', error);
        }
    }

    updateToggleLabel() {
        const toggleLabel = document.getElementById('toggleLabel');
        toggleLabel.textContent = this.minigameAlarmEnabled ? '已开启' : '已关闭';
    }

    updateNextAlarmTime() {
        const nextAlarmDiv = document.getElementById('nextAlarmTime');
        if (!this.minigameAlarmEnabled) {
            nextAlarmDiv.textContent = '';
            return;
        }
        
        const nextAlarm = this.getNextMinigameAlarm();
        const timeString = nextAlarm.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        nextAlarmDiv.textContent = `下次提醒: ${timeString}`;
    }

    updateNextEntryCountdown() {
        const entryCountdownDiv = document.getElementById('nextEntryCountdown');
        if (!this.minigameAlarmEnabled) {
            entryCountdownDiv.textContent = '';
            return;
        }
        
        const now = new Date();
        const targetTime = new Date(now);
        
        // 设置分钟为0，秒和毫秒为0（整点进场）
        targetTime.setMinutes(0, 0, 0);
        
        // 计算当前小时
        let currentHour = targetTime.getHours();
        
        // 检查是否需要调整到下一个双数小时
        if (now.getMinutes() >= 0 || currentHour % 2 !== 0) {
            // 计算下一个双数小时
            let nextHour = currentHour + 1;
            while (nextHour % 2 !== 0) {
                nextHour++;
            }
            // 处理跨天的情况
            if (nextHour >= 24) {
                nextHour = 0;
                targetTime.setDate(targetTime.getDate() + 1);
            }
            targetTime.setHours(nextHour);
        }
        
        const remaining = Math.max(0, targetTime - now);
        const minutes = Math.floor(remaining / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        const countdownString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        entryCountdownDiv.textContent = `下次进场倒计时: ${countdownString}`;
    }

    getNextMinigameAlarm() {
        const now = new Date();
        const nextAlarm = new Date(now);
        
        // 设置分钟为57，秒和毫秒为0（双数整点前3分钟提醒）
        nextAlarm.setMinutes(57, 0, 0);
        
        // 计算当前小时
        let currentHour = nextAlarm.getHours();
        
        // 检查是否需要调整到下一个双数小时
        if (now.getMinutes() >= 57 || currentHour % 2 !== 0) {
            // 计算下一个双数小时
            let nextHour = currentHour + 1;
            while (nextHour % 2 !== 0) {
                nextHour++;
            }
            // 处理跨天的情况
            if (nextHour >= 24) {
                nextHour = 0;
                nextAlarm.setDate(nextAlarm.getDate() + 1);
            }
            nextAlarm.setHours(nextHour);
        }
        
        return nextAlarm;
    }

    checkMinigameAlarm() {
        if (!this.minigameAlarmEnabled) return;
        
        const now = new Date();
        // 只在双数小时的第57分钟触发提醒（双数整点前3分钟）
        if (now.getMinutes() === 57 && now.getSeconds() === 0 && now.getHours() % 2 === 0 && !this.minigameAlarmTriggered) {
            this.minigameAlarmTriggered = true;
            this.triggerMinigameAlarm();
            
            setTimeout(() => {
                this.minigameAlarmTriggered = false;
            }, 1000);
        }
    }

    triggerMinigameAlarm() {
        this.minigameAlarmTriggered = true;
        this.minigameStartTime = Date.now();
        
        document.getElementById('minigameModal').style.display = 'flex';
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('小游戏时间到了！', {
                body: '请参与小游戏获取奖励',
                icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cGF0aCBkPSJNNTAgMGMtMTIuNSAwLTI1IDUuNS0yNSAyNSAwIDEyLjUgNS41IDI1IDI1IDI1czI1LTUuNSAyNS0yNSAwLTEyLjUtNS41LTI1LTI1LTI1em0wIDgwYy0xNS41IDAtMjAtLTMtMjAtMTBzNC41LTEwIDIwLTEwIDIwIDUgMjAgMTAtNC41IDEwLTIwIDEwem0tMTAtMzBjLTcgMC0xNS01LTE1LTE1czgtMTUgMTUtMTUgMTUgNSAxNSAxNS04IDE1LTE1LTE1eiIvPjxwYXRoIGQ9Ik0xMCAxMGg4MHY4MGgtODB6bTEwIDQwaDEwdjEwaC0xMHpNMzAgNDBoMTB2MTBoLTEwem0yMCA0MGgxMHYxMGgtMTB6bTIwIDQwaDEwdjEwaC0xMHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4='
            });
        }
        
        this.startContinuousAlarm();
        this.startMinigameTimeUpdate();
        
        // 10秒后自动关闭弹窗
        setTimeout(() => {
            this.stopMinigameAlarm();
        }, 10000);
    }

    startMinigameTimeUpdate() {
        this.updateMinigameTime();
        this.minigameUpdateInterval = setInterval(() => {
            this.updateMinigameTime();
        }, 1000);
    }

    updateMinigameTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('minigameCurrentTime').textContent = timeString;
        
        const currentHour = now.getHours();
        const targetTime = new Date(now);
        targetTime.setHours(currentHour, 18, 0, 0);
        
        if (now.getMinutes() >= 18) {
            targetTime.setHours(currentHour + 1, 18, 0, 0);
        }
        
        const remaining = Math.max(0, targetTime - now);
        const minutes = Math.floor(remaining / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        const countdownString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('minigameEntryCountdown').textContent = countdownString;
    }

    startContinuousAlarm() {
        this.minigameAlarmInterval = setInterval(() => {
            this.playMinigameAlarmSound();
        }, 2000);
    }

    playMinigameAlarmSound() {
        try {
            if (!this.minigameAudioContext) {
                this.minigameAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const notes = [523.25, 659.25, 783.99, 1046.50];
            
            notes.forEach((frequency, index) => {
                setTimeout(() => {
                    const oscillator = this.minigameAudioContext.createOscillator();
                    const gainNode = this.minigameAudioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.minigameAudioContext.destination);
                    
                    oscillator.frequency.value = frequency;
                    gainNode.gain.value = 0.3;
                    
                    oscillator.start();
                    setTimeout(() => {
                        gainNode.gain.exponentialRampToValueAtTime(0.01, this.minigameAudioContext.currentTime + 0.1);
                        setTimeout(() => {
                            oscillator.stop();
                        }, 100);
                    }, 100);
                }, index * 150);
            });
        } catch (error) {
            console.log('播放声音失败:', error);
        }
    }

    stopMinigameAlarm() {
        document.getElementById('minigameModal').style.display = 'none';
        
        if (this.minigameAlarmInterval) {
            clearInterval(this.minigameAlarmInterval);
            this.minigameAlarmInterval = null;
        }
        
        if (this.minigameUpdateInterval) {
            clearInterval(this.minigameUpdateInterval);
            this.minigameUpdateInterval = null;
        }
    }
}

const app = new BossTimerApp();

if ('Notification' in window) {
    Notification.requestPermission();
}
