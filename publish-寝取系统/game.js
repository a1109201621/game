// ==================== Debug日志系统 ====================
const DebugLog = {
    errors: [],
    aiLogs: [],
    allLogs: [],

    // 获取当前时间戳
    getTimestamp() {
        const now = new Date();
        return now.toLocaleString('zh-CN', {
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    // 添加错误日志
    error(source, message, details = null) {
        const log = {
            id: Date.now(),
            type: 'error',
            source: source,
            message: message,
            details: details,
            timestamp: this.getTimestamp()
        };
        this.errors.push(log);
        this.allLogs.push(log);
        this.updateBadges();
        this.updateDebugBtn();
        console.error(`[DEBUG ERROR] ${source}: ${message}`, details);
    },

    // 添加警告日志
    warning(source, message, details = null) {
        const log = {
            id: Date.now(),
            type: 'warning',
            source: source,
            message: message,
            details: details,
            timestamp: this.getTimestamp()
        };
        this.allLogs.push(log);
        this.updateBadges();
        console.warn(`[DEBUG WARNING] ${source}: ${message}`, details);
    },

    // 添加信息日志
    info(source, message, details = null) {
        const log = {
            id: Date.now(),
            type: 'info',
            source: source,
            message: message,
            details: details,
            timestamp: this.getTimestamp()
        };
        this.allLogs.push(log);
        this.updateBadges();
        console.log(`[DEBUG INFO] ${source}: ${message}`, details);
    },

    // 添加成功日志
    success(source, message, details = null) {
        const log = {
            id: Date.now(),
            type: 'success',
            source: source,
            message: message,
            details: details,
            timestamp: this.getTimestamp()
        };
        this.allLogs.push(log);
        this.updateBadges();
        console.log(`[DEBUG SUCCESS] ${source}: ${message}`, details);
    },

    // 添加AI交互日志
    aiRequest(source, prompt, model) {
        const log = {
            id: Date.now(),
            type: 'request',
            source: source,
            model: model,
            prompt: prompt,
            response: null,
            status: 'pending',
            timestamp: this.getTimestamp(),
            duration: null
        };
        this.aiLogs.push(log);
        this.allLogs.push({
            id: log.id,
            type: 'info',
            source: `AI请求 - ${source}`,
            message: `发送请求到 ${model}`,
            details: prompt,
            timestamp: log.timestamp
        });
        this.updateBadges();
        return log.id;
    },

    // 更新AI响应
    aiResponse(logId, response, success = true, error = null) {
        const log = this.aiLogs.find(l => l.id === logId);
        if (log) {
            log.response = response;
            log.status = success ? 'success' : 'error';
            log.error = error;
            log.duration = Date.now() - log.id;

            this.allLogs.push({
                id: Date.now(),
                type: success ? 'success' : 'error',
                source: `AI响应 - ${log.source}`,
                message: success ? `收到响应 (${log.duration}ms)` : `请求失败: ${error}`,
                details: response,
                timestamp: this.getTimestamp()
            });

            if (!success) {
                this.errors.push({
                    id: Date.now(),
                    type: 'error',
                    source: `AI错误 - ${log.source}`,
                    message: error,
                    details: { prompt: log.prompt, response: response },
                    timestamp: this.getTimestamp()
                });
            }
        }
        this.updateBadges();
        this.updateDebugBtn();
    },

    // 更新徽章数字
    updateBadges() {
        const errorBadge = document.getElementById('errorCountBadge');
        const aiBadge = document.getElementById('aiCountBadge');
        const allBadge = document.getElementById('allCountBadge');

        if (errorBadge) errorBadge.textContent = this.errors.length;
        if (aiBadge) aiBadge.textContent = this.aiLogs.length;
        if (allBadge) allBadge.textContent = this.allLogs.length;
    },

    // 更新Debug按钮状态
    updateDebugBtn() {
        const btn = document.getElementById('debugBtn');
        if (btn) {
            if (this.errors.length > 0) {
                btn.classList.add('has-errors');
                btn.innerHTML = `🐛 Debug (${this.errors.length})`;
            } else {
                btn.classList.remove('has-errors');
                btn.innerHTML = '🐛 Debug';
            }
        }
    },

    // 渲染错误日志
    renderErrors() {
        const container = document.getElementById('errorLogContainer');
        if (!container) return;

        if (this.errors.length === 0) {
            container.innerHTML = `
    <div class="debug-empty">
      <div class="debug-empty-icon">✅</div>
      <p>暂无错误记录</p>
    </div>
  `;
            return;
        }

        container.innerHTML = this.errors.slice().reverse().map(log => `
  <div class="debug-log-item error">
    <div class="debug-log-header">
      <span class="debug-log-type error">❌ ERROR</span>
      <span class="debug-log-time">${log.timestamp}</span>
    </div>
    <div class="debug-log-source">📍 ${log.source}</div>
    <div class="debug-log-message">${this.escapeHtml(log.message)}</div>
    ${log.details ? `
      <button class="debug-log-toggle" onclick="DebugLog.toggleDetails(${log.id})">
        展开详情 ▼
      </button>
      <div class="debug-log-details" id="details-${log.id}" style="display: none;">
${typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : this.escapeHtml(String(log.details))}
      </div>
    ` : ''}
  </div>
`).join('');
    },

    // 渲染AI日志
    renderAI() {
        const container = document.getElementById('aiLogContainer');
        if (!container) return;

        if (this.aiLogs.length === 0) {
            container.innerHTML = `
    <div class="debug-empty">
      <div class="debug-empty-icon">🤖</div>
      <p>暂无AI交互记录</p>
    </div>
  `;
            return;
        }

        container.innerHTML = this.aiLogs.slice().reverse().map(log => `
  <div class="ai-log-item">
    <div class="ai-log-header">
      <div class="ai-log-title">${log.source}</div>
      <div class="ai-log-meta">
        <span>📡 ${log.model}</span>
        <span>⏱️ ${log.duration ? log.duration + 'ms' : '进行中...'}</span>
        <span class="ai-log-status ${log.status}">${log.status === 'pending' ? '⏳ 请求中' :
                log.status === 'success' ? '✅ 成功' : '❌ 失败'
            }</span>
      </div>
    </div>

    <div class="ai-log-section">
      <div class="ai-log-section-title request">📤 发送的提示词</div>
      <div class="ai-log-content collapsed" id="prompt-${log.id}">
${this.escapeHtml(log.prompt)}
      </div>
      <button class="debug-log-toggle" onclick="DebugLog.toggleAIContent('prompt-${log.id}')">
        展开完整内容 ▼
      </button>
    </div>

    <div class="ai-log-section">
      <div class="ai-log-section-title response">📥 收到的响应</div>
      <div class="ai-log-content collapsed" id="response-${log.id}">
${log.response ? this.escapeHtml(log.response) : '(等待响应...)'}
      </div>
      ${log.response ? `
        <button class="debug-log-toggle" onclick="DebugLog.toggleAIContent('response-${log.id}')">
          展开完整内容 ▼
        </button>
      ` : ''}
    </div>

    ${log.error ? `
      <div class="ai-log-section">
        <div class="ai-log-section-title" style="color: var(--accent-red);">⚠️ 错误信息</div>
        <div class="ai-log-content" style="border: 1px solid var(--accent-red);">
${this.escapeHtml(log.error)}
        </div>
      </div>
    ` : ''}
  </div>
`).join('');
    },

    // 渲染全部日志
    renderAll() {
        const container = document.getElementById('allLogContainer');
        if (!container) return;

        if (this.allLogs.length === 0) {
            container.innerHTML = `
    <div class="debug-empty">
      <div class="debug-empty-icon">📋</div>
      <p>暂无日志记录</p>
    </div>
  `;
            return;
        }

        container.innerHTML = this.allLogs.slice().reverse().map(log => `
  <div class="debug-log-item ${log.type}">
    <div class="debug-log-header">
      <span class="debug-log-type ${log.type}">${this.getTypeIcon(log.type)} ${log.type.toUpperCase()}</span>
      <span class="debug-log-time">${log.timestamp}</span>
    </div>
    <div class="debug-log-source">📍 ${log.source}</div>
    <div class="debug-log-message">${this.escapeHtml(log.message)}</div>
    ${log.details ? `
      <button class="debug-log-toggle" onclick="DebugLog.toggleDetails(${log.id})">
        展开详情 ▼
      </button>
      <div class="debug-log-details" id="details-${log.id}" style="display: none;">
${typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : this.escapeHtml(String(log.details))}
      </div>
    ` : ''}
  </div>
`).join('');
    },

    // 刷新游戏状态显示
    refreshState() {
        const display = document.getElementById('gameStateDisplay');
        if (display) {
            // 创建一个不包含chatHistory的副本（太长了）
            const stateCopy = JSON.parse(JSON.stringify(GameState));
            stateCopy.chatHistory = `[${GameState.chatHistory.length} 条消息 - 已省略]`;
            display.textContent = JSON.stringify(stateCopy, null, 2);
        }
        showNotification('✅ 状态已刷新', 'success');
    },

    // 获取类型图标
    getTypeIcon(type) {
        const icons = {
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            success: '✅',
            request: '📤',
            response: '📥'
        };
        return icons[type] || '📋';
    },

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 切换详情显示
    toggleDetails(logId) {
        const details = document.getElementById(`details-${logId}`);
        if (details) {
            const isHidden = details.style.display === 'none';
            details.style.display = isHidden ? 'block' : 'none';
            const btn = details.previousElementSibling;
            if (btn) {
                btn.textContent = isHidden ? '收起详情 ▲' : '展开详情 ▼';
            }
        }
    },

    // 切换AI内容显示
    toggleAIContent(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const isCollapsed = element.classList.contains('collapsed');
            element.classList.toggle('collapsed');
            const btn = element.nextElementSibling;
            if (btn && btn.classList.contains('debug-log-toggle')) {
                btn.textContent = isCollapsed ? '收起内容 ▲' : '展开完整内容 ▼';
            }
        }
    },

    // 导出错误日志
    exportErrors() {
        this.downloadJSON(this.errors, 'error_logs');
    },

    // 导出AI日志
    exportAI() {
        this.downloadJSON(this.aiLogs, 'ai_logs');
    },

    // 导出全部日志
    exportAll() {
        this.downloadJSON({
            errors: this.errors,
            aiLogs: this.aiLogs,
            allLogs: this.allLogs,
            gameState: GameState
        }, 'all_debug_logs');
    },

    // 导出游戏状态
    exportState() {
        this.downloadJSON(GameState, 'game_state');
    },

    // 复制状态到剪贴板
    async copyState() {
        try {
            const stateCopy = JSON.parse(JSON.stringify(GameState));
            stateCopy.chatHistory = `[${GameState.chatHistory.length} 条消息]`;
            await navigator.clipboard.writeText(JSON.stringify(stateCopy, null, 2));
            showNotification('✅ 已复制到剪贴板', 'success');
        } catch (e) {
            showNotification('❌ 复制失败', 'error');
        }
    },

    // 下载JSON文件
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification(`✅ 已导出: ${a.download}`, 'success');
    },

    // 清空错误日志
    clearErrors() {
        if (confirm('确定要清空所有错误日志吗？')) {
            this.errors = [];
            this.updateBadges();
            this.updateDebugBtn();
            this.renderErrors();
            showNotification('🗑️ 错误日志已清空', 'info');
        }
    },

    // 清空AI日志
    clearAI() {
        if (confirm('确定要清空所有AI交互日志吗？')) {
            this.aiLogs = [];
            this.updateBadges();
            this.renderAI();
            showNotification('🗑️ AI日志已清空', 'info');
        }
    },

    // 清空全部日志
    clearAll() {
        if (confirm('确定要清空所有日志吗？')) {
            this.errors = [];
            this.aiLogs = [];
            this.allLogs = [];
            this.updateBadges();
            this.updateDebugBtn();
            this.renderErrors();
            this.renderAI();
            this.renderAll();
            showNotification('🗑️ 全部日志已清空', 'info');
        }
    }
};

// ==================== 全局错误捕获 ====================
window.onerror = function (message, source, lineno, colno, error) {
    DebugLog.error('全局错误', message, {
        source: source,
        line: lineno,
        column: colno,
        stack: error ? error.stack : null
    });
    return false;
};

window.addEventListener('unhandledrejection', function (event) {
    DebugLog.error('未处理的Promise错误', event.reason ? event.reason.message || String(event.reason) : '未知错误', {
        reason: event.reason
    });
});

// ==================== 性格词条定义 ====================
const PersonalityTraits = [
    { id: 'pure', name: '清纯', defaultDesc: '外表清纯可爱，对性知识几乎一无所知，容易害羞脸红' },
    { id: 'shy', name: '害羞', defaultDesc: '性格内向腼腆，不善于表达，被人注视时会紧张' },
    { id: 'gentle', name: '温柔', defaultDesc: '性格温和体贴，善解人意，说话轻声细语' },
    { id: 'tsundere', name: '傲娇', defaultDesc: '嘴上说不要身体却很诚实，表面高冷内心火热' },
    { id: 'cold', name: '高冷', defaultDesc: '外表冷淡疏离，不轻易对人敞开心扉' },
    { id: 'cheerful', name: '开朗', defaultDesc: '性格阳光活泼，爱笑爱闹，容易和人打成一片' },
    { id: 'obedient', name: '顺从', defaultDesc: '性格软弱容易被支配，难以拒绝他人的要求' },
    { id: 'proud', name: '高傲', defaultDesc: '自尊心极强，看不起普通人，不愿低头' },
    { id: 'innocent', name: '天然', defaultDesc: '思想单纯不谙世事，容易被人欺骗利用' },
    { id: 'sensual', name: '闷骚', defaultDesc: '外表正经内心淫荡，有隐藏的欲望' },
    { id: 'passionate', name: '热情', defaultDesc: '性格火热奔放，感情充沛，容易投入' },
    { id: 'devoted', name: '专一', defaultDesc: '对感情极度忠诚，一旦认定就不会改变' },
    { id: 'sensitive', name: '敏感', defaultDesc: '身体和心理都极其敏感，轻微刺激就有反应' },
    { id: 'masochist', name: '抖M', defaultDesc: '有被虐倾向，被粗暴对待反而会兴奋' },
    { id: 'exhibitionist', name: '暴露癖', defaultDesc: '有在他人面前暴露身体的冲动和快感' }
];

// ==================== 游戏状态 ====================
const GameState = {
    model: 'nalang-xl-0826',
    protagonist: { name: '', age: 22 },
    heroine: {
        name: '',
        age: 21,
        relation: '',
        identity: '',
        personality: [],
        personalityDesc: {},
        corruptionLevel: 1,
        corruptionExp: 5,
        infidelityValue: 0,
        virginStatus: '完璧',
        cheatingCount: 0,
        sexStats: {
            oral: 0, handjob: 0, boobjob: 0, footjob: 0,
            anal: 0, condomSex: 0, creampie: 0, externalCum: 0,
            threesome: 0, intercrural: 0,
            orgasms: 0, cumExtracted: 0
        }
    },
    system: { level: 1, exp: 0, expToNext: 100, coins: 0 },
    shelter: {
        level: 1,
        name: '末世之光',
        items: ['压缩饼干x3', '矿泉水x2', '毛毯x1', '应急灯x1']
    },
    gameTime: { year: 2025, month: 12, day: 15, hour: 14, minute: 30, weekday: '星期一' },
    environment: { outdoorTemp: -35, indoorTemp: 18, weather: '阴冷', location: '避难所' },
    currentTasks: { daily: null, bounty: null },
    completedTasks: [],
    abilities: [],
    purchaseHistory: [],
    chatHistory: [],
    saves: [null, null, null],
    // 新增：总结相关状态
    summaryIndex: -1,
    lastUserMessageIndex: -1,
    // 新增：商店搜索缓存
    shopCache: {},  // 格式: { "搜索关键词": [商品数组] }
    shopSearchHistory: []  // 搜索历史记录
};

// ==================== 初始化 ====================
function initPersonalityTags() {
    const container = document.getElementById('personalityTags');
    container.innerHTML = PersonalityTraits.map(trait => `
<div class="personality-tag" data-id="${trait.id}" onclick="togglePersonalityTag('${trait.id}')">
  ${trait.name}
</div>
      `).join('');
    DebugLog.info('初始化', '性格词条初始化完成', { count: PersonalityTraits.length });
}

function togglePersonalityTag(id) {
    const tag = document.querySelector(`.personality-tag[data-id="${id}"]`);
    tag.classList.toggle('selected');
    updatePersonalityDescriptions();
}

function updatePersonalityDescriptions() {
    const container = document.getElementById('personalityDescContainer');
    const selectedTags = document.querySelectorAll('.personality-tag.selected');

    if (selectedTags.length === 0) {
        container.classList.remove('active');
        container.innerHTML = '';
        return;
    }

    container.classList.add('active');
    container.innerHTML = Array.from(selectedTags).map(tag => {
        const id = tag.dataset.id;
        const trait = PersonalityTraits.find(t => t.id === id);
        const savedDesc = GameState.heroine.personalityDesc[id] || trait.defaultDesc;
        return `
  <div class="personality-desc-item">
    <div class="personality-desc-label">${trait.name}</div>
    <input type="text" class="personality-desc-input"
           data-id="${id}"
           value="${savedDesc}"
           onchange="updatePersonalityDesc('${id}', this.value)">
  </div>
`;
    }).join('');
}

function updatePersonalityDesc(id, value) {
    GameState.heroine.personalityDesc[id] = value;
}

function handleVirginChange() {
    const select = document.getElementById('virginSelect');
    const options = document.getElementById('virginOptions');

    if (select.value === 'no') {
        options.classList.add('active');
    } else {
        options.classList.remove('active');
    }
}

function selectVirginOption(element, value) {
    document.querySelectorAll('.radio-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    element.querySelector('input').checked = true;

    const customInput = document.getElementById('customVirginInput');
    if (value === 'custom') {
        customInput.classList.add('active');
    } else {
        customInput.classList.remove('active');
    }
}

// ==================== 工具函数 ====================
function formatGameTime() {
    const t = GameState.gameTime;
    const pad = n => String(n).padStart(2, '0');
    return `${t.year}-${pad(t.month)}-${pad(t.day)} ${pad(t.hour)}:${pad(t.minute)}`;
}

function formatShortTime() {
    const t = GameState.gameTime;
    return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

function getCorruptionStars(level) {
    return '⭐'.repeat(level) + '☆'.repeat(5 - level);
}

function getWeekday(date) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return weekdays[date.getDay()];
}

function isBountyDay() {
    const wd = GameState.gameTime.weekday;
    return wd === '星期一' || wd === '星期四';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== 判断是否为移动端 ====================
function isMobile() {
    return window.innerWidth <= 900;
}

// ==================== 侧边栏切换（修复移动端问题） ====================
function toggleSidePanel() {
    const panel = document.getElementById('sidePanel');
    const btn = document.getElementById('togglePanelBtn');
    const overlay = document.getElementById('mobileOverlay');

    if (isMobile()) {
        const isVisible = panel.classList.contains('mobile-visible');
        if (isVisible) {
            panel.classList.remove('mobile-visible');
            overlay.classList.remove('active');
            btn.classList.remove('active');
        } else {
            panel.classList.add('mobile-visible');
            overlay.classList.add('active');
            btn.classList.add('active');
        }
    } else {
        const chat = document.getElementById('chatContainer');
        panel.classList.toggle('collapsed');
        chat.classList.toggle('expanded');
        btn.classList.toggle('active');
    }
}

// ==================== 关闭侧边栏（点击遮罩时） ====================
function closeSidePanel() {
    const panel = document.getElementById('sidePanel');
    const btn = document.getElementById('togglePanelBtn');
    const overlay = document.getElementById('mobileOverlay');

    panel.classList.remove('mobile-visible');
    overlay.classList.remove('active');
    btn.classList.remove('active');
}

// ==================== Debug模态框 ====================
function openDebugModal() {
    document.getElementById('debugModal').classList.add('active');
    DebugLog.refreshState();
    DebugLog.renderErrors();
    DebugLog.renderAI();
    DebugLog.renderAll();
    DebugLog.info('Debug', '打开Debug面板');
}

function closeDebugModal() {
    document.getElementById('debugModal').classList.remove('active');
}

function switchDebugTab(tabName) {
    document.querySelectorAll('.debug-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.debugTab === tabName);
    });
    document.querySelectorAll('.debug-content').forEach(content => {
        content.classList.toggle('active', content.id === `debug-${tabName}`);
    });

    if (tabName === 'errors') DebugLog.renderErrors();
    if (tabName === 'ai') DebugLog.renderAI();
    if (tabName === 'all') DebugLog.renderAll();
    if (tabName === 'state') DebugLog.refreshState();
}

// ==================== 作弊模态框 ====================
function openCheatModal() {
    closeModelModal();
    document.getElementById('cheatModal').classList.add('active');
    loadCheatValues();
    DebugLog.info('作弊系统', '打开作弊面板');
}

function closeCheatModal() {
    document.getElementById('cheatModal').classList.remove('active');
}

// 加载当前游戏数值到作弊面板
function loadCheatValues() {
    // 系统数值
    document.getElementById('cheatCoins').value = GameState.system.coins;
    document.getElementById('cheatExp').value = GameState.system.exp;
    document.getElementById('cheatLevel').value = GameState.system.level;

    // 女主角数值
    document.getElementById('cheatCorruptionLevel').value = GameState.heroine.corruptionLevel;
    document.getElementById('cheatCorruptionExp').value = GameState.heroine.corruptionExp;
    document.getElementById('cheatInfidelity').value = GameState.heroine.infidelityValue;
    document.getElementById('cheatCheatingCount').value = GameState.heroine.cheatingCount;
    document.getElementById('cheatVirginStatus').value = GameState.heroine.virginStatus;

    // 性经验统计
    document.getElementById('cheatOral').value = GameState.heroine.sexStats.oral;
    document.getElementById('cheatHandjob').value = GameState.heroine.sexStats.handjob;
    document.getElementById('cheatBoobjob').value = GameState.heroine.sexStats.boobjob;
    document.getElementById('cheatFootjob').value = GameState.heroine.sexStats.footjob;
    document.getElementById('cheatAnal').value = GameState.heroine.sexStats.anal;
    document.getElementById('cheatCondomSex').value = GameState.heroine.sexStats.condomSex;
    document.getElementById('cheatCreampie').value = GameState.heroine.sexStats.creampie;
    document.getElementById('cheatExternalCum').value = GameState.heroine.sexStats.externalCum;
    document.getElementById('cheatThreesome').value = GameState.heroine.sexStats.threesome;
    document.getElementById('cheatIntercrural').value = GameState.heroine.sexStats.intercrural;
    document.getElementById('cheatOrgasms').value = GameState.heroine.sexStats.orgasms;
    document.getElementById('cheatCumExtracted').value = GameState.heroine.sexStats.cumExtracted;

    // 环境设置
    document.getElementById('cheatOutdoorTemp').value = GameState.environment.outdoorTemp;
    document.getElementById('cheatIndoorTemp').value = GameState.environment.indoorTemp;
    document.getElementById('cheatLocation').value = GameState.environment.location;
    document.getElementById('cheatWeather').value = GameState.environment.weather;

    // 避难所设置
    document.getElementById('cheatShelterLevel').value = GameState.shelter.level;
    document.getElementById('cheatShelterName').value = GameState.shelter.name;

    DebugLog.info('作弊系统', '已加载当前游戏数值');
}

// 应用作弊修改
function applyCheat() {
    // 系统数值
    GameState.system.coins = parseInt(document.getElementById('cheatCoins').value) || 0;
    GameState.system.exp = parseInt(document.getElementById('cheatExp').value) || 0;
    GameState.system.level = parseInt(document.getElementById('cheatLevel').value) || 1;

    // 女主角数值
    GameState.heroine.corruptionLevel = Math.min(5, Math.max(1, parseInt(document.getElementById('cheatCorruptionLevel').value) || 1));
    GameState.heroine.corruptionExp = Math.min(100, Math.max(0, parseInt(document.getElementById('cheatCorruptionExp').value) || 0));
    GameState.heroine.infidelityValue = Math.min(100, Math.max(0, parseInt(document.getElementById('cheatInfidelity').value) || 0));
    GameState.heroine.cheatingCount = parseInt(document.getElementById('cheatCheatingCount').value) || 0;
    GameState.heroine.virginStatus = document.getElementById('cheatVirginStatus').value || '完璧';

    // 性经验统计
    GameState.heroine.sexStats.oral = parseInt(document.getElementById('cheatOral').value) || 0;
    GameState.heroine.sexStats.handjob = parseInt(document.getElementById('cheatHandjob').value) || 0;
    GameState.heroine.sexStats.boobjob = parseInt(document.getElementById('cheatBoobjob').value) || 0;
    GameState.heroine.sexStats.footjob = parseInt(document.getElementById('cheatFootjob').value) || 0;
    GameState.heroine.sexStats.anal = parseInt(document.getElementById('cheatAnal').value) || 0;
    GameState.heroine.sexStats.condomSex = parseInt(document.getElementById('cheatCondomSex').value) || 0;
    GameState.heroine.sexStats.creampie = parseInt(document.getElementById('cheatCreampie').value) || 0;
    GameState.heroine.sexStats.externalCum = parseInt(document.getElementById('cheatExternalCum').value) || 0;
    GameState.heroine.sexStats.threesome = parseInt(document.getElementById('cheatThreesome').value) || 0;
    GameState.heroine.sexStats.intercrural = parseInt(document.getElementById('cheatIntercrural').value) || 0;
    GameState.heroine.sexStats.orgasms = parseInt(document.getElementById('cheatOrgasms').value) || 0;
    GameState.heroine.sexStats.cumExtracted = parseInt(document.getElementById('cheatCumExtracted').value) || 0;

    // 环境设置
    GameState.environment.outdoorTemp = parseInt(document.getElementById('cheatOutdoorTemp').value) || -35;
    GameState.environment.indoorTemp = parseInt(document.getElementById('cheatIndoorTemp').value) || 18;
    GameState.environment.location = document.getElementById('cheatLocation').value || '避难所';
    GameState.environment.weather = document.getElementById('cheatWeather').value || '阴冷';

    // 避难所设置
    GameState.shelter.level = parseInt(document.getElementById('cheatShelterLevel').value) || 1;
    GameState.shelter.name = document.getElementById('cheatShelterName').value || '末世之光';

    // 更新UI
    updateAllUI();

    // 关闭作弊面板
    closeCheatModal();

    showNotification('✅ 作弊数值已应用！', 'success');
    DebugLog.success('作弊系统', '已应用作弊修改', {
        coins: GameState.system.coins,
        level: GameState.system.level,
        corruptionLevel: GameState.heroine.corruptionLevel
    });
}

// ==================== 任务系统 ====================
function getTaskLevelDescription(level, isBounty = false) {
    const effectiveLevel = isBounty ? Math.min(level + 1, 5) : level;
    const descriptions = {
        1: '简单的身体接触（握手、拥抱、眼神接触等）',
        2: '裸露和触摸身体（展示身材、被摸胸、被摸臀等）',
        3: '口交和足交等非插入性行为（口交、足交、乳交等，避免性交）',
        4: '完整的性交行为（阴道性交、肛交、内射等）',
        5: isBounty ? '长时间的轮奸、公共肉便器、极端群交等' : '群交和多P行为（3P、轮奸、多人性交等）'
    };
    return descriptions[effectiveLevel] || descriptions[1];
}

async function generateDailyTask() {
    const level = GameState.heroine.corruptionLevel;
    const levelDesc = getTaskLevelDescription(level, false);
    const container = document.getElementById('dailyTaskContainer');

    container.innerHTML = `
<div class="task-loading">
  <div class="task-loading-spinner"></div>
  正在生成任务...
</div>
      `;

    DebugLog.info('任务系统', '开始生成每日任务', { level: level });

    const prompt = `你是末世寝取生存游戏的任务生成系统。这是一款以寝取（NTR）为核心玩法的成人游戏。
【背景设定】
极寒末世，文明崩溃。主角${GameState.protagonist.name}和女友${GameState.heroine.name}躲在避难所生存。
主角拥有"寝取系统"，通过让女友与其他男性发生亲密接触来获取资源。
女主角：${GameState.heroine.name}，${GameState.heroine.age}岁，${GameState.heroine.identity}，是主角的${GameState.heroine.relation}
【当前淫乱等级】${level}星
【任务尺度要求】${levelDesc}
【任务设计规则】
1. 任务必须是让女主角与任意【其他男性】发生指定尺度的亲密接触
2. 任务对象没有任何限制,但不能是${GameState.protagonist.name}
请生成1个每日任务，严格按照以下JSON格式返回：
{
  "content": "任务描述，简单叙述任务要求",
  "coins": ${level * 15}到${level * 30}之间的整数,
  "exp": ${level * 20}到${level * 40}之间的整数
}
【示例参考】
1星: "让${GameState.heroine.name}寻找任意男性，允许对方握住她的手并凝视她30秒"
2星: "让${GameState.heroine.name}在任意男性面前脱掉上衣让其抚摸检查她的胸部"
3星: "让${GameState.heroine.name}给任意男性口交一次并吞精"
4星: "让${GameState.heroine.name}被人以男性插入并射精"
5星: "让${GameState.heroine.name}一天内被至少4名男性中出"
只返回JSON，不要任何其他文字。`;

    const logId = DebugLog.aiRequest('生成每日任务', prompt, GameState.model);

    try {
        let fullResponse = '';
        await dzmm.completions({
            model: GameState.model,
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 500
        }, (content, done) => {
            fullResponse = content;
            if (done) {
                DebugLog.aiResponse(logId, fullResponse, true);

                try {
                    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const taskData = JSON.parse(jsonMatch[0]);
                        GameState.currentTasks.daily = {
                            type: '每日任务',
                            content: taskData.content,
                            rewards: { coins: taskData.coins, exp: taskData.exp },
                            level: level,
                            status: 'pending'
                        };
                        updateTaskUI();
                        DebugLog.success('任务系统', '每日任务生成成功', taskData);
                    } else {
                        throw new Error('无法从响应中解析JSON');
                    }
                } catch (e) {
                    DebugLog.error('任务系统', '每日任务JSON解析失败', {
                        error: e.message,
                        response: fullResponse
                    });
                    container.innerHTML = `<div style="color: var(--accent-red); font-size: 0.8rem;">任务生成失败，请重试</div>`;
                }
            }
        });
    } catch (error) {
        DebugLog.aiResponse(logId, null, false, error.message);
        DebugLog.error('任务系统', '每日任务API请求失败', { error: error.message });
        container.innerHTML = `<div style="color: var(--accent-red); font-size: 0.8rem;">任务生成失败: ${error.message}</div>`;
    }
}

async function generateBountyTask() {
    if (!isBountyDay()) {
        showNotification('悬赏任务仅在周一/周四开放', 'warning');
        DebugLog.warning('任务系统', '尝试在非悬赏日生成悬赏任务', { weekday: GameState.gameTime.weekday });
        return;
    }

    const level = GameState.heroine.corruptionLevel;
    const effectiveLevel = Math.min(level + 1, 5);
    const levelDesc = getTaskLevelDescription(level, true);
    const container = document.getElementById('bountyTaskContainer');

    container.innerHTML = `
<div class="task-loading">
  <div class="task-loading-spinner"></div>
  正在生成悬赏任务...
</div>
      `;

    DebugLog.info('任务系统', '开始生成悬赏任务', { level: level, effectiveLevel: effectiveLevel });

    const prompt = `你是末世寝取生存游戏的悬赏任务生成系统。这是一款以寝取（NTR）为核心玩法的成人游戏。
【背景设定】
极寒末世，文明崩溃。主角${GameState.protagonist.name}和女友${GameState.heroine.name}躲在避难所生存。
主角拥有"寝取系统"，通过让女友与其他男性发生亲密接触来获取资源。
女主角：${GameState.heroine.name}，${GameState.heroine.age}岁，${GameState.heroine.identity}，是主角的${GameState.heroine.relation}
【当前淫乱等级】${level}星
【悬赏难度】${effectiveLevel}星（比每日任务高一级，更危险更刺激）
【任务尺度要求】${levelDesc}
【任务设计规则】
1. 悬赏任务比每日任务更极端，涉及更多人数或更羞耻的场景
2. 任务对象没有任何限制，但不能是${GameState.protagonist.name}
3. 可以涉及公开场合、多人、连续性行为
请生成1个悬赏任务，严格按照以下JSON格式返回：
{
  "content": "任务描述，简单叙述任务要求，要比每日任务更刺激",
  "coins": ${effectiveLevel * 30}到${effectiveLevel * 50}之间的整数,
  "exp": ${effectiveLevel * 40}到${effectiveLevel * 60}之间的整数
}
【示例参考】
1星: "让${GameState.heroine.name}在公共场所露出胸部"
2星: "让${GameState.heroine.name}被人以男性玩弄乳头到高潮"
3星: "让${GameState.heroine.name}在一天内至少给两人口交吞精"
4星: "让${GameState.heroine.name}在一天内至少被4人中出射精"
5星: "让${GameState.heroine.name}在公共厕所作为公共肉便器直到第二天"
只返回JSON，不要任何其他文字。`;

    const logId = DebugLog.aiRequest('生成悬赏任务', prompt, GameState.model);

    try {
        let fullResponse = '';
        await dzmm.completions({
            model: GameState.model,
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 600
        }, (content, done) => {
            fullResponse = content;
            if (done) {
                DebugLog.aiResponse(logId, fullResponse, true);

                try {
                    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const taskData = JSON.parse(jsonMatch[0]);
                        GameState.currentTasks.bounty = {
                            type: '悬赏任务',
                            content: taskData.content,
                            rewards: { coins: taskData.coins, exp: taskData.exp },
                            level: effectiveLevel,
                            status: 'pending'
                        };
                        updateTaskUI();
                        DebugLog.success('任务系统', '悬赏任务生成成功', taskData);
                    } else {
                        throw new Error('无法从响应中解析JSON');
                    }
                } catch (e) {
                    DebugLog.error('任务系统', '悬赏任务JSON解析失败', {
                        error: e.message,
                        response: fullResponse
                    });
                    container.innerHTML = `<div style="color: var(--accent-red); font-size: 0.8rem;">悬赏任务生成失败</div>`;
                }
            }
        });
    } catch (error) {
        DebugLog.aiResponse(logId, null, false, error.message);
        DebugLog.error('任务系统', '悬赏任务API请求失败', { error: error.message });
        container.innerHTML = `<div style="color: var(--accent-red); font-size: 0.8rem;">悬赏任务生成失败</div>`;
    }
}

