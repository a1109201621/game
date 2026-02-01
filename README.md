# Gamefy Workbench 游戏开发项目

欢迎使用 Gamefy Workbench！本项目用于游戏开发。

> **注意**：目前仅支持静态项目（HTML、CSS、JavaScript），暂不支持需要后端服务或构建工具的项目。

## 📁 目录结构

```
/workspace/
├── publish/          # 发布目录（重要！）
│   ├── index.html    # 入口文件（必须）
│   ├── game.js       # 游戏逻辑
│   └── assets/       # 资源文件
└── ...
```

**publish 目录** 是最终发布的目录：

- 必须包含 `index.html` 作为入口
- 所有游戏资源（图片、脚本、样式）都应放在此目录
- 只有此目录中的文件会被发布

## 🎮 Gamefy SDK API

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

**可用模型**：

| 模型 | 说明 |
|------|------|
| `nalang-turbo-0826` | 快速经济（32K 上下文） |
| `nalang-medium-0826` | 平衡性能（32K 上下文） |
| `nalang-max-0826` | 高质量（32K 上下文） |
| `nalang-xl-0826` | 最强模型（32K 上下文） |

### 2. AI 画图 API

生成动漫风格图片。

```javascript
const result = await dzmm.draw.generate({
  prompt: '一个可爱的猫娘，粉色头发',
  dimension: '1:1',
  model: 'anime',
  negativePrompt: 'low quality, blurry'
});

console.log('图片地址:', result.images[0]);
```

**提示词技巧**：

```
// 好的提示词
1girl, long hair, blue eyes, white dress, flower field, sunlight, high quality, detailed

// 推荐的负面提示词
lowres, bad anatomy, bad hands, text, error, missing fingers, worst quality, low quality, blurry
```

### 3. 聊天存档 API

管理对话历史，支持树状分支剧情，适合 Galgame、互动小说等。

```javascript
// 1. 插入消息
const result = await dzmm.chat.insert(parentId, [
  { role: 'user', content: '向左走' },
  { role: 'assistant', content: '你走进了一片森林...' }
]);

// 2. 获取消息
const messages = await dzmm.chat.list(['msg-123']);

// 3. 获取完整时间线
const timeline = await dzmm.chat.timeline(messageId);
```

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

## ⚠️ 限制说明

| 功能 | 限制 |
|------|------|
| 画图 | 仅支持 anime 模型；每日有配额；提示词最多 2000 字符 |
| AI 对话 | maxTokens 范围 200-3000；建议并发不超过 3 个 |
| 聊天存档 | 单条消息建议不超过 10000 字符 |
| KV 存储 | 键名最多 256 字符；值建议不超过 1MB |

## 🚀 发布游戏

完成开发后，点击页面顶部的 **「发布」** 按钮，将 publish 目录的内容发布上线。

> **开发模式 vs 生产模式**：
>
> - 开发模式（Workbench 预览）：聊天存档和 KV 数据刷新后丢失
> - 生产模式（发布后）：数据持久化保存

## 📂 项目文件

本仓库包含多个游戏示例和发布项目：

- `publish-任务系统` - 任务系统游戏
- `publish-复活酒馆` - 复活酒馆游戏
- `publish-旅馆` - 旅馆游戏
- `publish-直播女孩` - 直播女孩游戏
- `独立游戏示例` - 独立游戏开发示例
- `示例1`、`示例2`、`示例3` - 基础示例

## 📄 License

本项目仅供学习交流使用。
