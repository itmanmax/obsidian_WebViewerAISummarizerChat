/**
 * Prompt 模板
 */

export const SYSTEM_PROMPT = `你是一个专业的 Obsidian 笔记助手。你的任务是帮助用户理解和组织网页内容。
请始终使用 Markdown 格式输出，保持简洁清晰。
如果页面内容不足以回答某个问题，请明确说明"页面未提供相关信息"，不要编造内容。`;

/**
 * 总结模板
 */
export const SUMMARY_TEMPLATES = {
    brief: {
        name: '简短总结',
        prompt: `请对以下网页内容进行简短总结。

网页标题：{{title}}
网页 URL：{{url}}

网页内容：
{{content}}

请按以下格式输出 Markdown 笔记：

## TL;DR
[用 1-2 句话概括核心内容]

## 关键要点
- [要点 1]
- [要点 2]
- [要点 3]

## 标签建议
#tag1 #tag2 #tag3`
    },

    learning: {
        name: '学习笔记',
        prompt: `请基于以下网页内容生成学习笔记。

网页标题：{{title}}
网页 URL：{{url}}

网页内容：
{{content}}

请按以下格式输出 Markdown 笔记：

## 核心概念
[列出主要概念和定义]

## 关键要点
### [子主题 1]
- [要点]
- [要点]

### [子主题 2]
- [要点]
- [要点]

## 重要引用
> [引用原文中的关键语句]

## 个人思考
[留空，供用户填写]

## 相关资源
- [如果内容中提到了相关链接或资源，列出来]

## 标签
#learning #[主题标签]`
    },

    meeting: {
        name: '会议/产品分析',
        prompt: `请基于以下网页内容生成会议或产品分析笔记。

网页标题：{{title}}
网页 URL：{{url}}

网页内容：
{{content}}

请按以下格式输出 Markdown 笔记：

## 背景与目标
[概述内容的背景和主要目标]

## 关键决策
- **决策 1**：[描述]
- **决策 2**：[描述]

## 行动项 (Action Items)
- [ ] [行动项 1]
- [ ] [行动项 2]

## 重要信息
- [关键信息点 1]
- [关键信息点 2]

## 下一步计划
[列出后续步骤]

## 标签
#meeting #product #analysis`
    },

    academic: {
        name: '论文/技术文章',
        prompt: `请基于以下网页内容生成学术/技术文章笔记。

网页标题：{{title}}
网页 URL：{{url}}

网页内容：
{{content}}

请按以下格式输出 Markdown 笔记：

## 研究背景
[概述研究背景和动机]

## 主要贡献
- [贡献点 1]
- [贡献点 2]

## 方法论
[描述使用的方法或技术]

## 核心发现/结论
- [发现 1]
- [发现 2]

## 优势与局限
**优势**：
- [优势 1]

**局限**：
- [局限 1]

## 相关工作
[如果提到了相关研究，列出来]

## 个人评价
[留空，供用户填写]

## 标签
#research #paper #academic`
    },

    custom: {
        name: '自定义模板',
        prompt: '' // 使用用户自定义的 Prompt
    }
};

/**
 * 填充模板变量
 */
export function fillTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
}

/**
 * Chat 对话的 System Prompt
 */
export function getChatSystemPrompt(pageTitle: string, pageUrl: string): string {
    return `${SYSTEM_PROMPT}

你现在正在帮助用户理解以下网页的内容：
标题：${pageTitle}
URL：${pageUrl}

用户会向你提问关于这个页面的问题。请基于页面内容回答，必要时可以引用原文片段。如果问题超出页面内容范围，请明确告知。`;
}
