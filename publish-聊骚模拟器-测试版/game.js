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

        // 时间系统 & Debug
        debugMode: false,
        debugTime: '', // HH:MM 格式的调试时间
        debugTimeDisplay: '', // 实时显示的当前时间
        isWorkTime: false, // 当前是否工作时间
        showDebugPanel: false,
        debugTimerInterval: null,

        // AI生成相关
        generating: false,
        customRequirement: '',

        model: 'nalang-xl-0826',
        modelList: [
            { value: 'nalang-xl-0826', label: 'nalang-xl-0826 — 最强模型（32K 上下文）' },
            { value: 'x-apex-0212', label: 'Apex-Sigma-0212 — 文笔精致，角色刻画深入' },
            { value: 'x-apex-neo', label: 'Apex-Neo-0213 — 叙事细腻，感官描写丰富' },
            { value: 'x-apex-flux-0217', label: 'Apex-Flux-0217 — 节奏明快，场景描写生动' },
            { value: 'nalang-turbo-0826', label: 'nalang-turbo-0826 — 快速经济（32K 上下文）' },
            { value: 'nalang-medium-0826', label: 'nalang-medium-0826 — 平衡性能（32K 上下文）' },
            { value: 'nalang-max-0826', label: 'nalang-max-0826 — 高质量（32K 上下文）' },
        ],

        // 部位关键词 → 图片分类映射
        bodyKeywords: {
            '胸': ['胸部特写(内衣)', '胸部特写(裸露)'],
            '奶': ['胸部特写(内衣)', '胸部特写(裸露)'],
            '乳': ['胸部特写(裸露)'],
            '咪咪': ['胸部特写(内衣)', '胸部特写(裸露)'],
            '波': ['胸部特写(内衣)', '胸部特写(裸露)'],
            '脚': ['脚特写'],
            '足': ['脚特写'],
            '丝袜': ['脚特写'],
            '腿': ['脚特写'],
            '美腿': ['脚特写'],
            '腋': ['腋下特写'],
            '腋下': ['腋下特写'],
            '肚': ['小腹特写'],
            '腹': ['小腹特写'],
            '小腹': ['小腹特写'],
            '肚脐': ['小腹特写'],
            '屁': ['菊穴特写'],
            '臀': ['菊穴特写'],
            '屁股': ['菊穴特写'],
            '菊': ['菊穴特写'],
            '后面': ['菊穴特写'],
            '下面': ['小穴特写'],
            '穴': ['小穴特写'],
            '逼': ['小穴特写'],
            '私处': ['小穴特写'],
            '那里': ['小穴特写'],
            '花园': ['小穴特写'],
        },

        // 图片分类最大编号
        imageMaxMap: {
            '菊穴特写': 10, '腋下特写': 10, '脚特写': 10,
            '小腹特写': 10, '胸部特写(内衣)': 10, '胸部特写(裸露)': 10, '小穴特写': 10
        },

        // 根据文本生成图片HTML
        generateImageForAction(text) {
            const randomNum = (max) => String(Math.floor(Math.random() * max) + 1).padStart(2, '0');
            const makeImg = (url) => `<div class="selfie-container"><img src="${url}" class="selfie-img" onclick="this.classList.toggle('expanded')" /><span class="selfie-hint">点击查看大图</span></div>`;

            // 检测部位关键词
            const matchedCategories = new Set();
            for (const [keyword, categories] of Object.entries(this.bodyKeywords)) {
                if (text.includes(keyword)) {
                    categories.forEach(c => matchedCategories.add(c));
                }
            }

            // 如果有匹配到部位关键词且好感度足够
            if (matchedCategories.size > 0 && this.affection >= 60) {
                const cats = [...matchedCategories];
                // 最多2张
                const selected = cats.sort(() => Math.random() - 0.5).slice(0, 2);
                return selected.map(cat => {
                    const max = this.imageMaxMap[cat] || 10;
                    const num = randomNum(max);
                    return makeImg(`https://img.wutongsama.xyz/i/${cat}${num}.png`);
                });
            }

            // 没有匹配或好感度不够 → 发自拍
            const num = randomNum(50);
            return [makeImg(`https://img.wutongsama.xyz/i/自拍照(镜子)${num}.png`)];
        },

        selectedPreset: 0,

        presets: [
            {
                label: '🎀 林晓雪 - 拜金大学生',
                name: '林晓雪',
                personality: '- 活泼可爱但有点物质，喜欢漂亮东西\n- 会撒娇要礼物，但不会太直接\n- 经常说自己穷、吃土、买不起想要的东西\n- 收到礼物会很开心，会更加热情\n- 有点小心机但不坏，就是想被宠\n- 偶尔会有点骚，但又会装矜持',
                style: '- 用很多emoji和颜文字 (≧▽≦)\n- 说话萌萌的，偶尔用叠词\n- 回复简短活泼，15-50字左右\n- 开心时会求夸"好看吗好看吗"\n- 收到礼物会表达感谢和惊喜\n- 聊骚时会害羞，用"讨厌啦~"之类的话',
                isCustom: false
            },
            {
                label: '🌸 苏婉儿 - 温柔御姐',
                name: '苏婉儿',
                personality: '- 温柔成熟，说话慢条斯理很有韵味\n- 职场白领，经济独立但喜欢被宠爱\n- 外表优雅知性，私下有点小妩媚\n- 会主动关心对方，像姐姐一样体贴\n- 偶尔会撒娇，反差萌',
                style: '- 说话温柔优雅，偶尔带点慵懒\n- 喜欢用"嗯~"、"呐"等语气词\n- 会说"别乱想哦"之类的话\n- 晚上聊天会更暧昧一点\n- 喜欢用🌙💋🍷这类emoji',
                isCustom: false
            },
            {
                label: '⚡ 周小萌 - 元气少女',
                name: '周小萌',
                personality: '- 超级活泼开朗，像小太阳一样\n- 大一新生，对什么都充满好奇\n- 话很多，经常蹦蹦跳跳的感觉\n- 有点小迷糊，经常闹笑话\n- 喜欢追星、打游戏、看动漫',
                style: '- 用超多表情包和emoji！！！\n- 说话经常用感叹号！超级兴奋！\n- 回复很快，像机关枪一样\n- 开心就会蹦蹦跳跳分享心情\n- 会问"你在干嘛呀"、"想我了吗"',
                isCustom: false
            },
            {
                label: '📚 陈诗琪 - 高冷学霸',
                name: '陈诗琪',
                personality: '- 外表高冷，其实内心很柔软\n- 研究生在读，学习很忙\n- 平时话不多，但聊开了会很话痨\n- 嘴硬心软，傲娇属性拉满',
                style: '- 回复比较简短，惜字如金\n- 不太用emoji\n- 被撩会说"幼稚"但其实在意\n- 嘴上说不要但心里很在乎',
                isCustom: false
            },
            {
                label: '🎭 赵心怡 - 绿茶心机',
                name: '赵心怡',
                personality: '- 表面人畜无害，实则心思深沉\n- 很会说话，让人感觉很舒服\n- 擅长欲擒故纵，吊人胃口\n- 会装可怜博同情，但不留痕迹\n- 对金钱敏感，喜欢高价值的东西',
                style: '- 说话滴水不漏，让人挑不出毛病\n- 经常用"人家"、"讨厌啦"装可爱\n- 会问"好看吗"、"你觉得呢"钓评价\n- 喜欢用问句把话题抛回给对方',
                isCustom: false
            },
            {
                label: '✏️ 自定义角色',
                name: '',
                personality: '',
                style: '',
                isCustom: true
            }
        ],

        charName: '林晓雪',
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