function completeTask(taskType) {
    const task = GameState.currentTasks[taskType];
    if (!task || task.status === 'completed') return;

    task.status = 'completed';
    GameState.system.coins += task.rewards.coins;
    GameState.system.exp += task.rewards.exp;

    DebugLog.info('任务系统', `完成${taskType === 'daily' ? '每日' : '悬赏'}任务`, {
        task: task.content,
        rewards: task.rewards
    });

    while (GameState.system.exp >= GameState.system.expToNext) {
        GameState.system.exp -= GameState.system.expToNext;
        GameState.system.level++;
        GameState.system.expToNext = Math.floor(GameState.system.expToNext * 1.5);
        showNotification(`🎉 寝取等级提升至 Lv.${GameState.system.level}！`, 'success');
        DebugLog.success('升级系统', `等级提升到 Lv.${GameState.system.level}`);
    }

    GameState.heroine.infidelityValue = Math.min(100, GameState.heroine.infidelityValue + 5);
    GameState.heroine.corruptionExp += 15;
    if (GameState.heroine.corruptionExp >= 100 && GameState.heroine.corruptionLevel < 5) {
        GameState.heroine.corruptionExp = 0;
        GameState.heroine.corruptionLevel++;
        showNotification(`💔 ${GameState.heroine.name}的淫乱等级提升至 ${GameState.heroine.corruptionLevel}星！`, 'info');
        DebugLog.info('堕落系统', `淫乱等级提升到 ${GameState.heroine.corruptionLevel}星`);
    }

    GameState.completedTasks.push({ ...task, completedAt: formatGameTime() });
    showNotification(`✅ 任务完成！获得 ${task.rewards.coins}💰 ${task.rewards.exp}经验`, 'success');

    updateAllUI();
}

