/**
 * Tag 系统互动游戏
 * 
 * 玩家可以探索世界，遇到 NPC 后可以查看和修改其 Tag
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

        // 当前交互的 NPC (动态创建)
        currentNpc: null,

        // 界面状态
        showTagPanel: false,
        tagChanged: false,
        messages: [],

        // 存档状态
        hasSave: false,
        saveToast: false,

        // 当前模型
        currentModel: 'nalang-xl-0826',

        // 自定义输入状态
        customInputs: {
            personality: false,
            profession: false,
            hobby: false,
            attitude: false,
            mood: false
        },
        customValues: {
            personality: '',
            profession: '',
            hobby: '',
            attitude: '',
            mood: ''
        },
        originalTags: null, // 记录修改前的 Tag

        // 预设选项
        presetOptions: {
            personality: ['开朗', '内向', '冷漠', '热情', '傲娇', '温柔', '病娇', '天然呆'],
            profession: ['学生', '老师', 'OL', '偶像', '护士', '女仆', '画家', '作家'],
            hobby: ['阅读', '绘画', '音乐', '游戏', '运动', '烹饪', '独处', '社交'],
            attitude: ['友好', '冷淡', '好奇', '警惕', '亲密', '崇拜', '敌意'],
            mood: ['普通', '高兴', '伤心', '害羞', '生气', '紧张', '兴奋']
        },

        /**
         * 检查当前 Tag 值是否为自定义值
         */
        isCustomValue(tagType) {
            if (!this.currentNpc) return false;
            const currentValue = this.currentNpc.tags[tagType];
            const presets = this.presetOptions[tagType];
            return currentValue && !presets.includes(currentValue);
        },

        /**
         * 生成系统提示词
         */
        createSystemPrompt() {
            let npcInfo = '';
            if (this.currentNpc) {
                const tags = this.currentNpc.tags;
                npcInfo = `
【当前NPC信息】
姓名：${this.currentNpc.name}
性格：${tags.personality}
职业：${tags.profession}
爱好：${tags.hobby}
对${this.player_name}的态度：${tags.attitude}
当前心情：${tags.mood}

【NPC行为规则】
NPC的言行必须完全符合上述Tag设定：
- 性格"${tags.personality}"决定说话方式和反应模式
- 职业"${tags.profession}"影响知识背景和话题
- 爱好"${tags.hobby}"是经常提起的兴趣
- 态度"${tags.attitude}"决定对玩家的亲疏
- 心情"${tags.mood}"影响当前情绪状态`;
            }

            return `你是一个互动小说游戏的叙述者AI。玩家名叫${this.player_name}，拥有特殊能力可以修改NPC的Tag。

【回复格式要求】
每次回复必须严格遵循此格式：

###STATE
{"npc_name":"NPC名字或null","mood":"心情词","personality":"性格","profession":"职业","hobby":"爱好","attitude":"态度","summary":"简短总结"}
###END
叙述内容

【格式规则】
1. 前三行必须是 ###STATE、JSON、###END
2. JSON 必须在一行内
3. 如果场景中出现新NPC，填写npc_name和其他属性；如果只是环境描述，npc_name填null
4. 第4行开始是叙述内容
5. NPC名字要有寓意，禁止"小xx"、"阿xx"或叠词
6. mood 可选：普通、高兴、伤心、害羞、生气、紧张、兴奋
7. personality 可选：开朗、内向、冷漠、热情、傲娇、温柔、病娇、天然呆
8. profession 可选：学生、老师、OL、偶像、护士、女仆、画家、作家
9. hobby 可选：阅读、绘画、音乐、游戏、运动、烹饪、独处、社交
10. attitude 可选：友好、冷淡、好奇、警惕、亲密、崇拜、敌意
${npcInfo}

【场景描写要求】
- 描写要生动有画面感
- 使用*包围动作和环境描写
- 对话用引号包围
- 如果玩家想去某地或找某人，自然地引导相遇
- 玩家的Tag修改后，NPC会自然地表现出来，不需要特意说明
- 每次回复的正文部分不少于600字

【禁止事项】
❌ 不要提及 Tag 系统的存在
❌ 不要让NPC知道自己被设定
❌ 保持沉浸感`;
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
            this.currentNpc = null;

            // 显示开场白
            const openingText = `*你睁开眼睛，发现自己站在一个陌生的十字路口*

阳光温暖地洒落在街道上，周围是熙熙攘攘的人群。你突然意识到，自己拥有一种特殊的能力——可以看到并修改他人内心深处的"Tag"。

这里是一座繁华的都市。向北是商业街，向东是学园区，向南是住宅区，向西是公园。

*你可以输入想去的地方，或者描述你想遇见什么样的人*`;

            this.messages.push({
                role: 'assistant',
                speaker: '旁白',
                content: this.formatContent(openingText)
            });

            this.scrollToBottom();
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
                // 检查是否有存档
                await this.checkSave();
                await this.restoreProgress();
            } catch (e) {
                console.warn('初始化超时或失败:', e);
            }
            this.loading = false;
        },

        /**
         * 检查是否有存档
         */
        async checkSave() {
            try {
                const saveData = await window.dzmm.kv.get('game_save');
                this.hasSave = !!(saveData && saveData.value);
            } catch (e) {
                console.warn('检查存档失败:', e);
                this.hasSave = false;
            }
        },

        /**
         * 保存游戏
         */
        async saveGame() {
            if (this.disabled) return;

            try {
                const saveData = {
                    player_name: this.player_name,
                    currentNpc: this.currentNpc,
                    messages: this.messages,
                    timestamp: Date.now()
                };

                await window.dzmm.kv.put('game_save', saveData);

                // 显示保存成功提示
                this.saveToast = true;
                setTimeout(() => {
                    this.saveToast = false;
                }, 2000);

                this.hasSave = true;
            } catch (e) {
                console.error('保存失败:', e);
            }
        },

        /**
         * 读取存档
         */
        async loadSave() {
            try {
                const result = await window.dzmm.kv.get('game_save');
                if (result && result.value) {
                    const saveData = result.value;
                    this.player_name = saveData.player_name;
                    this.currentNpc = saveData.currentNpc;
                    this.messages = saveData.messages || [];
                    this.started = true;
                    this.scrollToBottom();
                }
            } catch (e) {
                console.error('读取存档失败:', e);
            }
        },

        /**
         * 发送消息
         */
        async send() {
            if (!this.input.trim() || this.disabled) return;

            const userMessage = this.input.trim();
            this.input = '';

            // 添加用户消息到界面
            this.messages.push({
                role: 'user',
                content: userMessage
            });

            // 滚动到底部
            this.scrollToBottom();

            // 请求 AI 回复
            await this.requestAIResponse(userMessage);
        },

        /**
         * 选择 Tag 时的回调
         */
        onTagSelect(tagType, event) {
            const value = event.target.value;
            if (value === '__custom__') {
                // 显示自定义输入框，保留之前的自定义值或清空
                this.customInputs[tagType] = true;
                // 如果之前有自定义值就保留，否则用当前值
                if (!this.customValues[tagType]) {
                    this.customValues[tagType] = '';
                }
                // 聚焦到输入框
                setTimeout(() => {
                    const input = document.querySelector(`.tag-item input[placeholder*="${tagType === 'personality' ? '性格' : tagType === 'profession' ? '职业' : tagType === 'hobby' ? '爱好' : tagType === 'attitude' ? '态度' : '心情'}"]`);
                    if (input) input.focus();
                }, 50);
            } else {
                this.customInputs[tagType] = false;
                this.customValues[tagType] = '';
                this.onTagChange();
            }
        },

        /**
         * 应用自定义 Tag 值
         */
        applyCustomTag(tagType) {
            const value = this.customValues[tagType]?.trim();
            if (value) {
                this.currentNpc.tags[tagType] = value;
                this.customInputs[tagType] = false;
                this.onTagChange();
            } else {
                // 如果输入为空，恢复下拉菜单显示当前值
                this.customInputs[tagType] = false;
            }
        },

        /**
         * Tag 变更回调
         */
        onTagChange() {
            this.tagChanged = true;
        },

        /**
         * 应用 Tag 修改，让 AI 生成反应
         */
        async applyTagChanges() {
            if (!this.currentNpc || !this.tagChanged) return;

            this.tagChanged = false;
            this.showTagPanel = false;

            // 构建修改描述
            const tags = this.currentNpc.tags;
            const prompt = `（系统：玩家使用能力修改了${this.currentNpc.name}的Tag。现在她的属性变为：性格=${tags.personality}，职业=${tags.profession}，爱好=${tags.hobby}，态度=${tags.attitude}，心情=${tags.mood}。请根据新的Tag描写${this.currentNpc.name}的变化和反应，她本人不知道自己被修改了，但性格和行为会自然地发生变化）`;

            await this.requestAIResponse(prompt);
        },

        /**
         * 请求 AI 回复
         */
        async requestAIResponse(userMessage) {
            this.disabled = true;
            this.streaming = true;
            this.streamContent = '';

            try {
                // 从 chat API 读取历史消息
                let chatHistory = [];
                try {
                    chatHistory = await window.dzmm.chat.list() || [];
                } catch (e) {
                    console.warn('读取历史失败:', e);
                }

                // 构建 messages 数组
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

                let fullContent = '';

                await window.dzmm.completions(
                    { model: this.currentModel, messages, maxTokens: 1500 },
                    async (content, done) => {
                        fullContent = content;
                        const parsed = this.parseAIResponse(content);

                        if (parsed.ready) {
                            this.updateGameState(parsed.state);
                            this.streamContent = parsed.dialogue;
                        } else {
                            this.streamContent = this.formatContent(content) || '<span class="loading">思考中...</span>';
                        }

                        this.scrollToBottom();

                        if (done && fullContent) {
                            this.streaming = false;
                            const finalParsed = this.parseAIResponse(fullContent);

                            this.messages.push({
                                role: 'assistant',
                                speaker: this.currentNpc?.name || '旁白',
                                content: finalParsed.ready ? finalParsed.dialogue : this.formatContent(fullContent)
                            });

                            // 保存到 chat API
                            try {
                                const messagesToSave = [];
                                if (userMessage) {
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
                this.streaming = false;
                this.messages.push({
                    role: 'assistant',
                    speaker: '旁白',
                    content: '*一阵微风吹过，周围的声音变得模糊...*<br><br>（系统提示：AI 响应失败，请稍后重试）'
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
                // 格式化文本
                dialogue = this.formatContent(dialogue);
                return { ready: true, state, dialogue };
            } catch (error) {
                console.warn('状态解析失败:', error);
                return { ready: false };
            }
        },

        /**
         * 格式化内容 - 将 *text* 转换为斜体样式
         */
        formatContent(text) {
            if (!text) return text;

            // 将换行转为 <br>
            text = text.replace(/\n/g, '<br>');

            // 将 *text* 转换为斜体样式
            text = text.replace(/\*([^*]+)\*/g, '<font color=#00BFFF>$1</font>');

            // 将 「text」或 "text" 转换为带样式的对话
            text = text.replace(/「([^」]+)」/g, '<span style="color:#fbbf24">「$1」</span>');
            text = text.replace(/"([^"]+)"/g, '<span style="color:#fbbf24">"$1"</span>');

            return text;
        },

        /**
         * 更新游戏状态
         */
        updateGameState(state) {
            // 如果有新 NPC 出现
            if (state.npc_name && state.npc_name !== 'null') {
                if (!this.currentNpc || this.currentNpc.name !== state.npc_name) {
                    // 创建新 NPC
                    this.currentNpc = {
                        name: state.npc_name,
                        tags: {
                            personality: state.personality || '普通',
                            profession: state.profession || '路人',
                            hobby: state.hobby || '散步',
                            attitude: state.attitude || '友好',
                            mood: state.mood || '普通'
                        }
                    };
                } else {
                    // 更新现有 NPC 心情
                    if (state.mood) this.currentNpc.tags.mood = state.mood;
                }
            }
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
                                speaker: parsed.state?.npc_name || '旁白',
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
        }
    });

    queueMicrotask(() => Alpine.store('game').init?.());
});
