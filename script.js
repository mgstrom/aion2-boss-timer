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
            { name: '叛教者雷拉', respawnTime: 180 * 60 * 1000 },
            { name: '百夫長戴米羅斯', respawnTime: 240 * 60 * 1000 },
            { name: '神聖的安薩斯', respawnTime: 360 * 60 * 1000 },
            { name: '收穫管理者莫夏夫', respawnTime: 180 * 60 * 1000 },
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
        this.initCustomBoss();
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
        document.getElementById('addCustomBossBtn').addEventListener('click', () => this.addCustomBoss());
        document.getElementById('toggleCustomBossBtn').addEventListener('click', () => this.toggleCustomBossInputs());
        document.getElementById('cancelCustomBossBtn').addEventListener('click', () => this.closeCustomBossModal());
        document.getElementById('saveBossBtn').addEventListener('click', () => this.saveBossEdit());
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.closeEditModal());
        
        // 点击弹窗外部关闭
        document.getElementById('editBossModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('editBossModal')) {
                this.closeEditModal();
            }
        });
        
        // 点击自定义BOSS弹窗外部关闭
        document.getElementById('customBossModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('customBossModal')) {
                this.closeCustomBossModal();
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
    }

    toggleCustomBossInputs() {
        const modal = document.getElementById('customBossModal');
        modal.style.display = 'flex';
    }

    closeCustomBossModal() {
        const modal = document.getElementById('customBossModal');
        modal.style.display = 'none';
        
        // 清空输入框
        document.getElementById('customBossName').value = '';
        document.getElementById('customBossHours').value = '';
        document.getElementById('customBossMinutes').value = '';
        document.getElementById('customBossSeconds').value = '';
    }

    initCustomBoss() {
        // 初始化自定义BOSS弹窗
        document.getElementById('customBossModal').style.display = 'none';
    }

    addCustomBoss() {
        const bossName = document.getElementById('customBossName').value.trim();
        const hours = parseInt(document.getElementById('customBossHours').value) || 0;
        const minutes = parseInt(document.getElementById('customBossMinutes').value) || 0;
        const seconds = parseInt(document.getElementById('customBossSeconds').value) || 0;
        
        if (!bossName) {
            alert('请输入BOSS名称');
            return;
        }
        
        if (hours === 0 && minutes === 0 && seconds === 0) {
            alert('请设置倒计时时间');
            return;
        }
        
        const respawnTime = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
        
        const boss = {
            id: Date.now(),
            name: bossName,
            respawnTime: respawnTime,
            nextSpawn: Date.now() + respawnTime,
            alertEnabled: true,
            alertMinutes: 5,
            justRespawned: false
        };
        
        this.bosses.push(boss);
        this.saveBosses();
        this.renderBosses();
        this.updateBossSelect();
        
        // 关闭弹窗并清空输入框
        this.closeCustomBossModal();
    }

    updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const dateString = now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        document.getElementById('currentTime').textContent = timeString;
        document.getElementById('currentDate').textContent = dateString;
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
                boss.nextSpawn = now + boss.respawnTime + killTime;
                boss.justRespawned = true;
                
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
            
            const bossElement = document.createElement('div');
            bossElement.className = 'boss-item';
            const totalTime = boss.respawnTime;
            const progress = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
            bossElement.innerHTML = `
                <div class="boss-item-content">
                    <div class="boss-info">
                        <div class="boss-name">${boss.name} ${alertStatus} ${respawnedMark}</div>
                        <div class="boss-alert-info">${alertInfo}</div>
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
        entryCountdownDiv.textContent = `下次进场倒计时: ${countdownString}`;
    }

    getNextMinigameAlarm() {
        const now = new Date();
        const nextAlarm = new Date(now);
        nextAlarm.setMinutes(10, 0, 0);
        
        if (now.getMinutes() >= 10) {
            nextAlarm.setHours(nextAlarm.getHours() + 1);
        }
        
        return nextAlarm;
    }

    checkMinigameAlarm() {
        if (!this.minigameAlarmEnabled) return;
        
        const now = new Date();
        if (now.getMinutes() === 10 && now.getSeconds() === 0 && !this.minigameAlarmTriggered) {
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
