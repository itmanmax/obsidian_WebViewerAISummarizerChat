/**
 * 插件配置接口
 */
export interface PluginSettings {
    // AI Provider 配置
    apiKey: string;
    baseUrl: string;
    model: string;

    // 输出配置
    summaryTemplate: 'brief' | 'learning' | 'meeting' | 'academic' | 'custom';
    customPrompt: string; // 自定义 Prompt
    saveFolder: string;
    fileNameTemplate: string;
    includeFrontmatter: boolean;

    // 高级配置
    maxCharacters: number;
}

/**
 * 默认配置
 */
export const DEFAULT_SETTINGS: PluginSettings = {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    summaryTemplate: 'brief',
    customPrompt: '请对以下网页内容进行总结：\n\n网页标题：{{title}}\n网页 URL：{{url}}\n\n网页内容：\n{{content}}\n\n请用 Markdown 格式输出总结。',
    saveFolder: 'Inbox/Web',
    fileNameTemplate: '{{title}} - {{date}}',
    includeFrontmatter: true,
    maxCharacters: 30000,
};

/**
 * 提取的页面数据
 */
export interface ExtractedPage {
    title: string;
    url: string;
    content: string;
    capturedAt: string; // ISO 时间戳
    metadata?: {
        siteName?: string;
        author?: string;
        publishedDate?: string;
    };
}

/**
 * 对话消息
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

/**
 * AI API 响应
 */
export interface AIResponse {
    content: string;
    tokenUsage?: {
        prompt: number;
        completion: number;
        total: number;
    };
}

/**
 * OpenAI Compatible API 请求格式
 */
export interface ChatCompletionRequest {
    model: string;
    messages: Array<{
        role: string;
        content: string;
    }>;
    temperature?: number;
    max_tokens?: number;
}

/**
 * OpenAI Compatible API 响应格式
 */
export interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