请严格按照以下JSON格式输出角色设定，不要输出任何其他内容。

下面是一个正确的输出示例，供你参考格式（注意personality和style中每条用英文分号;分隔）：
{
  "name": "林晓雪",
  "personality": "- 活泼可爱但有点物质，喜欢漂亮东西;- 大二在读，经常说自己穷、吃土;- 收到礼物会很开心，会更加热情;- 有点小心机但不坏，就是想被宠;- 偶尔会有点骚，但又会装矜持",
  "style": "- 用很多emoji和颜文字 (≧▽≦);- 说话萌萌的，偶尔用叠词;- 回复简短活泼，15-50字左右;- 开心时会求夸好看吗好看吗;- 被撩时会害羞，用讨厌啦~之类的话"
}

现在请根据用户要求，生成一个全新的角色（不要照抄示例），输出格式与示例完全一致：
{
  "name": "角色姓名",
  "personality": "- 第一条性格描述;- 第二条性格描述;- ...",
  "style": "- 第一条风格描述;- 第二条风格描述;- ..."
}

注意：
1. 性格和聊天风格要有趣、立体、有反差，4-6条
2. 要符合女性的特点
3. 聊天风格不要提到发自拍或发图片，图片由系统自动处理
4. 只输出JSON，不要有任何其他文字或解释
5. personality和style的值必须是单行字符串，条目之间用英文分号;连接`;

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

                            let parsed = false;
                            let data = null;

                            // 方法1：直接JSON.parse
                            try {
                                data = JSON.parse(jsonStr);
                                parsed = true;
                            } catch (e) {
                                // 方法2：尝试修复常见的JSON格式问题（如真实换行、单引号等）
                                try {
                                    let fixedStr = jsonStr
                                        .replace(/\r?\n/g, ' ')       // 把真实换行替换为空格
                                        .replace(/'/g, '"')           // 单引号换双引号
                                        .replace(/,\s*}/g, '}')       // 移除尾逗号
                                        .replace(/,\s*]/g, ']');      // 移除数组尾逗号
                                    data = JSON.parse(fixedStr);
                                    parsed = true;
                                } catch (e2) {
                                    // 方法3：正则提取各字段
                                    try {
                                        const nameMatch = jsonStr.match(/["']?name["']?\s*[:：]\s*["'"]([^"'"]+)["'"]/i);
                                        const persMatch = jsonStr.match(/["']?personality["']?\s*[:：]\s*["'"]([^"'"]+)["'"]/i);
                                        const styleMatch = jsonStr.match(/["']?style["']?\s*[:：]\s*["'"]([^"'"]+)["'"]/i);
                                        if (nameMatch || persMatch || styleMatch) {
                                            data = {
                                                name: nameMatch ? nameMatch[1] : '',
                                                personality: persMatch ? persMatch[1] : '',
                                                style: styleMatch ? styleMatch[1] : ''
                                            };
                                            parsed = true;
                                        }
                                    } catch (e3) { }
                                }
                            }

                            if (parsed && data) {
                                // 应用生成的数据，兼容分号和\\n两种分隔符
                                if (data.name) this.charName = data.name;
                                if (data.personality) this.charPersonality = data.personality.replace(/;/g, '\n').replace(/\\n/g, '\n');
                                if (data.style) this.charStyle = data.style.replace(/;/g, '\n').replace(/\\n/g, '\n');
                            } else {
                                // 完全无法解析，将原始内容填入性格列
                                console.error('解析AI响应失败，原始内容:', content);
                                this.charPersonality = content.trim();
                                this.charStyle = '';
                                alert('格式错误，已将结果输出在性格列，请自行修改。或者切换max模型重试');
                            }

                        } catch (parseError) {
                            // 最外层兜底：将原始内容填入性格列
                            console.error('解析AI响应失败:', parseError, content);
                            this.charPersonality = content.trim();
                            this.charStyle = '';
                            alert('格式错误，已将结果输出在性格列，请自行修改。或者切换max模型重试');
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



        createSystemPrompt() {
            return `你现在扮演一个叫"${this.charName}"的女生，正在和一个人聊天。