// ==================== 时间系统 ====================
async function advanceTime(hours) {
    const t = GameState.gameTime;
    const date = new Date(t.year, t.month - 1, t.day, t.hour, t.minute);
    date.setHours(date.getHours() + hours);

    GameState.gameTime = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        weekday: getWeekday(date)
    };

    DebugLog.info('时间系统', `时间推进 ${hours} 小时`, { newTime: formatGameTime() });

    updateAllUI();

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        showTypingIndicator();

        const prompt = `时间快进了${days}天。请简要描述这${days}天内发生的事情：

1. 女主角${GameState.heroine.name}是否执行了任务？
2. 任务过程中发生了什么？
3. 她的状态有什么变化？

当前淫乱等级：${GameState.heroine.corruptionLevel}星
当前任务：${GameState.currentTasks.daily ? GameState.currentTasks.daily.content : '无'}

请用600-800字描述，包含适当的色情细节。
最后用【状态变化】标注数值变动。`;

        await sendToAI(prompt);
    } else {
        showNotification(`⏰ 时间推进了${hours}小时`, 'info');
    }
}

// ==================== UI更新 ====================
function updateAllUI() {
    // 头部
    document.getElementById('headerCoins').textContent = GameState.system.coins;
    document.getElementById('headerLevel').textContent = `Lv.${GameState.system.level}`;
    document.getElementById('headerTime').textContent = formatShortTime();
    document.getElementById('headerCorruption').textContent = GameState.heroine.corruptionLevel;

    // 全局状态
    document.getElementById('gameTime').textContent = formatGameTime();
    document.getElementById('gameWeekday').textContent = GameState.gameTime.weekday;
    document.getElementById('gameLocation').textContent = GameState.environment.location;
    document.getElementById('outdoorTemp').textContent = `${GameState.environment.outdoorTemp}°C`;
    document.getElementById('indoorTemp').textContent = `${GameState.environment.indoorTemp}°C`;
    document.getElementById('weather').textContent = GameState.environment.weather;

    // 系统
    document.getElementById('systemLevel').textContent = `Lv.${GameState.system.level}`;
    document.getElementById('systemExp').textContent = `${GameState.system.exp} / ${GameState.system.expToNext}`;
    document.getElementById('systemCoins').textContent = `${GameState.system.coins} 💰`;

    // 避难所
    document.getElementById('shelterLevel').textContent = `Lv.${GameState.shelter.level} ${GameState.shelter.name}`;
    document.getElementById('inventoryList').innerHTML = GameState.shelter.items.map(item =>
        `<span class="inventory-item">${item}</span>`
    ).join('');

    // 能力
    const abilitiesList = document.getElementById('abilitiesList');
    if (GameState.abilities.length > 0) {
        abilitiesList.innerHTML = GameState.abilities.map(a => `
  <div class="ability-card">
    <div class="ability-name">${a.name}</div>
    <div class="ability-desc">${a.desc}</div>
  </div>
`).join('');
    } else {
        abilitiesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.75rem;">暂无特殊能力</div>';
    }

    // 女主角
    document.getElementById('heroineDisplayName').textContent = GameState.heroine.name;
    document.getElementById('heroineDisplayRelation').textContent = GameState.heroine.relation;
    document.getElementById('heroineDisplayAge').textContent = `${GameState.heroine.age}岁`;
    document.getElementById('heroineDisplayIdentity').textContent = GameState.heroine.identity;
    document.getElementById('heroineDisplayPersonality').textContent =
        GameState.heroine.personality.length > 0 ?
            GameState.heroine.personality.map(id => PersonalityTraits.find(t => t.id === id)?.name).join('、') : '-';

    // 堕落数据
    document.getElementById('corruptionStars').textContent = getCorruptionStars(GameState.heroine.corruptionLevel);
    document.getElementById('corruptionBar').style.width = `${GameState.heroine.corruptionExp}%`;
    document.getElementById('infidelityValue').textContent = `${GameState.heroine.infidelityValue}%`;
    document.getElementById('virginStatus').textContent = GameState.heroine.virginStatus;
    document.getElementById('cheatingCount').textContent = GameState.heroine.cheatingCount;

    // 性经验
    const stats = GameState.heroine.sexStats;
    const statsLabels = {
        oral: '口部侍奉', handjob: '手部侍奉', boobjob: '乳部侍奉', footjob: '足部侍奉',
        anal: '肛门性交', condomSex: '戴套性交', creampie: '无套内射', externalCum: '体外射精',
        threesome: '3P/乱交', intercrural: '素股',
        orgasms: '高潮次数', cumExtracted: '榨精(ml)'
    };
    document.getElementById('sexStatsGrid').innerHTML = Object.entries(stats).map(([key, value]) => `
<div class="sex-stat">
  <span class="status-label">${statsLabels[key]}</span>
  <span class="status-value ${value > 0 ? 'pink' : ''}">${value}</span>
</div>
      `).join('');

    updateTaskUI();

    if (document.getElementById('shopCoins')) {
        document.getElementById('shopCoins').textContent = `${GameState.system.coins} 💰`;
    }
}

