if (window.parent !== window) {
    window.parent.postMessage('iframe:content-ready', '*');
}

const dzmmReady = new Promise((resolve) => {
    window.addEventListener('message', function handler(event) {
        if (event.data?.type === 'dzmm:ready') {
            window.removeEventListener('message', handler);
            resolve();
        }
    });
    setTimeout(resolve, 3000);
});

// 房客名字库
const GUEST_NAMES = {
    'single-girl': ['林小雨', '陈思琪', '王雨萱', '张婉清', '李梦瑶', '周婷婷', '刘雪晴', '杨小芸', '吴佳琪'],
    'couple': ['张明+李婷', '王强+赵丽', '刘洋+周敏', '陈刚+吴静'],
    'family': ['张家三口', '李家四口', '王家三口', '陈家五口'],
    'business': ['张总', '李经理', '王先生', '刘总监', '陈老板'],
    '18-25': ['小张', '小李', '小王', '小刘', '小陈', '小周', '小吴', '小杨'],
    '26-40': ['张明', '李强', '王伟', '刘婷', '陈静', '周华', '吴芳', '杨敏'],
    'default': ['旅客A', '旅客B', '旅客C', '旅客D', '旅客E', '旅客F', '旅客G', '旅客H', '旅客I']
};

const GUEST_AVATARS = ['👩', '👨', '👧', '👦', '👩‍🦰', '👨‍🦱', '👩‍🦳', '👨‍🦲', '🧑'];
const GUEST_DESCRIPTIONS = [
    '看起来很安静的人，喜欢独处。',
    '热情开朗，喜欢和人聊天。',
    '神秘莫测，行踪不定。',
    '工作繁忙，经常加班。',
    '喜欢美食，经常出去觅食。',
    '作息规律，早睡早起。',
    '夜猫子，经常熬夜。',
    '运动爱好者，每天早起跑步。',
    '文艺青年，喜欢看书写字。'
];

