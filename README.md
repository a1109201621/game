# Gamefy Workbench 帮助文档

欢迎使用 Gamefy Workbench！本文档将帮助你快速上手游戏开发。

---

## 快速入门

### 开发环境

Workbench 是一个在线游戏开发环境，你可以在这里编写代码、实时预览游戏、与 Claude 助手协作开发。

 **注意：目前仅支持静态项目** （HTML、CSS、JavaScript），暂不支持需要后端服务或构建工具的项目。

### 目录结构

```
/workspace/
├── publish/          # 输出目录（重要！）
│   ├── index.html    # 入口文件（必须）
│   ├── game.js       # 游戏逻辑
│   └── assets/       # 资源文件
└── ...
```

 **`publish` 目录是最终输出的游戏目录** ：

* 必须包含 `index.html` 作为入口
* 所有游戏资源（图片、脚本、样式）都应放在此目录
* 只有此目录中的文件会被保存到线上

### 保存代码

Claude 助手会自动帮你保存代码更改。你也可以随时告诉 Claude「保存一下」或「提交代码」。

### 保存游戏

完成开发后，点击页面顶部的**「保存游戏」**按钮，将 `publish` 目录的内容保存到线上。保存后即可在 DZMM 中游玩。未保存的更改仅保留在 Workbench 中。

---

## Gamefy SDK API

| API                        | 说明                                          |
| -------------------------- | --------------------------------------------- |
| `dzmm.completions()`     | AI 对话（流式）                               |
| `dzmm.draw.generate()`   | AI 画图                                       |
| `dzmm.draw.edit()`       | AI 图片编辑                                   |
| `dzmm.draw.download(id)` | 通过任务 ID 下载图片                          |
| `dzmm.draw.nav(id)`      | 打开绘图详情页                                |
| `dzmm.chat.*`            | 聊天存档（树状分支）                          |
| `dzmm.kv.*`              | KV 键值存储                                   |
| `dzmm.models.list()`     | 查询可用模型列表                              |
| `dzmm.user.info()`       | 获取当前玩家信息（ID、昵称、头像、JWT token） |
| `dzmm.user.jwks()`       | 获取 JWKS 公钥（用于后端验签）                |

### 1. AI 对话 API

调用 AI 生成对话内容。

```javascript
// 基础用法
await dzmm.completions({
  model: 'nalang-turbo-0826',
  messages: [
    { role: 'user', content: '你好！' }
  ],
  maxTokens: 1000
});

// 流式响应（推荐）
await dzmm.completions({
  model: 'nalang-turbo-0826',
  messages: [
    { role: 'user', content: '讲个故事' }
  ]
}, (content, done) => {
  console.log('收到:', content);
  if (done) console.log('完成！');
});
```

**参数说明：**

| 参数          | 类型   | 必需 | 说明                                   |
| ------------- | ------ | ---- | -------------------------------------- |
| `model`     | string | ✅   | AI 模型名称                            |
| `messages`  | array  | ✅   | 消息数组，至少 1 条                    |
| `maxTokens` | number | ❌   | 最大生成长度，范围 200-3000，默认 1000 |

**可用模型：**

* `nalang-turbo-0826` - 快速经济（32K 上下文）
* `nalang-medium-0826` - 平衡性能（32K 上下文）
* `nalang-max-0826` - 高质量（32K 上下文）
* `nalang-xl-0826` - 最强模型（32K 上下文）

> **💡 提示：** 推荐使用 `dzmm.models.list()` 动态获取最新可用模型列表，而非硬编码模型名。

---

### 2. AI 画图 API

生成 AI 图片，支持 anime（二次元）和 vivid 风格。

```javascript
const result = await dzmm.draw.generate({
  prompt: '一个可爱的猫娘，粉色头发',
  dimension: '1:1',
  negativePrompt: 'low quality, blurry'
});

console.log('图片地址:', result.images[0]);
```

**参数说明：**

| 参数               | 类型   | 必需 | 说明                                  |
| ------------------ | ------ | ---- | ------------------------------------- |
| `prompt`         | string | ✅   | 图片描述，最多 2000 字符              |
| `dimension`      | string | ✅   | 尺寸比例：`1:1` / `2:3` / `3:2` |
| `model`          | string | ❌   | `'anime'`（默认）或 `'vivid'`     |
| `negativePrompt` | string | ❌   | 负面提示词，最多 2000 字符            |

