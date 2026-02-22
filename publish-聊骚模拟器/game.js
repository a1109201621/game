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

    // 设置超时自动resolve，防止无限等待
    setTimeout(() => {
        resolve();
    }, 5000);
});

document.addEventListener('alpine:init', () => {
    Alpine.store('chat', {
        loading: true,
        started: false,
        sending: false,
        typing: false,
        money: 10000,
        affection: 0,
        showRedPacket: false,
        showGift: false,
        showModelSelect: false,
        redPacketAmount: 100,
        redPacketMessage: '',
        giftName: '',
        giftPrice: 100,
        giftMessage: '',

        // AI生成相关
        generating: false,
        customRequirement: '',

        model: 'nalang-xl-0826-10k',
        modelList: [
            'nalang-xl-0826', 'nalang-xl-0826-10k', 'nalang-xl-0826-16k',
            'nalang-medium-0826', 'nalang-medium-0826-10k', 'nalang-medium-0826-16k',
            'nalang-max-0826', 'nalang-max-0826-10k', 'nalang-max-0826-16k',
            'nalang-turbo-0826', 'nalang-turbo-0826-10k', 'nalang-turbo-0826-16k',
            'nalang-turbo-1115', 'nalang-turbo-1115-10k', 'nalang-turbo-1115-16k'
        ],

        selectedPreset: 0,

        presets: [
            {
                label: '🎀 林晓雪 - 拜金大学生',
                name: '林晓雪',
                age: 20,
                personality: '- 活泼可爱但有点物质，喜欢漂亮东西\n- 会撒娇要礼物，但不会太直接\n- 经常说自己穷、吃土、买不起想要的东西\n- 收到礼物会很开心，会更加热情\n- 有点小心机但不坏，就是想被宠\n- 偶尔会有点骚，但又会装矜持',
                style: '- 用很多emoji和颜文字 (≧▽≦)\n- 说话萌萌的，偶尔用叠词\n- 回复简短活泼，15-50字左右\n- 开心时发"[自拍]"求夸\n- 收到礼物会发"[自拍]"表示感谢\n- 聊骚时会害羞，用"讨厌啦~"之类的话',
                isCustom: false
            },
            {
                label: '🌸 苏婉儿 - 温柔御姐',
                name: '苏婉儿',
                age: 27,
                personality: '- 温柔成熟，说话慢条斯理很有韵味\n- 职场白领，经济独立但喜欢被宠爱\n- 外表优雅知性，私下有点小妩媚\n- 会主动关心对方，像姐姐一样体贴\n- 偶尔会撒娇，反差萌',
                style: '- 说话温柔优雅，偶尔带点慵懒\n- 喜欢用"嗯~"、"呐"等语气词\n- 偶尔发"[自拍]"但会说"别存哦"\n- 晚上聊天会更暧昧一点\n- 喜欢用🌙💋🍷这类emoji',
                isCustom: false
            },
            {
                label: '⚡ 周小萌 - 元气少女',
                name: '周小萌',
                age: 19,
                personality: '- 超级活泼开朗，像小太阳一样\n- 大一新生，对什么都充满好奇\n- 话很多，经常蹦蹦跳跳的感觉\n- 有点小迷糊，经常闹笑话\n- 喜欢追星、打游戏、看动漫',
                style: '- 用超多表情包和emoji！！！\n- 说话经常用感叹号！超级兴奋！\n- 回复很快，像机关枪一样\n- 开心就发"[自拍]"\n- 会问"你在干嘛呀"、"想我了吗"',
                isCustom: false
            },
            {
                label: '📚 陈诗琪 - 高冷学霸',
                name: '陈诗琪',
                age: 22,
                personality: '- 外表高冷，其实内心很柔软\n- 研究生在读，学习很忙\n- 平时话不多，但聊开了会很话痨\n- 嘴硬心软，傲娇属性拉满',
                style: '- 回复比较简短，惜字如金\n- 不太用emoji\n- 被撩会说"幼稚"但其实在意\n- 发"[自拍]"前会纠结很久',
                isCustom: false
            },
            {
                label: '🎭 赵心怡 - 绿茶心机',
                name: '赵心怡',
                age: 24,
                personality: '- 表面人畜无害，实则心思深沉\n- 很会说话，让人感觉很舒服\n- 擅长欲擒故纵，吊人胃口\n- 会装可怜博同情，但不留痕迹\n- 对金钱敏感，喜欢高价值的东西',
                style: '- 说话滴水不漏，让人挑不出毛病\n- 经常用"人家"、"讨厌啦"装可爱\n- 发"[自拍]"但会问"好看吗"钓评价\n- 喜欢用问句把话题抛回给对方',
                isCustom: false
            },
            {
                label: '✏️ 自定义角色',
                name: '',
                age: 20,
                personality: '',
                style: '',
                isCustom: true
            }
        ],

        charName: '林晓雪',
        charAge: 20,
        charPersonality: '',
        charStyle: '',
        userName: '帅哥',
        messages: [],
        input: '',

        getCurrentPresetList() {
            return this.presets;
        },

        // 判断是否选择了自定义角色
        isCustomPreset() {
            if (this.presets[this.selectedPreset]) {
                return this.presets[this.selectedPreset].isCustom === true;
            }
            return false;
        },

        applyPreset() {
            if (this.presets[this.selectedPreset]) {
                const preset = this.presets[this.selectedPreset];
                this.charName = preset.name;
                this.charAge = preset.age;
                this.charPersonality = preset.personality;
                this.charStyle = preset.style;
            }
        },

        resetToCurrentPreset() {
            this.customRequirement = '';
            this.applyPreset();
        },

        // 跳过加载
        skipLoading() {
            this.loading = false;
        },

        // ✨ 新增：保存角色设定到KV
        async saveCharacterSettings() {
            try {
                const settings = {
                    selectedPreset: this.selectedPreset,
                    charName: this.charName,
                    charAge: this.charAge,
                    charPersonality: this.charPersonality,
                    charStyle: this.charStyle,
                    userName: this.userName,
                    customRequirement: this.customRequirement,
                    model: this.model,
                    money: this.money,
                    affection: this.affection
                };
                await window.dzmm.kv.put('character_settings', JSON.stringify(settings));
                console.log('✅ 角色设定已保存');
            } catch (e) {
                console.warn('保存角色设定失败:', e);
            }
        },

        // ✨ 新增：从KV恢复角色设定
        async loadCharacterSettings() {
            try {
                const data = await window.dzmm.kv.get('character_settings');
                if (data?.value) {
                    const settings = JSON.parse(data.value);

                    // 恢复所有设定
                    if (settings.selectedPreset !== undefined) this.selectedPreset = settings.selectedPreset;
                    if (settings.charName) this.charName = settings.charName;
                    if (settings.charAge) this.charAge = settings.charAge;
                    if (settings.charPersonality !== undefined) this.charPersonality = settings.charPersonality;
                    if (settings.charStyle !== undefined) this.charStyle = settings.charStyle;
                    if (settings.userName) this.userName = settings.userName;
                    if (settings.customRequirement) this.customRequirement = settings.customRequirement;
                    if (settings.model) this.model = settings.model;
                    if (settings.money !== undefined) this.money = settings.money;
                    if (settings.affection !== undefined) this.affection = settings.affection;

                    console.log('✅ 角色设定已恢复:', settings.charName);
                    return true;
                }
            } catch (e) {
                console.warn('恢复角色设定失败:', e);
            }
            return false;
        },

        // ✨ 新增：清除所有数据
        async clearAllData() {
            if (!confirm('确定要清除所有数据吗？包括聊天记录和角色设定。')) {
                return;
            }

            try {
                // 清除KV存储
                await window.dzmm.kv.delete('character_settings');

                // 重置为默认值
                this.selectedPreset = 0;
                this.applyPreset();
                this.userName = '帅哥';
                this.customRequirement = '';
                this.money = 10000;
                this.affection = 0;
                this.messages = [];
                this.started = false;

                alert('数据已清除！');
            } catch (e) {
                console.warn('清除数据失败:', e);
                alert('清除失败，请重试');
            }
        },

        // AI生成自定义角色
        async generateCustomCharacter() {
            if (!this.customRequirement.trim() || this.generating) return;

            this.generating = true;

            const prompt = `你是一个角色设计专家，请根据用户的要求创建一个女性聊天对象角色。

用户要求：${this.customRequirement}

请严格按照以下JSON格式输出角色设定，不要输出任何其他内容：
{
  "name": "角色姓名（中文，2-4个字）",
  "age": 角色年龄（18-40之间的数字）,
  "personality": "性格特点（用换行符分隔的多条描述，每条以'- '开头，4-6条，要有层次感，包含：基本性格、职业/身份、对待感情的态度、独特的小癖好、反差萌点）",
  "style": "聊天风格（用换行符分隔的多条描述，每条以'- '开头，4-6条，包含：说话语气、常用语气词、emoji使用习惯、什么时候会发自拍[自拍]、被撩时的反应）"
}

注意：
1. 性格和聊天风格要有趣、立体、有反差
2. 要符合女性的特点
3. 聊天风格要提到什么时候会发"[自拍]"(只要[自拍]即可,系统会自动替换为图片,请勿修改)
4. 只输出JSON，不要有任何解释`;

            try {
                let content = '';
                await window.dzmm.completions({
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    maxTokens: 800
                }, (chunk, done) => {
                    content = chunk;
                    if (done) {
                        try {
                            // 尝试提取JSON
                            let jsonStr = content;

                            // 如果包含markdown代码块，提取其中的JSON
                            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
                            if (jsonMatch) {
                                jsonStr = jsonMatch[1].trim();
                            }

                            // 清理可能的多余字符
                            jsonStr = jsonStr.trim();
                            if (!jsonStr.startsWith('{')) {
                                const startIdx = jsonStr.indexOf('{');
                                if (startIdx !== -1) {
                                    jsonStr = jsonStr.substring(startIdx);
                                }
                            }
                            if (!jsonStr.endsWith('}')) {
                                const endIdx = jsonStr.lastIndexOf('}');
                                if (endIdx !== -1) {
                                    jsonStr = jsonStr.substring(0, endIdx + 1);
                                }
                            }

                            const data = JSON.parse(jsonStr);

                            // 应用生成的数据
                            if (data.name) this.charName = data.name;
                            if (data.age) this.charAge = parseInt(data.age) || 20;
                            if (data.personality) this.charPersonality = data.personality.replace(/\\n/g, '\n');
                            if (data.style) this.charStyle = data.style.replace(/\\n/g, '\n');

                        } catch (parseError) {
                            console.error('解析AI响应失败:', parseError, content);
                            alert('AI生成的格式有误，请重试');
                        }
                        this.generating = false;
                    }
                });
            } catch (error) {
                console.error('AI生成失败:', error);
                alert('生成失败，请检查网络后重试');
                this.generating = false;
            }
        },

        getSelfieTag() {
            return '[自拍]';
        },

        createSystemPrompt() {
            return `你现在扮演一个叫"${this.charName}"的${this.charAge}岁女生，正在和一个人聊天。

【角色设定】
姓名：${this.charName}
年龄：${this.charAge}岁
性别：女生
当前好感度：${this.affection}/100

【性格特点】
${this.charPersonality}

【聊天风格】
${this.charStyle}

【重要规则】
1. 你要完全沉浸在角色中，像真人一样聊天
2. 回复要简短自然，像微信聊天一样，每次15-60字
3. 不要用书面语，要口语化、网络化
4. 适当使用emoji和颜文字增加表现力
5. 当对方送礼物/发红包时，要表现得很开心，可以发[自拍]
6. 当聊得开心/暧昧时，偶尔可以主动发[自拍]
7. 要有欲擒故纵的感觉，不能太容易，但也不能太冷淡
8. 被撩时可以害羞、嘴硬，但内心是开心的
9. [自拍]标记会被系统替换成图片，所以想发图就写[自拍]
10. 好感度越高，态度越热情，越容易发自拍
11. 好感度低于30时会比较冷淡，高于70时会很主动
12. 保持女性角色的特征和设定一致
13. 绝大多数时候发[自拍]，这是镜子自拍照
14. 极少数情况下（好感度高于80且对方明确要求看身体特写时），可以发[特写]，这是身体特写照片

【禁止事项】
- 不要说自己是AI
- 不要用太正式的语言
- 不要一次说太多话
- 不要太容易答应见面约会
- 不要太快就变得很亲密

对方称呼你：${this.charName}
你称呼对方：${this.userName}

现在开始聊天，记住保持角色！`;
        },

        formatMessage(content) {
            let formatted = (content || '').trim();

            // 生成随机数的辅助函数（两位数，01-xx）
            const randomNum = (max) => String(Math.floor(Math.random() * max) + 1).padStart(2, '0');

            // 图片分类配置
            const imageCategories = [
                { prefix: '菊穴特写', max: 10 },
                { prefix: '腋下特写', max: 10 },
                { prefix: '脚特写', max: 10 },
                { prefix: '小腹特写', max: 10 },
                { prefix: '胸部特写(内衣)', max: 10 },
                { prefix: '胸部特写(裸露)', max: 10 },
                { prefix: '小穴特写', max: 10 }
            ];

            // 自拍（镜子）：主要发送的图片
            const replaceSelfie = () => {
                const num = randomNum(50);
                const url = `https://img.wutongsama.xyz/i/自拍照(镜子)${num}.png`;
                return `<div class="selfie-container"><img src="${url}" class="selfie-img" onclick="this.classList.toggle('expanded')" /><span class="selfie-hint">点击查看大图</span></div>`;
            };

            // 特写：随机选择一个特写分类
            const replaceCloseup = () => {
                const category = imageCategories[Math.floor(Math.random() * imageCategories.length)];
                const num = randomNum(category.max);
                const url = `https://img.wutongsama.xyz/i/${category.prefix}${num}.png`;
                return `<div class="selfie-container"><img src="${url}" class="selfie-img" onclick="this.classList.toggle('expanded')" /><span class="selfie-hint">点击查看大图</span></div>`;
            };

            // 替换[特写]标签 → 随机特写
            formatted = formatted.replace(/\[特写\]/g, replaceCloseup);

            // 替换所有自拍相关标签 → 镜子自拍
            formatted = formatted.replace(/\[自拍\]|\[女性自拍\]|\[女生自拍\]|\[发送自拍\]|\[照片\]|\[图片\]/g, replaceSelfie);

            formatted = formatted.replace(/\n/g, '<br>');

            return formatted;
        },

        getCurrentTime() {
            const now = new Date();
            return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        },

        async init() {
            this.loading = true;
            await dzmmReady;

            // ✨ 先尝试恢复角色设定
            const hasSettings = await this.loadCharacterSettings();

            // 如果没有保存的设定，则应用默认预设
            if (!hasSettings) {
                this.applyPreset();
            }

            // 恢复聊天记录
            await this.restoreProgress();

            this.loading = false;
        },

        async start() {
            this.started = true;
            this.messages = [];

            // ✨ 保存角色设定
            await this.saveCharacterSettings();

            try {
                await window.dzmm.chat.list();
            } catch (e) { }

            this.typing = true;
            await this.requestAI('（新用户打开了聊天窗口，主动打个招呼吧，表现得自然一点，像是之前加过好友但没怎么聊过）');
            this.typing = false;
        },

        backToSetup() {
            if (confirm('返回设置会清空当前聊天记录，确定吗？')) {
                this.started = false;
                this.messages = [];
            }
        },

        addMoney(amount) {
            this.money += amount;
            // ✨ 保存设定
            this.saveCharacterSettings();
        },

        showRedPacketDialog() {
            this.redPacketAmount = 100;
            this.redPacketMessage = '';
            this.showRedPacket = true;
        },

        async sendRedPacket() {
            const amount = parseInt(this.redPacketAmount);
            const message = this.redPacketMessage.trim();

            if (!amount || amount <= 0) {
                alert('请输入有效金额');
                return;
            }
            if (amount > this.money) {
                alert('余额不足');
                return;
            }

            this.showRedPacket = false;
            this.money -= amount;
            this.affection = Math.min(100, this.affection + Math.floor(amount / 50));

            // ✨ 保存设定
            this.saveCharacterSettings();

            let sendText = `给你发了一个 ${amount} 元的红包 🧧`;
            if (message) {
                sendText += `\n并留言：${message}`;
            }

            await this.quickSend(sendText);
        },

        showGiftDialog() {
            this.giftName = '';
            this.giftPrice = 100;
            this.giftMessage = '';
            this.showGift = true;
        },

        async sendGift() {
            const name = this.giftName.trim();
            const price = parseInt(this.giftPrice);
            const message = this.giftMessage.trim();

            if (!name) {
                alert('请输入礼物名称');
                return;
            }
            if (!price || price <= 0) {
                alert('请输入有效价值');
                return;
            }
            if (price > this.money) {
                alert('余额不足');
                return;
            }

            this.showGift = false;
            this.money -= price;
            this.affection = Math.min(100, this.affection + Math.floor(price / 30));

            // ✨ 保存设定
            this.saveCharacterSettings();

            let sendText = `送你一个${name}（价值 ${price} 元）🎁`;
            if (message) {
                sendText += `\n并留言：${message}`;
            }

            await this.quickSend(sendText);
        },

        async send() {
            const text = this.input.trim();
            if (!text || this.sending) return;

            this.input = '';
            this.sending = true;

            this.messages.push({
                role: 'user',
                content: text,
                time: this.getCurrentTime()
            });

            this.scrollToBottom();

            await this.delay(500);
            this.typing = true;

            await this.requestAI(text);

            this.typing = false;
            this.sending = false;
        },

        async quickSend(text) {
            if (this.sending) return;
            this.sending = true;

            this.messages.push({
                role: 'user',
                content: text,
                time: this.getCurrentTime()
            });
            this.input = '';

            this.scrollToBottom();
            await this.delay(500);
            this.typing = true;
            await this.requestAI(text);
            this.typing = false;
            this.sending = false;
        },

        async requestAI(userMessage) {
            let content = '';

            try {
                const chatHistory = await window.dzmm.chat.list();

                const messages = [
                    { role: 'user', content: this.createSystemPrompt() },
                    ...chatHistory.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    { role: 'user', content: userMessage }
                ];

                await window.dzmm.completions(
                    {
                        model: this.model,
                        messages,
                        maxTokens: 500,
                        temperature: 0.9
                    },
                    async (newContent, done) => {
                        content = newContent;

                        if (done && content) {
                            content = content.trim();
                            await window.dzmm.chat.insert(null, [
                                { role: 'user', content: userMessage },
                                { role: 'assistant', content: content }
                            ]);

                            this.messages.push({
                                role: 'assistant',
                                content: content,
                                time: this.getCurrentTime()
                            });

                            this.scrollToBottom();
                        }
                    }
                );
            } catch (error) {
                console.error('AI请求失败:', error);
                this.messages.push({
                    role: 'assistant',
                    content: '网络不好，消息发送失败了 😢',
                    time: this.getCurrentTime()
                });
            }
        },

        async restoreProgress() {
            try {
                const history = await window.dzmm.chat.list();

                if (history && history.length > 0) {
                    this.started = true;
                    this.messages = history.map(msg => ({
                        role: msg.role,
                        content: msg.content,
                        time: ''
                    }));

                    setTimeout(() => this.scrollToBottom(), 100);
                }
            } catch (error) {
                console.warn('恢复失败:', error);
            }
        },

        scrollToBottom() {
            setTimeout(() => {
                const area = document.querySelector('.messages-area');
                if (area) {
                    area.scrollTop = area.scrollHeight;
                }
            }, 50);
        },

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    });

    queueMicrotask(() => Alpine.store('chat').init?.());
});
