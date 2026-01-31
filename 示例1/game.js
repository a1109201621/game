/**
 * Galgame 恋爱游戏模板
 *
 * 使用 DZMM Chat API 实现自动存档
 *
 * 自定义指南：
 * 1. 角色设置：编辑 character_name、character_image 和 createSystemPrompt()
 * 2. AI 模型：在 requestAIResponse() 中配置 model 参数
 * 3. 游戏机制：在 updateGameState() 中扩展新功能
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

        // 玩家配置
        player_name: '',
        initial_affection: 50,
        relationship: '同学',
        input: '',

        // 角色配置 - 可自定义
        character_name: '小樱',
        character_image: '',

        // 游戏变量
        current_affection: 50,
        current_time: '日',
        current_mood: '普通',
        chat_content: '',

        /**
         * 角色提示词 - 为你的故事自定义这个函数
         */
        createSystemPrompt() {
            return `你是恋爱游戏中的女主角小樱。你必须严格按照以下格式回复，否则游戏将无法运行。

当前状态：
玩家名：${this.player_name || '玩家'}
好感度：${this.current_affection || this.initial_affection}
关系：${this.relationship}
心情：${this.current_mood || '普通'}
时间：${this.current_time || '日'}

【极其重要的格式要求】
你的每个回复都必须严格按照这个模板：

###STATE
{"affection":数字,"mood":"心情词","time":"时间词","summary":"简短总结"}
###END
角色对话内容

【必须遵守的规则】
1. 前三行必须是###STATE、JSON、###END，不能有任何其他内容
2. JSON必须在一行内完成，包含且仅包含这4个字段
3. affection是0-100的数字，根据互动调整±10以内
4. mood只能是：普通、高兴、伤心、害羞、生气之一
5. time只能是：日、夜之一
6. 第4行开始才是角色对话

【正确示例】
用户：早上好
回复：
###STATE
{"affection":52,"mood":"高兴","time":"日","summary":"早安问候"}
###END
早上好呀！今天天气真不错，要一起去上学吗？

【错误示例 - 绝对不要这样】
❌ 把对话写在STATE前面
❌ 把STATE写在对话后面
❌ 不写STATE
❌ JSON格式错误

记住：如果不按格式输出，游戏会崩溃！`;
        },

        /**
         * 开始游戏
         */
        async start() {
            this.current_affection = this.initial_affection;
            this.started = true;
            this.next();
        },

        /**
         * 初始化
         */
        async init() {
            this.loading = true;
            await dzmmReady;
            await this.restoreProgress();
            this.loading = false;
        },

        /**
         * 发送消息
         */
        async next() {
            this.disabled = true;
            try {
                const userMessage = this.input;
                this.input = '';
                this.chat_content = '<span class="loading">...</span>';
                await this.requestAIResponse(userMessage);
            } finally {
                this.disabled = false;
            }
        },

        /**
         * 请求 AI 回复
         */
        async requestAIResponse(userMessage) {
            let content = '';

            // 从 chat API 读取所有历史消息
            const chatHistory = await window.dzmm.chat.list();

            // 构建 messages 数组：系统提示词 + 历史对话 + 新用户消息
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

            await window.dzmm.completions(
                { model: 'nalang-xl-0826-10k', messages, maxTokens: 1500 },
                async (newContent, done) => {
                    content = newContent;
                    const parsed = this.parseAIResponse(content);

                    if (parsed.ready) {
                        this.updateGameState(parsed.state);
                        this.chat_content = parsed.dialogue;
                    }

                    if (done && content) {
                        const messagesToSave = [];
                        if (userMessage) {
                            messagesToSave.push({ role: 'user', content: userMessage });
                        }
                        messagesToSave.push({ role: 'assistant', content });
                        await window.dzmm.chat.insert(null, messagesToSave);
                    }
                }
            );
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
                const dialogue = content.slice(endIndex + endMarker.length).trim();
                return { ready: true, state, dialogue };
            } catch (error) {
                console.warn('状态解析失败:', error);
                return { ready: false };
            }
        },

        /**
         * 更新游戏状态
         */
        updateGameState(state) {
            if (typeof state.affection === 'number') {
                this.current_affection = Math.max(0, Math.min(100, state.affection));
            }
            if (state.mood) this.current_mood = state.mood;
            if (state.time) this.current_time = state.time;
        },

        /**
         * 从 chat API 恢复游戏进度
         */
        async restoreProgress() {
            try {
                const messages = await window.dzmm.chat.list();

                if (messages && messages.length > 0) {
                    for (let i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].role === 'assistant') {
                            const parsed = this.parseAIResponse(messages[i].content);
                            if (parsed.ready) {
                                this.updateGameState(parsed.state);
                                this.chat_content = parsed.dialogue;
                                this.started = true;
                                break;
                            }
                        }
                    }

                    if (!this.started && messages.length > 0) {
                        this.started = true;
                    }
                }
            } catch (error) {
                console.warn('读取存档失败:', error);
            }
        }
    });

    queueMicrotask(() => Alpine.store('game').init?.());
});
