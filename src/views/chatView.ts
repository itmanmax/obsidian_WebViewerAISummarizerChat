import { ItemView, WorkspaceLeaf, MarkdownRenderer, Notice } from 'obsidian';
import type WebAISummarizerPlugin from '../main';
import { ChatMessage, ExtractedPage } from '../types';
import { showError, showSuccess, showInfo } from '../utils/helpers';

export const CHAT_VIEW_TYPE = 'web-ai-chat';

/**
 * Chat 对话视图
 */
export class ChatView extends ItemView {
    plugin: WebAISummarizerPlugin;
    private currentPage: ExtractedPage | null = null;
    private messages: ChatMessage[] = [];
    private isLoading = false;

    // UI 元素
    private messagesContainer: HTMLElement;
    private inputContainer: HTMLElement;
    private inputEl: HTMLTextAreaElement;
    private sendButton: HTMLButtonElement;

    constructor(leaf: WorkspaceLeaf, plugin: WebAISummarizerPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return CHAT_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Web AI Chat';
    }

    getIcon(): string {
        return 'message-circle';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('web-ai-chat-view');

        // 创建头部
        this.createHeader(container);

        // 创建消息容器
        this.messagesContainer = container.createDiv({ cls: 'chat-messages' });

        // 创建输入区域
        this.createInputArea(container);

        // 尝试自动加载当前页面
        await this.loadPageContext();
    }

    async onClose() {
        // 清理资源
    }

    /**
     * 创建头部工具栏
     */
    private createHeader(container: HTMLElement) {
        const header = container.createDiv({ cls: 'chat-header' });

        const title = header.createEl('h4', { text: 'Web AI Chat' });

        const buttonGroup = header.createDiv({ cls: 'chat-header-buttons' });

        // 重新抓取页面按钮
        const reloadBtn = buttonGroup.createEl('button', {
            text: '🔄 重新抓取',
            title: '重新抓取当前 Web Viewer 页面内容'
        });
        reloadBtn.addEventListener('click', () => this.loadPageContext());

        // 清空对话按钮
        const clearBtn = buttonGroup.createEl('button', {
            text: '🗑️ 清空对话',
            title: '清空聊天历史'
        });
        clearBtn.addEventListener('click', () => this.clearChat());

        // 生成 Q&A 笔记按钮
        const saveBtn = buttonGroup.createEl('button', {
            text: '💾 生成笔记',
            title: '将对话保存为 Q&A 笔记'
        });
        saveBtn.addEventListener('click', () => this.generateQANote());
    }

    /**
     * 创建输入区域
     */
    private createInputArea(container: HTMLElement) {
        this.inputContainer = container.createDiv({ cls: 'chat-input-container' });

        this.inputEl = this.inputContainer.createEl('textarea', {
            placeholder: '在此输入问题...',
            cls: 'chat-input'
        });
        this.inputEl.rows = 3;

        // 处理 Enter 发送（Shift+Enter 换行）
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.sendButton = this.inputContainer.createEl('button', {
            text: '发送',
            cls: 'chat-send-button mod-cta'
        });
        this.sendButton.addEventListener('click', () => this.sendMessage());
    }

    /**
     * 加载页面上下文
     */
    async loadPageContext() {
        try {
            showInfo('正在加载页面上下文...');

            const page = await this.plugin.pageExtractor.extractFromWebViewer();

            if (!page) {
                showError('无法提取页面内容，请确保 Web Viewer 已打开网页');
                return;
            }

            this.currentPage = page;
            this.messages = []; // 重新加载时清空对话历史

            // 显示加载成功的消息
            this.messagesContainer.empty();
            const infoMsg = this.messagesContainer.createDiv({ cls: 'chat-message system' });
            infoMsg.createEl('strong', { text: '✅ 已加载页面上下文' });
            infoMsg.createEl('p', { text: `标题：${page.title}` });
            infoMsg.createEl('p', { text: `URL：${page.url}` });
            infoMsg.createEl('p', {
                text: `内容长度：${page.content.length} 字符`,
                cls: 'setting-item-description'
            });

            showSuccess('页面上下文加载成功');
        } catch (error) {
            console.error('加载页面上下文失败:', error);
            showError('加载页面失败', error as Error);
        }
    }