function game() {
    return {
        // ========== 状态 ==========
        screen: 'loading',
        loadingProgress: 0,
        loadingText: '正在打开旅馆大门...',

        // 玩家设置
        playerName: '',
        replyLength: 500,
        selectedModel: 'nalang-xl-0826',
        models: ['nalang-xl-0826', 'nalang-medium-0826', 'nalang-max-0826', 'nalang-turbo-0826', 'nalang-turbo-1115'],

        // 房间租金配置 (每天)
        roomRents: {
            101: 100, 102: 100, 103: 120,
            104: 150, 105: 180, 106: 200,
            107: 250, 108: 300, 109: 500
        },

        // 绘图系统
        showDrawPanel: false,
        drawPrompt: '',
        isDrawing: false,
        generatedImages: [],

        // 客户族群
        guestCategories: [
            { label: '18-25岁', value: '18-25' },
            { label: '26-40岁', value: '26-40' },
            { label: '家庭住户', value: 'family' },
            { label: '情侣档', value: 'couple' },
            { label: '单身少女', value: 'single-girl' },
            { label: '商务人士', value: 'business' },
            { label: '自定义', value: 'custom' }
        ],
        selectedCategory: '',
        customCategory: '',

        // 时间系统
        gameTime: {
            day: 1,
            hour: 8,
            period: 'morning',
            periodName: '早晨'
        },

        // 房客系统
        guests: [],
        selectedGuest: null,
        showGuestsPanel: false,
        showGuestCreateModal: false,
        creatingGuestRoom: null,
        isCreatingGuest: false,

        // 规则系统
        rules: [],
        newRuleText: '',
        showNoticePanel: false,
        editingRuleIndex: null,
        editingRuleText: '',

        // 聊天系统
        messages: [],
        userInput: '',
        isGenerating: false,
        streamingContent: '',
        summary: null,
        summaryMessageCount: 0,

        // 编辑系统
        editingMessage: null,
        editingContent: '',

        // 面板状态
        showSavePanel: false,
        showSettingsPanel: false,

        // 存档
        saves: {},
        hasSavedGame: false,
        isSaving: false,
        isLoading: false,

        // ========== 计算属性 ==========
        get displayMessages() {
            if (this.summary && this.summaryMessageCount > 0) {
                return this.messages.slice(this.summaryMessageCount);
            }
            return this.messages;
        },

        get activeRules() {
            return this.rules.filter(r => r.active);
        },

        get effectiveCategory() {
            return this.selectedCategory === 'custom' ? this.customCategory : this.selectedCategory;
        },

        // ========== 初始化 ==========
        async init() {
            await dzmmReady;
            await this.loadSavesInfo();
            this.startLoading();
        },

        startLoading() {
            const loadingTexts = [
                '正在打开旅馆大门...',
                '整理房间中...',
                '准备登记簿...',
                '点亮大堂灯光...',
                '旅馆已准备就绪！'
            ];

            let progress = 0;
            this.loadingInterval = setInterval(() => {
                progress += Math.random() * 15 + 5;
                if (progress >= 100) {
                    progress = 100;
                    this.loadingProgress = 100;
                    this.loadingText = loadingTexts[4];
                    clearInterval(this.loadingInterval);
                    setTimeout(() => {
                        if (this.screen === 'loading') {
                            this.screen = 'setup';
                        }
                    }, 500);
                } else {
                    this.loadingProgress = progress;
                    this.loadingText = loadingTexts[Math.floor(progress / 25)];
                }
            }, 300);
        },

        skipLoading() {
            this.loadingProgress = 100;
            this.screen = 'setup';
        },

        // ========== 房客生成 ==========
        initEmptyRooms() {
            this.guests = [];
            for (let i = 0; i < 9; i++) {
                const roomNumber = 101 + i;
                this.guests.push({
                    id: i + 1,
                    roomNumber: roomNumber,
                    rent: this.roomRents[roomNumber] || 100,
                    name: '',
                    avatar: '',
                    category: '',
                    stayDuration: 0,
                    remainingDays: 0,
                    description: '',
                    money: 0,
                    paidRent: 0,
                    status: 'empty'
                });
            }
        },

        // 获取房间租金
        getRoomRent(roomNumber) {
            return this.roomRents[roomNumber] || 100;
        },

        handleGuestCardClick(guest) {
            if (guest.name && guest.status === 'active') {
                // 已入住房客，显示详情
                this.showGuestDetail(guest.id);
            } else if (!guest.name || guest.status === 'empty' || guest.status === 'checked-out') {
                // 空房间或已退房，打开创建弹窗
                this.creatingGuestRoom = guest;
                this.selectedCategory = '';
                this.customCategory = '';
                this.showGuestCreateModal = true;
            }
        },

        async confirmCreateGuest() {
            if (!this.creatingGuestRoom) return;
            if (!this.selectedCategory) return;
            if (this.selectedCategory === 'custom' && !this.customCategory.trim()) return;
            if (this.isCreatingGuest) return;

            this.isCreatingGuest = true;
            const categoryLabel = this.getCategoryLabel();
            const roomNumber = this.creatingGuestRoom.roomNumber;
            const stayDuration = Math.floor(Math.random() * 30) + 1;

            // 计算租金和金钱
            const dailyRent = this.getRoomRent(roomNumber);
            const totalRent = dailyRent * stayDuration;
            // 房客携带金钱 = 总租金 + 随机额外金钱 (100-2000)
            const extraMoney = Math.floor(Math.random() * 1901) + 100;
            const guestMoney = totalRent + extraMoney;

            // 情侣档可以有男性，其他只生成女性
            const isCouple = this.selectedCategory === 'couple';
            const genderRequirement = isCouple
                ? '一对情侣（一男一女）'
                : '女性角色（必须是女性，使用女性化的中文名字）';

            const prompt = `你是一个角色生成器。请为旅馆生成一位新入住的房客，要求如下：

客户类型：${categoryLabel}
性别要求：${genderRequirement}
房间号：${roomNumber}号房
入住天数：${stayDuration}天
房间租金：${dailyRent}元/天

请生成以下信息，严格按照JSON格式返回（不要有任何其他文字）：
{
  "name": "${isCouple ? '两人姓名，格式如：张明+李婷' : '女性中文名，2-3个字，如：林小雨、陈思琪'}",
  "avatar": "${isCouple ? '情侣emoji如👫💑' : '女性emoji，如👩👧👩‍🦰'}",
  "description": "50字左右的人物简介，包含外貌特征（身材、发型、穿着）和性格特点"
}`;

            try {
                let result = '';
                await window.dzmm.completions({
                    model: this.selectedModel,
                    messages: [{ role: 'user', content: prompt }],
                    maxTokens: 300
                }, (chunk, done) => {
                    result = chunk;
                    if (done) {
                        try {
                            // 尝试解析JSON
                            const jsonMatch = result.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                const guestData = JSON.parse(jsonMatch[0]);
                                const roomIdx = this.guests.findIndex(g => g.id === this.creatingGuestRoom.id);

                                if (roomIdx !== -1) {
                                    // 入住时扣除全部租金
                                    const moneyAfterRent = guestMoney - totalRent;
                                    this.guests[roomIdx] = {
                                        ...this.guests[roomIdx],
                                        name: guestData.name || '神秘旅客',
                                        avatar: guestData.avatar || (isCouple ? '👫' : '👩'),
                                        category: categoryLabel,
                                        stayDuration: stayDuration,
                                        remainingDays: stayDuration,
                                        description: guestData.description || '一位神秘的旅客。',
                                        money: moneyAfterRent,
                                        paidRent: totalRent,
                                        status: 'active'
                                    };
                                }
                            }
                        } catch (parseErr) {
                            console.error('解析房客数据失败:', parseErr);
                            // 使用简单默认值
                            const roomIdx = this.guests.findIndex(g => g.id === this.creatingGuestRoom.id);
                            if (roomIdx !== -1) {
                                const moneyAfterRent = guestMoney - totalRent;
                                this.guests[roomIdx] = {
                                    ...this.guests[roomIdx],
                                    name: isCouple ? '神秘情侣' : '神秘女子',
                                    avatar: isCouple ? '👫' : '👩',
                                    category: categoryLabel,
                                    stayDuration: stayDuration,
                                    remainingDays: stayDuration,
                                    description: '一位神秘的旅客，等待着故事的展开。',
                                    money: moneyAfterRent,
                                    paidRent: totalRent,
                                    status: 'active'
                                };
                            }
                        }

                        this.isCreatingGuest = false;
                        this.showGuestCreateModal = false;
                        this.creatingGuestRoom = null;
                    }
                });
            } catch (e) {
                console.error('生成房客失败:', e);
                this.isCreatingGuest = false;
                alert('生成房客失败，请重试');
            }
        },


        getCategoryLabel() {
            if (this.selectedCategory === 'custom') return this.customCategory;
            const cat = this.guestCategories.find(c => c.value === this.selectedCategory);
            return cat ? cat.label : '普通旅客';
        },

        showGuestDetail(id) {
            this.selectedGuest = this.guests.find(g => g.id === id) || null;
        },

        // ========== 时间系统 ==========
        advanceTime() {
            this.gameTime.hour += 4;
            if (this.gameTime.hour >= 24) {
                this.gameTime.hour = 8;
                this.gameTime.day++;
                this.updateGuestsOnNewDay();
            }
            this.updateTimePeriod();
        },

        updateTimePeriod() {
            const hour = this.gameTime.hour;
            if (hour >= 6 && hour < 12) {
                this.gameTime.period = 'morning';
                this.gameTime.periodName = '早晨';
            } else if (hour >= 12 && hour < 18) {
                this.gameTime.period = 'afternoon';
                this.gameTime.periodName = '下午';
            } else if (hour >= 18 && hour < 22) {
                this.gameTime.period = 'evening';
                this.gameTime.periodName = '傍晚';
            } else {
                this.gameTime.period = 'night';
                this.gameTime.periodName = '深夜';
            }
        },

        updateGuestsOnNewDay() {
            this.guests.forEach(guest => {
                if (guest.status === 'active' && guest.remainingDays > 0) {
                    guest.remainingDays--;
                    if (guest.remainingDays <= 0) {
                        guest.status = 'checked-out';
                    }
                }
            });
        },

        // ========== 游戏开始 ==========
        startGame() {
            if (!this.playerName.trim()) return;

            this.screen = 'game';
            this.messages = [];
            this.initEmptyRooms();
            this.generateOpening();
        },

        generateOpening() {
            const openingText = `「幽灵旅馆」，一家隐藏在小巷深处的神秘旅馆。

${this.playerName}是这里的老板。今天是新的一天，阳光透过大堂的彩色玻璃窗洒落，在地板上投下斑驳的光影。

目前旅馆里还没有房客入住，9个房间都空着，等待着新的客人到来。

就在${this.playerName}整理柜台的时候，一阵古怪的风吹过，一本泛黄的书籍不知从何处落在了柜台上。封面上写着几个烫金大字：

「旅馆规则之书」

书页自动翻开，一行字浮现在${this.playerName}眼前：

*「持书者，可改写此旅馆之一切法则。汝之所书，将成为此地之真理。」*

这本书......似乎蕴含着某种不可思议的力量。

*点击顶部的 👥 按钮，然后点击空房间来安排客人入住吧。*`;

            this.messages.push({
                id: Date.now(),
                role: 'assistant',
                content: openingText
            });

            this.scrollToBottom();
        },

        // ========== 消息发送 ==========
        async sendMessage() {
            if (!this.userInput.trim() || this.isGenerating) return;

            const userMsg = this.userInput.trim();
            this.userInput = '';

            this.messages.push({
                id: Date.now(),
                role: 'user',
                content: userMsg
            });

            this.scrollToBottom();
            await this.generateResponse();
        },

        async generateResponse() {
            this.isGenerating = true;
            this.streamingContent = '';

            const prompt = this.buildPrompt(this.messages);
            const self = this;

            try {
                await window.dzmm.completions({
                    model: this.selectedModel,
                    messages: prompt,
                    maxTokens: Math.min(2000, this.replyLength + 200)
                }, (chunk, done) => {
                    const content = chunk || '';
                    // 流式显示时移除 STATE 块
                    self.streamingContent = self.removeStateFromContent(content);
                    self.scrollToBottom();

                    if (done) {
                        // 先处理 STATE 格式的消费信息
                        self.detectAndProcessPurchases(content);

                        // 移除 STATE 块，只保留故事内容
                        const cleanContent = self.removeStateFromContent(content);

                        self.messages = [...self.messages, {
                            id: Date.now(),
                            role: 'assistant',
                            content: cleanContent
                        }];
                        self.streamingContent = '';
                        self.isGenerating = false;
                    }
                });
            } catch (e) {
                console.error('生成失败:', e);
                this.streamingContent = '';
                this.isGenerating = false;
                alert('生成失败，请重试');
            }
        },

        // 解析回复中的 STATE 格式并处理消费
        detectAndProcessPurchases(content) {
            // 匹配 ###STATE ... ###END 格式
            const stateMatch = content.match(/###STATE\s*([\s\S]*?)\s*###END/);
            if (!stateMatch) {
                console.log('未检测到 STATE 格式');
                return null;
            }

            try {
                const stateJson = stateMatch[1].trim();
                const state = JSON.parse(stateJson);

                // 处理消费记录
                if (state.spending && Array.isArray(state.spending) && state.spending.length > 0) {
                    state.spending.forEach(spend => {
                        if (spend.amount && spend.amount > 0) {
                            let guest = null;

                            // 优先按房间号查找
                            if (spend.room) {
                                guest = this.guests.find(g => g.roomNumber === spend.room && g.status === 'active');
                            }

                            // 按姓名查找
                            if (!guest && spend.guest) {
                                guest = this.guests.find(g => g.name && g.name.includes(spend.guest) && g.status === 'active');
                            }

                            if (guest) {
                                if (guest.money >= spend.amount) {
                                    guest.money -= spend.amount;
                                    console.log(`✅ 扣款成功：${guest.name} 购买 ${spend.item || '物品'}，花费 ¥${spend.amount}，剩余 ¥${guest.money}`);
                                } else {
                                    console.log(`⚠️ 金钱不足：${guest.name} 尝试消费 ¥${spend.amount}，但只有 ¥${guest.money}`);
                                }
                            } else {
                                console.log(`❌ 未找到房客：${spend.guest || '未知'} (房间 ${spend.room || '未知'})`);
                            }
                        }
                    });
                }

                // 处理时间推进（如果需要）
                if (state.time_passed === true) {
                    // 可选：自动推进时间
                    // this.advanceTime();
                }

                return state;
            } catch (e) {
                console.error('解析 STATE 失败:', e);
                return null;
            }
        },

        // 从回复中移除 STATE 块，只保留故事内容
        removeStateFromContent(content) {
            return content.replace(/###STATE[\s\S]*?###END\s*/g, '').trim();
        },

        // ========== 提示词构建 ==========
        buildPrompt(messages) {
            const systemPrompt = this.buildSystemPrompt();
            const rulesInsert = this.buildRulesInsert();

            // 获取最新的用户消息用于关键词检测
            const latestUserMsg = [...messages].reverse().find(m => m.role === 'user');
            const latestUserContent = latestUserMsg ? latestUserMsg.content : '';
            const guestsInsert = this.buildGuestsInsert(latestUserContent);

            let result = [];

            if (this.summary && this.summaryMessageCount > 0) {
                result.push({
                    role: 'user',
                    content: systemPrompt + '\n\n【前情总结】\n' + this.summary
                });

                const recentMessages = messages.slice(this.summaryMessageCount);
                let contextInserted = false;

                for (let i = 0; i < recentMessages.length; i++) {
                    if (!contextInserted && recentMessages[i].role === 'user') {
                        let insertContent = rulesInsert;
                        if (guestsInsert) {
                            insertContent += '\n\n' + guestsInsert;
                        }
                        result.push({
                            role: 'user',
                            content: insertContent + '\n\n' + recentMessages[i].content
                        });
                        contextInserted = true;
                    } else {
                        result.push({
                            role: recentMessages[i].role,
                            content: recentMessages[i].content
                        });
                    }
                }
            } else {
                result.push({ role: 'user', content: systemPrompt });

                let contextInserted = false;
                let userMessageCount = 0;

                for (let i = 0; i < messages.length; i++) {
                    const msg = messages[i];
                    if (msg.role === 'user') {
                        userMessageCount++;
                        if (userMessageCount === 1 && !contextInserted) {
                            let insertContent = rulesInsert;
                            if (guestsInsert) {
                                insertContent += '\n\n' + guestsInsert;
                            }
                            result.push({
                                role: 'user',
                                content: insertContent + '\n\n' + msg.content
                            });
                            contextInserted = true;
                        } else {
                            result.push({ role: 'user', content: msg.content });
                        }
                    } else {
                        result.push({ role: 'assistant', content: msg.content });
                    }
                }
            }

            return result;
        },

        buildSystemPrompt() {
            // 获取当前活跃房客的金钱信息摘要
            const activeGuests = this.guests.filter(g => g.status === 'active');
            let guestMoneyInfo = '';
            if (activeGuests.length > 0) {
                guestMoneyInfo = '\n【当前房客金钱状况】\n';
                activeGuests.forEach(g => {
                    guestMoneyInfo += `- ${g.roomNumber}号房 ${g.name}：剩余¥${g.money || 0}\n`;
                });
            }

            return `【系统设定】
你是一个旅馆互动小说的AI叙述者，以上帝视角进行叙事。

【NPC规则】
1. 每个新出场的NPC必须详细描述外貌特征（身高、体型、发型、眼睛、五官、穿着等）
2. NPC姓名必须符合中国人名规范
3. NPC应有独立性格，行为符合逻辑
4. NPC会根据当前生效的规则改变认知和行为，并认为这是理所当然的

【世界观】
- 故事发生在「幽灵旅馆」，一家神秘的小旅馆
- ${this.playerName}是旅馆老板，发现了《旅馆规则之书》
- 被改写的规则会影响所有人的认知和行为
- 当前是第${this.gameTime.day}天${this.gameTime.periodName}
${guestMoneyInfo}
【金钱系统规则】
- 房客可以在旅馆内购买物品或服务
- 购买时需要检查房客剩余金钱是否足够
- 如果金钱不足，房客可能会：
  * 请求老板宽限几天再付款
  * 提出用其他方式（劳动、服务等）作为代价
  * 放弃购买或选择更便宜的选项
- 金钱不足时的行为应符合角色性格

【叙事风格】
- 使用第三人称上帝视角叙事
- 描写细腻，包含环境、表情、动作
- 可以描写NPC的内心活动和对话
- 保持故事的连贯性和趣味性
- 对话使用引号「」

【核心规则 - 必须严格遵守】
1. 绝对禁止代替${this.playerName}说话、行动、做决定
2. ${this.playerName}的任何行为、对话都必须由玩家输入决定
3. 你只能描写${this.playerName}以外的所有角色和环境
4. 每次回复控制在${this.replyLength}字左右
5. 全程使用上帝视角（第三人称全知叙事）

【重要：输出格式】
你的每次回复必须严格按照以下格式：

###STATE
{"spending":[{"guest":"房客姓名","room":房间号,"amount":消费金额,"item":"购买物品"}],"time_passed":是否推进时间(true/false)}
###END

然后是故事内容、角色反应、对话、动作描写等。

STATE说明：
- spending: 消费记录数组，没有消费时为空数组 []
- guest: 消费的房客姓名
- room: 房间号（数字）
- amount: 消费金额（数字），没有消费则不填此项
- item: 购买的物品或服务名称
- time_passed: 本次回复是否推进了时间

示例1（有消费）：
###STATE
{"spending":[{"guest":"林小雨","room":101,"amount":50,"item":"精致甜点"}],"time_passed":false}
###END

林小雨走到柜台前，看着玻璃柜里摆放的精致甜点...

示例2（无消费）：
###STATE
{"spending":[],"time_passed":false}
###END

阳光透过窗户洒落在大堂里...

示例3（金钱不足）：
###STATE
{"spending":[],"time_passed":false}
###END

林小雨翻看着自己的钱包，脸上露出为难的神色。「老板，我现在手头有点紧，能不能让我先欠着，过几天房租到账了再还您？」她用恳求的眼神看向${this.playerName}。`;
        },

        buildRulesInsert() {
            if (this.activeRules.length === 0) return '';

            let rulesText = '【⚠️ 当前生效的旅馆规则 - 必须严格遵循】\n';
            rulesText += `以下规则已被写入《旅馆规则之书》，旅馆中的所有人（除${this.playerName}外）都会认为这些是理所当然的事实：\n\n`;

            this.activeRules.forEach((rule, index) => {
                rulesText += `规则${index + 1}：${rule.text}\n`;
            });

            rulesText += `\n所有NPC的行为和认知必须符合以上规则。只有${this.playerName}知道这些规则是被改写的。`;

            return rulesText;
        },

        buildGuestsInsert(userMessage) {
            const activeGuests = this.guests.filter(g => g.status === 'active');
            if (activeGuests.length === 0) return '';

            // 检测用户消息中提到的房客
            const mentionedGuests = [];
            const msgLower = (userMessage || '').toLowerCase();

            activeGuests.forEach(g => {
                // 检测房间号关键词：101、101号、101号房、一零一等
                const roomStr = String(g.roomNumber);
                const roomPatterns = [
                    roomStr,              // 101
                    roomStr + '号',       // 101号
                    roomStr + '号房',     // 101号房
                    '#' + roomStr,        // #101
                ];

                // 检测姓名
                const namePatterns = g.name ? [g.name, g.name.substring(0, 2)] : [];

                const allPatterns = [...roomPatterns, ...namePatterns];

                for (const pattern of allPatterns) {
                    if (msgLower.includes(pattern.toLowerCase())) {
                        if (!mentionedGuests.find(mg => mg.id === g.id)) {
                            mentionedGuests.push(g);
                        }
                        break;
                    }
                }
            });

            // 如果没有提到任何房客，不发送房客信息
            if (mentionedGuests.length === 0) return '';

            // 只发送被提及的房客详细信息
            let text = '【相关房客信息】\n';
            mentionedGuests.forEach(g => {
                text += `- ${g.roomNumber}号房：${g.name}\n`;
                text += `  类型：${g.category}\n`;
                text += `  入住${g.stayDuration}天，剩余${g.remainingDays}天\n`;
                text += `  房间租金：¥${g.rent || this.getRoomRent(g.roomNumber)}/天\n`;
                text += `  已付租金：¥${g.paidRent || 0}\n`;
                text += `  携带金钱：¥${g.money || 0}\n`;
                text += `  简介：${g.description}\n`;
            });
            return text;
        },

        // ========== 规则管理 ==========
        addRule() {
            if (!this.newRuleText.trim()) return;

            this.rules.push({
                text: this.newRuleText.trim(),
                active: true,
                createdAt: new Date().toISOString()
            });

            this.newRuleText = '';
        },

        toggleRule(index) {
            this.rules[index].active = !this.rules[index].active;
        },

        editRule(index) {
            this.editingRuleIndex = index;
            this.editingRuleText = this.rules[index].text;
        },

        saveEditedRule() {
            if (this.editingRuleIndex !== null && this.editingRuleText.trim()) {
                this.rules[this.editingRuleIndex].text = this.editingRuleText.trim();
                this.editingRuleIndex = null;
                this.editingRuleText = '';
            }
        },

        deleteRule(index) {
            if (confirm('确定要删除这条规则吗？')) {
                this.rules.splice(index, 1);
            }
        },

        // ========== 消息编辑 ==========
        editMessage(index) {
            const actualIndex = this.summary ? this.summaryMessageCount + index : index;
            this.editingMessage = actualIndex;
            this.editingContent = this.messages[actualIndex].content;
        },

        saveEditedMessage() {
            if (this.editingMessage !== null) {
                this.messages[this.editingMessage].content = this.editingContent;
                this.editingMessage = null;
                this.editingContent = '';
            }
        },

        async regenerateMessage() {
            if (this.isGenerating) return;

            if (this.messages.length > 0 && this.messages[this.messages.length - 1].role === 'assistant') {
                this.messages.pop();
            }

            await this.generateResponse();
        },

        // ========== 总结功能 ==========
        async doSummary() {
            if (this.isGenerating || this.messages.length < 6) return;

            if (!confirm('生成总结后，历史消息将被总结替代。确定要生成总结吗？')) {
                return;
            }

            this.isGenerating = true;

            const summaryPrompt = `请总结以下故事内容，保留关键信息（人物、事件、规则影响、关系变化）：

${this.messages.map(m => `${m.role === 'user' ? this.playerName : '叙述者'}：${m.content}`).join('\n\n')}

请用300字左右总结上述内容，保留重要细节和人物关系。`;

            try {
                let content = '';
                await window.dzmm.completions({
                    model: this.selectedModel,
                    messages: [{ role: 'user', content: summaryPrompt }],
                    maxTokens: 800
                }, (chunk, done) => {
                    content = chunk;
                    if (done) {
                        this.summary = content;
                        this.summaryMessageCount = this.messages.length;
                        this.isGenerating = false;
                        alert('总结生成成功！');
                    }
                });
            } catch (e) {
                console.error('总结生成失败:', e);
                this.isGenerating = false;
                alert('总结生成失败，请重试');
            }
        },

        clearSummary() {
            if (confirm('清除总结后，将重新发送所有历史消息。确定吗？')) {
                this.summary = null;
                this.summaryMessageCount = 0;
            }
        },

        // ========== 存档系统 ==========
        async loadSavesInfo() {
            try {
                if (window.dzmm?.kv) {
                    const result = await window.dzmm.kv.get('hotelRuleBook_saves_index');
                    if (result && result.value) {
                        this.saves = JSON.parse(result.value);
                        this.hasSavedGame = Object.keys(this.saves).some(k => this.saves[k]);
                    }
                }
            } catch (e) {
                console.error('加载存档信息失败:', e);
                this.saves = {};
            }
        },

        async saveGame(slot) {
            if (this.isSaving) return;
            this.isSaving = true;

            const saveData = {
                playerName: this.playerName,
                replyLength: this.replyLength,
                selectedModel: this.selectedModel,
                selectedCategory: this.selectedCategory,
                customCategory: this.customCategory,
                rules: this.rules,
                messages: this.messages,
                guests: this.guests,
                gameTime: this.gameTime,
                summary: this.summary,
                summaryMessageCount: this.summaryMessageCount,
                date: new Date().toLocaleString(),
                rulesCount: this.rules.length
            };

            this.saves[slot] = {
                playerName: this.playerName,
                date: saveData.date,
                rulesCount: this.rules.length,
                day: this.gameTime.day
            };

            try {
                if (window.dzmm?.kv) {
                    await window.dzmm.kv.put(`hotelRuleBook_save_${slot}`, JSON.stringify(saveData));
                    await window.dzmm.kv.put('hotelRuleBook_saves_index', JSON.stringify(this.saves));
                }
                this.hasSavedGame = true;
                alert('保存成功！');
            } catch (e) {
                console.error('保存失败:', e);
                alert('保存失败：' + e.message);
            } finally {
                this.isSaving = false;
            }
        },

        async loadGame(slot) {
            if (this.isLoading) return;

            const saveInfo = this.saves[slot];
            if (!saveInfo) {
                alert('存档不存在');
                return;
            }

            this.isLoading = true;

            try {
                if (window.dzmm?.kv) {
                    const result = await window.dzmm.kv.get(`hotelRuleBook_save_${slot}`);
                    if (result && result.value) {
                        const data = JSON.parse(result.value);

                        this.playerName = data.playerName;
                        this.replyLength = data.replyLength;
                        this.selectedModel = data.selectedModel;
                        this.selectedCategory = data.selectedCategory || '';
                        this.customCategory = data.customCategory || '';
                        this.rules = data.rules || [];
                        this.messages = data.messages || [];
                        this.guests = data.guests || [];
                        this.gameTime = data.gameTime || { day: 1, hour: 8, period: 'morning', periodName: '早晨' };
                        this.summary = data.summary || null;
                        this.summaryMessageCount = data.summaryMessageCount || 0;

                        this.screen = 'game';
                        this.showSavePanel = false;

                        setTimeout(() => this.scrollToBottom(), 100);
                    } else {
                        alert('存档数据不存在');
                    }
                }
            } catch (e) {
                console.error('读取存档失败:', e);
                alert('读取存档失败：' + e.message);
            } finally {
                this.isLoading = false;
            }
        },

        async loadLatestSave() {
            let latestSlot = null;
            let latestDate = null;

            for (const slot in this.saves) {
                if (this.saves[slot]) {
                    const saveDate = new Date(this.saves[slot].date);
                    if (!latestDate || saveDate > latestDate) {
                        latestDate = saveDate;
                        latestSlot = slot;
                    }
                }
            }

            if (latestSlot) {
                await this.loadGame(latestSlot);
            }
        },

        async deleteSave(slot) {
            if (!confirm('确定要删除这个存档吗？')) return;

            try {
                if (window.dzmm?.kv) {
                    await window.dzmm.kv.delete(`hotelRuleBook_save_${slot}`);
                }

                delete this.saves[slot];

                if (window.dzmm?.kv) {
                    await window.dzmm.kv.put('hotelRuleBook_saves_index', JSON.stringify(this.saves));
                }

                this.hasSavedGame = Object.keys(this.saves).some(k => this.saves[k]);
            } catch (e) {
                console.error('删除存档失败:', e);
                alert('删除存档失败：' + e.message);
            }
        },

        exportSave() {
            const data = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                currentGame: {
                    playerName: this.playerName,
                    replyLength: this.replyLength,
                    selectedCategory: this.selectedCategory,
                    customCategory: this.customCategory,
                    rules: this.rules,
                    messages: this.messages,
                    guests: this.guests,
                    gameTime: this.gameTime,
                    summary: this.summary,
                    summaryMessageCount: this.summaryMessageCount
                },
                saves: this.saves
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `旅馆规则之书_存档_${new Date().toLocaleDateString()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },

        async importSave(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    if (data.currentGame) {
                        this.playerName = data.currentGame.playerName;
                        this.replyLength = data.currentGame.replyLength;
                        this.selectedCategory = data.currentGame.selectedCategory || '';
                        this.customCategory = data.currentGame.customCategory || '';
                        this.rules = data.currentGame.rules || [];
                        this.messages = data.currentGame.messages || [];
                        this.guests = data.currentGame.guests || [];
                        this.gameTime = data.currentGame.gameTime || { day: 1, hour: 8, period: 'morning', periodName: '早晨' };
                        this.summary = data.currentGame.summary || null;
                        this.summaryMessageCount = data.currentGame.summaryMessageCount || 0;
                    }

                    if (data.saves) {
                        this.saves = data.saves;
                        if (window.dzmm?.kv) {
                            await window.dzmm.kv.put('hotelRuleBook_saves_index', JSON.stringify(this.saves));
                        }
                    }

                    alert('导入成功！');
                    this.showSavePanel = false;

                    if (this.messages.length > 0) {
                        this.screen = 'game';
                    }
                } catch (err) {
                    alert('导入失败：文件格式错误');
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        },

        confirmReset() {
            if (confirm('确定要重新开始游戏吗？当前进度将丢失（存档不受影响）。')) {
                this.messages = [];
                this.rules = [];
                this.guests = [];
                this.gameTime = { day: 1, hour: 8, period: 'morning', periodName: '早晨' };
                this.summary = null;
                this.summaryMessageCount = 0;
                this.showSettingsPanel = false;
                this.screen = 'setup';
            }
        },

        // ========== 工具函数 ==========
        formatMessage(content) {
            return content
                .replace(/\n/g, '<br>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/「([^」]+)」/g, '<span class="dialogue">「$1」</span>');
        },

        scrollToBottom() {
            setTimeout(() => {
                const container = document.getElementById('chatMessages');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 50);
        },

        // ========== 绘图功能 ==========
        async generateImage() {
            if (!this.drawPrompt.trim() || this.isDrawing) return;

            this.isDrawing = true;
            try {
                const result = await window.dzmm.draw.generate({
                    prompt: this.drawPrompt,
                    dimension: '1:1',
                    model: 'anime',
                    negativePrompt: 'lowres, bad anatomy, bad hands, text, error, missing fingers, worst quality, low quality, blurry'
                });

                if (result && result.images && result.images.length > 0) {
                    this.generatedImages.unshift({
                        url: result.images[0],
                        prompt: this.drawPrompt,
                        createdAt: new Date().toLocaleString()
                    });
                    this.drawPrompt = '';
                    alert('图片生成成功！');
                } else {
                    alert('图片生成失败，请重试');
                }
            } catch (e) {
                console.error('绘图失败:', e);
                alert('绘图失败：' + (e.message || '未知错误'));
            } finally {
                this.isDrawing = false;
            }
        },

        // 插入图片到聊天
        insertImageToChat(imageUrl) {
            const imgMsg = `[生成的图片]\n![生成图片](${imageUrl})`;
            this.messages.push({
                id: Date.now(),
                role: 'assistant',
                content: imgMsg
            });
            this.showDrawPanel = false;
            this.scrollToBottom();
        },

        // ========== 购买扣款功能 ==========
        // 从指定房客扣除金钱
        deductGuestMoney(guestId, amount) {
            const guestIdx = this.guests.findIndex(g => g.id === guestId);
            if (guestIdx !== -1 && this.guests[guestIdx].money >= amount) {
                this.guests[guestIdx].money -= amount;
                return true;
            }
            return false;
        },

        // 根据房间号扣除金钱
        deductMoneyByRoom(roomNumber, amount) {
            const guest = this.guests.find(g => g.roomNumber === roomNumber && g.status === 'active');
            if (guest && guest.money >= amount) {
                guest.money -= amount;
                return true;
            }
            return false;
        },

        // 根据房客名字扣除金钱
        deductMoneyByName(guestName, amount) {
            const guest = this.guests.find(g => g.name && g.name.includes(guestName) && g.status === 'active');
            if (guest && guest.money >= amount) {
                guest.money -= amount;
                return true;
            }
            return false;
        },

        // 处理购买请求（供对话中调用）
        handlePurchase(identifier, amount, itemName) {
            let success = false;
            let guest = null;

            // 尝试按房间号查找
            if (typeof identifier === 'number' || /^\d+$/.test(identifier)) {
                const roomNum = parseInt(identifier);
                guest = this.guests.find(g => g.roomNumber === roomNum && g.status === 'active');
                if (guest) {
                    success = this.deductMoneyByRoom(roomNum, amount);
                }
            } else {
                // 按名字查找
                guest = this.guests.find(g => g.name && g.name.includes(identifier) && g.status === 'active');
                if (guest) {
                    success = this.deductMoneyByName(identifier, amount);
                }
            }

            if (success && guest) {
                return {
                    success: true,
                    guestName: guest.name,
                    amount: amount,
                    remainingMoney: guest.money,
                    message: `${guest.name} 购买了 ${itemName}，花费 ¥${amount}，剩余 ¥${guest.money}`
                };
            } else {
                return {
                    success: false,
                    message: guest ? '金钱不足' : '找不到该房客'
                };
            }
        }
    };
}
