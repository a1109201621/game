/**
 * 迷糊直播间 - 游戏逻辑
 * 
 * 功能：
 * 1. 存档系统（dzmm.kv）
 * 2. 消息管理（编辑/重新生成/删除）
 * 3. 图片关键词触发
 * 4. Debug日志收集
 */

// 通知父窗口 iframe 已准备好
if (window.parent !== window) {
    window.parent.postMessage('iframe:content-ready', '*');
}

// 检查 DZMM SDK 是否已注入
function isDzmmInjected() {
    return !!(window.dzmm && window.dzmm.completions && window.dzmm.chat && window.dzmm.kv);
}

// 等待 DZMM API 就绪
const dzmmReady = new Promise((resolve) => {
    if (isDzmmInjected()) return resolve('injected');

    const handler = (event) => {
        if (event.data?.type === 'dzmm:ready') {
            window.removeEventListener('message', handler);
            resolve('message');
        }
    };
    window.addEventListener('message', handler);

    const t0 = Date.now();
    const timer = setInterval(() => {
        if (isDzmmInjected()) {
            clearInterval(timer);
            window.removeEventListener('message', handler);
            resolve('poll');
            return;
        }
        if (Date.now() - t0 > 5000) {
            clearInterval(timer);
            window.removeEventListener('message', handler);
            resolve('timeout');
        }
    }, 100);
});

