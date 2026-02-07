/**
 * 女鞋店 - 互动游戏
 * 
 * 玩家作为店主，为女顾客提供试鞋服务
 */

// 通知父窗口 iframe 已准备好
if (window.parent !== window) {
    window.parent.postMessage('iframe:content-ready', '*');
}

// 等待 DZMM API 就绪
const dzmmReady = new Promise((resolve) => {
    window.addEventListener('message', function handler(event) {
        if (event.data?.type === 'dzmm:ready') {
            window.removeEventListener('message', handler);
            resolve();
        }
    });
});

document.addEventListener('alpine:init', () => {
    Alpine.store('game', {
        // 游戏状态
        started: false,
        disabled: false,
        loading: true,
        streaming: false,
        streamContent: '',

        // 玩家配置
        player_name: '',
        input: '',

        // 顾客状态
        state: {
            customerName: '',
            companionName: '',
            companionRelation: '',
            timeOfDay: '上午',
            customerServed: 0,
            // 足部状态
            feet: '',
            soles: '',
            toes: '',
            footSweat: '',
            stockings: '',
            shoes: '',
            footScent: '',
            thighs: '',
            calves: ''
        },

        // 界面状态
        showStatusPanel: false,
        messages: [],

        // 编辑消息相关
        showEditModal: false,
        editContent: '',
        editIndex: -1,

        // 存档状态
        hasSave: false,
        saveToast: false,
        saveToastMessage: '游戏已保存',
        showSaveSlots: false,
        showLoadSlots: false,
        saveSlots: [
            { index: 0, isEmpty: true, data: null },
            { index: 1, isEmpty: true, data: null },
            { index: 2, isEmpty: true, data: null }
        ],

        // 当前模型
        currentModel: 'nalang-xl-0826',

        // Debug 相关
        showDebug: false,
        debugInfo: {
            lastRequest: '',
            lastResponse: '',
            errors: []
        },

        /**
         * 生成系统提示词
         */
        createSystemPrompt() {
            return `你是一个成人互动小说的AI叙述者。你需要扮演场景中的所有NPC角色。

<shop>
{
  "店铺设定": {
    "类型": "女鞋店",
    "经营者": "${this.player_name}",
    "主要业务": "销售女鞋及提供试鞋服务"
  },
  "顾客设定": {
    "性别": "女性",
    "陪同": ["父亲", "男友", "丈夫", "情人"],
    "试鞋许可": true
  },
  "互动规则": {
    "基本服务": "为顾客试鞋",
    "允许行为": "对顾客脚部进行任何互动",
    "禁止行为": "触碰其他私密部位"
  },
  "脚部气味类型": {
    "运动少女": {
      "特征": "淡淡汗臭味",
      "场景": "刚运动完来店里的年轻女性"
    },
    "长靴女性": {
      "特征": "浓烈汗味",
      "场景": "穿着长靴前来的女性顾客"
    },
    "凉鞋/拖鞋": {
      "特征": "淡淡清香",
      "场景": "穿着露趾鞋款的女性"
    },
    "丝袜女性": {
      "特征": "香水味",
      "场景": "穿着丝袜的优雅女性"
    },
    "其他变体": {
      "特征": "根据具体情况随机生成",
      "说明": "可依据顾客特征灵活设定不同气味类型"
    }
  },
  "场景补充": {
    "营业时间": "正常营业时间",
    "环境氛围": "专业且私密",
    "服务态度": "周到专业",
    "互动限制": "仅限于试鞋相关服务"
  }
}
</shop>

<reply_format>
当有新顾客前来购物时:
  首先介绍女顾客和男伴的姓名,长相,关系,然后描写两人之间的对话,动作,etc.
  其次女顾客向${this.player_name}提出试鞋请求
    !!important!! 禁止输出${this.player_name}的回应 !!important!!
  试鞋过程中,男伴要目不转睛的看着${this.player_name}玩弄女顾客的玉足
  女顾客对${this.player_name}玩弄自己的玉足感到理所当然
  当${this.player_name}想要玩弄其他地方时,会严厉拒绝${this.player_name}
rule:
  为出场的NPC赋予一个有含义的姓名,禁止是"小X","啊X"等等
  描写时应着重描写女性的[鞋,袜,脚]的[味道,形状,褶皱,动作,etc]
  不能阻止${this.player_name}玩弄自己的脚
  禁止${this.player_name}玩弄除了脚以外的其他任何地方
</reply_format>

【当前状态】
时间: ${this.state.timeOfDay}
已服务顾客数: ${this.state.customerServed}
当前顾客: ${this.state.customerName || '暂无'}
陪同者: ${this.state.companionName || '暂无'} (${this.state.companionRelation || '暂无'})

【回复格式要求】
每次回复必须严格遵循此格式：

###STATE
{"customerName":"顾客姓名","companionName":"陪同者姓名","companionRelation":"关系","timeOfDay":"时间","feet":"玉足描述","soles":"脚心描述","toes":"脚趾描述","footSweat":"脚汗描述","stockings":"丝袜描述","shoes":"鞋描述","footScent":"足香描述","thighs":"大腿描述","calves":"小腿描述","summary":"简短总结"}
###END
角色扮演内容

【格式规则】
1. 前三行必须是 ###STATE、JSON、###END
2. JSON 必须在一行内
3. timeOfDay 可选：上午、中午、下午、傍晚、晚上
4. 第4行开始是角色扮演正文
5. 所有足部描述都应该非常详细，富有画面感

【足部描述规范】
玉足: 包括双脚的整体外观，脚底的大小，脚背的弧度，以及行走时的步态变化。双脚修长白皙，散发着淡淡的体香，每一步都优雅动人
脚心: 详细描写脚底的柔嫩和被触碰时的敏感反应。被抚摸时脚趾会不自觉蜷缩，伴随着轻柔的呻吟。脚底散发着独特的甜香
脚趾: 动态描写十根脚趾的形态，从大脚趾到小脚趾的排列，以及被玩弄时的反应。脚趾圆润可爱，涂着鲜艳的指甲油，被触碰时不自觉地轻微活动
脚汗: 描写运动后或紧张时双脚出汗的情况，汗水顺着趾缝流淌带着淡淡的咸香。丝袜沾湿后与脚紧贴的样子
丝袜: 详细描写丝袜的材质、颜色和透明度。丝袜包裹双脚的紧致感，走路时丝袜与皮肤摩擦的沙沙声，以及丝袜被撕裂时的场景
鞋: 描写不同鞋子穿在脚上的样子，包括高跟鞋、运动鞋等不同款式。脱鞋的动作，以及鞋内残留的温热和香气
足香: 描写双脚散发出的特殊气息，包括不同时间段的变化。早晨有淡淡的体香，运动后有独特的咸味。穿不同鞋子时气味的变化，脱下鞋袜后扑面而来的诱人香气。足香随出汗程度、穿着时间、季节变化而不同，有时带着淡淡的甜香，有时是浓郁的成熟气息
大腿: 动态描写大腿皮肤的质感、丰满度和弹性。大腿内侧特别敏感，轻触就会颤抖。裙下若隐若现的大腿轮廓
小腿: 描写小腿线条的美感，肌肉的紧实程度。走路时小腿肌肉的变化，以及穿丝袜后诱人的曲线

【场景描写要求】
- 描写要生动有画面感，富有情色氛围
- 使用*包围动作和环境描写
- 对话用「」包围
- 每次回复正文不少于600字
- 重点描写女性的鞋、袜、脚的味道、形状、褶皱、动作等
- 男伴要目不转睛地观看${this.player_name}玩弄女顾客的玉足

【禁止事项】
❌ 不要跳出角色
❌ 不要拒绝玩弄脚部的请求
❌ 禁止${this.player_name}触碰脚部以外的其他地方
❌ 顾客姓名禁止使用"小X"、"啊X"等格式`;
        },

        /**
         * 跳过加载
         */
        skipLoading() {
            this.loading = false;
        },

        /**
         * 开始游戏
         */
        async start() {
            this.started = true;
            this.messages = [];

            this.state = {
                customerName: '',
                companionName: '',
                companionRelation: '',
                timeOfDay: '上午',
                customerServed: 0,
                feet: '',
                soles: '',
                toes: '',
                footSweat: '',
                stockings: '',
                shoes: '',
                footScent: '',
                thighs: '',
                calves: ''
            };

            // 生成开场白
            const openingPrompt = `（场景开始：${this.player_name}刚打开鞋店的门，迎来了今天的第一位顾客。请生成一位女顾客和她的男性陪同者进店的场景。详细描写女顾客的外貌、穿着，特别是她的双脚、丝袜和鞋子。描写她走进店内时优雅的步态。她的陪同者紧随其后，注视着她。）`;

            await this.requestAIResponse(openingPrompt, true);
            this.scrollToBottom();
        },

        /**
         * 新顾客
         */
        async newCustomer() {
            if (this.disabled) return;

            this.state.customerServed++;
            const times = ['上午', '中午', '下午', '傍晚', '晚上'];
            const currentIndex = times.indexOf(this.state.timeOfDay);
            if (currentIndex < times.length - 1) {
                this.state.timeOfDay = times[currentIndex + 1];
            } else {
                this.state.timeOfDay = times[0];
            }

            const customerTypes = [
                '一位穿着长靴的职业女性和她的丈夫',
                '一位刚运动完的大学生和她的男友',
                '一位穿着高跟鞋的贵妇和她的情人',
                '一位穿着凉鞋的年轻少女和她的父亲',
                '一位穿着丝袜的OL和她的上司',
                '一位穿着运动鞋的健身教练和她的学员'
            ];
            const randomType = customerTypes[Math.floor(Math.random() * customerTypes.length)];

            const prompt = `（新的顾客进店：${randomType}走进了店内。请详细描写她们的外貌、关系、以及女顾客的双脚特征。重点描写她脱鞋后双脚的状态、气味和丝袜的情况。男伴一直注视着她的玉足。）`;

            this.messages.push({
                role: 'user',
                content: `*${this.player_name}送走了上一位顾客，迎接新的客人入店*`
            });

            await this.requestAIResponse(prompt);
        },

        /**
         * 初始化
         */
        async init() {
            this.loading = true;
            try {
                await Promise.race([
                    dzmmReady,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
                ]);
                await this.checkSave();
                await this.restoreProgress();
            } catch (e) {
                console.warn('初始化超时或失败:', e);
                this.addDebugError('初始化失败: ' + e.message);
            }
            this.loading = false;
        },

        /**
         * 检查是否有存档
         */
        async checkSave() {
            await this.checkAllSaves();
            try {
                const oldSave = await window.dzmm.kv.get('shoeshop_save');
                if (oldSave && oldSave.value && this.saveSlots[0].isEmpty) {
                    await window.dzmm.kv.put('shoeshop_save_0', oldSave.value);
                    await window.dzmm.kv.delete('shoeshop_save');
                    await this.checkAllSaves();
                }
            } catch (e) {
                console.warn('检查旧存档失败:', e);
            }
            this.hasSave = this.saveSlots.some(slot => !slot.isEmpty);
        },

        /**
         * 检查所有存档位
         */
        async checkAllSaves() {
            for (let i = 0; i < 3; i++) {
                try {
                    const saveData = await window.dzmm.kv.get(`shoeshop_save_${i}`);
                    if (saveData && saveData.value) {
                        this.saveSlots[i] = {
                            index: i,
                            isEmpty: false,
                            data: saveData.value
                        };
                    } else {
                        this.saveSlots[i] = { index: i, isEmpty: true, data: null };
                    }
                } catch (e) {
                    console.warn(`检查存档位${i + 1}失败:`, e);
                    this.saveSlots[i] = { index: i, isEmpty: true, data: null };
                }
            }
        },

        /**
         * 格式化存档时间
         */
        formatSaveTime(timestamp) {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${month}/${day} ${hours}:${minutes}`;
        },

        /**
         * 保存游戏
         */
        saveGame() {
            if (this.disabled) return;
            this.showSaveSlots = true;
        },

        /**
         * 保存到指定存档位
         */
        async saveToSlot(slotIndex) {
            if (this.disabled) return;

            try {
                const saveData = {
                    player_name: this.player_name,
                    state: this.state,
                    messages: this.messages,
                    timestamp: Date.now()
                };

                await window.dzmm.kv.put(`shoeshop_save_${slotIndex}`, saveData);

                this.saveSlots[slotIndex] = {
                    index: slotIndex,
                    isEmpty: false,
                    data: saveData
                };

                this.saveToastMessage = `已保存到存档位 ${slotIndex + 1}`;
                this.saveToast = true;
                this.showSaveSlots = false;
                setTimeout(() => {
                    this.saveToast = false;
                }, 2000);

                this.hasSave = true;
            } catch (e) {
                console.error('保存失败:', e);
                this.addDebugError('保存失败: ' + e.message);
            }
        },

        /**
         * 删除存档
         */
        async deleteSave(slotIndex) {
            try {
                await window.dzmm.kv.delete(`shoeshop_save_${slotIndex}`);
                this.saveSlots[slotIndex] = { index: slotIndex, isEmpty: true, data: null };
                this.hasSave = this.saveSlots.some(slot => !slot.isEmpty);

                this.saveToastMessage = `存档位 ${slotIndex + 1} 已删除`;
                this.saveToast = true;
                setTimeout(() => {
                    this.saveToast = false;
                }, 2000);
            } catch (e) {
                console.error('删除存档失败:', e);
            }
        },

        /**
         * 读取存档
         */
        loadSave() {
            this.showLoadSlots = true;
        },

        /**
         * 从指定存档位读取
         */
        async loadFromSlot(slotIndex) {
            try {
                const result = await window.dzmm.kv.get(`shoeshop_save_${slotIndex}`);
                if (result && result.value) {
                    const saveData = result.value;
                    this.player_name = saveData.player_name;
                    this.state = saveData.state || this.state;
                    this.messages = saveData.messages || [];
                    this.started = true;
                    this.showLoadSlots = false;
                    this.scrollToBottom();
                }
            } catch (e) {
                console.error('读取存档失败:', e);
                this.addDebugError('读取存档失败: ' + e.message);
            }
        },

        /**
         * 发送消息
         */
        async send() {
            if (!this.input.trim() || this.disabled) return;

            const userMessage = this.input.trim();
            this.input = '';

            this.messages.push({
                role: 'user',
                content: userMessage
            });

            this.scrollToBottom();
            await this.requestAIResponse(userMessage);
        },

        /**
         * 编辑消息
         */
        editMessage(index) {
            this.editIndex = index;
            this.editContent = this.messages[index].content.replace(/<[^>]*>/g, '');
            this.showEditModal = true;
        },

        /**
         * 确认编辑
         */
        confirmEdit() {
            if (this.editIndex >= 0 && this.editContent.trim()) {
                this.messages[this.editIndex].content = this.formatContent(this.editContent);
                this.showEditModal = false;
                this.editIndex = -1;
                this.editContent = '';
            }
        },

        /**
         * 删除消息
         */
        deleteMessage(index) {
            if (confirm('确定要删除这条消息吗？')) {
                this.messages.splice(index, 1);
            }
        },

        /**
         * 重新生成消息（仅限最新的AI消息）
         */
        async regenerateMessage(index) {
            if (index !== this.messages.length - 1) return;
            if (this.messages[index].role !== 'assistant') return;

            // 删除最后一条AI消息
            this.messages.pop();

            // 找到上一条用户消息
            let lastUserMessage = '';
            for (let i = this.messages.length - 1; i >= 0; i--) {
                if (this.messages[i].role === 'user') {
                    lastUserMessage = this.messages[i].content.replace(/<[^>]*>/g, '');
                    break;
                }
            }

            // 重新生成
            await this.requestAIResponse(lastUserMessage || '（继续场景）');
        },

        /**
         * 请求 AI 回复
         */
        async requestAIResponse(userMessage, isOpening = false) {
            this.disabled = true;
            this.streaming = true;
            this.streamContent = '';

            try {
                let chatHistory = [];
                try {
                    chatHistory = await window.dzmm.chat.list() || [];
                } catch (e) {
                    console.warn('读取历史失败:', e);
                }

                const messages = [
                    { role: 'user', content: this.createSystemPrompt() },
                    ...chatHistory.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                ];

                if (userMessage) {
                    messages.push({ role: 'user', content: userMessage });
                }

                // Debug 记录
                this.debugInfo.lastRequest = JSON.stringify({
                    model: this.currentModel,
                    messageCount: messages.length,
                    lastMessage: userMessage?.substring(0, 100) + '...'
                }, null, 2);

                let fullContent = '';

                await window.dzmm.completions(
                    { model: this.currentModel, messages, maxTokens: 2000 },
                    async (content, done) => {
                        fullContent = content;
                        const parsed = this.parseAIResponse(content);

                        if (parsed.ready) {
                            this.updateGameState(parsed.state);
                            this.streamContent = parsed.dialogue;
                        } else {
                            this.streamContent = this.formatContent(content) || '<span class="loading">描写中...</span>';
                        }

                        this.scrollToBottom();

                        if (done && fullContent) {
                            this.streaming = false;
                            const finalParsed = this.parseAIResponse(fullContent);

                            // Debug 记录
                            this.debugInfo.lastResponse = fullContent.substring(0, 500) + '...';

                            this.messages.push({
                                role: 'assistant',
                                speaker: '旁白',
                                content: finalParsed.ready ? finalParsed.dialogue : this.formatContent(fullContent)
                            });

                            try {
                                const messagesToSave = [];
                                if (userMessage && !isOpening) {
                                    messagesToSave.push({ role: 'user', content: userMessage });
                                }
                                messagesToSave.push({ role: 'assistant', content: fullContent });
                                await window.dzmm.chat.insert(null, messagesToSave);
                            } catch (e) {
                                console.warn('保存失败:', e);
                            }

                            this.scrollToBottom();
                        }
                    }
                );
            } catch (error) {
                console.error('AI 请求失败:', error);
                this.addDebugError('AI请求失败: ' + error.message);
                this.streaming = false;
                this.messages.push({
                    role: 'assistant',
                    speaker: '旁白',
                    content: '*店内安静了一会儿...*<br><br>（系统提示：AI 响应失败，请稍后重试）'
                });
            } finally {
                this.disabled = false;
            }
        },

        /**
         * 解析 AI 回复
         */
        parseAIResponse(content) {
            const stateMarker = '###STATE';
            const endMarker = '###END';
            const stateIndex = content.indexOf(stateMarker);
            const endIndex = content.indexOf(endMarker, stateIndex + stateMarker.length);

            if (stateIndex === -1 || endIndex === -1) {
                return { ready: false };
            }

            const jsonRaw = content.slice(stateIndex + stateMarker.length, endIndex).trim();

            try {
                const state = JSON.parse(jsonRaw);
                let dialogue = content.slice(endIndex + endMarker.length).trim();
                dialogue = this.formatContent(dialogue);
                return { ready: true, state, dialogue };
            } catch (error) {
                console.warn('状态解析失败:', error);
                this.addDebugError('状态解析失败: ' + error.message);
                return { ready: false };
            }
        },

        /**
         * 格式化内容
         */
        formatContent(text) {
            if (!text) return text;

            text = text.replace(/\n/g, '<br>');
            text = text.replace(/\*([^*]+)\*/g, '<font color=#00BFFF>$1</font>');
            text = text.replace(/「([^」]+)」/g, '<font color=#23EC86>「$1」</font>');
            text = text.replace(/"([^"]+)"/g, '<font color=#23EC86>"$1"</font>');

            return text;
        },

        /**
         * 更新游戏状态
         */
        updateGameState(state) {
            if (state.customerName) this.state.customerName = state.customerName;
            if (state.companionName) this.state.companionName = state.companionName;
            if (state.companionRelation) this.state.companionRelation = state.companionRelation;
            if (state.timeOfDay) this.state.timeOfDay = state.timeOfDay;
            if (state.feet) this.state.feet = state.feet;
            if (state.soles) this.state.soles = state.soles;
            if (state.toes) this.state.toes = state.toes;
            if (state.footSweat) this.state.footSweat = state.footSweat;
            if (state.stockings) this.state.stockings = state.stockings;
            if (state.shoes) this.state.shoes = state.shoes;
            if (state.footScent) this.state.footScent = state.footScent;
            if (state.thighs) this.state.thighs = state.thighs;
            if (state.calves) this.state.calves = state.calves;
        },

        /**
         * 滚动到底部
         */
        scrollToBottom() {
            setTimeout(() => {
                const container = document.getElementById('chatMessages');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 50);
        },

        /**
         * 恢复游戏进度
         */
        async restoreProgress() {
            try {
                const chatMessages = await window.dzmm.chat.list();

                if (chatMessages && chatMessages.length > 0) {
                    for (const msg of chatMessages) {
                        if (msg.role === 'assistant') {
                            const parsed = this.parseAIResponse(msg.content);
                            this.messages.push({
                                role: 'assistant',
                                speaker: '旁白',
                                content: parsed.ready ? parsed.dialogue : this.formatContent(msg.content)
                            });
                            if (parsed.ready) {
                                this.updateGameState(parsed.state);
                            }
                        } else if (msg.role === 'user') {
                            this.messages.push({
                                role: 'user',
                                content: msg.content
                            });
                        }
                    }

                    this.started = true;
                    this.scrollToBottom();
                }
            } catch (error) {
                console.warn('恢复存档失败:', error);
            }
        },

        /**
         * Debug 相关方法
         */
        addDebugError(error) {
            this.debugInfo.errors.push(`[${new Date().toLocaleTimeString()}] ${error}`);
            if (this.debugInfo.errors.length > 20) {
                this.debugInfo.errors.shift();
            }
        },

        clearDebug() {
            this.debugInfo = {
                lastRequest: '',
                lastResponse: '',
                errors: []
            };
        }
    });

    queueMicrotask(() => Alpine.store('game').init?.());
});
