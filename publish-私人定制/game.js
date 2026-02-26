// ===== SDK 就绪 =====
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
    setTimeout(() => resolve(), 5000);
});

// ===== Debug 系统 =====
const DebugLog = {
    entries: [],
    maxEntries: 200,

    add(type, data) {
        this.entries.unshift({
            type,
            time: new Date().toLocaleTimeString(),
            data: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
        });
        if (this.entries.length > this.maxEntries) this.entries.pop();
    },

    addPrompt(messages) { this.add('prompt', messages); },
    addResponse(content) { this.add('response', content); },
    addError(err) { this.add('error', err?.message || String(err)); },
    clear() { this.entries = []; },

    getByType(type) {
        if (type === 'all') return this.entries;
        return this.entries.filter(e => e.type === type);
    }
};

// ===== 主游戏逻辑 =====
document.addEventListener('alpine:init', () => {
    Alpine.store('game', {
        // ---------- 状态 ----------
        loading: true,
        started: false,
        sending: false,
        typing: false,
        generating: false,
        generatingSpec: false,


        // ---------- 面板开关 ----------
        showDebug: false,
        showDebugButton: true,
        showSpecPanel: false,
        showStatusBar: true,

        showModelSelect: false,
        showEditModal: false,
        editingIndex: -1,
        editContent: '',
        debugTab: 'all',

        // ---------- Debug按钮拖动 ----------
        debugBtnPos: { x: -1, y: -1 }, // -1表示用默认位置
        _dragging: false,
        _dragOffset: { x: 0, y: 0 },

        // ---------- 模型 ----------
        model: 'x-apex-0212',
        genModel: 'nalang-xl-0826', // 角色生成/特化专用
        allModels: [
            { value: 'x-apex-0212', label: 'Apex-Sigma — 文笔精致' },
            { value: 'x-apex-neo', label: 'Apex-Neo — 叙事细腻' },
            { value: 'x-apex-flux-0217', label: 'Apex-Flux — 节奏明快' },
            { value: 'nalang-turbo-0826', label: 'nalang-turbo — 快速经济' },
            { value: 'nalang-medium-0826', label: 'nalang-medium — 平衡性能' },
            { value: 'nalang-max-0826', label: 'nalang-max — 高质量' },
            { value: 'nalang-xl-0826', label: 'nalang-xl — 最强模型' },
        ],
        highModels: [
            { value: 'nalang-xl-0826', label: 'nalang-xl — 最强模型' },
            { value: 'nalang-max-0826', label: 'nalang-max — 高质量' },
            { value: 'x-apex-0212', label: 'Apex-Sigma — 文笔精致' },
            { value: 'x-apex-neo', label: 'Apex-Neo — 叙事细腻' },
            { value: 'x-apex-flux-0217', label: 'Apex-Flux — 节奏明快' },
        ],

        // ---------- 设置字段 ----------
        playerName: '',
        playerIdentity: '',
        charName: '',
        charIdentity: '',
        charAppearance: '',
        charClothing: '',
        charPersonality: '',
        charBackground: '',
        openingRequirement: '',

        // 防抢话
        antiSteal: false,
        antiStealWordCount: 600,

        // 角色JSON设定
        characterJson: '',

        // ---------- 聊天 ----------
        messages: [],
        input: '',

        // ---------- 状态栏（追踪女主属性） ----------
        heroineStatus: {
            name: '',
            favorability: 50,
            mood: '平静',
            clothing: '未知',
            action: '站立',
            fetish: '未知'
        },

        // ---------- 特化 ----------
        specializations: [],
        presetSpecs: ['口交', '足交', '腋下', '小腹', '手交'],
        presetSpecContents: {
            '口交': `<口交特化>
引导角色对{{user}}进行口交时的详细描写指导：
- 从角色视角描写口腔接触、舌头、唾液的细腻感受
- 重点描写角色的表情、神情变化（羞耻/享受/濡湿）
- 包含角色发出的声音、呻吟、吞咽等细节
- 描写角色鼻腔气息、眼泪等生理反应
- 节奏感要强，从缓慢到急促均有节奏变化
- 将{{user}}的反应和角色内心感受交织描写
</口交特化>`,
            '足交': `<足交特化>
引导角色对{{user}}进行足交时的详细描写指导：
- 详细描写角色脚的外貌（脚趾、脚心、脚踝、肤色）
- 描写角色用脚接触时的细腻触感与温度
- 包含角色足底与{{user}}接触部位的摩擦、夹持等动作细节
- 描写角色的神情：低头窥视、羞涩或挑衅的眼神
- 强调角色脚部汗水或丝袜等细节增强真实感
- 将角色内心的微妙情绪（羞耻/掌控感）融入动作描写中
</足交特化>`,
            '腋下': `<腋下特化>
引导角色与{{user}}进行腋下相关互动的详细描写指导：
- 描写角色腋下的外貌：细嫩/柔软/有汗毛/光滑等细节
- 重点刻画腋下的气息、温热、微汗的感觉
- 描写{{user}}嗅闻、舔舐、摩擦腋下时角色的反应
- 刻画角色因腋下被触碰而产生的酥麻、痒意、颤抖等感受
- 描写角色脸上的羞耻、敏感表情和压抑的声音
- 强调这处敏感带对角色来说的羞耻程度
</腋下特化>`,
            '小腹': `<小腹特化>
引导角色与{{user}}进行小腹相关互动的详细描写指导：
- 描写角色小腹外貌：平坦/微微隆起/细嫩/白皙/柔软
- 重点描写贴触小腹时的温热、柔软触感和轻微的律动
- 描写从外部能感知到内部（子宫/肠道）的律动感
- 当角色被顶到深处时，描写小腹处隐约的凸起或律动
- 刻画角色因子宫受到冲击而体现在小腹上的反应
- 将小腹的感受与角色的全身酥麻、腿软连接起来描写
</小腹特化>`,
            '手交': `<手交特化>
引导角色对{{user}}进行手交时的详细描写指导：
- 描写角色手的外貌：纤细/柔软/白皙/手指修长等细节
- 详细描写握持的力度、温度、以及手指动作的节奏
- 包含角色不同握法和动作（轻柔揉搓、快速摩擦等）
- 描写角色注视着自己手与{{user}}接触时的眼神和表情
- 刻画角色手掌被润滑液弄湿后的细节和反应
- 融入角色内心情绪：技巧感、羞耻感或掌控欲
</手交特化>`
        },
        customSpecInput: '',
        // 编辑特化
        showSpecEditModal: false,
        editingSpecName: '',
        editingSpecContent: '',



        // ---------- 初始化 ----------
        async init() {
            this.loading = true;
            await dzmmReady;

            try {
                const hasData = await this.loadSave();
                if (hasData && this.characterJson) {
                    // 恢复聊天记录
                    await this.restoreChat();
                }
            } catch (e) {
                DebugLog.addError(e);
            }

            this.loading = false;
        },

        skipLoading() {
            this.loading = false;
        },

        // ===== 存档系统 =====
        async saveSetting() {
            try {
                const data = {
                    playerName: this.playerName,
                    playerIdentity: this.playerIdentity,
                    charName: this.charName,
                    charIdentity: this.charIdentity,
                    charAppearance: this.charAppearance,
                    charClothing: this.charClothing,
                    charPersonality: this.charPersonality,
                    charBackground: this.charBackground,
                    openingRequirement: this.openingRequirement,
                    antiSteal: this.antiSteal,
                    antiStealWordCount: this.antiStealWordCount,
                    characterJson: this.characterJson,
                    specializations: this.specializations,
                    model: this.model,
                    genModel: this.genModel,
                    started: this.started,
                    heroineStatus: this.heroineStatus,
                    showDebugButton: this.showDebugButton,
                    debugBtnPos: this.debugBtnPos,
                };
                await window.dzmm.kv.put('game_save', JSON.stringify(data));
                DebugLog.add('response', '存档已保存');
            } catch (e) {
                DebugLog.addError(e);
            }
        },

        async loadSave() {
            try {
                const res = await window.dzmm.kv.get('game_save');
                if (res?.value) {
                    const data = JSON.parse(res.value);
                    Object.keys(data).forEach(k => {
                        if (data[k] !== undefined && k in this) {
                            this[k] = data[k];
                        }
                    });
                    DebugLog.add('response', '存档已恢复');
                    return true;
                }
            } catch (e) {
                DebugLog.addError(e);
            }
            return false;
        },

        async clearAllData() {
            if (!confirm('确定要清除所有数据吗？（包括角色设定和聊天记录）')) return;
            try {
                await window.dzmm.kv.delete('game_save');
                this.playerName = '';
                this.playerIdentity = '';
                this.charName = '';
                this.charIdentity = '';
                this.charAppearance = '';
                this.charClothing = '';
                this.charPersonality = '';
                this.charBackground = '';
                this.openingRequirement = '';
                this.characterJson = '';
                this.specializations = [];
                this.messages = [];
                this.started = false;
                this.antiSteal = false;
                this.antiStealWordCount = 600;
                this.heroineStatus = { name: '', favorability: 50, mood: '平静', clothing: '未知', action: '站立', fetish: '未知' };
                alert('数据已清除！');
            } catch (e) {
                DebugLog.addError(e);
                alert('清除失败');
            }
        },

        // ===== 角色生成 =====
        async generateCharacter() {
            if (this.generating) return;
            if (!this.charName.trim()) {
                alert('请至少填写角色名字');
                return;
            }

            this.generating = true;

            const userInputs = [
                this.playerName && `玩家姓名：${this.playerName}`,
                this.playerIdentity && `玩家身份：${this.playerIdentity}`,
                `角色名字：${this.charName}`,
                this.charIdentity && `身份：${this.charIdentity}`,
                this.charAppearance && `外貌：${this.charAppearance}`,
                this.charClothing && `衣着：${this.charClothing}`,
                this.charPersonality && `性格：${this.charPersonality}`,
                this.charBackground && `背景：${this.charBackground}`,
            ].filter(Boolean).join('\n');

            const prompt = `<Create_a_character>
# 你现在的任务是帮助我设计角色，请根据以下内容进行角色设计：
<default-requirement>
  1.使用<${this.charName}>xml标签包裹角色设定，放在\`\`\`json代码块中
  2.称呼{{user}}为{{user}}，而不是你。
  3.用词下流且色情，不避讳、不隐晦。鸡巴就是鸡巴，屄就是屄，而不是"性器官"！
  4.双引号("双引号")内必须使用单引号('单引号')
  5.避免使用"极度"、"极其"这样的极限词
</default-requirement>
<format-example>
\`\`\`json
<${this.charName}>
{
    "Name": "角色姓名",
    "gender": "填写性别",
    "age": "填写年龄",
    "background": [
        "填写背景描述 1",
        "填写背景描述 2",
        "etc."
    ],
    "appearance": {
        "body_shape": "填写体型",
        "hairstyle": "填写发型及发色",
        "eye_color": "填写眼睛颜色/形状",
        "etc.": "其他外貌描述"
    },
    "voice_traits": {
        "timbre": "填写音色 (如: 清亮, 沙哑)",
        "accent_or_catchphrase": "填写口音或口头禅"
    },
    // 不加固定设定，不写死剧情，只加性格和生理的缺陷锚点，让角色更加生动形象，让玩家更加自由
    "personality": "填写核心性格特质的概括性描述",
    "strengths_weaknesses": {
        "strengths": [
            "填写优点 1",
            "etc."
        ],
        "weaknesses": [
            "填写缺点 1",
            "etc."
        ]
    },
    "NSFW_information": {
        "physical_traits": {
            "breast_size": "填写乳房大小",
            "nipples": "填写乳头描述",
            "pussy": "填写小穴外貌、体毛等描述",
            "anus": "填写肛门描述",
            "etc.": "其他身体特征"
        }
    }
}
</${this.charName}>
\`\`\`
</format-example>

### 写在最后最后，以上的内容不是一成不变的，你可以根据自己的想法进行适当的修改。谢谢！

用户给出的角色信息：
${userInputs}
</Create_a_character>`;

            const messages = [{ role: 'user', content: prompt }];
            DebugLog.addPrompt(messages);

            try {
                let content = '';
                await window.dzmm.completions({
                    model: this.genModel,
                    messages,
                    maxTokens: 2000,
                    temperature: 0.8
                }, (chunk, done) => {
                    content = chunk;
                    if (done) {
                        DebugLog.addResponse(content);
                        this.characterJson = content;
                        this.generating = false;
                        this.saveSetting();
                    }
                });
            } catch (e) {
                DebugLog.addError(e);
                alert('角色生成失败，请重试');
                this.generating = false;
            }
        },

        // ===== 开始游戏 =====
        async start() {
            if (!this.charName.trim()) {
                alert('请至少填写角色名字');
                return;
            }
            if (!this.characterJson) {
                alert('请先生成角色设定');
                return;
            }

            this.started = true;
            this.messages = [];
            this.heroineStatus.name = this.charName;
            if (this.charClothing) this.heroineStatus.clothing = this.charClothing;
            await this.saveSetting();

            // 发送开场白
            this.typing = true;
            const openingPrompt = this.openingRequirement
                ? `（开始扮演角色，根据以下要求说开场白：${this.openingRequirement}）`
                : '（开始扮演角色，以角色的口吻自然地和{{user}}打招呼）';
            await this.requestAI(openingPrompt, true);
            this.typing = false;
        },

        backToSetup() {
            if (this.messages.length > 0 && !confirm('返回会保留角色设定，但聊天记录将清空，确定吗？')) return;
            this.started = false;
            this.messages = [];
            this.saveSetting();
        },

        // ===== 提示词构建 =====
        buildSystemPrompt() {
            let prompt = `${this.characterJson}

以下为角色扮演指令：
你将扮演上述角色设定中的角色与{{user}}互动。
{{user}}的称呼：${this.playerName || '主人'}
{{user}}的身份：${this.playerIdentity || '普通人'}
请严格按照角色的性格和说话方式来回应。`;

            // 特化
            if (this.specializations.length > 0) {
                prompt += '\n\n以下为特化指令：\n';
                this.specializations.forEach(s => {
                    prompt += s.content + '\n';
                });
            }

            // 字数限制（始终生效）
            prompt += `\n\n生成的字数不得少于${this.antiStealWordCount}字`;

            // 防抢话（仅当开启时）
            if (this.antiSteal) {
                prompt += `\n\n<Prohibition_of_substitution_{{user}}>
以下内容为行最高优先级：
-只能描写除了{{user}}以外的其他所有人物角色、生命体、人、事、物、环境等，禁止代替{{user}}进行任何语言、行动或是心理想法等描写。
-不要出现前文已有内容，每次输出前都要确保与上文不同，保证每次回复时输出的内容都与已输出过的内容不重复，确保每次回复时输出的内容充满新意、新鲜感、使用不同的词汇、不重复的表达。
</Prohibition_of_substitution_{{user}}>`;
            }

            // 状态栏指令
            prompt += `

<status_tracking>
每次回复结束后，请在回复末尾用以下格式输出角色当前状态（这部分不会显示给用户）：
<status_update>
favorability:数字(0-100)
mood:心情描述
clothing:当前衣着
action:当前动作/姿态
fetish:已发现的性癖/敏感点
</status_update>
注意：favorability请根据剧情发展合理变化，不要每次都增加。mood、clothing、action请用简短中文描述。
</status_tracking>`;

            return prompt;
        },

        // ===== AI 请求 =====
        async requestAI(userMessage, isSystem = false) {
            let content = '';
            try {
                // 获取历史
                let history = [];
                try {
                    history = await window.dzmm.chat.list();
                    if (!Array.isArray(history)) history = [];
                } catch (e) {
                    DebugLog.addError({ msg: 'chat.list failed', err: e?.message });
                }

                const systemPrompt = this.buildSystemPrompt();
                const messages = [
                    { role: 'user', content: systemPrompt },
                    ...history.map(m => ({ role: m.role, content: m.content })),
                    { role: 'user', content: userMessage }
                ];

                DebugLog.addPrompt(messages);

                await window.dzmm.completions({
                    model: this.model,
                    messages,
                    maxTokens: 2400,
                    temperature: 0.9
                }, async (chunk, done) => {
                    content = chunk;
                    if (done && content) {
                        content = content.trim();
                        DebugLog.addResponse(content);

                        // 解析状态更新
                        const statusContent = this.parseStatusUpdate(content);
                        const cleanContent = statusContent.clean;

                        // 保存到chat存档
                        try {
                            await window.dzmm.chat.insert(null, [
                                { role: 'user', content: userMessage },
                                { role: 'assistant', content: cleanContent }
                            ]);
                        } catch (e) {
                            DebugLog.addError({ msg: 'chat.insert failed', err: e?.message });
                        }

                        this.messages.push({
                            role: 'assistant',
                            content: cleanContent,
                            time: this.getTime()
                        });
                        this.scrollToBottom();
                        this.saveSetting();
                    }
                });
            } catch (e) {
                DebugLog.addError(e);
                this.messages.push({
                    role: 'system',
                    content: '⚠️ AI请求失败: ' + (e?.message || '网络错误'),
                    time: this.getTime()
                });
            }
        },

        // ===== 发送消息 =====
        async send() {
            const text = this.input.trim();
            if (!text || this.sending) return;

            this.input = '';
            this.sending = true;

            this.messages.push({
                role: 'user',
                content: text,
                time: this.getTime()
            });
            this.scrollToBottom();

            await this.delay(300);
            this.typing = true;
            await this.requestAI(text);
            this.typing = false;
            this.sending = false;
        },

        // ===== 消息操作 =====
        openEdit(index) {
            this.editingIndex = index;
            this.editContent = this.messages[index].content;
            this.showEditModal = true;
        },

        saveEdit() {
            if (this.editingIndex >= 0 && this.editingIndex < this.messages.length) {
                this.messages[this.editingIndex].content = this.editContent;
            }
            this.showEditModal = false;
            this.editingIndex = -1;
        },

        deleteMessage(index) {
            if (!confirm('确定删除这条消息？')) return;
            this.messages.splice(index, 1);
        },

        async regenerateLatest() {
            if (this.sending) return;
            // 找最后一条assistant
            let lastIdx = -1;
            for (let i = this.messages.length - 1; i >= 0; i--) {
                if (this.messages[i].role === 'assistant') {
                    lastIdx = i;
                    break;
                }
            }
            if (lastIdx === -1) return;

            // 找到对应的user消息
            let userMsg = '';
            for (let i = lastIdx - 1; i >= 0; i--) {
                if (this.messages[i].role === 'user') {
                    userMsg = this.messages[i].content;
                    break;
                }
            }
            if (!userMsg) return;

            // 删除最后的assistant消息
            this.messages.splice(lastIdx, 1);

            this.sending = true;
            this.typing = true;
            await this.requestAI(userMsg);
            this.typing = false;
            this.sending = false;
        },

        isLatestAssistant(index) {
            for (let i = this.messages.length - 1; i >= 0; i--) {
                if (this.messages[i].role === 'assistant') {
                    return i === index;
                }
            }
            return false;
        },

        // ===== 状态解析 =====
        parseStatusUpdate(content) {
            const statusRegex = /<status_update>([\s\S]*?)<\/status_update>/;
            const match = content.match(statusRegex);
            let clean = content.replace(/<status_tracking>[\s\S]*?<\/status_tracking>/g, '').replace(/<status_update>[\s\S]*?<\/status_update>/g, '').trim();

            if (match) {
                const block = match[1];
                const getVal = (key) => {
                    const m = block.match(new RegExp(key + '[:：]\\s*(.+)'));
                    return m ? m[1].trim() : null;
                };
                const fav = getVal('favorability');
                if (fav) this.heroineStatus.favorability = Math.max(0, Math.min(100, parseInt(fav) || this.heroineStatus.favorability));
                const mood = getVal('mood');
                if (mood) this.heroineStatus.mood = mood;
                const clothing = getVal('clothing');
                if (clothing) this.heroineStatus.clothing = clothing;
                const action = getVal('action');
                if (action) this.heroineStatus.action = action;
                const fetish = getVal('fetish');
                if (fetish) this.heroineStatus.fetish = fetish;
                DebugLog.add('response', '状态更新: ' + JSON.stringify(this.heroineStatus));
            }
            return { clean };
        },

        // ===== 特化系统 =====
        isSpecAdded(name) {
            return this.specializations.some(s => s.name === name);
        },

        addPresetSpec(name) {
            if (this.isSpecAdded(name)) {
                this.removeSpec(name);
                return;
            }

            if (this.specializations.length >= 3 && !confirm('⚠️ 因为AI上下文窗口限制，过多的特化会增加积分的消耗。确定要继续添加吗？')) {
                return;
            }

            const content = this.presetSpecContents[name] || `<${name}特化>\n${name}特化内容\n</${name}特化>`;
            this.specializations.push({ name, content });
            this.saveSetting();
        },

        // 打开特化编辑弹窗
        editSpec(name) {
            const sp = this.specializations.find(s => s.name === name);
            if (!sp) return;
            this.editingSpecName = name;
            this.editingSpecContent = sp.content;
            this.showSpecEditModal = true;
        },

        saveSpecEdit() {
            const sp = this.specializations.find(s => s.name === this.editingSpecName);
            if (sp) {
                sp.content = this.editingSpecContent;
                this.saveSetting();
            }
            this.showSpecEditModal = false;
            this.editingSpecName = '';
            this.editingSpecContent = '';
        },

        async addCustomSpec() {
            const input = this.customSpecInput.trim();
            if (!input || this.generatingSpec) return;

            if (this.specializations.length >= 3 && !confirm('⚠️ 因为AI上下文窗口限制，过多的特化会增加积分的消耗。确定要继续添加吗？')) {
                return;
            }

            this.generatingSpec = true;
            const prompt = `使用yaml格式输出<${input}特化>,用以指导ai进行创作,每个特化不要超过500中文汉字!!!

格式:
\`\`\`yaml
<${input}特化>
特化内容
</${input}特化>
\`\`\`

请根据"${input}"这个主题/要求生成具体、详细的特化指导内容。`;

            const messages = [{ role: 'user', content: prompt }];
            DebugLog.addPrompt(messages);

            try {
                let content = '';
                await window.dzmm.completions({
                    model: this.genModel,
                    messages,
                    maxTokens: 800,
                    temperature: 0.7
                }, (chunk, done) => {
                    content = chunk;
                    if (done) {
                        DebugLog.addResponse(content);
                        this.specializations.push({
                            name: input,
                            content: content.trim()
                        });
                        this.customSpecInput = '';
                        this.generatingSpec = false;
                        this.saveSetting();
                    }
                });
            } catch (e) {
                DebugLog.addError(e);
                alert('特化生成失败');
                this.generatingSpec = false;
            }
        },

        removeSpec(name) {
            this.specializations = this.specializations.filter(s => s.name !== name);
            this.saveSetting();
        },



        // ===== 恢复聊天记录 =====
        async restoreChat() {
            try {
                const history = await window.dzmm.chat.list();
                if (history && history.length > 0) {
                    this.messages = history.map(m => ({
                        role: m.role,
                        content: m.content,
                        time: ''
                    }));
                    setTimeout(() => this.scrollToBottom(), 100);
                }
            } catch (e) {
                DebugLog.addError(e);
            }
        },

        // ===== 格式化 =====
        formatMessage(content) {
            if (!content) return '';
            let text = content.trim();
            // 如果包含img标签则直接返回
            if (text.includes('<img ')) return text;
            // 简单转换换行
            text = text.replace(/\n/g, '<br>');
            return text;
        },

        getTime() {
            const now = new Date();
            return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        },

        scrollToBottom() {
            setTimeout(() => {
                const area = document.querySelector('.messages-area');
                if (area) area.scrollTop = area.scrollHeight;
            }, 60);
        },

        delay(ms) {
            return new Promise(r => setTimeout(r, ms));
        },

        // ===== Debug =====
        getDebugEntries() {
            return DebugLog.getByType(this.debugTab);
        },

        clearDebug() {
            DebugLog.clear();
        },

        // ===== Debug 拖动 =====
        initDebugDrag() {
            const btn = document.querySelector('.debug-toggle');
            if (!btn) return;

            let startX, startY, moved;

            const onStart = (e) => {
                if (this._dragging) return;
                const touch = e.touches ? e.touches[0] : e;
                const rect = btn.getBoundingClientRect();
                startX = touch.clientX;
                startY = touch.clientY;
                this._dragOffset = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
                moved = false;

                const onMove = (e2) => {
                    const t = e2.touches ? e2.touches[0] : e2;
                    const dx = Math.abs(t.clientX - startX);
                    const dy = Math.abs(t.clientY - startY);
                    if (dx > 5 || dy > 5) moved = true;
                    if (!moved) return;
                    e2.preventDefault();
                    this._dragging = true;
                    btn.classList.add('dragging');
                    let nx = t.clientX - this._dragOffset.x;
                    let ny = t.clientY - this._dragOffset.y;
                    // 边界限制
                    nx = Math.max(0, Math.min(window.innerWidth - 36, nx));
                    ny = Math.max(0, Math.min(window.innerHeight - 36, ny));
                    btn.style.left = nx + 'px';
                    btn.style.top = ny + 'px';
                    btn.style.right = 'auto';
                    this.debugBtnPos = { x: nx, y: ny };
                };

                const onEnd = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onEnd);
                    document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('touchend', onEnd);
                    setTimeout(() => {
                        this._dragging = false;
                        btn.classList.remove('dragging');
                    }, 50);
                    if (moved) this.saveSetting();
                };

                document.addEventListener('mousemove', onMove, { passive: false });
                document.addEventListener('mouseup', onEnd);
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('touchend', onEnd);
            };

            btn.addEventListener('mousedown', onStart);
            btn.addEventListener('touchstart', onStart, { passive: true });

            // 恢复位置
            if (this.debugBtnPos.x >= 0) {
                btn.style.left = this.debugBtnPos.x + 'px';
                btn.style.top = this.debugBtnPos.y + 'px';
                btn.style.right = 'auto';
            }
        },

        toggleDebug() {
            if (this._dragging) return;
            this.showDebug = !this.showDebug;
        },

        hideDebugButton() {
            this.showDebugButton = false;
            this.showDebug = false;
            this.saveSetting();
        },

        restoreDebugButton() {
            this.showDebugButton = true;
            this.saveSetting();
        }
    });

    queueMicrotask(() => {
        Alpine.store('game').init?.();
        // 初始化拖动
        setTimeout(() => Alpine.store('game').initDebugDrag(), 200);
    });
});
