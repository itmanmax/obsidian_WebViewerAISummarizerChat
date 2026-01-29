import { requestUrl } from 'obsidian';
import {
    PluginSettings,
    ExtractedPage,
    ChatMessage,
    ChatCompletionRequest,
    ChatCompletionResponse
} from '../types';
import { SUMMARY_TEMPLATES, fillTemplate, getChatSystemPrompt } from '../utils/prompts';
import { truncateText, showError } from '../utils/helpers';

/**
 * AI 服务
 */
export class AIService {
    constructor(private settings: PluginSettings) { }

    /**
     * 生成总结
     */
    async summarize(page: ExtractedPage): Promise<string> {
        // 截断内容
        const { text: truncatedContent, truncated } = truncateText(
            page.content,
            this.settings.maxCharacters
        );

        // 获取 Prompt：如果是自定义模板，使用用户自定义的 Prompt
        let userPrompt: string;
        if (this.settings.summaryTemplate === 'custom') {
            userPrompt = fillTemplate(this.settings.customPrompt, {
                title: page.title,
                url: page.url,
                content: truncatedContent
            });
        } else {
            const template = SUMMARY_TEMPLATES[this.settings.summaryTemplate];
            userPrompt = fillTemplate(template.prompt, {
                title: page.title,
                url: page.url,
                content: truncatedContent
            });
        }

        // 调用 API
        const response = await this.callAPI([
            { role: 'user', content: userPrompt }
        ]);

        // 如果内容被截断，在开头添加提示
        if (truncated) {
            return `> [!WARNING]\n> 原文内容超出字符限制（${this.settings.maxCharacters}），已自动截断。生成的总结基于部分内容。\n\n${response}`;
        }

        return response;
    }

    /**
     * Chat 对话
     */
    async chat(messages: ChatMessage[], context: ExtractedPage): Promise<string> {
        // 截断上下文
        const { text: truncatedContent } = truncateText(
            context.content,
            this.settings.maxCharacters
        );

        // 构建消息列表
        const apiMessages = [
            {
                role: 'system',
                content: `${getChatSystemPrompt(context.title, context.url)}\n\n页面内容：\n${truncatedContent}`
            },
            ...messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        ];

        return await this.callAPI(apiMessages);
    }

    /**
     * 调用 OpenAI Compatible API
     */
    private async callAPI(messages: Array<{ role: string; content: string }>): Promise<string> {
        // 验证配置
        if (!this.settings.apiKey) {
            throw new Error('API Key 未配置，请在设置中配置');
        }

        if (!this.settings.baseUrl) {
            throw new Error('API Base URL 未配置');
        }

        const requestBody: ChatCompletionRequest = {
            model: this.settings.model,
            messages,
            temperature: 0.7,
        };

        try {
            const response = await requestUrl({
                url: `${this.settings.baseUrl}/chat/completions`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey}`
                },
                body: JSON.stringify(requestBody),
                throw: false
            });

            // 检查 HTTP 状态码
            if (response.status === 401) {
                throw new Error('API Key 无效或未授权（401）');
            } else if (response.status === 429) {
                throw new Error('请求过于频繁，请稍后重试（429）');
            } else if (response.status === 500) {
                throw new Error('AI 服务内部错误（500）');
            } else if (response.status !== 200) {
                throw new Error(`API 请求失败（${response.status}）: ${response.text}`);
            }

            // 解析响应
            const data: ChatCompletionResponse = response.json;

            if (!data.choices || data.choices.length === 0) {
                throw new Error('API 返回的响应格式错误：缺少 choices');
            }

            const content = data.choices[0].message.content;

            if (!content) {
                throw new Error('API 返回的内容为空');
            }

            return content.trim();
        } catch (error: any) {
            console.error('AI API 调用失败:', error);

            // 网络错误
            if (error.message?.includes('fetch') || error.message?.includes('network')) {
                throw new Error('网络连接失败，请检查网络设置');
            }

            // 重新抛出错误
            throw error;
        }
    }

    /**
     * 更新设置
     */
    updateSettings(settings: PluginSettings) {
        this.settings = settings;
    }
}