**返回值：**

```typescript
{
  taskId: string;       // 任务 ID
  status: string;       // 状态
  images: string[];     // 图片 URL 数组
  createdAt: string;    // 创建时间
  errorMessage?: string // 错误信息
}
```

**提示词技巧：**

```
// 好的提示词
1girl, long hair, blue eyes, white dress, flower field, sunlight, high quality, detailed

// 推荐的负面提示词
lowres, bad anatomy, bad hands, text, error, missing fingers, worst quality, low quality, blurry
```

**注意事项：**

* 每日有配额限制，用尽后扣除 5 积分/张
* 生成时间约 10-60 秒

---

### 2.1 AI 图片编辑 API

基于已有图片进行 AI 编辑，支持编辑 `draw.generate()` 的结果或 canvas 截图。

```javascript
// 编辑 generate 的结果
const generated = await dzmm.draw.generate({ prompt: '猫娘', dimension: '1:1' });
const edited = await dzmm.draw.edit({
  prompt: '换成蓝色头发',
  images: [generated.images[0]],
});

// 编辑 canvas 截图
const dataUrl = canvas.toDataURL('image/png');
const edited = await dzmm.draw.edit({
  prompt: '添加魔法光效',
  images: [dataUrl],
  dimension: '2:3',
});
```

**参数说明：**

| 参数          | 类型     | 必需 | 说明                                                                               |
| ------------- | -------- | ---- | ---------------------------------------------------------------------------------- |
| `prompt`    | string   | ✅   | 编辑描述，最多 2000 字符                                                           |
| `images`    | string[] | ✅   | 参考图片，1-4 张。支持 URL（generate 结果）或 base64 data URL（canvas/FileReader） |
| `dimension` | string   | ❌   | 输出尺寸：`1:1`（默认）/ `2:3` / `3:2`                                       |

**返回值：** 与 `draw.generate()` 相同的 `DrawGenerationResult` 格式。

**注意事项：**

* 使用 **独立的编辑配额** （与 generate 分开计算）
* 生成时间约 10-60 秒
* data URL 图片会自动校验格式和内容安全

---

### 2.2 图片下载 API

通过绘图任务 ID 下载图片到用户设备。由于游戏运行在沙箱 iframe 中，此方法委托父窗口通过服务端 API 下载，绕过 CORS 限制。

```javascript
const result = await dzmm.draw.generate({ prompt: '猫娘', dimension: '1:1' });
dzmm.draw.download(result.taskId);
```

**参数说明：**

| 参数   | 类型   | 必需 | 说明                                                                    |
| ------ | ------ | ---- | ----------------------------------------------------------------------- |
| `id` | string | ✅   | 绘图任务 ID（`draw.generate()` 或 `draw.edit()` 返回的 `taskId`） |

---

### 2.3 打开绘图详情

在新标签页中打开绘图详情页，方便用户查看、收藏或分享生成的图片。

```javascript
const result = await dzmm.draw.generate({ prompt: '猫娘', dimension: '1:1' });
dzmm.draw.nav(result.taskId);
```

**参数说明：**

| 参数   | 类型   | 必需 | 说明                                                                    |
| ------ | ------ | ---- | ----------------------------------------------------------------------- |
| `id` | string | ✅   | 绘图任务 ID（`draw.generate()` 或 `draw.edit()` 返回的 `taskId`） |

---

### 3. 聊天存档 API

管理对话历史，支持树状分支剧情，适合 Galgame、互动小说等。

#### 核心概念

聊天存档采用 **树状结构** ，每条消息有父消息和子消息，可实现：

* **多分支剧情** - 不同选择创建不同分支
* **存档/读档** - 记录和恢复剧情进度

#### API 方法

```javascript
// 1. 插入消息
const result = await dzmm.chat.insert(parentId, [
  { role: 'user', content: '向左走' },
  { role: 'assistant', content: '你走进了一片森林...' }
]);
// result.ids = ['msg-123', 'msg-124']

// 2. 获取消息
const messages = await dzmm.chat.list(['msg-123']);

// 3. 获取完整时间线
const timeline = await dzmm.chat.timeline(messageId);
```