function updateTaskUI() {
    // 每日任务
    const dailyContainer = document.getElementById('dailyTaskContainer');
    const task = GameState.currentTasks.daily;

    if (task) {
        const canRefresh = task.status === 'completed';
        dailyContainer.innerHTML = `
  <div class="task-card ${task.status === 'completed' ? 'completed' : ''}">
    <div class="task-header">
      <div class="task-type">💚 每日任务</div>
      <div class="task-level">${task.level}星难度</div>
    </div>
    <div class="task-content">${task.content}</div>
    <div class="task-rewards">
      <span class="task-reward coins">💰 +${task.rewards.coins}</span>
      <span class="task-reward exp">📈 +${task.rewards.exp}</span>
    </div>
    <span class="task-status ${task.status}">${task.status === 'pending' ? '进行中' : '已完成'}</span>
    <div class="task-actions">
      ${task.status === 'pending' ? `
        <button class="task-btn complete" onclick="completeTask('daily')">✅ 完成任务</button>
      ` : ''}
      <button class="task-btn refresh" onclick="generateDailyTask()" ${!canRefresh ? 'disabled' : ''}>
        🔄 ${canRefresh ? '刷新任务' : '完成后可刷新'}
      </button>
    </div>
  </div>
`;
    } else {
        dailyContainer.innerHTML = `
  <div class="task-card">
    <div class="task-content" style="color: var(--text-muted);">暂无任务</div>
    <div class="task-actions">
      <button class="task-btn refresh" onclick="generateDailyTask()">🔄 生成任务</button>
    </div>
  </div>
`;
    }

    // 悬赏任务
    const bountyContainer = document.getElementById('bountyTaskContainer');
    const bounty = GameState.currentTasks.bounty;
    const canShowBounty = isBountyDay();

    if (bounty) {
        const canRefresh = bounty.status === 'completed' && canShowBounty;
        bountyContainer.innerHTML = `
  <div class="task-card bounty ${bounty.status === 'completed' ? 'completed' : ''}">
    <div class="task-header">
      <div class="task-type">💛 悬赏任务</div>
      <div class="task-level">${bounty.level}星难度</div>
    </div>
    <div class="task-content">${bounty.content}</div>
    <div class="task-rewards">
      <span class="task-reward coins">💰 +${bounty.rewards.coins}</span>
      <span class="task-reward exp">📈 +${bounty.rewards.exp}</span>
    </div>
    <span class="task-status ${bounty.status}">${bounty.status === 'pending' ? '进行中' : '已完成'}</span>
    <div class="task-actions">
      ${bounty.status === 'pending' ? `
        <button class="task-btn complete" onclick="completeTask('bounty')">✅ 完成任务</button>
      ` : ''}
      ${canShowBounty ? `
        <button class="task-btn refresh" onclick="generateBountyTask()" ${!canRefresh ? 'disabled' : ''}>
          🔄 ${canRefresh ? '刷新悬赏' : '完成后可刷新'}
        </button>
      ` : ''}
    </div>
  </div>
`;
    } else if (canShowBounty) {
        bountyContainer.innerHTML = `
  <div class="task-card bounty">
    <div class="task-content" style="color: var(--text-muted);">今天是悬赏日！</div>
    <div class="task-actions">
      <button class="task-btn refresh" onclick="generateBountyTask()">🔄 生成悬赏任务</button>
    </div>
  </div>
`;
    } else {
        bountyContainer.innerHTML = `
  <div style="color: var(--text-muted); font-size: 0.75rem;">
    悬赏任务仅在周一/周四开放<br>
    当前: ${GameState.gameTime.weekday}
  </div>
`;
    }

    // 已完成任务
    const completedContainer = document.getElementById('completedTasksContainer');
    if (GameState.completedTasks.length > 0) {
        completedContainer.innerHTML = GameState.completedTasks.slice(-5).reverse().map(t => `
  <div class="task-card completed" style="opacity: 0.6;">
    <div class="task-content" style="font-size: 0.75rem;">${t.content}</div>
    <span class="task-status completed">✅ 已完成</span>
  </div>
`).join('');
    } else {
        completedContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.75rem;">暂无完成记录</div>';
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
}

// ==================== 消息系统 ====================
function addMessage(role, content, isSummary = false) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `message ${role}${isSummary ? ' summary' : ''}`;

    const messageIndex = GameState.chatHistory.length;
    const sender = role === 'user' ? GameState.protagonist.name : '系统叙述';
    const summaryBadge = isSummary ? '<span class="summary-badge">📝 剧情总结</span>' : '';

    div.innerHTML = `
<div class="message-sender">${sender}${summaryBadge}</div>
<div class="message-bubble">${formatContent(content)}</div>
      `;

    div.dataset.messageIndex = messageIndex;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    GameState.chatHistory.push({ role, content, isSummary: isSummary });

    if (isSummary) {
        GameState.summaryIndex = messageIndex;
        DebugLog.info('总结系统', '已创建总结，之前的消息将被屏蔽', { summaryIndex: messageIndex });
    }

    if (role === 'user') {
        GameState.lastUserMessageIndex = messageIndex;
    }

    DebugLog.info('消息系统', `添加${role === 'user' ? '用户' : 'AI'}消息`, {
        length: content.length,
        preview: content.substring(0, 100) + '...',
        isSummary: isSummary
    });

    updateLastMessageActions();
}