【角色设定】
姓名：${this.charName}
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
5. 当对方送礼物/发红包时，要表现得很开心，用文字表达感谢和惊喜
6. 保持女性角色的特征和设定一致
7. 不要在回复中写[自拍]、[特写]、[照片]、[图片]等标签，系统会自动处理图片发送

【禁止事项】
- 不要说自己是AI
- 不要用太正式的语言
- 不要一次说太多话
- 不要太容易答应见面约会
- 不要太快就变得很亲密
- 绝对不要输出任何方括号标签如[自拍]、[特写]等

对方称呼你：${this.charName}
你称呼对方：${this.userName}

现在开始聊天，记住保持角色！`;
        },

        formatMessage(content) {
            let formatted = (content || '').trim();
            // 清除AI可能意外输出的图片标签
            formatted = formatted.replace(/\[自拍\]|\[女性自拍\]|\[女生自拍\]|\[发送自拍\]|\[照片\]|\[图片\]|\[特写\]/g, '');
            formatted = formatted.replace(/\n/g, '<br>');
            return formatted;
        },

        // ===== 时间系统 =====

        // 获取模拟时间（debug模式下返回调试时间对应的Date，否则返回真实Date）
        getSimulatedDate() {
            if (this.debugMode && this.debugTime) {
                const parts = this.debugTime.split(':');
                if (parts.length === 2) {
                    const h = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10);
                    if (!isNaN(h) && !isNaN(m)) {
                        const d = new Date();
                        d.setHours(h, m, 0, 0);
                        return d;
                    }
                }
            }
            return new Date();
        },

        getCurrentTime() {
            const d = this.getSimulatedDate();
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        },

        // 判断是否工作时间：9:00-12:00, 13:00-15:00
        checkWorkTime() {
            const d = this.getSimulatedDate();
            const h = d.getHours();
            const m = d.getMinutes();
            const t = h * 60 + m; // 转为分钟数
            const working = (t >= 540 && t < 720) || (t >= 780 && t < 900);
            this.isWorkTime = working;
            return working;
        },

        // 更新时间显示（定时调用）
        updateTimeDisplay() {
            this.debugTimeDisplay = this.getCurrentTime();
            this.checkWorkTime();
        },

        // 启动时间刷新定时器
        startTimeTimer() {
            this.updateTimeDisplay();
            this.debugTimerInterval = setInterval(() => {
                this.updateTimeDisplay();
            }, 5000);
        },

        // ===== Debug 控制 =====

        toggleDebugPanel() {
            this.showDebugPanel = !this.showDebugPanel;
        },

        setDebugTime(timeStr) {
            if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
                this.debugMode = true;
                this.debugTime = timeStr;
                this.updateTimeDisplay();
                console.log(`🐛 Debug时间设置为: ${timeStr}, 工作时间: ${this.isWorkTime}`);
            }
        },

        clearDebugTime() {
            this.debugMode = false;
            this.debugTime = '';
            this.updateTimeDisplay();
            console.log('🐛 已恢复真实时间');
        },

        // 模拟重新打开（测试用）
        async simulateReopen() {
            console.log('🐛 模拟重新打开...');
            await this.handleReopen();
        },

        // ===== 核心：打开时处理积压消息或抱怨 =====

        async handleReopen() {
            try {
                const history = await window.dzmm.chat.list();
                if (!history || history.length === 0) return;

                // 如果当前处于工作时间，不处理
                if (this.checkWorkTime()) {
                    console.log('🏢 当前是工作时间，跳过handleReopen');
                    return;
                }

                const lastMsg = history[history.length - 1];

                if (lastMsg.role === 'user') {
                    // 场景A：最后N条是用户消息 → 批量回复
                    let pendingUserMessages = [];
                    for (let i = history.length - 1; i >= 0; i--) {
                        if (history[i].role === 'user') {
                            pendingUserMessages.unshift(history[i].content);
                        } else {
                            break;
                        }
                    }

                    if (pendingUserMessages.length > 0) {
                        console.log(`📨 发现 ${pendingUserMessages.length} 条积压用户消息，开始批量回复...`);
                        await this.batchReply(pendingUserMessages);
                    }
                } else if (lastMsg.role === 'assistant') {
                    // 场景B：最后消息是AI → 抱怨
                    console.log('😤 最后消息是AI的，生成抱怨...');
                    await this.generateComplaint();
                }
            } catch (e) {
                console.warn('handleReopen失败:', e);
            }
        },

        // 批量回复积压消息
        async batchReply(userMessages) {
            const messagesText = userMessages.map((m, i) => `消息${i + 1}: ${m}`).join('\n');

            const batchPrompt = `以下是用户在你工作期间（不在线时）给你发的 ${userMessages.length} 条消息，你现在下班了/有空了，看到了这些积压消息。请针对每条消息分别回复。

