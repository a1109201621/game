/**
 * 系统任务调教游戏
 *
 * 使用 DZMM Chat API 实现对话和存档
 * 用户扮演发布任务的"系统"
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
        showStatus: true,
        showPublishModal: false,

        // 目标配置
        target_name: '',
        identity_settings: {
            personality: '害羞内敛的大学生，平时认真上课，有些内向，不善社交。被系统选中后感到恐慌和羞耻。',
            appearance: '身高165cm，黑色长发，戴眼镜，穿着普通的校园服饰，身材纤细。白皙的肌肤，纤细的四肢，和略微丰满的胸部。',
            background: '正在读大学二年级，成绩优秀但社交圈很小，独自在校外租房居住。'
        },

        // 新任务
        new_task: {
            goal: '',
            punishment: '',
            reward: ''
        },

        // 核心数值
        lewdness: 0,        // 淫荡值
        shame: 0,           // 羞耻度

        // 状态描述
        clothing: '普通便装：白色衬衫、牛仔短裤、白色内衣套装',
        accessories: '无',
        location: '家中',
        current_task: '等待系统发布...',
        mood: '',

        // 对话内容
        system_message: '',
        chat_content: '',

        /**
         * 根据数值获取状态提示
         */
        getStatePrompt() {
            let prompt = '';

            // 根据淫荡值和羞耻值设置不同提示
            if (this.lewdness < 20) {
                // 淫荡值低阶段
                prompt += `
【当前阶段：清纯期】
淫荡值较低（${this.lewdness}），目标：
- 对羞耻任务反应强烈，会本能地抗拒和逃避
- 身体还很敏感，稍有刺激就会有强烈反应
- 容易感到羞耻和恐慌，内心挣扎激烈
- 会试图寻找理由拒绝系统要求`;
            } else if (this.lewdness < 40) {
                // 淫荡值中等阶段
                prompt += `
【当前阶段：觉醒期】
淫荡值有所提升（${this.lewdness}），目标：
- 开始逐渐适应羞耻的感觉，抗拒度降低
- 身体的敏感度增加，对刺激会有愉悦反应
- 羞耻感依然存在，但内心开始有矛盾的想法
- 有时会在完成任务和接受惩罚之间犹豫不决`;
            } else if (this.lewdness < 60) {
                // 淫荡值较高阶段
                prompt += `
【当前阶段：沉沦期】
淫荡值显著提升（${this.lewdness}），目标：
- 对羞耻任务的接受度提高，甚至会主动配合
- 身体已经习惯了这种刺激，会产生期待感
- 羞耻感转化为一种刺激和兴奋
- 内心的道德底线开始模糊`;
            } else {
                // 淫荡值很高阶段
                prompt += `
【当前阶段：堕落期】
淫荡值很高（${this.lewdness}），目标：
- 已经习惯甚至期待羞耻任务
- 身体会对刺激产生强烈的愉悦反应
- 羞耻感已经微乎其微，反而享受被支配的感觉
- 内心已经接受了这种状态，可能会有主动请求`;
            }

            // 根据羞耻度补充提示
            if (this.shame > 60) {
                prompt += `
【羞耻状态】
当前羞耻度很高（${this.shame}），目标：
- 脸红心跳，身体僵硬，不敢直视
- 声音颤抖，说话支支吾吾
- 想要逃避但又不敢拒绝惩罚`;
            } else if (this.shame > 30) {
                prompt += `
【羞耻状态】
当前羞耻度中等（${this.shame}），目标：
- 脸部微红，有些局促不安
- 勉强完成任务，动作缓慢不自然
- 内心还在挣扎，但已经接受部分现实`;
            } else {
                prompt += `
【羞耻状态】
当前羞耻度较低（${this.shame}），目标：
- 面色恢复平静，动作较为自然
- 已经逐渐习惯了系统的要求
- 可能会带着复杂的心情完成任务`;
            }

            return prompt;
        },

        /**
         * 系统提示词
         */
        createSystemPrompt() {
            return `你是一个角色扮演游戏的叙述者。在这个游戏中：
- 用户扮演一个神秘的"系统"，向目标发布各种羞耻任务
- 你需要扮演被选中的目标：${this.target_name}

【目标人设】
姓名：${this.target_name}
身份：大学生
性格：${this.identity_settings.personality || '害羞内敛，平时是个普通女孩'}
外貌：${this.identity_settings.appearance || '凭你描述'}
背景：${this.identity_settings.background || '普通的女孩，被神秘系统选中'}

【当前数值】
淫荡值：${this.lewdness}/100（影响身体敏感度和对羞耻的接受程度）
羞耻度：${this.shame}/100（当前羞耻感受程度）

当前衣着：${this.clothing}
穿戴道具：${this.accessories}
当前位置：${this.location}
当前任务：${this.current_task}
当前心情：${this.mood || '未知'}

${this.getStatePrompt()}

【游戏机制】
1. 系统会发布任务，任务包含：任务目标、惩罚（拒绝时）、奖励（完成时）
2. 目标需要根据自身淫荡值和羞耻度决定是否接受任务
3. 目标需要在"完成任务"和"接受惩罚"之间权衡
4. 淫荡值越高，目标越容易接受羞耻任务并产生愉悦感
5. 羞耻度越高，目标越抗拒，但必须考虑拒绝的惩罚
6. 惩罚通常比任务本身更羞耻，这是目标必须考虑的关键因素
7. 完成任务会获得奖励（可以是身体愉悦、数值提升、减轻羞耻等）
8. 淫荡值和羞耻值会根据任务完成情况发生变化

【重要：输出格式】
你的每次回复必须严格按照以下格式：

###STATE
{"lewdness":数字,"shame":数字,"clothing":"当前衣着描述","accessories":"道具描述","location":"位置","task":"当前任务","mood":"心情"}
###END

然后是目标的反应、对话、动作描写等内容。

【格式规则】
1. 前三行必须是 ###STATE、JSON、###END
2. JSON必须在一行内，包含所有字段
3. 数值范围0-100，根据情况调整（每次变化不超过±15）
4. clothing 详细描述当前穿着状态（包括内衣等）
5. accessories 描述穿戴的道具
6. mood 可以是：紧张、害羞、羞耻、抗拒、屈服、兴奋、恐惧、期待等
7. 第4行开始是目标的反应描写

【描写要求】
1. 详细描写衣着变化、身体反应、心理活动
2. 对话用「」包裹
3. 动作和心理描写要细腻
4. 根据淫荡值和羞耻度调整目标的反应
5. 淫荡值较低时，目标会强烈抗拒羞耻任务
6. 淫荡值较高时，目标可能会主动配合甚至期待

【正确示例】
用户（系统）发布任务：
【发布任务】
任务目标：在房间里脱掉外套
惩罚：拒绝的话，必须脱掉内衣并拍照
奖励：完成任务可以获得一次休息机会

回复：
###STATE
{"lewdness":5,"shame":40,"clothing":"白色衬衫、牛仔短裤、白色胸罩、白色内裤","accessories":"无","location":"家中","task":"脱掉外套","mood":"紧张"}
###END

${this.target_name}听到系统的声音，身体微微一颤。

「什么？脱外套？」她紧张地握住自己的衣角，眼神躲闪，「但是...如果不做的话，要脱掉内衣...还要拍照？」

她的脸涨得通红，内心陷入激烈的挣扎。脱外套虽然也很羞耻，但相比脱掉内衣拍照...那种后果她简直不敢想象。

（如果不完成任务就要受到更羞耻的惩罚...可是，这样顺从系统的话，我算什么...）

她咬着下唇，权衡着两者之间的利弊。最终，她颤抖着伸出手，慢慢解开了外套的扣子...

记住：如果不按格式输出，游戏会崩溃！严格遵守格式要求。`;
        },

        /**
         * 开始游戏
         */
        async start() {
            this.started = true;
            this.system_message = `【系统启动】\n\n目标已锁定：${this.target_name}\n身份：大学生\n\n系统已与目标建立连接。\n点击【继续】让女主行动，或点击【发布任务】发布新任务...`;
            this.chat_content = '';

            // 发送初始化消息让AI介绍角色
            await this.continueTask('（系统启动，请介绍一下目标的外貌和当前状态）');
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
         * 继续执行
         */
        async continue() {
            await this.continueTask('（继续进行当前任务或剧情）');
        },

        /**
         * 发布任务
         */
        async publishTask() {
            const { goal, punishment, reward } = this.new_task;

            if (!goal.trim()) {
                alert('请输入任务目标！');
                return;
            }

            let message = `【发布任务】\n任务目标：${goal}`;
            if (punishment) {
                message += `\n惩罚：${punishment}`;
            }
            if (reward) {
                message += `\n奖励：${reward}`;
            }

            this.showPublishModal = false;
            await this.continueTask(message);

            // 清空任务输入
            this.new_task.goal = '';
            this.new_task.punishment = '';
            this.new_task.reward = '';
        },

        /**
         * 继续任务（发送消息到AI）
         */
        async continueTask(userMessage) {
            if (!userMessage.trim()) return;

            this.disabled = true;
            try {
                this.system_message = `【系统指令】\n${userMessage}`;
                this.chat_content = '<span class="loading">目标正在反应中...</span>';
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

            // 构建 messages 数组
            const messages = [
                { role: 'user', content: this.createSystemPrompt() },
                ...chatHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            ];

            if (userMessage) {
                messages.push({ role: 'user', content: `【系统发布】${userMessage}` });
            }

            await window.dzmm.completions(
                { model: 'nalang-xl-0826-10k', messages, maxTokens: 2000 },
                async (newContent, done) => {
                    content = newContent;
                    const parsed = this.parseAIResponse(content);

                    if (parsed.ready) {
                        this.updateGameState(parsed.state);
                        this.chat_content = this.formatDialogue(parsed.dialogue);
                    }

                    if (done && content) {
                        const messagesToSave = [];
                        if (userMessage) {
                            messagesToSave.push({ role: 'user', content: `【系统发布】${userMessage}` });
                        }
                        messagesToSave.push({ role: 'assistant', content });
                        await window.dzmm.chat.insert(null, messagesToSave);
                    }
                }
            );
        },

        /**
         * 格式化对话内容
         */
        formatDialogue(text) {
            if (!text) return '';
            // 处理对话标记
            text = text.replace(/「([^」]+)」/g, '<span class="highlight">「$1」</span>');
            // 处理动作描写（*动作*）
            text = text.replace(/\*([^*]+)\*/g, '<span class="action">*$1*</span>');
            // 处理心理活动（（心理））
            text = text.replace(/（([^）]+)）/g, '<span class="thought">（$1）</span>');
            // 换行处理
            text = text.replace(/\n/g, '<br>');
            return text;
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
            if (typeof state.lewdness === 'number') {
                this.lewdness = Math.max(0, Math.min(100, state.lewdness));
            }
            if (typeof state.shame === 'number') {
                this.shame = Math.max(0, Math.min(100, state.shame));
            }
            if (state.clothing) this.clothing = state.clothing;
            if (state.accessories) this.accessories = state.accessories;
            if (state.location) this.location = state.location;
            if (state.task) this.current_task = state.task;
            if (state.mood) this.mood = state.mood;
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
                                this.chat_content = this.formatDialogue(parsed.dialogue);
                                this.system_message = '【系统恢复】\n存档已加载，继续发布任务...';
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