#### 示例：Galgame 存档系统

```javascript
let savePoint = null;

// 开始游戏
async function startGame() {
  const result = await dzmm.chat.insert(null, [
    { role: 'assistant', content: '你醒来发现自己在一个陌生的房间...' }
  ]);
  savePoint = result.ids[0];
}

// 玩家选择
async function makeChoice(choice) {
  const result = await dzmm.chat.insert(savePoint, [
    { role: 'user', content: choice },
    { role: 'assistant', content: getStoryResponse(choice) }
  ]);
  savePoint = result.ids[result.ids.length - 1];
}

// 读档
async function loadSave(savedId) {
  const timeline = await dzmm.chat.timeline(savedId);
  const history = await dzmm.chat.list(timeline);
  displayHistory(history);
  savePoint = savedId;
}
```

---

### 4. KV 存储 API

存储游戏数据（键值对）。

```javascript
// 保存
await dzmm.kv.put('score', 100);

// 读取
const data = await dzmm.kv.get('score');
console.log(data.value); // 100

// 删除
await dzmm.kv.delete('score');
```

---

### 5. 模型列表 API

动态查询可用模型，避免硬编码。

```javascript
const { models, defaultModel } = await dzmm.models.list();

// 显示可用模型
models.forEach(m => console.log(`${m.displayName} (${m.internalName})`));

// 使用推荐模型
await dzmm.completions({
  model: defaultModel || models[0].internalName,
  messages: [{ role: 'user', content: '你好' }]
}, (content, done) => {
  if (done) console.log('完成');
});
```

**返回值：**

| 字段             | 类型   | 说明                           |
| ---------------- | ------ | ------------------------------ |
| `models`       | array  | 扁平化的所有可用模型列表       |
| `categories`   | array  | 按分类分组的模型（含详细信息） |
| `defaultModel` | string | null                           |

---

### 6. 用户信息 API

获取当前玩家的基本信息，用于个性化游戏体验。

```javascript
const { id, name, avatarUrl, token } = await dzmm.user.info();

if (name) {
  console.log(`欢迎，${name}！`);
}
if (avatarUrl) {
  document.getElementById('avatar').src = avatarUrl;
}

// 将 token 发送到游戏后端验证身份
if (token) {
  fetch('https://your-game-server.com/api/login', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}
```

**返回值：**

| 字段          | 类型   | 说明 |
| ------------- | ------ | ---- |
| `id`        | string | null |
| `name`      | string | null |
| `avatarUrl` | string | null |
| `token`     | string | null |

**注意：** 字段可能为 `null`，请做好空值处理。开发模式下 `token` 始终为 `null`。

---

### 7. JWKS 公钥 API

获取平台 JWKS 公钥，供游戏后端验证 `user.info()` 返回的 JWT。

```javascript
const jwks = await dzmm.user.jwks();
// jwks.keys = [{ kty: 'RSA', alg: 'RS256', use: 'sig', kid: '...', n: '...', e: '...' }]
```

**游戏后端验签示例（Node.js）：**

```javascript
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://www.dzmm.io/api/gamefy/.well-known/jwks.json',
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    callback(err, key?.getPublicKey());
  });
}

jwt.verify(token, getKey, { algorithms: ['RS256'], issuer: 'dzmm-gamefy' }, (err, decoded) => {
  // decoded.sub = 用户 ID, decoded.name = 用户昵称
});
```

**注意：** 开发模式下此 API 不可用。

---

## 限制说明

| 功能               | 限制                                                              |
| ------------------ | ----------------------------------------------------------------- |
| **画图**     | 支持 anime（默认）和 vivid 模型；每日有配额；提示词最多 2000 字符 |
| **图片编辑** | 独立配额；支持 URL 和 base64 data URL；最多 4 张参考图            |
| **AI 对话**  | maxTokens 范围 200-3000；建议并发不超过 3 个                      |
| **聊天存档** | 单条消息建议不超过 10000 字符                                     |
| **KV 存储**  | 键名最多 256 字符；值建议不超过 1MB                               |

**开发模式 vs 生产模式：**

* **开发模式（Workbench 预览）** ：聊天存档和 KV 数据刷新后丢失
* **生产模式（保存游戏后）** ：数据持久化保存