function updateLastMessageActions() {
    const container = document.getElementById('chatMessages');
    const messages = container.querySelectorAll('.message');

    messages.forEach(msg => {
        const actions = msg.querySelector('.message-actions');
        if (actions) actions.remove();
    });

    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const lastIndex = parseInt(lastMessage.dataset.messageIndex);
        const lastHistoryItem = GameState.chatHistory[lastIndex];

        if (lastHistoryItem) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';

            if (lastHistoryItem.role === 'assistant') {
                actionsDiv.innerHTML = `
      <button class="message-action-btn edit" onclick="editMessage(${lastIndex})">✏️ 编辑</button>
      <button class="message-action-btn regenerate" onclick="regenerateMessage()">🔄 重新生成</button>
    `;
            } else {
                actionsDiv.innerHTML = `
      <button class="message-action-btn edit" onclick="editMessage(${lastIndex})">✏️ 编辑</button>
    `;
            }

            lastMessage.appendChild(actionsDiv);
        }
    }
}

function editMessage(index) {
    const container = document.getElementById('chatMessages');
    const messages = container.querySelectorAll('.message');
    let targetMessage = null;

    messages.forEach(msg => {
        if (parseInt(msg.dataset.messageIndex) === index) {
            targetMessage = msg;
        }
    });

    if (!targetMessage) return;

    const historyItem = GameState.chatHistory[index];
    const bubble = targetMessage.querySelector('.message-bubble');
    const originalContent = historyItem.content;

    const actions = targetMessage.querySelector('.message-actions');
    if (actions) actions.style.display = 'none';

    const editContainer = document.createElement('div');
    editContainer.className = 'message-edit-container';
    editContainer.id = `edit-container-${index}`;
    editContainer.innerHTML = `
<textarea class="message-edit-textarea" id="edit-textarea-${index}">${originalContent}</textarea>
<div class="message-edit-actions">
  <button class="message-edit-btn cancel" onclick="cancelEdit(${index})">取消</button>
  <button class="message-edit-btn save" onclick="saveEdit(${index})">保存</button>
</div>
      `;

    bubble.style.display = 'none';
    targetMessage.appendChild(editContainer);

    document.getElementById(`edit-textarea-${index}`).focus();

    DebugLog.info('编辑系统', '开始编辑消息', { index: index });
}

