// 通知父窗口 iframe 已准备好
if (window.parent !== window) {
    window.parent.postMessage('iframe:content-ready', '*');
}

function isDzmmInjected() {
    return !!(window.dzmm && window.dzmm.completions && window.dzmm.chat && window.dzmm.kv);
}

const dzmmReady = new Promise((resolve) => {
    if (isDzmmInjected()) return resolve('injected');

    const handler = (event) => {
        if (event.data?.type === 'dzmm:ready') {
            window.removeEventListener('message', handler);
            resolve('message');
        }
    };
    window.addEventListener('message', handler);

    const t0 = Date.now();
    const timer = setInterval(() => {
        if (isDzmmInjected()) {
            clearInterval(timer);
            window.removeEventListener('message', handler);
            resolve('poll');
            return;
        }
        if (Date.now() - t0 > 3000) {
            clearInterval(timer);
            window.removeEventListener('message', handler);
            resolve('timeout');
        }
    }, 60);
});

document.addEventListener('alpine:init', () => {
                Alpine.store('game', {
                    // ------------------------------
                    // 基础状态
                    // ------------------------------
                    started: false,
                    disabled: false,
                    loading: true,
                    inspectCostFaith: 20,
                    // 设置
                    godName: '',
                    model: 'nalang-xl-0826',
                    startEraIndex: 0,

                    // 游戏变量（会存档恢复）
                    mode: 'god', // 'god' | 'incarnate'
                    eraIndex: 0, // 0..4
                    faith: 100,
                    faithMax: 100,
                    progress: 0,
                    chat_content: '',
                    oracleInput: '',

                    // 异教徒
                    heretic: {
                        active: false,
                        name: '',
                        vibe: '',
                        hatred: '极端敌视'
                    },

                    // 侦查文明列表（同科技水平）
                    tribes: [], // [{id,name,era,population,trait,summary,godName,godDesc}]
                    warTargetId: null,

                    // 本地维护的上下文（替代 timeline）
                    history: [], // [{role, content}]
                    tailId: null,

                    // 上一次模型输出正文（可用于扩展作图；这里不做随时作图按钮）
                    lastModelText: '',

                    // 上次行动记录
                    lastAction: { type: '', faithDeltaText: '', progressDeltaText: '' },

                    // 弹窗
                    modal: { open: false, title: '', text: '', imageUrl: '', tip: '' },

                    // 抽屉
                    tribeDrawer: { open: false },

                    // 手动存档管理
                    saveManager: { open: false, fromSetup: false, summaries: { 1: null, 2: null, 3: null } },

                    openSaveManager(fromSetup) {
                        this.saveManager.open = true;
                        this.saveManager.fromSetup = !!fromSetup;
                        this.refreshSaveSummaries();
                    },

                    openTribeDrawer() { this.tribeDrawer.open = true; },

                    // ------------------------------
                    // 常量/工具
                    // ------------------------------
                    eras: ['原始时代', '封建时代', '蒸汽时代', '科技时代', '后科技时代'],
                    eraName() { return this.eras[this.eraIndex] || '未知时代'; },
                    modeName() { return this.mode === 'god' ? '神明状态' : '降临状态'; },

                    progressMax() {
                        // 时代越高，推进阈值稍大（可按需调）
                        const base = 100;
                        return base + this.eraIndex * 100;
                    },



                    faithPct() { return Math.max(0, Math.min(100, (this.faith / this.faithMax) * 100)); },
                    progressPct() { return Math.max(0, Math.min(100, (this.progress / this.progressMax()) * 100)); },

                    canAdvanceEra() { return this.eraIndex < 4 && this.progress >= this.progressMax(); },
                    canWar() { return this.mode === 'god' && this.faith >= this.faithMax && !!this.warTargetId; },

                    // 抽取 dzmm insert last id
                    extractLastId(result) {
                        const ids = result?.ids || result?.data?.ids || result?.result?.ids;
                        if (Array.isArray(ids) && ids.length) return ids[ids.length - 1];
                        if (result?.id) return result.id;
                        if (result?.data?.id) return result.data.id;
                        return null;
                    },

                    // ✅ Promise 包装：稳定等待 done
                    callCompletions({ model, messages, maxTokens }) {
                        return new Promise((resolve, reject) => {
                            try {
                                let finalText = '';
                                window.dzmm.completions(
                                    { model, messages, maxTokens },
                                    (newContent, done) => {
                                        if (typeof newContent === 'string') finalText = newContent;
                                        if (done) resolve((finalText || '').trim());
                                    }
                                );
                            } catch (e) {
                                reject(e);
                            }
                        });
                    },

                    // ------------------------------
                    // kv / localStorage 工具
                    // ------------------------------
                    slotKey(slot) { return `godsim_manual_slot_${slot}`; },

                    async kvPut(key, value) {
                        try { await window.dzmm.kv.put(key, value); }
                        catch (e) { localStorage.setItem(key, JSON.stringify(value)); }
                    },

                    async kvGet(key) {
                        try {
                            const data = await window.dzmm.kv.get(key);
                            return data?.value ?? null;
                        } catch (e) {
                            const raw = localStorage.getItem(key);
                            if (!raw) return null;
                            try { return JSON.parse(raw); } catch { return raw; }
                        }
                    },

                    // ------------------------------
                    // 图片池（请替换为你自己的图床 URL）
                    // ------------------------------
                    victoryImagePool: [
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-19-26-goddess,re-452323481-0.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-19-26-goddess,re-452323483-2.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-19-26-goddess,re-452323484-3.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-20-40-goddess,re-3359412252-0.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-20-40-goddess,re-3359412253-1.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-20-40-goddess,re-3359412254-2.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-20-40-goddess,re-3359412255-3.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-20-59-goddess,re-3691551512-0.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-20-59-goddess,re-3691551513-1.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-20-59-goddess,re-3691551514-2.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-20-59-goddess,re-3691551515-3.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-21-43-goddess,re-2421242398-0.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-21-43-goddess,re-2421242399-1.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-21-43-goddess,re-2421242400-2.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-21-43-goddess,re-2421242401-3.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-22-24-goddess,re-3820913277-0.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-22-24-goddess,re-3820913278-1.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-22-24-goddess,re-3820913280-3.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-23-37-goddess,re-1791024636-2.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E7%A5%9E%E5%8A%9B%E5%A4%BA%E5%8F%96/TA-2026-01-06-15-23-37-goddess,re-1791024637-3.png?raw=true'
                    ],
                    hereticImagePool: [
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-28-36-Ared-robed-1427612801-0.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-28-36-Ared-robed-1427612802-1.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-28-36-Ared-robed-1427612803-2.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-28-36-Ared-robed-1427612804-3.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-32-05-Ared-robed-2775752677-0.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-32-05-Ared-robed-2775752679-2.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-32-05-Ared-robed-2775752680-3.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-33-06-Awoman.bon-1605437539-2.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-33-54-Awoman.bon-2169044214-0.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-33-54-Awoman.bon-2169044215-1.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-33-54-Awoman.bon-2169044217-3.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-34-26-Awoman.bon-3045534626-0.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-34-26-Awoman.bon-3045534627-1.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-34-26-Awoman.bon-3045534628-2.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-34-42-Awoman.bon-2375325893-0.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-34-42-Awoman.bon-2375325894-1.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-34-42-Awoman.bon-2375325895-2.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-34-56-Awoman.bon-332643960-0.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-34-56-Awoman.bon-332643962-2.png?raw=true',
                        'https://github.com/UGentertainment/god1/blob/main/%E5%BC%82%E7%AB%AF/TA-2026-01-06-15-34-56-Awoman.bon-332643963-3.png?raw=true'
                    ],
                    inspectPoolsByEra: {
                        0: ['https://github.com/UGentertainment/god1/blob/main/%E5%8E%9F%E5%A7%8B/TA-2026-01-06-16-03-34-Aprehistor-2862382287-1.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%8E%9F%E5%A7%8B/TA-2026-01-06-16-05-17-1woman,1hu-2222525808-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%8E%9F%E5%A7%8B/TA-2026-01-06-16-05-17-1woman,1hu-2222525809-1.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%8E%9F%E5%A7%8B/TA-2026-01-06-16-05-17-1woman,1hu-2222525810-2.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%8E%9F%E5%A7%8B/TA-2026-01-06-16-05-17-1woman,1hu-2222525811-3.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%8E%9F%E5%A7%8B/TA-2026-01-06-16-07-01-1woman,1hu-614093724-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%8E%9F%E5%A7%8B/TA-2026-01-06-16-07-01-1woman,1hu-614093725-1.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%8E%9F%E5%A7%8B/TA-2026-01-06-16-07-01-1woman,1hu-614093726-2.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%8E%9F%E5%A7%8B/TA-2026-01-06-16-07-05-1woman,1hu-3758959099.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%8E%9F%E5%A7%8B/TA-2026-01-06-16-08-29-1woman,1hu-1908069586.png?raw=true'],
                        1: ['https://github.com/UGentertainment/god1/blob/main/%E5%B0%81%E5%BB%BA/TA-2026-01-06-15-40-52-thewomanto-3127497769-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%B0%81%E5%BB%BA/TA-2026-01-06-15-40-52-thewomanto-3127497771-2.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%B0%81%E5%BB%BA/TA-2026-01-06-15-41-48-thewomanto-3616556455-1.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%B0%81%E5%BB%BA/TA-2026-01-06-15-43-24-thewomanto-1713165089-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%B0%81%E5%BB%BA/TA-2026-01-06-15-43-24-thewomanto-1713165091-2.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%B0%81%E5%BB%BA/TA-2026-01-06-15-44-16-thewomanto-3652579952-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%B0%81%E5%BB%BA/TA-2026-01-06-15-44-16-thewomanto-3652579954-2.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%B0%81%E5%BB%BA/TA-2026-01-06-15-45-13-thewomanto-1717672119-2.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%B0%81%E5%BB%BA/TA-2026-01-06-15-45-17-thewomanto-2888679558-3.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E5%B0%81%E5%BB%BA/TA-2026-01-06-15-45-54-thewomanto-2712976030-0.png?raw=true'],
                        2: ['https://github.com/UGentertainment/god1/blob/main/%E8%92%B8%E6%B1%BD/TA-2026-01-06-15-40-52-thewomanto-3127497772-3.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E8%92%B8%E6%B1%BD/TA-2026-01-06-15-41-48-thewomanto-3616556457-3.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E8%92%B8%E6%B1%BD/TA-2026-01-06-15-42-51-thewomanto-3585987005-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E8%92%B8%E6%B1%BD/TA-2026-01-06-15-42-51-thewomanto-3585987008-3.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E8%92%B8%E6%B1%BD/TA-2026-01-06-15-43-24-thewomanto-1713165090-1.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E8%92%B8%E6%B1%BD/TA-2026-01-06-15-43-24-thewomanto-1713165092-3.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E8%92%B8%E6%B1%BD/TA-2026-01-06-15-45-13-thewomanto-1717672117-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E8%92%B8%E6%B1%BD/TA-2026-01-06-15-45-13-thewomanto-1717672120-3.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E8%92%B8%E6%B1%BD/TA-2026-01-06-15-45-17-thewomanto-2888679555-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E8%92%B8%E6%B1%BD/TA-2026-01-06-15-45-54-thewomanto-2712976031-1.png?raw=true'],
                        3: ['https://github.com/UGentertainment/god1/blob/main/%E7%8E%B0%E4%BB%A3/TA-2026-01-06-16-11-40-1ol,office-1016728680-1.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E7%8E%B0%E4%BB%A3/TA-2026-01-06-16-12-26-1ol,office-2577752127-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E7%8E%B0%E4%BB%A3/TA-2026-01-06-16-12-26-1ol,office-2577752129-2.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E7%8E%B0%E4%BB%A3/TA-2026-01-06-16-12-26-1ol,office-2577752130-3.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E7%8E%B0%E4%BB%A3/TA-2026-01-06-16-13-17-1ol,office-1566296875-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E7%8E%B0%E4%BB%A3/TA-2026-01-06-16-13-17-1ol,office-1566296877-2.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E7%8E%B0%E4%BB%A3/TA-2026-01-06-16-13-36-1ol,office-1849459382-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E7%8E%B0%E4%BB%A3/TA-2026-01-06-16-13-36-1ol,office-1849459383-1.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E7%8E%B0%E4%BB%A3/TA-2026-01-06-16-13-36-1ol,office-1849459384-2.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E7%8E%B0%E4%BB%A3/TA-2026-01-06-16-15-41-1ol,office-2839985690.png?raw=true'],
                        4: ['https://github.com/UGentertainment/god1/blob/main/%E6%9C%AA%E6%9D%A5/TA-2026-01-06-16-18-59-Futurepeop-3214344803.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E6%9C%AA%E6%9D%A5/TA-2026-01-06-16-19-38-Futurepeop-422853292-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E6%9C%AA%E6%9D%A5/TA-2026-01-06-16-19-59-Futurepeop-3330990106-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E6%9C%AA%E6%9D%A5/TA-2026-01-06-16-19-59-Futurepeop-3330990107-1.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E6%9C%AA%E6%9D%A5/TA-2026-01-06-16-20-45-Futurepeop-339868317-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E6%9C%AA%E6%9D%A5/TA-2026-01-06-16-20-45-Futurepeop-339868319-2.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E6%9C%AA%E6%9D%A5/TA-2026-01-06-16-21-02-Futurepeop-2045930818-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E6%9C%AA%E6%9D%A5/TA-2026-01-06-16-21-02-Futurepeop-2045930819-1.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E6%9C%AA%E6%9D%A5/TA-2026-01-06-16-22-25-1woman,1ma-2062431167-0.png?raw=true',
                            'https://github.com/UGentertainment/god1/blob/main/%E6%9C%AA%E6%9D%A5/TA-2026-01-06-16-22-25-1woman,1ma-2062431168-1.png?raw=true']
                    },

                    pickFrom(arr, fallbackSeed) {
                        const a = Array.isArray(arr) ? arr : [];
                        if (!a.length) return `https://picsum.photos/seed/${fallbackSeed || 'fallback'}/768/1024`;
                        return a[Math.floor(Math.random() * a.length)];
                    },

                    pickVictoryImage() { return this.pickFrom(this.victoryImagePool, 'victory_fallback'); },
                    pickHereticImage() { return this.pickFrom(this.hereticImagePool, 'heretic_fallback'); },
                    pickInspectImage() {
                        const arr = this.inspectPoolsByEra?.[this.eraIndex] || [];
                        return this.pickFrom(arr, 'inspect_fallback');
                    },

                    // ------------------------------
                    // 系统提示词（模型只写文）
                    // ------------------------------
                    createSystemPrompt() {
                        const GOD_PROMPT = `你正在为文字游戏《创世神：部族进步模拟器》撰写叙事文本。

【定位】
- 你是旁白/叙述者，史诗、神秘、具象，有画面感。
- 你不做任何数值计算；信仰/进步点/模式/时代/战争结果/异教徒状态都以我提供的“本地事实包”为准。
- 禁止描写任何玩家（{{user}}）的台词；玩家只以“神意/目光/手势/降临”等被动方式呈现。

【输出格式（必须严格三段）】
（第一段）【结果】……（写本次行动造成的结果、氛围变化、臣民反应，200字左右）
（第二段）【世界】……（补一段世界细节：制度、器物、信仰仪式、冲突苗头等，贴合当前时代，400字左右）
（第三段）【对白】人物名：“台词”（必须以一句台词收尾；台词可以来自祭司、异教徒、敌国使者、工匠、军头等）

【时代风格提示】
- 原始时代：部落、图腾、血火、饥荒、巫祝
- 封建时代：城寨、领主、宗教体系、税赋、铁器
- 蒸汽时代：煤烟、工坊、铁路雏形、报纸、机器
- 科技时代：电网、工厂、广播、现代军备、官僚
- 后科技时代：智能体、合成材料、巨构、意识协议、超然仪式

记住：只输出三段正文，不要输出STATE/JSON/代码/标题。`;
                        // 降临状态（人形在场那套）
                        const INCARNATE_PROMPT = `你正在为文字游戏《淫乱纪元：发展文明抢女神》撰写叙事文本。
神明名为${this.godName}
【定位（降临状态专用）】
- 当前模式为“降临”：神以人类形态在神庙/城镇/营地中行走，与臣民同在。
- 允许大量近景细节（人群、气味、器物、服饰、街巷/营帐/工坊），所有臣民对神明保持极高崇敬。
- 随机生成一位女性祭司，描写其发型，外貌，身材，气质，接待神明，态度极其恭敬
- 你不做任何数值计算；信仰/进步点/时代/异教徒状态等都以我提供的“本地事实包”为准。
- 禁止出现玩家神明的台词；也不要写“玩家做了某个明确动作”。你只能写“降临之神的沉默、目光、存在感”带来的影响。
<Notes>
- When writing sex scenes, keep them erotic, lengthy, detailed, and direct.
- When characters are naked or engaging in sexual acts, describe their body types and sexual organs in detail.
- Character settings should be dynamically adjusted based on chat logs to maintain consistency and continuity.
- 每次生成度最少600token
- 每次生成度最少600字数
记住：只输出正文，不要输出STATE/JSON/代码/标题。`;

                        return (this.mode === 'incarnate') ? INCARNATE_PROMPT : GOD_PROMPT;
                    },

                    // ------------------------------
                    // 解析 TRIBE（侦查生成）
                    // ------------------------------
                    parseTribeBlock(content) {
                        const sm = '###TRIBE';
                        const em = '###ENDTRIBE';
                        const si = content.indexOf(sm);
                        const ei = content.indexOf(em, si + sm.length);
                        if (si === -1 || ei === -1) return { ok: false, text: content };

                        const jsonRaw = content.slice(si + sm.length, ei).trim();
                        const rest = content.slice(ei + em.length).trim();
                        try {
                            const obj = JSON.parse(jsonRaw);
                            return { ok: true, tribe: obj, text: rest };
                        } catch (e) {
                            return { ok: false, text: content };
                        }
                    },

                    // ------------------------------
                    // 本地规则：回合结算（信仰恢复/异教徒生成/进步增长）
                    // ------------------------------
                    clamp(n, a, b) { return Math.max(a, Math.min(b, n)); },

                    maybeSpawnHeretic() {
                        if (this.heretic.active) return false;
                        // 概率随时代略增；你可按需调
                        const base = 0.12 + this.eraIndex * 0.03;
                        if (Math.random() < base) {
                            const names = ['露丝', '西尔维娅', '妮娜', '阿黛尔', '奥斯汀', '夏璐', '莱娜', '丽萨'];
                            const vibes = ['低声煽动', '公开亵渎', '暗中渗透', '伪装成祭司', '散播异端经文', '以奇术惑众'];
                            this.heretic.active = true;
                            this.heretic.name = names[Math.floor(Math.random() * names.length)];
                            this.heretic.vibe = vibes[Math.floor(Math.random() * vibes.length)];
                            return true;
                        }
                        return false;
                    },

                    regenOrBleedFaith() {
                        // 无异教徒：缓慢恢复；有异教徒：缓慢流失
                        let delta = 0;
                        if (this.heretic.active) delta = -(4 + this.eraIndex); // 越先进越容易引发“信仰危机”
                        else delta = +(5 + Math.floor(this.eraIndex / 2));
                        const before = this.faith;
                        this.faith = this.clamp(this.faith + delta, 0, this.faithMax);
                        return { before, after: this.faith, delta };
                    },

                    gainProgressByAction(actionType, gradeHint) {
                        // gradeHint: 'low'|'mid'|'high' (纯本地，不给模型)
                        let base = 0;
                        if (actionType === 'observe') base = 10;
                        if (actionType === 'oracle') base = 18;
                        if (actionType === 'inspect') base = 8;
                        if (actionType === 'handle_heretic') base = 6;
                        if (actionType === 'war_win') base = 45;
                        if (actionType === 'war_lose') base = 10;
                        if (actionType === 'advance_era') base = 0;
                        if (actionType === 'scout') base = 3;

                        if (gradeHint === 'low') base *= 0.8;
                        if (gradeHint === 'high') base *= 1.25;

                        // 时代越高，边际推进略难
                        const mult = 1 / (1 + this.eraIndex * 0.12);
                        const add = Math.floor(base * mult);

                        const before = this.progress;
                        this.progress = this.clamp(this.progress + add, 0, this.progressMax());
                        return { before, after: this.progress, add };
                    },

                    warTargetName() {
                        const t = this.tribes.find(x => x.id === this.warTargetId);
                        return t ? t.name : '';
                    },

                    selectWarTarget(id) {
                        this.warTargetId = id || null;
                        this.tribeDrawer.open = false;
                    },

                    removeTribe(id) {
                        this.tribes = (this.tribes || []).filter(x => x.id !== id);
                        if (this.warTargetId === id) this.warTargetId = null;
                    },

                    // ------------------------------
                    // 主流程：行动触发
                    // ------------------------------
                    async start() {
                        this.started = true;
                        this.disabled = true;

                        // 初始化
                        this.mode = 'god';
                        this.eraIndex = Number(this.startEraIndex) || 0;
                        this.faith = this.faithMax;
                        this.progress = 0;

                        this.heretic = { active: false, name: '', vibe: '', hatred: '极端敌视' };
                        this.tribes = [];
                        this.warTargetId = null;

                        this.history = [];
                        this.tailId = null;

                        this.lastAction = { type: '开局', faithDeltaText: '—', progressDeltaText: '—' };

                        // 开场文本（写入 dzmm + history）
                        const opening =
                            `【结果】你睁开“眼”的那一刻，世界仍是未曾被命名的阴影。部族围在火堆旁，抬头望向虚空，仿佛早已知道你会在这里。
【世界】祭司用兽骨刻下你的符号，孩子学会把恐惧和饥饿叫作“神意的考验”。第一座神庙只是石堆与木架，却足以让信仰落地生根。
【对白】祭司：“伟大的${this.godName}，请指引我们，我们该如何探求未来？”`;

                        const stateObj = {
                            godName: this.godName,
                            mode: this.mode,
                            eraIndex: this.eraIndex,
                            era: this.eraName(),
                            faith: this.faith,
                            progress: this.progress,
                            heretic: this.heretic,
                            tribes: { count: 0 },
                            summary: '开局'
                        };

                        const openingWithState =
                            `###STATE
${JSON.stringify(stateObj)}
###END
${opening}`.trim();

                        const result = await window.dzmm.chat.insert(null, [
                            { role: 'assistant', content: openingWithState }
                        ]);

                        this.tailId = this.extractLastId(result);
                        this.chat_content = opening;
                        this.lastModelText = opening;
                        this.history.push({ role: 'assistant', content: opening });

                        this.disabled = false;
                    },

                    async toggleIncarnation() {
                        if (this.disabled) return;

                        // 切换仅改变模式，并让模型写一段“转场”文本
                        const from = this.mode;
                        this.mode = (this.mode === 'god') ? 'incarnate' : 'god';

                        const actionType = (this.mode === 'incarnate') ? 'enter_incarnate' : 'exit_incarnate';
                        await this.runAction(actionType, {
                            oracle: '',
                            note: from + '->' + this.mode
                        }, { skipLocalTick: false });
                    },

                    async actObserve() {
                        if (this.disabled) return;
                        if (this.mode !== 'god') return;
                        await this.runAction('observe', { oracle: '' }, { skipLocalTick: false });
                    },

                    async actOracle() {
                        if (this.disabled) return;
                        if (this.mode !== 'god') return;

                        const text = (this.oracleInput || '').trim();
                        if (!text) return;
                        this.oracleInput = '';
                        await this.runAction('oracle', { oracle: text }, { skipLocalTick: false });
                    },

                    async actScout() {
                        if (this.disabled) return;
                        if (this.mode !== 'god') return;
                        await this.runAction('scout', { oracle: '' }, { skipLocalTick: false, wantTribe: true });
                    },

                    async actHandleHeretic() {
                        if (this.disabled) return;
                        if (this.mode !== 'god') return;
                        if (!this.heretic.active) return;

                        // 本地：处理掉异教徒
                        const name = this.heretic.name;
                        const vibe = this.heretic.vibe;

                        this.heretic.active = false;
                        this.heretic.name = '';
                        this.heretic.vibe = '';
                        const gain = 30 + Math.floor(Math.random() * 21); // 30~50
                        const beforeFaith = this.faith;
                        this.faith = this.clamp(this.faith + gain, 0, this.faithMax);
                        await this.runAction('handle_heretic', { hereticName: name, hereticVibe: vibe }, { skipLocalTick: false, wantHereticModal: true });
                    },

                    async actWar() {
                        if (this.disabled) return;
                        if (!this.canWar()) return;

                        const target = this.tribes.find(x => x.id === this.warTargetId);
                        if (!target) return;

                        this.disabled = true;
                        try {
                            const beforeFaith = this.faith;
                            this.faith = 0;

                            let winChance = 0.60;

                            const pop = Number(target.population);
                            if (!Number.isNaN(pop)) {
                                if (pop >= 20000) winChance -= 0.08;
                                if (pop <= 3000) winChance += 0.05;
                            } const trait = (target.trait || '').toLowerCase(); if (trait.includes('尚武') ||
                                trait.includes('侵略') || trait.includes('militar')) winChance -= 0.06; const warWin = Math.random() < winChance; const
                                    progDelta = this.gainProgressByAction(warWin ? 'war_win' : 'war_lose', warWin ? 'high' : 'mid'); this.lastAction = {
                                        type: warWin ? '战争·胜利' : '战争·失利', faithDeltaText: `信仰 ${beforeFaith} → ${this.faith}（- ${beforeFaith}）`,
                                        progressDeltaText: `进步 ${progDelta.before} → ${progDelta.after}（+${progDelta.add}）`
                                    }; await this.requestAIResponse({
                                        action: 'war', actionType: warWin ? 'war_win' : 'war_lose', oracle: '', warTarget: target, warWin, local: {
                                            faithBefore: beforeFaith, faithAfter: this.faith, progressBefore: progDelta.before, progressAfter: progDelta.after,
                                            progressAdd: progDelta.add
                                        }
                                    }); if (warWin) {
                                        const victoryText = await this.generateVictoryText(target); this.modal = {
                                            open: true, title: '🏆 胜利：诸神俯首', text: (victoryText || '你夺走对方的旗帜与神火，敌国的祈祷在你的名字里改写。').trim(), imageUrl:
                                                this.pickVictoryImage()
                                        };
                                    }
                        } catch (e) {
                            console.error('[actWar] error:', e);
                            this.chat_content = '（战争流程发生异常：请打开控制台查看错误）';
                        } finally { this.disabled = false; }
                    },

                    async actAdvanceEra() {
                        if (this.disabled) return;
                        if (!this.canAdvanceEra()) return;
                        if (this.mode !== 'god') return;

                        const before = this.eraIndex;
                        const beforeEra = this.eraName();
                        const beforeProg = this.progress;

                        this.eraIndex = this.clamp(this.eraIndex + 1, 0, 4);
                        this.progress = 0;

                        this.lastAction = {
                            type: '推进时代',
                            faithDeltaText: '—',
                            progressDeltaText: `进步 ${beforeProg} → 0（清空）`
                        };

                        await this.requestAIResponse({
                            action: 'advance_era',
                            actionType: 'advance_era',
                            oracle: '',
                            local: {
                                eraBefore: beforeEra,
                                eraAfter: this.eraName(),
                                eraIndexBefore: before,
                                eraIndexAfter: this.eraIndex,
                                progressBefore: beforeProg,
                                progressAfter: this.progress
                            }
                        });
                    },

                    async actInspect() {
                        if (this.disabled) return;
                        if (this.mode !== 'incarnate') return;

                        const cost = Number(this.inspectCostFaith || 20);

                        //  不够信仰：直接提示，不允许视察
                        if (this.faith < cost) {
                            this.modal = {
                                open: true,
                                title: '⛔ 信仰不足',
                                text: `视察需要消耗 ${cost} 点信仰。\n当前信仰：${this.faith}/${this.faithMax}\n\n让世界自行运转（观察/天启/等待恢复），或先处理异教徒以稳定信仰。`,
                                imageUrl: this.pickInspectImage(),
                                tip: '视察会消耗信仰，避免频繁刷进步'
                            };
                            return;
                        }

                        //  本地：先扣信仰（避免被后续逻辑“回血/扣血”干扰）
                        const faithBefore = this.faith;
                        this.faith = this.clamp(this.faith - cost, 0, this.faithMax);

                        //  本地：视察轻微增加进步（你原本的逻辑）
                        const progDelta = this.gainProgressByAction('inspect', 'mid');

                        this.lastAction = {
                            type: '视察',
                            faithDeltaText: `信仰 ${faithBefore} → ${this.faith}（- ${cost}）`,
                            progressDeltaText: `进步 ${progDelta.before} → ${progDelta.after}（+${progDelta.add}）`
                        };

                        //  只让模型写文 + 视察弹窗；不要再跑本地 tick（否则会回血/掉血/刷异教徒）
                        await this.runAction('inspect', { oracle: '' }, { skipLocalTick: true, wantInspectModal: true });
                    },


                    // ------------------------------
                    // 行动统一入口（除战争/推进时代那种强本地分支外）
                    // ------------------------------
                    async runAction(actionType, payload, opts) {
                        this.disabled = true;
                        try {
                            this.chat_content = '<span class="pulse">……神谕回响中……</span>';

                            const wantTribe = !!opts?.wantTribe;
                            const wantHereticModal = !!opts?.wantHereticModal;
                            const wantInspectModal = !!opts?.wantInspectModal;

                            // 本地：每次行动先做“信仰恢复/流失 + 异教徒可能出现”
                            if (!opts?.skipLocalTick) {
                                // 先可能刷新异教徒（让世界更有“不期而至”的味道）
                                const spawned = this.maybeSpawnHeretic();

                                const faithTick = this.regenOrBleedFaith();

                                // 进步：按行动类型增
                                const gradeHint = (actionType === 'oracle') ? 'high' : (actionType === 'observe' ? 'mid' : 'low');
                                const progDelta = this.gainProgressByAction(
                                    actionType === 'handle_heretic' ? 'handle_heretic' : actionType,
                                    gradeHint
                                );

                                this.lastAction = {
                                    type:
                                        actionType === 'observe' ? '观察' :
                                            actionType === 'oracle' ? '天启' :
                                                actionType === 'scout' ? '侦查' :
                                                    actionType === 'handle_heretic' ? '处理异教徒' :
                                                        actionType === 'enter_incarnate' ? '降临' :
                                                            actionType === 'exit_incarnate' ? '回归神位' :
                                                                actionType === 'inspect' ? '视察' : actionType,
                                    faithDeltaText: `信仰 ${faithTick.before} → ${faithTick.after}（${faithTick.delta >= 0 ? '+' : ''}${faithTick.delta}）` + (spawned ? ' · 异教徒出现' : ''),
                                    progressDeltaText: `进步 ${progDelta.before} → ${progDelta.after}（+${progDelta.add}）`
                                };
                            }

                            // 向模型请求叙事
                            const pack = {
                                actionType,
                                oracle: payload?.oracle || '',
                                hereticName: payload?.hereticName || '',
                                hereticVibe: payload?.hereticVibe || '',
                                mode: this.mode,
                                era: this.eraName(),
                                eraIndex: this.eraIndex,
                                faith: this.faith,
                                faithMax: this.faithMax,
                                progress: this.progress,
                                progressMax: this.progressMax(),
                                canAdvanceEra: this.canAdvanceEra(),
                                canWar: this.canWar(),
                                warTargetName: this.warTargetName() || '无',
                                heretic: {
                                    active: !!this.heretic.active,
                                    name: this.heretic.name || '无',
                                    vibe: this.heretic.vibe || '无'
                                }
                            };

                            // 侦查：需要模型生成 TRIBE JSON
                            if (wantTribe) {
                                const scoutText = await this.requestScoutTribe(pack);
                                this.chat_content = scoutText;
                                this.lastModelText = scoutText;

                                // history 写入（干净文本）
                                this.history.push({ role: 'user', content: '【侦查】' });
                                this.history.push({ role: 'assistant', content: scoutText });
                                this.trimHistory();

                                // 写入 dzmm（链式）
                                await this.insertToDzmm('【侦查】', scoutText, pack);
                                return;
                            }

                            // 普通行动：叙事
                            const resultText = await this.requestActionNarration(pack);
                            this.chat_content = resultText;
                            this.lastModelText = resultText;

                            // history
                            const userTag =
                                actionType === 'observe' ? '【观察】' :
                                    actionType === 'oracle' ? `【天启】${payload?.oracle || ''}` :
                                        actionType === 'handle_heretic' ? `【处理异教徒】${payload?.hereticName || ''}` :
                                            actionType === 'enter_incarnate' ? '【降临】' :
                                                actionType === 'exit_incarnate' ? '【回归神位】' :
                                                    actionType === 'inspect' ? '【视察】' :
                                                        '【行动】';

                            this.history.push({ role: 'user', content: userTag });
                            this.history.push({ role: 'assistant', content: resultText });
                            this.trimHistory();

                            await this.insertToDzmm(userTag, resultText, pack);

                            // 异教徒弹窗
                            if (wantHereticModal) {
                                const text = await this.generateHereticAftermathText(payload?.hereticName || '某位异教徒');
                                this.modal = {
                                    open: true,
                                    title: '✦ 异端已除',
                                    text: (text || '').trim() || '异端的声音被掐灭，留下的只有更沉重的沉默与更锋利的敬畏。',
                                    imageUrl: this.pickHereticImage(),
                                };
                            }

                            // 视察弹窗
                            if (wantInspectModal) {
                                const text = await this.generateInspectText();
                                this.modal = {
                                    open: true,
                                    title: '🏛 视察：降临之行',
                                    text: (text || '').trim() || '你行走在神庙与街巷之间，臣民的呼吸与祈祷像潮汐一样涌来。',
                                    imageUrl: this.pickInspectImage(),
                                };
                            }
                        } finally {
                            this.disabled = false;
                        }
                    },

                    trimHistory() {
                        const MAX_HISTORY = 24;
                        if (this.history.length > MAX_HISTORY) this.history = this.history.slice(-MAX_HISTORY);
                    },

                    async insertToDzmm(userText, assistantText, pack) {
                        const stateObj = {
                            godName: this.godName,
                            mode: this.mode,
                            eraIndex: this.eraIndex,
                            era: this.eraName(),
                            faith: this.faith,
                            progress: this.progress,
                            heretic: this.heretic,
                            tribes: { count: this.tribes.length },
                            warTargetId: this.warTargetId,
                            summary: `${this.lastAction.type || pack.actionType}`
                        };

                        const assistantContent =
                            `###STATE
${JSON.stringify(stateObj)}
###END
${assistantText}`.trim();

                        const parent = this.tailId || null;
                        const result = await window.dzmm.chat.insert(parent, [
                            { role: 'user', content: userText },
                            { role: 'assistant', content: assistantContent }
                        ]);

                        this.tailId = this.extractLastId(result);
                    },
                    // ------------------------------
                    // 统一入口：给“战争/推进时代”等强本地分支调用
                    // - 更新 chat_content / lastModelText
                    // - 写入 history
                    // - 写入 dzmm（带 ###STATE）
                    // ------------------------------
                    async requestAIResponse(payload) {
                        const actionType = payload?.actionType || payload?.action || 'action';
                        const oracle = payload?.oracle || '';

                        // 给 requestActionNarration 使用的 pack（字段要对上它内部的引用）
                        const pack = {
                            actionType,
                            oracle,
                            mode: this.mode,
                            era: this.eraName(),
                            eraIndex: this.eraIndex,

                            faith: this.faith,
                            faithMax: this.faithMax,
                            progress: this.progress,
                            progressMax: this.progressMax(),

                            canAdvanceEra: this.canAdvanceEra(),
                            canWar: this.canWar(),

                            warTargetName: payload?.warTarget?.name || this.warTargetName() || '无',
                            heretic: {
                                active: !!this.heretic.active,
                                name: this.heretic.name || '无',
                                vibe: this.heretic.vibe || '无'
                            },

                            // 额外信息（不强依赖；只是为了你以后扩展时方便）
                            local: payload?.local || null,
                            warWin: payload?.warWin
                        };

                        // 生成叙事文本
                        const text = await this.requestActionNarration(pack);

                        // 写到主叙事面板
                        this.chat_content = text;
                        this.lastModelText = text;

                        // 生成一个“用户侧标签”写入 history/dzmm
                        const userTag =
                            actionType === 'war_win' ? `【战争胜利】进攻：${pack.warTargetName}` :
                                actionType === 'war_lose' ? `【战争失利】进攻：${pack.warTargetName}` :
                                    actionType === 'advance_era' ? '【推进时代】' :
                                        actionType === 'enter_incarnate' ? '【降临】' :
                                            actionType === 'exit_incarnate' ? '【回归神位】' :
                                                actionType === 'inspect' ? '【视察】' :
                                                    actionType === 'scout' ? '【侦查】' :
                                                        actionType === 'observe' ? '【观察】' :
                                                            actionType === 'oracle' ? `【天启】${oracle}` :
                                                                '【行动】';

                        // history
                        this.history.push({ role: 'user', content: userTag });
                        this.history.push({ role: 'assistant', content: text });
                        this.trimHistory();

                        // dzmm（带 STATE）
                        await this.insertToDzmm(userTag, text, pack);

                        return text;
                    },
                    // ------------------------------
                    // 模型请求：普通叙事
                    // ------------------------------
                    async requestActionNarration(pack) {
                        const messages = [
                            { role: 'user', content: this.createSystemPrompt() },
                            ...(this.history || []).map(m => ({ role: m.role, content: m.content })),
                            {
                                role: 'user',
                                content:
                                    `【本地事实包（必须照此写，不做任何数值推演）】
神名=${this.godName}
当前模式=${pack.mode}
当前时代=${pack.era}
行动类型=${pack.actionType}
信仰=${pack.faith}/${pack.faithMax}
进步=${pack.progress}/${pack.progressMax}
异教徒存在=${pack.heretic.active ? '是' : '否'}
异教徒名=${pack.heretic.name}
异教徒动向=${pack.heretic.vibe}
战争目标=${pack.warTargetName}
可推进时代=${pack.canAdvanceEra ? '是' : '否'}
可发动战争=${pack.canWar ? '是' : '否'}

若行动类型是 oracle，则神谕原句如下（只作为剧情驱动，不要改写成玩家台词）：
神谕=${pack.oracle || '无'}

请严格输出三段：
【结果】...（200字左右）
【世界】...（400字左右）
【对白】人物名：“台词”（50字左右）`
                            }
                        ];

                        return await this.callCompletions({ model: this.model, messages, maxTokens: 1300 });
                    },

                    // ------------------------------
                    // 模型请求：侦查生成（TRIBE JSON + 叙事）
                    // ------------------------------
                    async requestScoutTribe(pack) {
                        const messages = [
                            {
                                role: 'user',
                                content:
                                    `你要为文字游戏生成一个“同科技水平的部族/文明”情报，并且它有自己的创世神。

【必须输出两块内容，顺序固定】
1) 先输出一段 TRIBE JSON，放在标记内（必须能被 JSON.parse 解析）：
###TRIBE
{...}
###ENDTRIBE

TRIBE JSON 字段要求（必须都有）：
- id: string（随机短ID，避免重复）
- name: string（文明名）
- era: string（必须等于“${pack.era}”）
- population: string（如“几百”“三千”“两万”这类概念值，不要数字计算）
- trait: string（文明特质，如“尚武/工匠之国/神权至上/贸易成瘾/禁欲严苛”等）
- summary: string（50~120字概述：地理、制度、矛盾、对外态度）
- godName: string（对方创世神名）
- godDesc: string（60~120字：对方神的形象、神恩风格、与其子民关系）

2) 然后输出三段叙事正文（与本卡一致）：
【结果】...（200字左右）
【世界】...（400字左右）
【对白】人物名：“台词”（50字左右）

额外约束：
- 禁止出现{{user}}的台词。
- 叙事里要体现“你在神域侦查，远眺到另一个文明的火光/电光/烟柱”等细节。
- 文明应与当前时代匹配（“${pack.era}”），禁止出现任何与文明阶段不匹配的内容，比如原始时代禁止出现宇宙飞船。`
                            }
                        ];

                        const raw = await this.callCompletions({ model: this.model, messages, maxTokens: 1500 });

                        // 解析 TRIBE
                        const parsed = this.parseTribeBlock(raw);
                        if (parsed.ok && parsed.tribe) {
                            const t = parsed.tribe;

                            // 基础清洗/补全
                            const safe = {
                                id: String(t.id || (Date.now() + '_' + Math.random().toString(16).slice(2, 6))),
                                name: String(t.name || '无名文明'),
                                era: this.eraName(),
                                population: String(t.population || '？'),
                                trait: String(t.trait || '？'),
                                summary: String(t.summary || ''),
                                godName: String(t.godName || '无名之神'),
                                godDesc: String(t.godDesc || '')
                            };

                            // 只保留同时代（防错）
                            safe.era = this.eraName();

                            // 去重：若 id 重复则换
                            if ((this.tribes || []).some(x => x.id === safe.id)) {
                                safe.id = safe.id + '_' + Math.random().toString(16).slice(2, 5);
                            }

                            // 插入列表（最多 10 个）
                            this.tribes.unshift(safe);
                            const MAX = 10;
                            if (this.tribes.length > MAX) this.tribes.length = MAX;

                            // 若还没目标，默认设最新为目标
                            if (!this.warTargetId) this.warTargetId = safe.id;
                        }

                        return parsed.ok ? parsed.text : raw;
                    },

                    // ------------------------------
                    // 模型请求：胜利描写（弹窗）
                    // ------------------------------
                    async generateVictoryText(target) {
                        const messages = [
                            {
                                role: 'user',
                                content:
                                    `你在为文字游戏生成一段神战争结束后胜利方的男性神爆操失败方的女性神，并夺取其神力的文本描述，这个过程中女性神会产生强烈的痛苦和快感，身体会剧烈痉挛，口水眼泪齐流，连续高潮。
- 详细描写女性神被爆操的过程，包括女性神的动作，表情，身体反应
- 女性神状态应该从高傲不屑到逐渐堕落再到求饶。
- 必须使用最粗俗的语言描写性行为和性器官，禁止任何文艺化表达
<Notes>
- When writing sex scenes, keep them erotic, lengthy, detailed, and direct.
- When characters are naked or engaging in sexual acts, describe their body types and sexual organs in detail.
- Character settings should be dynamically adjusted based on chat logs to maintain consistency and continuity.
【背景】
- 胜者之神名：${this.godName}
- 败者创世神：${target?.godName || '未知'}

【约束】
- 不要出现{{user}}台词
- 300-350字
- 结尾用一句短台词，格式：人物名：“台词”`
                            }
                        ];
                        return await this.callCompletions({ model: this.model, messages, maxTokens: 1000 });
                    },

                    // ------------------------------
                    // 模型请求：异教徒余波（弹窗）
                    // ------------------------------
                    async generateHereticAftermathText(name) {
                        const messages = [
                            {
                                role: 'user',
                                content:
                                    `写一段女性异教徒被神明化身爆操的场景描述，要表现出女性异教徒从抵抗到屈服的过程、夹杂少量色情调教惩罚（如鞭打，滴蜡等）。
- 神名：${this.godName}
- 异教徒名：${name}
- 详细描写爆操的过程，包括女性的动作，表情，身体反应
- 必须使用最粗俗的语言描写性行为和性器官，禁止任何文艺化表达
<Notes>
- When writing sex scenes, keep them erotic, lengthy, detailed, and direct.
- When characters are naked or engaging in sexual acts, describe their body types and sexual organs in detail.
- Character settings should be dynamically adjusted based on chat logs to maintain consistency and continuity.
结尾用一句台词：人物名：“台词”
禁止出现{{user}}台词。`
                            }
                        ];
                        return await this.callCompletions({ model: this.model, messages, maxTokens: 1000 });
                    },

                    // ------------------------------
                    // 模型请求：视察描写（弹窗）
                    // ------------------------------
                    async generateInspectText() {
                        const messages = [
                            {
                                role: 'user',
                                content:
                                    `女性信徒主动以性行为侍奉自己所信仰的神的短文（300-400字）。
- 神名：${this.godName}
- 当前时代：${this.eraName()}
要求：女性信徒应极端谄媚，以此为荣，极度色情
- 详细描写侍奉的过程，包括女性的动作，表情，身体反应
<Notes>
- When writing sex scenes, keep them erotic, lengthy, detailed, and direct.
- When characters are naked or engaging in sexual acts, describe their body types and sexual organs in detail.
- Character settings should be dynamically adjusted based on chat logs to maintain consistency and continuity.
禁止出现{{user}}台词。`
                            }
                        ];
                        return await this.callCompletions({ model: this.model, messages, maxTokens: 1000 });
                    },

                    // ------------------------------
                    // 手动存档：摘要展示
                    // ------------------------------
                    saveSummaryText(slot) {
                        const s = this.saveManager.summaries[slot];
                        if (!s) return '（空）';
                        return `${s.era} · ${s.mode} · 信仰${s.faith} · 进步${s.progress} · ${s.summary || '—'}`;
                    },

                    async refreshSaveSummaries() {
                        for (const slot of [1, 2, 3]) {
                            const data = await this.kvGet(this.slotKey(slot));
                            this.saveManager.summaries[slot] = data?.meta || null;
                        }
                    },

                    // ------------------------------
                    // 手动存档：保存（状态 + 上下文 + 侦查名单）
                    // ------------------------------
                    async manualSave(slot) {
                        if (!this.started) return;

                        const meta = {
                            era: this.eraName(),
                            mode: this.modeName(),
                            faith: this.faith,
                            progress: this.progress,
                            summary: this.lastAction.type || '—',
                            ts: Date.now()
                        };

                        const MAX_HISTORY = 24;
                        const trimmedHistory = (this.history || []).slice(-MAX_HISTORY);

                        const payload = {
                            meta,
                            state: {
                                godName: this.godName,
                                model: this.model,
                                mode: this.mode,
                                eraIndex: this.eraIndex,
                                faith: this.faith,
                                faithMax: this.faithMax,
                                progress: this.progress,
                                heretic: this.heretic,
                                tribes: this.tribes,
                                warTargetId: this.warTargetId,
                                lastAction: this.lastAction,
                                lastModelText: this.lastModelText,
                                chat_content: this.chat_content
                            },
                            history: trimmedHistory
                        };

                        await this.kvPut(this.slotKey(slot), payload);
                        this.saveManager.summaries[slot] = meta;
                    },

                    // ------------------------------
                    // 手动读档：恢复（状态 + 上下文；并以新链继续）
                    // ------------------------------
                    async manualLoad(slot) {
                        const data = await this.kvGet(this.slotKey(slot));
                        if (!data?.state) return;

                        this.disabled = true;
                        try {
                            const s = data.state;

                            this.godName = s.godName || this.godName;
                            this.model = s.model || this.model;

                            this.mode = s.mode || 'god';
                            this.eraIndex = typeof s.eraIndex === 'number' ? s.eraIndex : this.eraIndex;

                            this.faithMax = typeof s.faithMax === 'number' ? s.faithMax : 100;
                            this.faith = typeof s.faith === 'number' ? s.faith : this.faithMax;

                            this.progress = typeof s.progress === 'number' ? s.progress : 0;

                            this.heretic = s.heretic || { active: false, name: '', vibe: '', hatred: '极端敌视' };

                            this.tribes = Array.isArray(s.tribes) ? s.tribes : [];
                            this.warTargetId = s.warTargetId || null;

                            this.lastAction = s.lastAction || { type: '', faithDeltaText: '', progressDeltaText: '' };
                            this.lastModelText = s.lastModelText || '';
                            this.chat_content = s.chat_content || '';

                            this.history = Array.isArray(data.history) ? data.history : [];
                            this.started = true;

                            // 读档后：插入一个“续接节点”作为新链根
                            const resumeText =
                                this.chat_content ||
                                `【结果】你从沉睡般的空白里醒来，信仰的潮声仍在远处拍岸。
【世界】神庙的火未灭，祭司仍在等候下一道指令，世界悬在你的呼吸之间。
【对白】祭司：“伟大的${this.godName}……你还在聆听吗？”`;

                            const stateObj = {
                                godName: this.godName,
                                mode: this.mode,
                                eraIndex: this.eraIndex,
                                era: this.eraName(),
                                faith: this.faith,
                                progress: this.progress,
                                heretic: this.heretic,
                                tribes: { count: this.tribes.length },
                                warTargetId: this.warTargetId,
                                summary: '手动读档续接'
                            };

                            const resumeWithState =
                                `###STATE
${JSON.stringify(stateObj)}
###END
${resumeText}`.trim();

                            const result = await window.dzmm.chat.insert(null, [
                                { role: 'assistant', content: resumeWithState }
                            ]);

                            this.tailId = this.extractLastId(result);

                            // history 末尾保证是 assistant
                            if (!this.history.length || this.history[this.history.length - 1].role !== 'assistant') {
                                this.history.push({ role: 'assistant', content: resumeText });
                                this.trimHistory();
                            }

                            this.saveManager.open = false;
                        } finally {
                            this.disabled = false;
                        }
                    },

                    // ------------------------------
                    // 初始化：只等 dzmm ready（不再自动读档）
                    // ------------------------------
                    async init() {
                        this.loading = true;
                        await dzmmReady;
                        this.loading = false;
                    }
                });

                queueMicrotask(() => Alpine.store('game').init?.());
 

            });
