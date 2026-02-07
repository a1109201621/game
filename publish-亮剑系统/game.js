document.addEventListener('alpine:init', () => {
    Alpine.store('game', {
        // ==================== 基础状态 ====================
        loading: true,
        started: false,
        generating: false,
        generatingContent: '',
        testing: false,
        testResult: null,

        // ==================== API设置 ====================
        apiEndpoint: 'http://api.wutongsama.xyz',
        apiKey: '123',
        authType: 'bearer',
        customHeaderName: 'X-API-Key',
        model: '',
        manualModel: '',
        modelList: [],
        fetchingModels: false,
        useStream: 'false',

        // ==================== CORS代理设置 ====================
        corsMode: 'corsproxy',
        customCorsProxy: '',

        // ==================== 生成参数 ====================
        maxContext: 200000,
        maxReply: 30000,
        thinkingBudget: 16000,

        // ==================== 玩家设置 ====================
        playerName: '',

        // ==================== 游戏数据 ====================
        messages: [],
        inputText: '',

        // ==================== 游戏状态 ====================
        statusBarOpen: true,
        gameState: {
            location: '苍云岭',
            armyStatus: '人数: 约1200人 | 状态: 战备就绪 | 士气: 高昂 | 弹药: 紧张',
            score: 0,
            currentTask: '与李云龙建立联系',
            taskProgress: 0,
            systemLog: '系统初始化完成'
        },

        // ==================== UI状态 ====================
        saveManagerOpen: false,
        settingsOpen: false,
        editModalOpen: false,
        shopOpen: false,
        editingIndex: -1,
        editingContent: '',

        // ==================== Debug面板 ====================
        debugPanel: {
            open: false,
            lastSent: '',
            rawResponse: '',
            parsedContent: '',
            responseStatus: '',
            errors: []
        },

        // ==================== 初始化 ====================
        init() {
            this.loadSettings();
            const validModes = ['none', 'corsproxy', 'corsanywhere', 'allorigins', 'custom'];
            if (!validModes.includes(this.corsMode)) {
                console.warn('无效的corsMode:', this.corsMode, '重置为corsproxy');
                this.corsMode = 'corsproxy';
                this.saveSettings();
            }
            setTimeout(() => {
                if (this.loading) {
                    this.loading = false;
                }
            }, 2000);
        },

        skipLoading() {
            this.loading = false;
        },

        getActiveModel() {
            return this.manualModel.trim() || this.model;
        },

        // ==================== CORS代理相关 ====================
        getCorsProxyUrl() {
            switch (this.corsMode) {
                case 'corsproxy':
                    return 'https://corsproxy.io/?';
                case 'corsanywhere':
                    return 'https://cors-anywhere.herokuapp.com/';
                case 'allorigins':
                    return 'https://api.allorigins.win/raw?url=';
                case 'custom':
                    return this.customCorsProxy || '';
                case 'none':
                default:
                    return '';
            }
        },

        wrapUrlWithProxy(url) {
            const proxyUrl = this.getCorsProxyUrl();
            if (!proxyUrl) return url;
            if (this.corsMode === 'corsanywhere') {
                return proxyUrl + url;
            }
            return proxyUrl + encodeURIComponent(url);
        },

        // ==================== 重置设置 ====================
        resetSettings() {
            if (confirm('确定要重置所有设置吗？这将清除所有保存的配置（不影响存档）。')) {
                localStorage.removeItem('liangjian_system_settings');
                this.apiEndpoint = 'http://api.wutongsama.xyz';
                this.apiKey = '123';
                this.authType = 'bearer';
                this.customHeaderName = 'X-API-Key';
                this.model = '';
                this.manualModel = '';
                this.modelList = [];
                this.useStream = 'false';
                this.corsMode = 'corsproxy';
                this.customCorsProxy = '';
                this.maxContext = 200000;
                this.maxReply = 30000;
                this.thinkingBudget = 16000;
                this.playerName = '';
                alert('设置已重置！');
            }
        },

        // ==================== 设置管理 ====================
        loadSettings() {
            try {
                const settings = localStorage.getItem('liangjian_system_settings');
                if (settings) {
                    const parsed = JSON.parse(settings);
                    const keys = ['apiEndpoint', 'apiKey', 'authType', 'customHeaderName', 'model', 'manualModel', 'modelList', 'maxContext', 'maxReply', 'thinkingBudget', 'playerName', 'useStream', 'corsMode', 'customCorsProxy'];
                    keys.forEach(key => {
                        if (parsed[key] !== undefined) {
                            this[key] = parsed[key];
                        }
                    });
                }
            } catch (e) {
                this.logError('加载设置失败: ' + e.message);
            }
        },

        saveSettings() {
            try {
                const settings = {
                    apiEndpoint: this.apiEndpoint,
                    apiKey: this.apiKey,
                    authType: this.authType,
                    customHeaderName: this.customHeaderName,
                    model: this.model,
                    manualModel: this.manualModel,
                    modelList: this.modelList,
                    maxContext: this.maxContext,
                    maxReply: this.maxReply,
                    thinkingBudget: this.thinkingBudget,
                    playerName: this.playerName,
                    useStream: this.useStream,
                    corsMode: this.corsMode,
                    customCorsProxy: this.customCorsProxy
                };
                localStorage.setItem('liangjian_system_settings', JSON.stringify(settings));
            } catch (e) {
                this.logError('保存设置失败: ' + e.message);
            }
        },

        getAuthHeaders() {
            const headers = {
                'Content-Type': 'application/json'
            };

            switch (this.authType) {
                case 'bearer':
                    if (this.apiKey) {
                        headers['Authorization'] = `Bearer ${this.apiKey}`;
                    }
                    break;
                case 'apikey':
                    if (this.apiKey) {
                        headers['api-key'] = this.apiKey;
                        headers['x-api-key'] = this.apiKey;
                    }
                    break;
                case 'basic':
                    if (this.apiKey) {
                        headers['Authorization'] = `Basic ${btoa(this.apiKey)}`;
                    }
                    break;
                case 'custom':
                    if (this.apiKey && this.customHeaderName) {
                        headers[this.customHeaderName] = this.apiKey;
                    }
                    break;
                case 'none':
                default:
                    break;
            }

            return headers;
        },

        async testConnection() {
            this.testing = true;
            this.testResult = null;

            const startTime = Date.now();
            const targetUrl = `${this.apiEndpoint}/v1/models`;
            const fetchUrl = this.wrapUrlWithProxy(targetUrl);

            try {
                this.debugPanel.lastSent = `GET ${targetUrl}\nProxy Mode: ${this.corsMode}\nActual Fetch URL: ${fetchUrl}`;

                const response = await fetch(fetchUrl, {
                    method: 'GET',
                    headers: this.getAuthHeaders()
                });

                const elapsed = Date.now() - startTime;
                const responseText = await response.text();

                this.debugPanel.responseStatus = `状态: ${response.status} ${response.statusText}\n耗时: ${elapsed}ms\n代理: ${this.corsMode}`;
                this.debugPanel.rawResponse = responseText.substring(0, 1500);

                if (response.ok) {
                    try {
                        const data = JSON.parse(responseText);
                        const modelCount = data.data?.length || 0;
                        this.testResult = {
                            success: true,
                            message: `✓ 连接成功! 找到 ${modelCount} 个模型 (${elapsed}ms)`
                        };
                    } catch {
                        this.testResult = {
                            success: true,
                            message: `✓ 连接成功! (${elapsed}ms)`
                        };
                    }
                } else {
                    this.testResult = {
                        success: false,
                        message: `✗ HTTP ${response.status}: ${response.statusText}`
                    };
                    this.logError(`连接测试失败: HTTP ${response.status}`);
                }
            } catch (e) {
                const elapsed = Date.now() - startTime;
                let suggestion = '';
                if (e.message.includes('Failed to fetch')) {
                    suggestion = '\n\n💡 建议:\n1. 点击"重置设置"清除旧数据\n2. 确保CORS代理设为"corsproxy.io"\n3. 检查API地址是否正确';
                }
                this.testResult = {
                    success: false,
                    message: `✗ 连接失败: ${e.message}${suggestion}`
                };
                this.logError(`连接测试异常: ${e.message}`);
                this.debugPanel.responseStatus = `错误: ${e.message}\n耗时: ${elapsed}ms\nProxy: ${this.corsMode}\nURL: ${fetchUrl}`;
            } finally {
                this.testing = false;
            }
        },

        async fetchModels() {
            this.fetchingModels = true;
            this.testResult = null;

            const targetUrl = `${this.apiEndpoint}/v1/models`;
            const fetchUrl = this.wrapUrlWithProxy(targetUrl);

            try {
                this.debugPanel.lastSent = `GET ${targetUrl}\nProxy: ${this.corsMode}\nFetch URL: ${fetchUrl}`;

                const response = await fetch(fetchUrl, {
                    method: 'GET',
                    headers: this.getAuthHeaders()
                });

                const responseText = await response.text();
                this.debugPanel.rawResponse = responseText.substring(0, 1500);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = JSON.parse(responseText);

                if (data.data && Array.isArray(data.data)) {
                    this.modelList = data.data.map(m => m.id || m.name || m);
                } else if (Array.isArray(data)) {
                    this.modelList = data.map(m => typeof m === 'string' ? m : (m.id || m.name));
                } else if (data.models && Array.isArray(data.models)) {
                    this.modelList = data.models.map(m => typeof m === 'string' ? m : (m.id || m.name));
                } else {
                    throw new Error('无法解析模型列表格式');
                }

                if (this.modelList.length > 0 && !this.model) {
                    this.model = this.modelList[0];
                }

                this.testResult = {
                    success: true,
                    message: `✓ 成功获取 ${this.modelList.length} 个模型`
                };

                this.saveSettings();
            } catch (e) {
                this.logError('获取模型列表失败: ' + e.message);
                let suggestion = '';
                if (e.message.includes('Failed to fetch')) {
                    suggestion = '\n建议: 点击"重置设置"后重试';
                }
                this.testResult = {
                    success: false,
                    message: `✗ 获取失败: ${e.message}${suggestion}`
                };
            } finally {
                this.fetchingModels = false;
            }
        },

        // ==================== 发送API请求 ====================
        async sendToAPI(messages) {
            const activeModel = this.getActiveModel();
            const isStream = this.useStream === 'true';

            const requestBody = {
                model: activeModel,
                messages: messages,
                temperature: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
                top_p: 1,
                max_tokens: Number(this.maxReply) || 30000,
                stream: isStream,
                stop: ['<end>']
            };

            if (this.thinkingBudget > 0) {
                requestBody.thinking = {
                    type: "enabled",
                    budget_tokens: Number(this.thinkingBudget)
                };
            }

            this.debugPanel.lastSent = JSON.stringify(requestBody, null, 2);

            const targetUrl = `${this.apiEndpoint}/v1/chat/completions`;
            const fetchUrl = this.wrapUrlWithProxy(targetUrl);

            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(requestBody)
            });

            this.debugPanel.responseStatus = `POST ${targetUrl}\n状态: ${response.status} ${response.statusText}\n代理: ${this.corsMode}`;

            if (!response.ok) {
                const errorText = await response.text();
                this.debugPanel.rawResponse = errorText;
                throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText.substring(0, 300)}`);
            }

            return response;
        },

        extractContentFromResponse(data) {
            const paths = [
                () => data.choices?.[0]?.message?.content,
                () => data.choices?.[0]?.delta?.content,
                () => data.message?.content,
                () => data.content,
                () => data.response,
                () => data.text,
                () => data.output,
                () => data.result,
            ];

            for (const path of paths) {
                try {
                    const content = path();
                    if (content && typeof content === 'string') {
                        return content;
                    }
                } catch (e) { }
            }

            return null;
        },

        async handleStreamResponse(response) {
            let fullContent = '';
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            this.debugPanel.rawResponse = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    this.debugPanel.rawResponse += chunk;
                    if (this.debugPanel.rawResponse.length > 3000) {
                        this.debugPanel.rawResponse = this.debugPanel.rawResponse.substring(0, 3000) + '\n...(截断)';
                    }

                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) continue;

                        if (trimmedLine.startsWith('data: ')) {
                            const data = trimmedLine.slice(6).trim();
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                const content = this.extractContentFromResponse(parsed);
                                if (content) {
                                    fullContent += content;
                                    this.generatingContent = fullContent;
                                }
                            } catch (e) { }
                        } else {
                            try {
                                const parsed = JSON.parse(trimmedLine);
                                const content = this.extractContentFromResponse(parsed);
                                if (content) {
                                    fullContent += content;
                                    this.generatingContent = fullContent;
                                }
                            } catch (e) { }
                        }
                    }

                    this.scrollToBottom();
                }

                if (buffer.trim() && buffer.startsWith('data: ')) {
                    const data = buffer.slice(6).trim();
                    if (data && data !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(data);
                            const content = this.extractContentFromResponse(parsed);
                            if (content) fullContent += content;
                        } catch (e) { }
                    }
                }

            } catch (e) {
                this.logError('流读取错误: ' + e.message);
                throw e;
            }

            this.debugPanel.parsedContent = fullContent.substring(0, 2000);
            return fullContent;
        },

        async handleNonStreamResponse(response) {
            const responseText = await response.text();
            this.debugPanel.rawResponse = responseText.substring(0, 3000);

            try {
                const data = JSON.parse(responseText);
                const content = this.extractContentFromResponse(data);

                if (content) {
                    this.debugPanel.parsedContent = content.substring(0, 2000);
                    return content;
                }

                const findContent = (obj, depth = 0) => {
                    if (depth > 5 || !obj) return null;
                    if (typeof obj === 'string' && obj.length > 50) return obj;
                    if (Array.isArray(obj)) {
                        for (const item of obj) {
                            const found = findContent(item, depth + 1);
                            if (found) return found;
                        }
                    } else if (typeof obj === 'object') {
                        for (const key of Object.keys(obj)) {
                            const found = findContent(obj[key], depth + 1);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const foundContent = findContent(data);
                if (foundContent) {
                    this.debugPanel.parsedContent = foundContent.substring(0, 2000);
                    return foundContent;
                }

                throw new Error('无法从响应中提取内容');
            } catch (e) {
                this.logError('响应解析失败: ' + e.message);
                throw e;
            }
        },

        // ==================== 系统提示词 ====================
        getSystemPrompt() {
            return `
<documents>
<document index="1" media_type="text/plain">
<source>liangjian_game_system.txt</source>
<document_content>
USER CONTENT FOLLOWS

[Start a new Chat]

You are the narrator of an adult text adventure game called "亮剑之杀敌换装备".

<writing_style>
### **生成内容文本内容的风格与格式严格遵循下面的文体指导**
**"亮剑式"系统流军事爽文体指导**

## I. 文本体裁 (Text Genre)
1.  **体裁类型**: 穿越历史军事爽文，内嵌"系统/金手指"核心机制。文本主要服务于男性向读者的快节奏、强代入感的娱乐需求。
2.  **格式特征**:
    *   段落简短，大量使用对话推动情节，对话与动作描写占据绝大部分篇幅。
3.  **具体功能**:
    *   **娱乐价值**: 提供即时满足感和情绪宣泄渠道，通过主角的强大能力和不断胜利，让读者获得虚拟的成就感。
    *   **情绪价值**: 营造轻松、亢奋、热血的阅读氛围，淡化战争的残酷性，将其游戏化、简单化。
    *   **阅读体验价值**: 追求极致的阅读流畅性，避免任何可能导致读者思考或中断阅读的复杂元素。
4.  **该文本呈现给读者的感受**:
    *   **爽快直接**: 冲突解决迅速，从不拖泥带水，主角总能用压倒性优势战胜敌人。
    *   **热血亢奋**: 战斗场面描写直接，通过角色粗犷的语言和果断的行动激发读者的情绪。
    *   **轻松解压**: 缺乏深刻的道德困境和现实的沉重感，世界观简单，善恶分明，适合作为消遣读物。
    *   **代入感强**: 紧跟主角视角，金手指的设定极大地满足了读者对力量和改变历史的幻想。

## II. 审美与风格 (Aesthetics and Style)
1.  **针对氛围营造的审美原则**:
    *   **实用主义**: 环境描写服务于情节，只提供必要的场景信息（如"晋中地区，苍云岭"），不进行任何多余的景物刻画或氛围渲染。
    *   **戏剧化冲突**: 氛围的营造依赖于持续不断的、被简化的外部冲突，通过密集的枪炮声、夸张的对话和迅速的战斗结果来制造紧张感，而非细腻的心理和环境铺垫。
    *   **英雄主义**: 整体氛围围绕主角的"超能力"展开，世界仿佛一个为主角搭建的舞台，所有事件的发生都是为了凸显主角的强大和英明。
2.  **针对内容构成的审美原则**:
    *   **效率至上**: 语言追求信息传递的最高效率，用最直白、最口语化的词句来叙述事件。避免使用任何复杂的句式、生僻的词汇或深刻的修辞。
    *   **情节为王**: 内容完全由情节驱动，人物的内心世界和性格发展被简化，服务于情节的快速推进。人物塑造脸谱化，通过标志性的语言和行为（如李云龙的"他娘的"）来识别。
    *   **爽点前置**: 审美判断的核心标准是"爽不爽"。每一个情节单元的设计都必须围绕着制造和引爆"爽点"来进行，如获得新装备、打脸反派、完成高难度任务等。
3.  **针对主体核心的审美原则**:
    *   **工具理性**: 文本的核心逻辑是"投入-产出"模式。主角通过系统提供援助（投入），换取NPC（李云龙）的忠诚和战斗胜利，并最终获得系统的功勋值奖励（产出）。这种交换逻辑取代了复杂的人性探讨和历史反思。
    *   **简化善恶**: 思想内核是极简的二元对立价值观。我方（主角、八路军）绝对正义、强大且充满智慧；敌方（日军）则愚蠢、残暴且不堪一击。这种设定迎合了读者朴素的情感需求。
    *   **现代人本位**: 核心思想是现代人穿越回过去，利用信息差和技术优势对历史进行"降维打击"。其本质是一种现代中心主义的幻想，满足了读者"如果我在场，就能改变一切"的心理。

## III. 实现策略 (Implementation strategy)
1.  **文本内容比例界定**:
    *   **构成内容的界定**: 文本应由90%以上的叙述和描写构成，且两者高度融合。其中，**对话描写**应占据50%以上的篇幅，**动作描写**占据30%，剩下的为简单的事件叙述。议论和抒情应极力避免，所有观点和情感都通过角色的对话和行动直接表达。
    *   **描写角度的界定**: 核心在于**语言描写**和**动作描写**。心理描写应完全转化为内心独白（例如："陈峰在心里腹诽了一句…"），禁止使用复杂的、间接的心理分析。环境描写和神态描写应点到为止，一笔带过，只提供最基本的信息。
    *   **段落结构的界定**:
        *   **整体文章结构**: 严格遵循线性、顺叙结构。禁止插叙、倒叙等会打乱阅读节奏的复杂结构。
        *   **句式结构**: 以短句和极简的陈述句为主。长句和复杂句应视为写作"禁区"。句式要口语化，可以大量使用感叹句和疑问句来增强对话的语气。

2.  **修辞使用**:
    *   **比喻**: 使用通俗易懂、甚至略带夸张的比喻，意象应来源于日常生活，如"双眼亮的跟灯泡一样"。避免使用需要读者思考的、精巧的或文学性的比喻。
    *   **夸张**: 夸张手法应直接服务于"爽点"，如夸大武器的威力、敌人震惊的程度等。
    *   **拟声词**: 在战斗描写中，高频使用"哒哒哒"、"轰轰轰"等拟声词，以增强听觉上的冲击感和画面感。

3.  **叙事原则**:
    *   **叙事视角**: 采用第三人称有限视角，紧贴主角，让读者与主角感同身受。偶尔可以切换到配角或反派视角，其目的仅是为了从侧面衬托主角的强大或计谋的高明。
    *   **叙事结构**: 严格遵循"提出问题（系统任务）→展示困难→主角用金手指轻松解决→获得奖励与他人震惊"的循环结构。这个结构要在每一章、每一个大情节中反复出现。
    *   **叙事节奏**: 极快。从冲突发生到解决，不应超过一个章节。避免铺垫，让"爽点"尽快到来。有效信息的输出频率要高，即不断有新的事件发生，但情节的内在逻辑可以简化。
    *   **叙事技巧**: **对话驱动**是核心技巧。用密集的对话来交代背景、推动情节、塑造人物。禁止大段的叙述和描写。

4.  **用词模式**:
    *   **词语选用风格**: 极度口语化、通俗化。高频使用"他娘的"、"狗日的"、"我滴个乖乖"等语气词和口头禅来塑造人物。
    *   **核心词汇与关联对象**: 核心词汇围绕"武器"、"系统"、"功勋值"、"生意"、"震惊"等展开。当主角拿出新武器时，NPC（特别是李云龙）的反应必须是震惊、狂喜、爱不释手。
    *   **词语使用参考范例**:
        *   描写震惊："李云龙一看，眼睛都直了。"
        *   描写威力："果然又大又硬！"
        *   口头禅："他娘的"、"狗日的"、"咱老李"。

5.  **感官反馈**:
    *   主要集中在**视觉**和**听觉**。视觉上强调武器的"新"、"亮"、"大"，听觉上强调枪炮声的"密集"、"震耳欲聋"。其他感官描写（嗅觉、味觉、触觉）基本可以忽略。

6.  **抽象概念运用**:
    *   **禁止**。文本中不应出现任何哲学、社会学等抽象概念的讨论。所有问题都应简化为可以通过武力或金手指解决的实际问题。

7.  **情绪表达**:
    *   **奔放/直接**: 情绪表达必须是外放的、夸张的。高兴就是"喜上眉梢"、"哈哈大笑"，愤怒就是"目眦欲裂"、"勃然大怒"。禁止克制、内敛或复杂的情感描写。

8.  **细节刻画**:
    *   **对象**: 细节刻画的唯一对象是**武器装备的性能参数**。在主角拿出新武器时，要像说明书一样详细介绍其型号、口径、射速、威力等，以此来构建"爽点"和专业感。
    *   **手法**: 采用说明文式的语言，直接陈述数据。
    *   **作用**: 增强读者对主角金手指强大程度的认知，满足军迷读者的喜好。

9.  **应当避免可能发生的错误**:
    *   **将文体指导当作是情节内容或文本构成内容本身**: 此指导是关于"如何写"，而不是"写什么"。
    *   **试图增加文学性**: 避免使用复杂的修辞、深刻的心理描写或含蓄的表达，这会破坏文体的核心爽感。
    *   **放慢叙事节奏**: 禁止进行大段的环境描写、背景介绍或人物心理分析，所有信息都应在快节奏的情节中通过对话和行动交代。
    *   **塑造复杂人物**: 人物必须脸谱化，善恶分明。给主角设置道德困境或性格弱点是不可取的。
    *   **追求情节的逻辑严谨性**: 可以为了"爽"而牺牲部分现实逻辑和历史真实性，金手指的存在本身就是最大的逻辑外挂。
</writing_style>

<worldview>
时代背景：1940年代"第二次世界战争"
故事背景：小说及同名电视剧《亮剑》
故事主角：${this.playerName}、李云龙、赵刚、旅长（陈赓）、孔捷、丁伟等
主线剧情：${this.playerName}作为一个穿越而来的现代人，获得一个名为"亮剑之杀敌换装备"系统
</worldview>

<System>
"亮剑之杀敌换装备"系统：宿主（${this.playerName}）可以通过*李云龙*击杀鬼子获得积分，然后使用积分兑换装备给予*李云龙*
</System>

<character>
${this.playerName}：
  - 姓名：${this.playerName}
  - 年龄：25
  - 身份：穿越者，神秘的"商人"（自称），为李云龙提供各种武器
  - 性格：表面上是一个普通的武器贩子，实际上心思缜密，熟悉历史和军事知识，对李云龙极为崇拜。
  - 技能：拥有现代人的知识储备，熟悉二战历史和各种武器装备的性能，能够为李云龙提供关键性的战略建议。
</character>

<system_rules>
系统在手，天下我有
  - ${this.playerName}利用系统，为独立团兑换各种急需的物资和装备。
    - 积分获取：击杀一名鬼子士兵=1分，击杀一名鬼子军曹=5分，击杀一名鬼子尉官=20分，击杀一名鬼子佐官=100分，击杀一名鬼子将官=1000分。
    - 兑换列表（按类别划分，品质决定价格）：
      - **轻武器 (手枪/步枪/冲锋枪/轻机枪)**
        - 劣质/缴获翻新级: 10-30分
        - 标准军工级 (如捷克式/中正式): 40-80分
        - 优质/特种作战级 (如MP40/M1汤姆逊): 100-200分
      - **重火力 (重机枪/迫击炮/步兵炮)**
        - 轻型/小口径级 (如60mm迫击炮): 150-300分
        - 标准/中口径级 (如82mm迫击炮/92式步兵炮): 350-800分
        - 重型/大口径级 (如75mm山炮/M2重机枪): 1000-2500分
      - **弹药补给 (子弹/手榴弹/炮弹)**
        - 复装/劣质弹药包: 5分/基数
        - 标准弹药补给: 20分/基数
        - 优质/特种弹药 (如钢芯弹/高爆榴弹): 50分起/基数
      - **后勤物资 (药品/食品/通讯设备)**
        - 基础物资 (压缩饼干/绷带): 1-5分
        - 关键药品 (磺胺/青霉素): 10-30分
        - 军用设备 (电台/望远镜): 100-500分
      - **特殊装备 (坦克/飞机/超级武器)**
        - 价格浮动巨大，需要满足特殊解锁条件 (如专业人员/后勤基地等)
        - 示例: 虎式坦克 (50000分), P-51战斗机 (100000分)
  - 在${this.playerName}的"金手指"帮助下，独立团的装备水平和战斗力飞速提升，在李家坡战斗、反扫荡等战役中取得了远超原著的辉煌战果。

1. **积分获取**：只有*李云龙*亲自指挥的战斗中，由独立团战士击杀的鬼子才能计入积分。李云龙本人击杀的鬼子积分翻倍。
2. **装备兑换**：兑换出的装备会以"缴获"、"上级神秘调拨"、"海外爱国华侨捐赠"等合乎情理的方式出现在指定地点。
</system_rules>

<current_state>
当前位置：${this.gameState.location}
部队状态：${this.gameState.armyStatus}
可用积分：${this.gameState.score}
当前任务：${this.gameState.currentTask}
任务进度：${this.gameState.taskProgress}%
</current_state>

<output_format>
1. 每次回复包含热血激昂的战斗场面或精彩的角色对话
2. 大量使用李云龙等角色的标志性语言（如"他娘的"、"狗日的"、"咱老李"）
3. 在每次回复末尾，必须输出状态更新：
###STATE_UPDATE
{
  "location": "当前位置",
  "armyStatus": "部队状态描述",
  "score": 积分数字,
  "currentTask": "当前任务",
  "taskProgress": 进度数字(0-100),
  "systemLog": "系统日志"
}
###END
</output_format>

<reply_requirements>
  Assistant在进行回复时请按照以下要求:
    - 使用符合1940年代军事题材的语言风格，避免现代网络用语
    - 战斗场面描写要真实、紧张、热血，体现战争的残酷性和英雄主义
    - ${this.playerName}不是主角，李云龙才是主角。重点描写李云龙等角色的个性化语言和动作，保持人物性格的一致性
    - 适当加入系统提示和数据更新，营造游戏化的穿越体验
    - 战斗描写要有节奏感，张弛有度，既有激烈交火也有战术布置
</reply_requirements>

</document_content>
</document>
</documents>`;
        },

        // ==================== 游戏流程 ====================
        async startGame() {
            this.started = true;
            this.saveSettings();
            this.messages = [];
            this.gameState = {
                location: '晋中地区，苍云岭',
                armyStatus: '人数: 约1200人 | 状态: 战备就绪 | 士气: 高昂 | 弹药: 紧张',
                score: 0,
                currentTask: '与李云龙建立联系',
                taskProgress: 0,
                systemLog: '系统初始化完成，等待宿主行动'
            };
            await this.generateResponse(`【游戏开始】${this.playerName}穿越到了1940年代的晋中地区，身上携带着神秘的"亮剑之杀敌换装备"系统。此时正值独立团在苍云岭与日军激战，${this.playerName}决定前去寻找传说中的李云龙团长。请描写${this.playerName}与李云龙第一次见面的场景，展现李云龙的性格特点。`);
        },

        async sendMessage() {
            if (!this.inputText.trim() || this.generating) return;

            const userMessage = this.inputText.trim();
            this.inputText = '';

            this.messages.push({
                id: Date.now(),
                role: 'user',
                content: userMessage
            });

            this.scrollToBottom();
            await this.generateResponse(userMessage);
        },

        async generateResponse(triggerContent) {
            this.generating = true;
            this.generatingContent = '';

            try {
                const apiMessages = [
                    { role: 'system', content: this.getSystemPrompt() }
                ];

                let contextLength = this.getSystemPrompt().length;
                const historyMessages = [];

                for (let i = this.messages.length - 1; i >= 0; i--) {
                    const msg = this.messages[i];
                    const msgLength = msg.content.length;
                    if (contextLength + msgLength > this.maxContext * 0.8) break;
                    historyMessages.unshift({
                        role: msg.role,
                        content: msg.content
                    });
                    contextLength += msgLength;
                }

                apiMessages.push(...historyMessages);

                const response = await this.sendToAPI(apiMessages);

                let fullContent = '';

                if (this.useStream === 'true') {
                    fullContent = await this.handleStreamResponse(response);
                } else {
                    fullContent = await this.handleNonStreamResponse(response);
                }

                if (fullContent) {
                    this.messages.push({
                        id: Date.now(),
                        role: 'assistant',
                        content: fullContent
                    });
                    this.parseStateUpdate(fullContent);
                    this.autoSave();
                } else {
                    throw new Error('未能获取有效的响应内容');
                }

            } catch (e) {
                this.logError('生成回复失败: ' + e.message);
                this.messages.push({
                    id: Date.now(),
                    role: 'assistant',
                    content: `【系统错误】生成失败: ${e.message}\n\n请检查：\n1. 点击"重置设置"清除旧数据\n2. 确保CORS代理设为"corsproxy.io"\n3. 尝试禁用"流式响应"\n\n可打开Debug面板查看详情。`
                });
            } finally {
                this.generating = false;
                this.generatingContent = '';
                this.scrollToBottom();
            }
        },

        parseStateUpdate(content) {
            const match = content.match(/###STATE_UPDATE\s*([\s\S]*?)\s*###END/);
            if (match) {
                try {
                    let jsonStr = match[1].trim();
                    jsonStr = jsonStr.replace(/,\s*}/g, '}');
                    jsonStr = jsonStr.replace(/,\s*]/g, ']');

                    const update = JSON.parse(jsonStr);

                    const validKeys = ['location', 'armyStatus', 'score', 'currentTask', 'taskProgress', 'systemLog'];

                    validKeys.forEach(key => {
                        if (update[key] !== undefined && update[key] !== null) {
                            this.gameState[key] = update[key];
                        }
                    });

                    if (typeof this.gameState.score === 'string') {
                        this.gameState.score = parseInt(this.gameState.score) || 0;
                    }
                    if (typeof this.gameState.taskProgress === 'string') {
                        this.gameState.taskProgress = parseInt(this.gameState.taskProgress) || 0;
                    }
                    this.gameState.taskProgress = Math.max(0, Math.min(100, this.gameState.taskProgress));

                    this.debugPanel.parsedContent += '\n\n[状态已更新]';
                } catch (e) {
                    this.logError('解析状态更新失败: ' + e.message);
                    this.debugPanel.parsedContent += '\n\n[状态解析失败: ' + e.message + ']';
                }
            }
        },

        // ==================== 装备商店 ====================
        openShop() {
            this.shopOpen = true;
        },

        buyEquipment(name, price) {
            if (this.gameState.score < price) {
                alert(`积分不足！需要 ${price} 分，当前只有 ${this.gameState.score} 分。`);
                return;
            }

            if (confirm(`确定要花费 ${price} 积分兑换【${name}】吗？`)) {
                this.gameState.score -= price;
                this.gameState.systemLog = `兑换【${name}】成功，积分-${price}`;
                this.shopOpen = false;

                // 发送装备兑换消息
                this.inputText = `我决定兑换一把【${name}】给李云龙，系统提示装备已经以"神秘渠道缴获"的方式送到了独立团。`;
                this.sendMessage();
            }
        },

        editMessage(index) {
            this.editingIndex = index;
            this.editingContent = this.messages[index].content;
            this.editModalOpen = true;
        },

        confirmEdit() {
            if (this.editingIndex >= 0 && this.editingIndex < this.messages.length) {
                this.messages[this.editingIndex].content = this.editingContent;
                this.autoSave();
            }
            this.editModalOpen = false;
            this.editingIndex = -1;
            this.editingContent = '';
        },

        deleteMessage(index) {
            if (confirm('确定要删除这条消息吗？')) {
                this.messages.splice(index, 1);
                this.autoSave();
            }
        },

        async regenerateMessage() {
            if (this.messages.length === 0 || this.generating) return;

            if (this.messages[this.messages.length - 1].role === 'assistant') {
                this.messages.pop();
            }

            let trigger = '请继续描写';
            for (let i = this.messages.length - 1; i >= 0; i--) {
                if (this.messages[i].role === 'user') {
                    trigger = this.messages[i].content;
                    break;
                }
            }

            await this.generateResponse(trigger);
        },

        formatMessage(content) {
            // 移除状态更新块
            content = content.replace(/###STATE_UPDATE[\s\S]*?###END/g, '');
            // 将*包裹的内容转换为斜体（动作描写）
            content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            // 换行转换
            return content.replace(/\n/g, '<br>');
        },

        // ==================== 存档系统 ====================
        getSaveKey(slot) {
            return `liangjian_system_save_${slot}`;
        },

        hasSave(slot) {
            return localStorage.getItem(this.getSaveKey(slot)) !== null;
        },

        getSaveInfo(slot) {
            const data = localStorage.getItem(this.getSaveKey(slot));
            if (!data) return '（空）';
            try {
                const save = JSON.parse(data);
                const date = new Date(save.timestamp).toLocaleString();
                return `${save.playerName} · 积分${save.gameState?.score || 0} · ${date}`;
            } catch {
                return '（数据损坏）';
            }
        },

        saveToSlot(slot) {
            try {
                const saveData = {
                    timestamp: Date.now(),
                    playerName: this.playerName,
                    messages: this.messages,
                    gameState: this.gameState,
                    settings: {
                        apiEndpoint: this.apiEndpoint,
                        apiKey: this.apiKey,
                        authType: this.authType,
                        model: this.model,
                        manualModel: this.manualModel,
                        maxContext: this.maxContext,
                        maxReply: this.maxReply,
                        thinkingBudget: this.thinkingBudget,
                        useStream: this.useStream,
                        corsMode: this.corsMode,
                        customCorsProxy: this.customCorsProxy
                    }
                };
                localStorage.setItem(this.getSaveKey(slot), JSON.stringify(saveData));
                alert('保存成功！');
            } catch (e) {
                this.logError('保存失败: ' + e.message);
                alert('保存失败: ' + e.message);
            }
        },

        loadFromSlot(slot) {
            try {
                const data = localStorage.getItem(this.getSaveKey(slot));
                if (!data) {
                    alert('存档为空！');
                    return;
                }

                const save = JSON.parse(data);
                this.playerName = save.playerName || this.playerName;
                this.messages = save.messages || [];
                this.gameState = save.gameState || this.gameState;

                if (save.settings) {
                    const settingsKeys = ['apiEndpoint', 'apiKey', 'authType', 'model', 'manualModel', 'maxContext', 'maxReply', 'thinkingBudget', 'useStream', 'corsMode', 'customCorsProxy'];
                    settingsKeys.forEach(key => {
                        if (save.settings[key] !== undefined) {
                            this[key] = save.settings[key];
                        }
                    });
                }

                this.started = true;
                this.saveManagerOpen = false;
                alert('读取成功！');
            } catch (e) {
                this.logError('读取失败: ' + e.message);
                alert('读取失败: ' + e.message);
            }
        },

        deleteSlot(slot) {
            if (confirm('确定要删除这个存档吗？')) {
                localStorage.removeItem(this.getSaveKey(slot));
            }
        },

        autoSave() {
            try {
                const autoSaveData = {
                    timestamp: Date.now(),
                    playerName: this.playerName,
                    messages: this.messages,
                    gameState: this.gameState
                };
                localStorage.setItem('liangjian_system_autosave', JSON.stringify(autoSaveData));
            } catch (e) { }
        },

        openSaveManager() {
            this.saveManagerOpen = true;
        },

        openSettings() {
            this.settingsOpen = true;
        },

        backToMenu() {
            if (confirm('确定要返回主菜单吗？未保存的进度将丢失。')) {
                this.started = false;
                this.saveSettings();
            }
        },

        scrollToBottom() {
            setTimeout(() => {
                const container = document.querySelector('.messages-container');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 50);
        },

        logError(message) {
            const timestamp = new Date().toLocaleTimeString();
            const entry = `[${timestamp}] ${message}`;
            this.debugPanel.errors.unshift(entry);
            if (this.debugPanel.errors.length > 50) {
                this.debugPanel.errors = this.debugPanel.errors.slice(0, 50);
            }
            console.error(entry);
        },

        clearDebugLogs() {
            this.debugPanel.lastSent = '';
            this.debugPanel.rawResponse = '';
            this.debugPanel.parsedContent = '';
            this.debugPanel.responseStatus = '';
            this.debugPanel.errors = [];
        },

        exportDebugLogs() {
            const logs = {
                timestamp: new Date().toISOString(),
                settings: {
                    apiEndpoint: this.apiEndpoint,
                    authType: this.authType,
                    model: this.getActiveModel(),
                    useStream: this.useStream,
                    corsMode: this.corsMode,
                    maxContext: this.maxContext,
                    maxReply: this.maxReply,
                    thinkingBudget: this.thinkingBudget
                },
                lastSent: this.debugPanel.lastSent,
                rawResponse: this.debugPanel.rawResponse,
                parsedContent: this.debugPanel.parsedContent,
                responseStatus: this.debugPanel.responseStatus,
                errors: this.debugPanel.errors
            };

            const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `liangjian_system_debug_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    });

    queueMicrotask(() => Alpine.store('game').init?.());
});