function saveEdit(index) {
    const textarea = document.getElementById(`edit-textarea-${index}`);
    const newContent = textarea.value.trim();

    if (!newContent) {
        showNotification('消息内容不能为空', 'error');
        return;
    }

    GameState.chatHistory[index].content = newContent;

    const container = document.getElementById('chatMessages');
    const messages = container.querySelectorAll('.message');
    let targetMessage = null;

    messages.forEach(msg => {
        if (parseInt(msg.dataset.messageIndex) === index) {
            targetMessage = msg;
        }
    });

    if (targetMessage) {
        const bubble = targetMessage.querySelector('.message-bubble');
        bubble.innerHTML = formatContent(newContent);
        bubble.style.display = 'block';

        const editContainer = document.getElementById(`edit-container-${index}`);
        if (editContainer) editContainer.remove();

        const actions = targetMessage.querySelector('.message-actions');
        if (actions) actions.style.display = 'flex';
    }

    showNotification('✅ 消息已更新', 'success');
    DebugLog.success('编辑系统', '消息编辑完成', { index: index });
}

function cancelEdit(index) {
    const container = document.getElementById('chatMessages');
    const messages = container.querySelectorAll('.message');
    let targetMessage = null;

    messages.forEach(msg => {
        if (parseInt(msg.dataset.messageIndex) === index) {
            targetMessage = msg;
        }
    });

    if (targetMessage) {
        const bubble = targetMessage.querySelector('.message-bubble');
        bubble.style.display = 'block';

        const editContainer = document.getElementById(`edit-container-${index}`);
        if (editContainer) editContainer.remove();

        const actions = targetMessage.querySelector('.message-actions');
        if (actions) actions.style.display = 'flex';
    }

    DebugLog.info('编辑系统', '取消编辑', { index: index });
}

async function regenerateMessage() {
    let lastUserIndex = -1;
    for (let i = GameState.chatHistory.length - 1; i >= 0; i--) {
        if (GameState.chatHistory[i].role === 'user') {
            lastUserIndex = i;
            break;
        }
    }

    if (lastUserIndex === -1) {
        showNotification('没有找到用户消息', 'error');
        return;
    }

    const lastUserMessage = GameState.chatHistory[lastUserIndex].content;

    const lastIndex = GameState.chatHistory.length - 1;
    if (GameState.chatHistory[lastIndex].role === 'assistant') {
        GameState.chatHistory.pop();

        const container = document.getElementById('chatMessages');
        const messages = container.querySelectorAll('.message');
        if (messages.length > 0) {
            messages[messages.length - 1].remove();
        }
    }

    DebugLog.info('重新生成', '开始重新生成AI响应', { userMessage: lastUserMessage.substring(0, 50) + '...' });

    showTypingIndicator();
    document.getElementById('sendBtn').disabled = true;

    await sendToAI(lastUserMessage, true);

    document.getElementById('sendBtn').disabled = false;
}

function formatContent(content) {
    return content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/「(.+?)」/g, '<span style="color: var(--accent-cyan);">「$1」</span>')
        .replace(/（(.+?)）/g, '<span style="color: var(--text-muted); font-style: italic;">（$1）</span>');
}