document.addEventListener('alpine:init', () => {
    Alpine.store('game', {
        // ========== 基础状态 ==========
        started: false,
        disabled: false,
        loading: true,
        loadingText: '正在连接直播间...',
        showSkipBtn: false,
        isGenerating: false,

        // ========== 玩家配置 ==========
        playerName: '',
        model: 'nalang-xl-0826',
        rulesExpanded: false,

        // ========== 消息与历史 ==========
        messages: [],  // [{id, role, content, images}]
        history: [],   // 用于AI上下文的历史
        input: '',

        // ========== 图片配置 ==========
        imageKeywords: {
            // 胸部相关 - 更宽泛
            '胸': { prefix: '胸部', count: 10 },
            '胸部': { prefix: '胸部', count: 10 },
            '奶子': { prefix: '胸部', count: 10 },
            '乳房': { prefix: '胸部', count: 10 },
            '乳头': { prefix: '胸部', count: 10 },
            '奶': { prefix: '胸部', count: 10 },
            '胸罩': { prefix: '胸部', count: 10 },
            '胸围': { prefix: '胸部', count: 10 },
            '爆乳': { prefix: '胸部', count: 10 },
            '巨乳': { prefix: '胸部', count: 10 },
            // 下体相关 - 更宽泛
            '穴': { prefix: '小穴', count: 10 },
            '小穴': { prefix: '小穴', count: 10 },
            '私处': { prefix: '小穴', count: 10 },
            '下面': { prefix: '小穴', count: 10 },
            '阴部': { prefix: '小穴', count: 10 },
            '阴唇': { prefix: '小穴', count: 10 },
            '阴蒂': { prefix: '小穴', count: 10 },
            '阴道': { prefix: '小穴', count: 10 },
            '下体': { prefix: '小穴', count: 10 },
            '私': { prefix: '小穴', count: 10 },
            '那里': { prefix: '小穴', count: 10 },
            '内裤': { prefix: '小穴', count: 10 },
            '裤': { prefix: '小穴', count: 10 },
            '大腿': { prefix: '小穴', count: 10 },
            '腿间': { prefix: '小穴', count: 10 },
            '两腿': { prefix: '小穴', count: 10 },
            '腿': { prefix: '小穴', count: 10 },
            '屁股': { prefix: '小穴', count: 10 },
            '臀': { prefix: '小穴', count: 10 },
            '肛门': { prefix: '小穴', count: 10 },
            // 腋下相关
            '腋': { prefix: '腋下', count: 10 },
            '腋下': { prefix: '腋下', count: 10 },
            '腋窝': { prefix: '腋下', count: 10 },
            '胳膊': { prefix: '腋下', count: 10 },
            '手臂': { prefix: '腋下', count: 10 },
            '手': { prefix: '腋下', count: 10 },
            // 足部相关 - 更宽泛
            '足': { prefix: '足部', count: 10 },
            '足部': { prefix: '足部', count: 10 },
            '脚': { prefix: '足部', count: 10 },
            '脚趾': { prefix: '足部', count: 10 },
            '脚底': { prefix: '足部', count: 10 },
            '足底': { prefix: '足部', count: 10 },
            '脚踝': { prefix: '足部', count: 10 },
            '鞋': { prefix: '足部', count: 10 },
            // 玩具相关 - 更宽泛
            '跳蛋': { prefix: '跳蛋', count: 10 },
            '振动棒': { prefix: '振动棒', count: 10 },
            '按摩棒': { prefix: '振动棒', count: 10 },
            '双穴': { prefix: '双穴', count: 10 },
            '双头': { prefix: '双穴', count: 10 },
            '玩具': { prefix: '振动棒', count: 10 },
            '道具': { prefix: '振动棒', count: 10 },
            '插入': { prefix: '振动棒', count: 10 },
            '震动': { prefix: '振动棒', count: 10 },
            // 身体相关
            '身体': { prefix: '胸部', count: 10 },
            '皮肤': { prefix: '胸部', count: 10 },
            '裸': { prefix: '胸部', count: 10 },
            '脱': { prefix: '胸部', count: 10 },
            '衣服': { prefix: '胸部', count: 10 },
            '裙子': { prefix: '胸部', count: 10 },
            '丝袜': { prefix: '足部', count: 10 },
            '袜子': { prefix: '足部', count: 10 }
        },

        // ========== 礼物系统 ==========
        gifts: [
            { id: 1, icon: '❤️', name: '爱心', price: 1 },
            { id: 2, icon: '🌟', name: '星星', price: 5 },
            { id: 3, icon: '💐', name: '鲜花', price: 10 },
            { id: 4, icon: '🎂', name: '蛋糕', price: 20 },
            { id: 5, icon: '💎', name: '钻石', price: 50 },
            { id: 6, icon: '👑', name: '皇冠', price: 100 },
            { id: 7, icon: '🚀', name: '火箭', price: 200 },
            { id: 8, icon: '🏰', name: '城堡', price: 500 }
        ],
        giftModal: { open: false },
        selectedGift: null,
        giftMessage: '',

        // ========== 弹窗状态 ==========
        saveManager: { open: false, fromSetup: false, summaries: {} },
        editModal: { open: false, index: -1, content: '' },
        deleteModal: { open: false, index: -1 },
        imageModal: { open: false, src: '' },
        debugPanel: { open: false },

        // ========== Debug日志 ==========
        debugLogs: [],

        // ========== 初始化 ==========
        async init() {
            this.loading = true;
            this.loadingText = '正在连接直播间...';
            this.log('info', '开始初始化游戏...');

            // 3秒后显示跳过按钮
            setTimeout(() => {
                this.showSkipBtn = true;
            }, 3000);

            try {
                const result = await dzmmReady;
                this.log('info', `SDK就绪: ${result}`);
                
                if (result === 'timeout') {
                    this.log('error', 'SDK初始化超时，可能无法正常使用');
                    this.loadingText = '连接超时，请点击跳过按钮继续...';
                    return;
                }

                this.loadingText = '加载存档信息...';
                await this.refreshSaveSummaries();
                
                this.loading = false;
                this.log('info', '初始化完成');
            } catch (e) {
                this.log('error', `初始化失败: ${e.message}`);
                this.loadingText = '初始化失败，请点击跳过按钮继续...';
            }
        },

        skipLoading() {
            this.log('info', '用户跳过加载');
            this.loading = false;
        },

        // ========== 日志系统 ==========
        log(type, message, data = null) {
            const now = new Date();
            const time = now.toLocaleTimeString('zh-CN', { hour12: false });
            const logEntry = { type, message, time, data };
            this.debugLogs.push(logEntry);
            
            // 限制日志数量
            if (this.debugLogs.length > 200) {
                this.debugLogs = this.debugLogs.slice(-100);
            }
            
            // 同时输出到控制台
            console.log(`[${type.toUpperCase()}] ${time}: ${message}`, data || '');
        },

        copyLogs() {
            const text = this.debugLogs.map(l => 
                `[${l.type.toUpperCase()}] ${l.time}: ${l.message}${l.data ? '\n' + JSON.stringify(l.data, null, 2) : ''}`
            ).join('\n');
            
            navigator.clipboard.writeText(text).then(() => {
                this.log('info', '日志已复制到剪贴板');
                alert('日志已复制到剪贴板！');
            }).catch(e => {
                this.log('error', `复制失败: ${e.message}`);
            });
        },

        clearLogs() {
            this.debugLogs = [];
            this.log('info', '日志已清空');
        },

        // ========== 存档系统 ==========
        slotKey(slot) {
            return `livestream_save_slot_${slot}`;
        },

        async kvPut(key, value) {
            try {
                await window.dzmm.kv.put(key, value);
                this.log('info', `KV保存成功: ${key}`);
            } catch (e) {
                this.log('warn', `KV保存失败，使用localStorage: ${e.message}`);
                localStorage.setItem(key, JSON.stringify(value));
            }
        },

        async kvGet(key) {
            try {
                const data = await window.dzmm.kv.get(key);
                return data?.value ?? null;
            } catch (e) {
                this.log('warn', `KV读取失败，使用localStorage: ${e.message}`);
                const raw = localStorage.getItem(key);
                if (!raw) return null;
                try { return JSON.parse(raw); } catch { return raw; }
            }
        },

        async refreshSaveSummaries() {
            for (let slot = 1; slot <= 3; slot++) {
                const data = await this.kvGet(this.slotKey(slot));
                if (data && data.savedAt) {
                    this.saveManager.summaries[slot] = {
                        savedAt: data.savedAt,
                        messageCount: data.messages?.length || 0
                    };
                } else {
                    this.saveManager.summaries[slot] = null;
                }
            }
        },

        getSaveInfo(slot) {
            const info = this.saveManager.summaries[slot];
            if (!info) return '（空）';
            return `${info.savedAt} | ${info.messageCount}条消息`;
        },

        openSaveManager(fromSetup) {
            this.saveManager.open = true;
            this.saveManager.fromSetup = !!fromSetup;
            this.refreshSaveSummaries();
        },

        async manualSave(slot) {
            if (!this.started) return;
            
            this.log('info', `保存到存档位 ${slot}`);
            
            const saveData = {
                savedAt: new Date().toLocaleString('zh-CN'),
                playerName: this.playerName,
                model: this.model,
                messages: this.messages,
                history: this.history
            };

            await this.kvPut(this.slotKey(slot), saveData);
            await this.refreshSaveSummaries();
            
            this.log('info', '存档保存成功');
            alert(`已保存到存档位 ${slot}`);
        },

        async manualLoad(slot) {
            this.log('info', `读取存档位 ${slot}`);
            
            const data = await this.kvGet(this.slotKey(slot));
            if (!data) {
                alert('该存档位为空');
                return;
            }

            this.playerName = data.playerName || '观众';
            this.model = data.model || 'nalang-xl-0826';
            this.messages = data.messages || [];
            this.history = data.history || [];
            
            this.started = true;
            this.saveManager.open = false;
            
            this.log('info', '存档读取成功');

            // 滚动到底部
            Alpine.nextTick(() => {
                this.scrollToBottom();
            });
        },

        // ========== 游戏流程 ==========
        async start() {
            if (!this.playerName.trim()) return;
            
            this.log('info', `游戏开始，玩家: ${this.playerName}`);
            this.started = true;
            this.disabled = true;
            this.isGenerating = true;

            try {
                // 生成开场白
                const opening = await this.requestAIResponse('', true);
                this.addMessage('assistant', opening);
            } catch (e) {
                this.log('error', `开场白生成失败: ${e.message}`);
                this.addMessage('assistant', '（连接直播间时出现错误，请刷新重试）');
            } finally {
                this.disabled = false;
                this.isGenerating = false;
            }
        },

        async sendMessage() {
            const text = this.input.trim();
            if (!text || this.disabled) return;

            this.input = '';
            this.disabled = true;
            this.isGenerating = true;

            this.addMessage('user', text);
            this.log('send', `用户发送: ${text}`);

            try {
                const response = await this.requestAIResponse(text, false);
                this.addMessage('assistant', response);
            } catch (e) {
                this.log('error', `AI响应失败: ${e.message}`);
                this.addMessage('assistant', '（小雨好像走神了...请稍后再试）');
            } finally {
                this.disabled = false;
                this.isGenerating = false;
            }
        },

        addMessage(role, content) {
            const images = role === 'assistant' ? this.extractImages(content) : [];
            const cleanContent = this.cleanContent(content);
            
            this.messages.push({
                id: Date.now() + Math.random(),
                role,
                content: cleanContent,
                images
            });

            // 更新历史
            this.history.push({ role, content: cleanContent });
            this.trimHistory();

            Alpine.nextTick(() => {
                this.scrollToBottom();
            });
        },

        scrollToBottom() {
            try {
                const panel = document.getElementById('chatPanel');
                if (panel) {
                    panel.scrollTop = panel.scrollHeight;
                }
            } catch (e) {
                // blob环境下可能无法访问document
                this.log('warn', `滚动失败: ${e.message}`);
            }
        },

        trimHistory() {
            const MAX = 20;
            if (this.history.length > MAX) {
                this.history = this.history.slice(-MAX);
            }
        },

        // ========== AI通信 ==========
        createSystemPrompt() {
            return `你是一个名叫"小雨"的游戏直播女孩。玩家（观众）名叫：${this.playerName}

【性格特点】
- 天然呆、迷糊、经常犯小错误
- 对自己的穿着状态不太在意，经常穿着内衣甚至不穿衣服开播
- 即使被观众提醒也显得无所谓、得过且过
- 说话可爱、有点小迷糊

【直播状态】
- 你是一个普通的游戏主播，但经常穿着不当
- 观众送礼物时会配合展示身体各部位的特写
- 会根据金主要求使用各种玩具

【输出规则】
1. 以第一人称叙述，描写你的动作、表情、说话内容
2. 适当描写身体细节和状态
3. 保持迷糊可爱的人设
4. 不要拒绝观众的合理请求
5. 如果观众要求看特定部位，就配合展示并详细描写
6. 如果观众要求使用道具，就配合使用并描写感受

【关键词触发】（当你的回复中提到以下内容时，系统会自动附加图片）
- 胸部/奶子/乳房 相关描写
- 小穴/私处 相关描写  
- 腋下 相关描写
- 足部/脚 相关描写
- 跳蛋 使用描写
- 振动棒/按摩棒 使用描写
- 双穴 玩具使用描写

现在开始直播互动，记住你是迷糊可爱的小雨~`;
        },

        async requestAIResponse(userMessage, isOpening = false) {
            const messages = [
                { role: 'user', content: this.createSystemPrompt() }
            ];

            // 加入历史
            for (const msg of this.history) {
                messages.push({ role: msg.role, content: msg.content });
            }

            if (isOpening) {
                messages.push({ 
                    role: 'user', 
                    content: `观众"${this.playerName}"刚刚进入你的直播间，请用可爱迷糊的方式打个招呼。描述一下你现在的状态（穿着、在做什么等）。` 
                });
            } else if (userMessage) {
                messages.push({ role: 'user', content: `【弹幕】${this.playerName}：${userMessage}` });
            }

            this.log('send', '发送AI请求', { model: this.model, messageCount: messages.length });

            return new Promise((resolve, reject) => {
                let content = '';
                
                try {
                    window.dzmm.completions(
                        { 
                            model: this.model, 
                            messages, 
                            maxTokens: 1500 
                        },
                        (newContent, done) => {
                            content = newContent;
                            if (done) {
                                this.log('receive', 'AI响应完成', { length: content.length });
                                resolve(content.trim());
                            }
                        }
                    );
                } catch (e) {
                    this.log('error', `AI请求异常: ${e.message}`);
                    reject(e);
                }
            });
        },

        // ========== 图片关键词检测 ==========
        extractImages(content) {
            const images = [];
            const matched = new Set();

            for (const [keyword, config] of Object.entries(this.imageKeywords)) {
                if (content.includes(keyword) && !matched.has(config.prefix)) {
                    matched.add(config.prefix);
                    const num = Math.floor(Math.random() * config.count) + 1;
                    images.push(`https://img.wutongsama.xyz/i/2026/01/25/${config.prefix}${num}.jpg`);

                    this.log('info', `关键词触发: ${keyword} -> ${config.prefix}${num}.jpg`);

                    // 最多附加2张图片
                    if (images.length >= 2) break;
                }
            }

            return images;
        },

        cleanContent(content) {
            // 移除可能的STATE标记
            return content
                .replace(/###STATE[\s\S]*?###END\s*/g, '')
                .trim();
        },

        showImageModal(src) {
            this.imageModal.src = src;
            this.imageModal.open = true;
        },

        // ========== 消息管理 ==========
        editMessage(index) {
            const msg = this.messages[index];
            if (!msg) return;

            this.editModal.index = index;
            this.editModal.content = msg.content.replace(/<[^>]*>/g, ''); // 移除HTML标签
            this.editModal.open = true;
            
            this.log('info', `编辑消息 #${index}`);
        },

        confirmEdit() {
            const index = this.editModal.index;
            if (index < 0 || index >= this.messages.length) return;

            const newContent = this.editModal.content.trim();
            if (!newContent) return;

            this.messages[index].content = newContent;
            
            // 同步更新历史
            if (index < this.history.length) {
                this.history[index].content = newContent;
            }

            this.editModal.open = false;
            this.log('info', `消息 #${index} 已更新`);
        },

        deleteMessage(index) {
            this.deleteModal.index = index;
            this.deleteModal.open = true;
            this.log('info', `请求删除消息 #${index}`);
        },

        confirmDelete() {
            const index = this.deleteModal.index;
            if (index < 0 || index >= this.messages.length) return;

            this.messages.splice(index, 1);
            
            // 同步删除历史
            if (index < this.history.length) {
                this.history.splice(index, 1);
            }

            this.deleteModal.open = false;
            this.log('info', `消息 #${index} 已删除`);
        },

        async regenerateLastMessage() {
            if (this.messages.length === 0) return;
            
            const lastIndex = this.messages.length - 1;
            const lastMsg = this.messages[lastIndex];
            
            if (lastMsg.role !== 'assistant') {
                this.log('warn', '只能重新生成AI的回复');
                return;
            }

            this.log('info', '重新生成最后一条回复');
            this.disabled = true;
            this.isGenerating = true;

            // 移除最后一条AI回复
            this.messages.pop();
            this.history.pop();

            // 获取最后一条用户消息
            let lastUserMsg = '';
            for (let i = this.history.length - 1; i >= 0; i--) {
                if (this.history[i].role === 'user') {
                    lastUserMsg = this.history[i].content;
                    break;
                }
            }

            try {
                const response = await this.requestAIResponse(lastUserMsg.replace(/【弹幕】.*?：/, ''), false);
                this.addMessage('assistant', response);
            } catch (e) {
                this.log('error', `重新生成失败: ${e.message}`);
                this.addMessage('assistant', '（重新生成失败，请稍后再试）');
            } finally {
                this.disabled = false;
                this.isGenerating = false;
            }
        },

        // ========== 礼物系统 ==========
        openGiftModal() {
            this.giftModal.open = true;
            this.selectedGift = null;
            this.giftMessage = '';
        },

        selectGift(gift) {
            this.selectedGift = gift;
        },

        async sendGift() {
            if (!this.selectedGift) return;

            const gift = this.selectedGift;
            const message = this.giftMessage.trim();
            this.giftModal.open = false;

            // 添加礼物消息到聊天
            const giftContent = `
                <div class="gift-content">
                    <span class="gift-icon">${gift.icon}</span>
                    <div class="gift-text">
                        <span class="gift-name">送出了 ${gift.name} x1</span>
                        ${message ? `<span class="gift-msg">：${message}</span>` : ''}
                    </div>
                </div>
            `;

            this.messages.push({
                id: Date.now() + Math.random(),
                role: 'user',
                content: giftContent,
                isGift: true
            });

            this.log('send', `送礼物: ${gift.name}，消息: ${message || '无'}`);

            // 如果有附言，触发AI回复
            if (message) {
                this.disabled = true;
                this.isGenerating = true;

                // 添加礼物信息到历史
                this.history.push({
                    role: 'user',
                    content: `【送礼物】${this.playerName} 送出 ${gift.name}（${gift.price}钻）并留言：${message}`
                });

                try {
                    const response = await this.requestAIResponse(`【礼物】${gift.name}（${gift.price}钻）附言：${message}`, false);
                    this.addMessage('assistant', response);
                } catch (e) {
                    this.log('error', `AI响应失败: ${e.message}`);
                    this.addMessage('assistant', '（小雨好像走神了...请稍后再试）');
                } finally {
                    this.disabled = false;
                    this.isGenerating = false;
                }
            }

            // 清空状态
            this.selectedGift = null;
            this.giftMessage = '';

            // 滚动到底部
            Alpine.nextTick(() => {
                this.scrollToBottom();
            });
        }
    });

    // 初始化
    queueMicrotask(() => Alpine.store('game').init?.());
});
