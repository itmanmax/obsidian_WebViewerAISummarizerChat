# Web Viewer AI Summarizer & Chat

Obsidian 插件：为 Web Viewer 添加 AI 总结和对话功能。

## 功能

- 📝 **一键总结网页** - 5 种模板（含自定义）
- 💬 **智能对话** - 基于网页内容提问
- 📁 **自动保存笔记** - 自定义路径和命名

## 安装

1. 复制插件到 `.obsidian/plugins/web-viewer-ai-summarizer/`
2. 重启 Obsidian → 启用插件
3. 在设置中配置 API Key

## 使用

| 命令 | 功能 |
|------|------|
| `AI: Summarize current web page` | 总结当前页面 |
| `AI: Chat with current web page` | 打开对话 |
| `AI: Summarize from clipboard` | 从剪贴板总结 |

## 配置

- **API Key** - OpenAI 或兼容服务
- **Base URL** - 默认 `https://api.openai.com/v1`
- **模型** - 如 `gpt-3.5-turbo`
- **总结模板** - 简短/学习/会议/学术/自定义
- **保存路径** - 默认 `Inbox/Web`

## 开发

```bash
npm install
npm run build
```

## 注意

⚠️ 网页内容会发送到 AI 服务处理，请勿处理敏感信息。

## License

MIT