function showTypingIndicator() {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = 'typingIndicator';
    div.innerHTML = `
<div class="message-sender">系统叙述</div>
<div class="typing-indicator">
  <div class="typing-dot"></div>
  <div class="typing-dot"></div>
  <div class="typing-dot"></div>
</div>
      `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// ==================== 总结系统 ====================
function prepareSummary() {
    const defaultSummaryPrompt = `请对之前的剧情进行总结，要求：

1. 概括主要剧情发展和关键事件
2. 记录女主角${GameState.heroine.name}的状态变化和心理转变
3. 总结已完成的任务和获得的奖励
4. 保留重要的角色关系和情感发展
5. 记录当前的游戏状态（位置、时间、资源等）

请用500-800字进行总结，保留关键细节以便后续剧情衔接。
总结完成后，在结尾添加【总结完成】标记。`;

    const input = document.getElementById('userInput');
    input.value = defaultSummaryPrompt;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    input.focus();

    showNotification('📝 总结提示词已填入，可以修改后发送', 'info');
    DebugLog.info('总结系统', '准备总结提示词');
}

// ==================== AI交互 ====================
async function sendToAI(userMessage, isRegenerate = false) {
    const systemPrompt = buildSystemPrompt();
    const messages = [
        { role: 'user', content: systemPrompt },
        { role: 'assistant', content: '明白，我将作为末世寝取生存游戏的叙事系统进行创作。' }
    ];

    let effectiveHistory = [];
    if (GameState.summaryIndex >= 0) {
        effectiveHistory = GameState.chatHistory.slice(GameState.summaryIndex);
        DebugLog.info('总结系统', '使用总结后的历史记录', {
            summaryIndex: GameState.summaryIndex,
            effectiveCount: effectiveHistory.length
        });
    } else {
        effectiveHistory = GameState.chatHistory.slice(-8);
    }

    const historyToUse = isRegenerate ? effectiveHistory.slice(0, -1) : effectiveHistory;

    for (const msg of historyToUse) {
        messages.push({ role: msg.role, content: msg.content });
    }

    if (!isRegenerate) {
        messages.push({ role: 'user', content: userMessage });
    }

    const fullPromptForLog = `=== System Prompt ===\n${systemPrompt}\n\n=== 历史消息 (${historyToUse.length}条) ===\n${historyToUse.map(m => `[${m.role}]: ${m.content.substring(0, 200)}...`).join('\n')}\n\n=== 当前用户消息 ===\n${userMessage}`;

    const logId = DebugLog.aiRequest('主对话', fullPromptForLog, GameState.model);

    try {
        let fullResponse = '';
        await dzmm.completions({
            model: GameState.model,
            messages: messages,
            maxTokens: 2000
        }, (content, done) => {
            fullResponse = content;
            if (done) {
                removeTypingIndicator();
                DebugLog.aiResponse(logId, fullResponse, true);
                processAIResponse(fullResponse, userMessage);
            }
        });
    } catch (error) {
        removeTypingIndicator();
        DebugLog.aiResponse(logId, null, false, error.message);
        DebugLog.error('AI交互', '主对话API请求失败', { error: error.message, userMessage: userMessage });
        addMessage('assistant', `❌ 发生错误: ${error.message}`);
    }
}

function buildSystemPrompt() {
    const p = GameState.protagonist;
    const h = GameState.heroine;

    const personalityText = h.personality.map(id => {
        const trait = PersonalityTraits.find(t => t.id === id);
        const desc = h.personalityDesc[id] || trait?.defaultDesc;
        return `${trait?.name}: ${desc}`;
    }).join('\n');

    return `你是末世寝取生存游戏的叙事AI。

【世界观】极寒末世，文明崩溃，户外有致命寒流。

【当前状态】时间: ${formatGameTime()} ${GameState.gameTime.weekday}

【主角】${p.name}，${p.age}岁，有淫妻癖倾向

【女主角】${h.name}，${h.age}岁，${h.identity}，主角的${h.relation}
- 淫乱等级: ${h.corruptionLevel}星
- 出轨值: ${h.infidelityValue}%
- 处女状态: ${h.virginStatus}
- 性格特点:
${personalityText || '无特殊设定'}

【当前任务】${GameState.currentTasks.daily ? GameState.currentTasks.daily.content : '暂无'}

【写作要求】
1. 描写详细生动，感官细节丰富
2. 对话口语化，性爱场景直白露骨
3. 女主角高潮时叫声夸张（哦齁齁、咿咿咿等）
4. 女主角独自执行任务，主角享受隐奸快感
5. 结尾用【状态变化】标注数值变动`;
}

function processAIResponse(response, userMessage) {
    const changes = parseStateChanges(response);
    if (changes) {
        applyStateChanges(changes);
        DebugLog.info('状态解析', '从AI响应中解析到状态变化', changes);
    }

    const isSummary = response.includes('【总结完成】') || userMessage.includes('请对之前的剧情进行总结');

    addMessage('assistant', response, isSummary);
    updateAllUI();
}

function parseStateChanges(response) {
    const changes = {};
    const coinMatch = response.match(/寝取币\s*[+＋]\s*(\d+)/);
    if (coinMatch) changes.coins = parseInt(coinMatch[1]);
    const expMatch = response.match(/经验\s*[+＋]\s*(\d+)/);
    if (expMatch) changes.exp = parseInt(expMatch[1]);
    const infMatch = response.match(/出轨值\s*[+＋]\s*(\d+)/);
    if (infMatch) changes.infidelity = parseInt(infMatch[1]);
    return Object.keys(changes).length > 0 ? changes : null;
}

function applyStateChanges(changes) {
    if (changes.coins) {
        GameState.system.coins += changes.coins;
        showNotification(`💰 +${changes.coins} 寝取币`, 'success');
    }
    if (changes.exp) {
        GameState.system.exp += changes.exp;
        while (GameState.system.exp >= GameState.system.expToNext) {
            GameState.system.exp -= GameState.system.expToNext;
            GameState.system.level++;
            GameState.system.expToNext = Math.floor(GameState.system.expToNext * 1.5);
            showNotification(`🎉 升级到 Lv.${GameState.system.level}！`, 'success');
            DebugLog.success('升级系统', `从AI响应升级到 Lv.${GameState.system.level}`);
        }
    }
    if (changes.infidelity) {
        GameState.heroine.infidelityValue = Math.min(100, GameState.heroine.infidelityValue + changes.infidelity);
    }
}

// ==================== 商店系统（带缓存） ====================
async function searchShop() {
    const query = document.getElementById('shopSearchInput').value.trim();
    if (!query) {
        showNotification('请输入搜索内容', 'error');
        return;
    }

    const resultsContainer = document.getElementById('shopResults');
    const searchBtn = document.getElementById('shopSearchBtn');

    // 检查缓存中是否已有该搜索结果
    if (GameState.shopCache[query]) {
        DebugLog.info('商店系统', '从缓存中加载商品', { query: query, count: GameState.shopCache[query].length });
        displayShopItems(GameState.shopCache[query]);
        showNotification('📦 已从缓存加载商品', 'info');
        return;
    }

    searchBtn.disabled = true;
    resultsContainer.innerHTML = `
<div class="shop-loading">
  <div class="shop-loading-spinner"></div>
  正在搜索商品...
</div>
      `;

    DebugLog.info('商店系统', '开始搜索商品', { query: query });

    const prompt = `你是末世寝取生存游戏的商店系统。玩家搜索: "${query}"

请生成3-4个相关商品，严格按照JSON数组格式返回：
[
  {"name": "商品名", "desc": "描述20-40字", "price": 价格10-500, "effect": "效果描述"}
]

商品要符合现实(除非玩家搜索超自然物品)，只返回JSON数组。`;

    const logId = DebugLog.aiRequest('商店搜索', prompt, GameState.model);

    try {
        let fullResponse = '';
        await dzmm.completions({
            model: GameState.model,
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 800
        }, (content, done) => {
            fullResponse = content;
            if (done) {
                DebugLog.aiResponse(logId, fullResponse, true);

                try {
                    const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        const items = JSON.parse(jsonMatch[0]);

                        // 保存到缓存
                        GameState.shopCache[query] = items;

                        // 添加到搜索历史（避免重复）
                        if (!GameState.shopSearchHistory.includes(query)) {
                            GameState.shopSearchHistory.unshift(query);
                            // 只保留最近10条搜索历史
                            if (GameState.shopSearchHistory.length > 10) {
                                GameState.shopSearchHistory.pop();
                            }
                        }

                        displayShopItems(items);
                        updateShopHistory();
                        DebugLog.success('商店系统', '商品搜索成功并已缓存', { count: items.length, items: items });
                    } else {
                        throw new Error('无法从响应中解析JSON数组');
                    }
                } catch (e) {
                    DebugLog.error('商店系统', '商品JSON解析失败', {
                        error: e.message,
                        response: fullResponse
                    });
                    resultsContainer.innerHTML = `<div class="shop-empty">生成失败，请重试</div>`;
                }
                searchBtn.disabled = false;
            }
        });
    } catch (error) {
        DebugLog.aiResponse(logId, null, false, error.message);
        DebugLog.error('商店系统', '商品搜索API请求失败', { error: error.message });
        resultsContainer.innerHTML = `<div class="shop-empty">搜索失败: ${error.message}</div>`;
        searchBtn.disabled = false;
    }
}

// 从历史记录快速搜索
function quickSearchFromHistory(query) {
    document.getElementById('shopSearchInput').value = query;
    searchShop();
}