用户的积压消息：
${messagesText}

请用以下JSON数组格式回复，每条回复15-60字，保持你的角色和聊天风格：
["回复消息1", "回复消息2", ...]

注意：
1. 第一条回复可以先解释一下自己刚才在忙/在上班/在工作
2. 然后逐条回复用户的消息
3. 回复要自然，像是看到积压消息后一条条回的感觉
4. 只输出JSON数组，不要其他内容`;

            this.typing = true;

            try {
                let content = '';
                const chatHistory = await window.dzmm.chat.list();
                const messages = [
                    { role: 'user', content: this.createSystemPrompt() },
                    ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
                    { role: 'user', content: batchPrompt }
                ];

                await window.dzmm.completions(
                    { model: this.model, messages, maxTokens: 1500, temperature: 0.9 },
                    async (newContent, done) => {
                        content = newContent;
                        if (done && content) {
                            content = content.trim();
                            let replies = [];

                            try {
                                // 尝试提取JSON数组
                                let jsonStr = content;
                                const jsonMatch = content.match(/\[[\s\S]*?\]/);
                                if (jsonMatch) {
                                    jsonStr = jsonMatch[0];
                                }
                                replies = JSON.parse(jsonStr);
                                if (!Array.isArray(replies)) replies = [content];
                            } catch (e) {
                                // JSON解析失败，按换行分割或作为整体
                                replies = content.split(/\n+/).filter(l => l.trim()).map(l => l.replace(/^\d+[.、:：]\s*/, '').replace(/^"|"$/g, '').trim());
                                if (replies.length === 0) replies = [content];
                            }

                            // 逐条显示回复
                            for (let i = 0; i < replies.length; i++) {
                                const reply = (typeof replies[i] === 'string' ? replies[i] : String(replies[i])).trim();
                                if (!reply) continue;

                                // 存入chat
                                if (i === 0) {
                                    await window.dzmm.chat.insert(null, [
                                        { role: 'user', content: '（积压消息已读）' },
                                        { role: 'assistant', content: reply }
                                    ]);
                                } else {
                                    await window.dzmm.chat.insert(null, [
                                        { role: 'assistant', content: reply }
                                    ]);
                                }

                                // 显示在界面
                                this.messages.push({
                                    role: 'assistant',
                                    content: reply,
                                    time: this.getCurrentTime()
                                });
                                this.scrollToBottom();

                                // 每条之间有延迟，模拟逐条回复
                                if (i < replies.length - 1) {
                                    this.typing = false;
                                    await this.delay(800 + Math.random() * 1200);
                                    this.typing = true;
                                    await this.delay(500 + Math.random() * 1000);
                                }
                            }
                        }
                    }
                );
            } catch (e) {
                console.error('批量回复失败:', e);
            }

            this.typing = false;
        },

        // 生成抱怨消息
        async generateComplaint() {
            const complaintPrompt = `用户已经很久没找你聊天了，现在终于打开了聊天窗口。请用你的角色口吻表达不满/撒娇/抱怨。