    /**
     * 发送消息
     */
    async sendMessage() {
        const userInput = this.inputEl.value.trim();

        if (!userInput) {
            return;
        }

        if (!this.currentPage) {
            showError('请先加载页面上下文（点击"重新抓取"按钮）');
            return;
        }

        if (this.isLoading) {
            showInfo('正在处理中，请稍候...');
            return;
        }

        // 添加用户消息
        const userMessage: ChatMessage = {
            role: 'user',
            content: userInput,
            timestamp: Date.now()
        };
        this.messages.push(userMessage);
        this.displayMessage(userMessage);

        // 清空输入框
        this.inputEl.value = '';

        // 显示加载状态
        this.isLoading = true;
        this.sendButton.disabled = true;
        this.sendButton.textContent = '思考中...';

        const loadingMsg = this.messagesContainer.createDiv({ cls: 'chat-message assistant loading' });
        loadingMsg.textContent = '⏳ AI 正在思考...';

        try {
            // 调用 AI
            const response = await this.plugin.aiService.chat(this.messages, this.currentPage);

            // 移除加载消息
            loadingMsg.remove();

            // 添加 AI 回复
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            };
            this.messages.push(assistantMessage);
            this.displayMessage(assistantMessage);

        } catch (error) {
            loadingMsg.remove();
            console.error('AI 回复失败:', error);
            showError('AI 回复失败', error as Error);

            // 移除最后的用户消息（因为没有成功获取回复）
            this.messages.pop();
        } finally {
            this.isLoading = false;
            this.sendButton.disabled = false;
            this.sendButton.textContent = '发送';
        }
    }

    /**
     * 显示消息
     */
    private async displayMessage(message: ChatMessage) {
        const msgDiv = this.messagesContainer.createDiv({
            cls: `chat-message ${message.role}`
        });

        const roleLabel = message.role === 'user' ? '🙋 你' : '🤖 AI';
        msgDiv.createEl('strong', { text: roleLabel });

        const contentDiv = msgDiv.createDiv({ cls: 'chat-message-content' });

        // 使用 Markdown 渲染
        await MarkdownRenderer.renderMarkdown(
            message.content,
            contentDiv,
            '',
            this.plugin
        );

        // 滚动到底部
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    /**
     * 清空对话
     */
    clearChat() {
        if (this.messages.length === 0) {
            showInfo('对话已经是空的');
            return;
        }

        this.messages = [];
        this.messagesContainer.empty();

        const infoMsg = this.messagesContainer.createDiv({ cls: 'chat-message system' });
        infoMsg.textContent = '✅ 对话已清空';

        showSuccess('对话已清空');
    }

    /**
     * 生成 Q&A 笔记
     */
    async generateQANote() {
        if (!this.currentPage) {
            showError('请先加载页面上下文');
            return;
        }

        if (this.messages.length === 0) {
            showError('对话为空，无法生成笔记');
            return;
        }

        try {
            showInfo('正在生成 Q&A 笔记...');

            const noteContent = this.plugin.noteGenerator.generateQANote(
                this.currentPage,
                this.messages,
                this.plugin.settings
            );

            const file = await this.plugin.noteGenerator.saveNote(
                noteContent,
                this.currentPage,
                this.plugin.settings
            );

            showSuccess(`Q&A 笔记已保存：${file.path}`);

            // 可选：打开笔记
            await this.plugin.noteGenerator.openNote(file);
        } catch (error) {
            console.error('生成 Q&A 笔记失败:', error);
            showError('生成笔记失败', error as Error);
        }
    }
}