// 更新搜索历史显示
function updateShopHistory() {
    const container = document.getElementById('shopHistoryContainer');
    const tagsContainer = document.getElementById('shopHistoryTags');

    if (GameState.shopSearchHistory.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    tagsContainer.innerHTML = GameState.shopSearchHistory.map(query => `
<span class="shop-history-tag" onclick="quickSearchFromHistory('${query}')">${query}</span>
      `).join('');
}

function displayShopItems(items) {
    const container = document.getElementById('shopResults');
    const coins = GameState.system.coins;

    container.innerHTML = items.map((item, i) => `
<div class="shop-item" id="shop-item-${i}">
  <div class="shop-item-header">
    <div class="shop-item-name">${item.name}</div>
    <div class="shop-item-price">💰 ${item.price}</div>
  </div>
  <div class="shop-item-desc">${item.desc}</div>
  <div class="shop-item-effect">✨ ${item.effect}</div>
  <button class="shop-item-btn" onclick="buyItem(${i}, '${encodeURIComponent(JSON.stringify(item))}')"
          ${coins < item.price ? 'disabled' : ''}>
    ${coins < item.price ? '余额不足' : '购买'}
  </button>
</div>
      `).join('');
}

function buyItem(index, encodedItem) {
    const item = JSON.parse(decodeURIComponent(encodedItem));
    if (GameState.system.coins < item.price) {
        showNotification('寝取币不足！', 'error');
        DebugLog.warning('商店系统', '购买失败：余额不足', { item: item.name, price: item.price, coins: GameState.system.coins });
        return;
    }

    GameState.system.coins -= item.price;

    if (item.effect.includes('能力') || item.effect.includes('永久') || item.effect.includes('提升')) {
        GameState.abilities.push({ name: item.name, desc: item.effect });
        DebugLog.info('商店系统', '获得新能力', { name: item.name, effect: item.effect });
    } else {
        GameState.shelter.items.push(item.name);
        DebugLog.info('商店系统', '获得新物品', { name: item.name });
    }

    GameState.purchaseHistory.push({ name: item.name, price: item.price });
    updateAllUI();

    const btn = document.querySelector(`#shop-item-${index} .shop-item-btn`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = '✅ 已购买';
    }

    showNotification(`✅ 购买成功: ${item.name}`, 'success');
    DebugLog.success('商店系统', '购买成功', { item: item.name, price: item.price });
}

function openShop() {
    document.getElementById('shopModal').classList.add('active');
    document.getElementById('shopCoins').textContent = `${GameState.system.coins} 💰`;
    document.getElementById('shopSearchInput').value = '';
    document.getElementById('shopResults').innerHTML = `<div class="shop-empty">🛍️ 输入关键词搜索商品</div>`;
    updateShopHistory();
    DebugLog.info('商店系统', '打开商店');
}

function closeShop() {
    document.getElementById('shopModal').classList.remove('active');
}

// ==================== 存档系统 ====================
function openSaveModal() {
    document.getElementById('saveModal').classList.add('active');
    renderSaveSlots();
    DebugLog.info('存档系统', '打开存档管理');
}

function closeSaveModal() {
    document.getElementById('saveModal').classList.remove('active');
}

function renderSaveSlots() {
    const container = document.getElementById('saveSlots');

    for (let i = 0; i < 3; i++) {
        const saved = localStorage.getItem(`ntrGame_slot_${i}`);
        if (saved) {
            try {
                GameState.saves[i] = JSON.parse(saved);
            } catch (e) {
                GameState.saves[i] = null;
                DebugLog.error('存档系统', `存档槽位${i}读取失败`, { error: e.message });
            }
        }
    }

    container.innerHTML = GameState.saves.map((save, i) => {
        if (save) {
            return `
    <div class="save-slot">
      <div class="save-slot-header">
        <div class="save-slot-name">存档 ${i + 1}</div>
        <div class="save-slot-time">${save.savedAt || '未知时间'}</div>
      </div>
      <div class="save-slot-info">
        ${save.protagonist?.name || '未知'} & ${save.heroine?.name || '未知'}<br>
        Lv.${save.system?.level || 1} | 💰${save.system?.coins || 0} | ⭐${save.heroine?.corruptionLevel || 1}
      </div>
      <div class="save-slot-actions">
        <button class="save-slot-btn save" onclick="saveToSlot(${i})">覆盖</button>
        <button class="save-slot-btn load" onclick="loadFromSlot(${i})">读取</button>
        <button class="save-slot-btn delete" onclick="deleteSlot(${i})">删除</button>
      </div>
    </div>
  `;
        } else {
            return `
    <div class="save-slot">
      <div class="save-slot-header">
        <div class="save-slot-name">存档 ${i + 1}</div>
      </div>
      <div class="save-slot-info save-slot-empty">空存档</div>
      <div class="save-slot-actions">
        <button class="save-slot-btn save" onclick="saveToSlot(${i})">保存</button>
        <button class="save-slot-btn load" disabled>读取</button>
        <button class="save-slot-btn delete" disabled>删除</button>
      </div>
    </div>
  `;
        }
    }).join('');
}

function saveToSlot(slot) {
    try {
        const saveData = JSON.parse(JSON.stringify(GameState));
        saveData.savedAt = formatGameTime();
        saveData.saves = undefined;

        localStorage.setItem(`ntrGame_slot_${slot}`, JSON.stringify(saveData));
        GameState.saves[slot] = saveData;

        renderSaveSlots();
        showNotification(`✅ 已保存到存档 ${slot + 1}`, 'success');
        DebugLog.success('存档系统', `保存到存档槽位 ${slot + 1}`, { savedAt: saveData.savedAt });
    } catch (e) {
        DebugLog.error('存档系统', `保存到存档槽位${slot + 1}失败`, { error: e.message });
        showNotification('❌ 保存失败', 'error');
    }
}

function loadFromSlot(slot) {
    const saved = localStorage.getItem(`ntrGame_slot_${slot}`);
    if (!saved) {
        showNotification('存档不存在', 'error');
        DebugLog.warning('存档系统', `存档槽位${slot + 1}不存在`);
        return;
    }

    try {
        const saveData = JSON.parse(saved);
        const currentSaves = GameState.saves;

        Object.assign(GameState, saveData);
        GameState.saves = currentSaves;

        // 确保新增的字段有默认值
        if (!GameState.shopCache) GameState.shopCache = {};
        if (!GameState.shopSearchHistory) GameState.shopSearchHistory = [];

        renderChatHistory();

        updateAllUI();
        closeSaveModal();
        showNotification(`✅ 已加载存档 ${slot + 1}`, 'success');
        DebugLog.success('存档系统', `加载存档槽位 ${slot + 1}`, { savedAt: saveData.savedAt });
    } catch (e) {
        DebugLog.error('存档系统', `加载存档槽位${slot + 1}失败`, { error: e.message });
        showNotification('存档损坏', 'error');
    }
}

function renderChatHistory() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';

    GameState.chatHistory.forEach((msg, index) => {
        const div = document.createElement('div');
        div.className = `message ${msg.role}${msg.isSummary ? ' summary' : ''}`;
        div.dataset.messageIndex = index;

        const sender = msg.role === 'user' ? GameState.protagonist.name : '系统叙述';
        const summaryBadge = msg.isSummary ? '<span class="summary-badge">📝 剧情总结</span>' : '';

        div.innerHTML = `
  <div class="message-sender">${sender}${summaryBadge}</div>
  <div class="message-bubble">${formatContent(msg.content)}</div>
`;

        container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
    updateLastMessageActions();
}

function deleteSlot(slot) {
    if (!confirm(`确定要删除存档 ${slot + 1} 吗？`)) return;

    localStorage.removeItem(`ntrGame_slot_${slot}`);
    GameState.saves[slot] = null;

    renderSaveSlots();
    showNotification(`🗑️ 已删除存档 ${slot + 1}`, 'info');
    DebugLog.info('存档系统', `删除存档槽位 ${slot + 1}`);
}

// ==================== 模型设置 ====================
function openModelModal() {
    document.getElementById('modelModal').classList.add('active');
    document.getElementById('inGameModelSelect').value = GameState.model;
    document.getElementById('currentModelDisplay').textContent = GameState.model;
}

function closeModelModal() {
    document.getElementById('modelModal').classList.remove('active');
}

function applyModel() {
    const oldModel = GameState.model;
    GameState.model = document.getElementById('inGameModelSelect').value;
    document.getElementById('currentModelDisplay').textContent = GameState.model;
    closeModelModal();
    showNotification(`✅ 已切换到: ${GameState.model}`, 'success');
    DebugLog.info('模型设置', `切换模型: ${oldModel} -> ${GameState.model}`);
}

// ==================== 用户交互 ====================
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    input.style.height = 'auto';

    addMessage('user', message);
    showTypingIndicator();
    document.getElementById('sendBtn').disabled = true;

    await sendToAI(message);

    document.getElementById('sendBtn').disabled = false;
}

function quickAction(action) {
    document.getElementById('userInput').value = action;
    sendMessage();
    DebugLog.info('快捷操作', `执行快捷操作: ${action}`);
}

// ==================== 游戏启动 ====================
async function startGame() {
    DebugLog.info('游戏启动', '开始初始化游戏...');

    GameState.model = document.getElementById('modelSelect').value;
    GameState.protagonist.name = document.getElementById('protagonistName').value || '陈默';
    let pAge = parseInt(document.getElementById('protagonistAge').value) || 22;
    GameState.protagonist.age = Math.max(18, pAge);
    GameState.heroine.name = document.getElementById('heroineName').value || '林雨晴';
    let hAge = parseInt(document.getElementById('heroineAge').value) || 21;
    GameState.heroine.age = Math.max(18, hAge);
    GameState.heroine.relation = document.getElementById('heroineRelation').value || '女友';
    GameState.heroine.identity = document.getElementById('heroineIdentity').value || '大学校花';

    const virginSelect = document.getElementById('virginSelect').value;
    if (virginSelect === 'yes') {
        GameState.heroine.virginStatus = '完璧';
    } else {
        const selectedOption = document.querySelector('.radio-option.selected input');
        if (selectedOption) {
            const value = selectedOption.value;
            if (value === 'protagonist') {
                GameState.heroine.virginStatus = `被${GameState.protagonist.name}夺走`;
            } else if (value === 'other') {
                GameState.heroine.virginStatus = '被其他人夺走';
            } else if (value === 'custom') {
                GameState.heroine.virginStatus = document.getElementById('customVirginText').value || '被其他人夺走';
            }
        } else {
            GameState.heroine.virginStatus = '被其他人夺走';
        }
    }

    const selectedTags = document.querySelectorAll('.personality-tag.selected');
    GameState.heroine.personality = Array.from(selectedTags).map(tag => tag.dataset.id);

    DebugLog.success('游戏启动', '角色设置完成', {
        protagonist: GameState.protagonist,
        heroine: {
            name: GameState.heroine.name,
            age: GameState.heroine.age,
            relation: GameState.heroine.relation,
            identity: GameState.heroine.identity,
            personality: GameState.heroine.personality,
            virginStatus: GameState.heroine.virginStatus
        },
        model: GameState.model
    });

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';

    updateAllUI();

    DebugLog.info('游戏启动', '开始生成初始任务...');
    await generateDailyTask();

    showTypingIndicator();

    const personalityText = GameState.heroine.personality.map(id => {
        const trait = PersonalityTraits.find(t => t.id === id);
        return trait?.name;
    }).filter(Boolean).join('、') || '普通';

    const openingPrompt = `游戏开始。生成开场剧情：

主角${GameState.protagonist.name}（${GameState.protagonist.age}岁）在末日寒流后，与${GameState.heroine.relation}${GameState.heroine.name}（${GameState.heroine.age}岁，${GameState.heroine.identity}，性格：${personalityText}）躲在避难所内。

女主角处女状态：${GameState.heroine.virginStatus}

描写：
1. 避难所环境
2. 两人的亲密互动（体现女主角的性格特点）
3. 系统首次激活
4. 提醒用户查看侧边栏的任务

叙事细腻，对话生动。`;

    DebugLog.info('游戏启动', '开始生成开场剧情...');
    await sendToAI(openingPrompt);
    DebugLog.success('游戏启动', '游戏初始化完成');
}

// ==================== 事件监听 ====================
document.getElementById('userInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

document.getElementById('userInput').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('active');
    });
});

// ==================== 初始化 ====================
initPersonalityTags();
DebugLog.info('系统初始化', '页面加载完成，等待用户开始游戏');

function handleResize() {
    const panel = document.getElementById('sidePanel');
    const chat = document.getElementById('chatContainer');
    const overlay = document.getElementById('mobileOverlay');
    const btn = document.getElementById('togglePanelBtn');

    if (isMobile()) {
        panel.classList.remove('collapsed');
        chat.classList.remove('expanded');
        if (!panel.classList.contains('mobile-visible')) {
            overlay.classList.remove('active');
            btn.classList.remove('active');
        }
    } else {
        panel.classList.remove('mobile-visible');
        overlay.classList.remove('active');
        btn.classList.remove('active');
        panel.classList.remove('collapsed');
        chat.classList.remove('expanded');
    }
}

window.addEventListener('resize', handleResize);
handleResize();

if (typeof dzmm === 'undefined') {
    DebugLog.error('系统初始化', 'dzmm对象未定义，AI功能将无法使用', {
        hint: '请确保在支持dzmm的环境中运行'
    });
} else {
    DebugLog.success('系统初始化', 'dzmm对象已就绪');
}