参考风格（请根据你的性格选择合适的表达方式，不要照抄）：
- 傲娇型："哼，终于想起我了？"
- 撒娇型："你好坏，都不来找人家 😢"
- 毒舌型："哟哟哟，大少爷，终于想起我来了"
- 高冷型："……你来了。"
- 活泼型："你再不来我就要报警了！说！去哪了！"

请只回复一条15-60字的消息，保持你的人设和聊天风格。不要解释，直接回复。`;

            this.typing = true;

            try {
                let content = '';
                const chatHistory = await window.dzmm.chat.list();
                const messages = [
                    { role: 'user', content: this.createSystemPrompt() },
                    ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
                    { role: 'user', content: complaintPrompt }
                ];

                await window.dzmm.completions(
                    { model: this.model, messages, maxTokens: 300, temperature: 0.9 },
                    async (newContent, done) => {
                        content = newContent;
                        if (done && content) {
                            content = content.trim();

                            // 存入chat
                            await window.dzmm.chat.insert(null, [
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
            } catch (e) {
                console.error('生成抱怨失败:', e);
            }

            this.typing = false;
        },

        // ===== 初始化 & 生命周期 =====

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

            // 启动时间系统
            this.startTimeTimer();

            this.loading = false;

            // 打开时处理积压消息或抱怨（仅在已经开始聊天后）
            if (this.started && this.messages.length > 0) {
                await this.handleReopen();
            }
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
            this.affection = Math.min(100, this.affection + Math.floor(amount / 150));

            // ✨ 保存设定
            this.saveCharacterSettings();

            let sendText = `给你发了一个 ${amount} 元的红包 🧧`;
            if (message) {
                sendText += `\n并留言：${message}`;
            }

            await this.quickSend(sendText);

            // 红包发送后自动插入图片
            const images = this.generateImageForAction(message || '');
            for (const imgHtml of images) {
                await this.delay(800);
                this.messages.push({
                    role: 'assistant',
                    content: imgHtml,
                    time: this.getCurrentTime(),
                    isImage: true
                });
                this.scrollToBottom();
            }
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
            this.affection = Math.min(100, this.affection + Math.floor(price / 100));

            // ✨ 保存设定
            this.saveCharacterSettings();

            let sendText = `送你一个${name}（价值 ${price} 元）🎁`;
            if (message) {
                sendText += `\n并留言：${message}`;
            }

            // 合并礼物名+留言进行关键词检测
            const detectText = name + (message ? ' ' + message : '');
            await this.quickSend(sendText);

            // 礼物发送后自动插入图片
            const images = this.generateImageForAction(detectText);
            for (const imgHtml of images) {
                await this.delay(800);
                this.messages.push({
                    role: 'assistant',
                    content: imgHtml,
                    time: this.getCurrentTime(),
                    isImage: true
                });
                this.scrollToBottom();
            }
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

            // 工作时间检查：只存消息，不调AI
            if (this.checkWorkTime()) {
                try {
                    await window.dzmm.chat.insert(null, [
                        { role: 'user', content: text }
                    ]);
                } catch (e) {
                    console.warn('存储消息失败:', e);
                }
                this.sending = false;
                console.log('🏢 工作时间，消息已存储但不回复');
                return;
            }

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

            // 工作时间检查：只存消息，不调AI
            if (this.checkWorkTime()) {
                try {
                    await window.dzmm.chat.insert(null, [
                        { role: 'user', content: text }
                    ]);
                } catch (e) {
                    console.warn('存储消息失败:', e);
                }
                this.sending = false;
                console.log('🏢 工作时间，消息已存储但不回复');
                return;
            }

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

                            // 聊天时有概率增加好感度
                            const roll = Math.random();
                            if (roll < 0.10) {
                                this.affection = Math.min(100, this.affection + 2);
                                this.saveCharacterSettings();
                            } else if (roll < 0.40) {
                                this.affection = Math.min(100, this.affection + 1);
                                this.saveCharacterSettings();
                            }

                            this.scrollToBottom();

                            // ✨ 新增：检测用户消息是否在索要图片
                            const wantPic = /(照片|自拍|看看|发一张|来一张|发个)/.test(userMessage);
                            const hasKeyword = Object.keys(this.bodyKeywords).some(k => userMessage.includes(k));

                            if (wantPic || hasKeyword) {
                                // 模拟发送图片的延迟
                                this.typing = true;
                                await this.delay(1200 + Math.random() * 800);
                                this.typing = false;

                                const images = this.generateImageForAction(userMessage);
                                for (const imgHtml of images) {
                                    await this.delay(500);
                                    this.messages.push({
                                        role: 'assistant',
                                        content: imgHtml,
                                        time: this.getCurrentTime(),
                                        isImage: true
                                    });
                                    this.scrollToBottom();
                                }
                            }
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
