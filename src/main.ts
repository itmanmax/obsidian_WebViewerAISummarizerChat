import { Plugin } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS } from './types';
import { WebAISettingTab } from './settings';
import { ChatView, CHAT_VIEW_TYPE } from './views/chatView';
import { PageExtractorService } from './services/pageExtractor';
import { AIService } from './services/aiService';
import { NoteGeneratorService } from './services/noteGenerator';
import { showError, showSuccess, showInfo } from './utils/helpers';

export default class WebAISummarizerPlugin extends Plugin {
    settings: PluginSettings;

    // 服务实例
    pageExtractor: PageExtractorService;
    aiService: AIService;
    noteGenerator: NoteGeneratorService;

    async onload() {
        console.log('Loading Web Viewer AI Summarizer & Chat plugin');

        // 加载设置
        await this.loadSettings();

        // 初始化服务
        this.pageExtractor = new PageExtractorService(this.app);
        this.aiService = new AIService(this.settings);
        this.noteGenerator = new NoteGeneratorService(this.app);

        // 注册 Chat View
        this.registerView(
            CHAT_VIEW_TYPE,
            (leaf) => new ChatView(leaf, this)
        );

        // 注册命令
        this.registerCommands();

        // 添加设置页面
        this.addSettingTab(new WebAISettingTab(this.app, this));

        // 添加 Ribbon 图标（可选）
        this.addRibbonIcon('sparkles', 'AI Summarize Web Page', async () => {
            await this.summarizeCurrentPage();
        });
    }

    onunload() {
        console.log('Unloading Web Viewer AI Summarizer & Chat plugin');
    }

    /**
     * 注册所有命令
     */
    registerCommands() {
        // 1. 总结当前网页
        this.addCommand({
            id: 'summarize-current-page',
            name: 'Summarize current web page',
            callback: async () => {
                await this.summarizeCurrentPage();
            }
        });

        // 2. 生成笔记（与总结类似，但更详细）
        this.addCommand({
            id: 'generate-note-from-page',
            name: 'Generate note from current web page',
            callback: async () => {
                await this.summarizeCurrentPage();
            }
        });

        // 3. 打开 Chat 对话
        this.addCommand({
            id: 'chat-with-page',
            name: 'Chat with current web page',
            callback: async () => {
                await this.openChatView();
            }
        });

        // 4. 重新抓取页面（在 Chat 中使用）
        this.addCommand({
            id: 're-extract-page',
            name: 'Re-extract current web page',
            callback: async () => {
                showInfo('请在 Chat 视图中点击"重新抓取"按钮');
            }
        });

        // 5. 从剪贴板总结（兜底方案）
        this.addCommand({
            id: 'summarize-from-clipboard',
            name: 'Summarize from clipboard',
            callback: async () => {
                await this.summarizeFromClipboard();
            }
        });
    }

    /**
     * 总结当前网页
     */
    async summarizeCurrentPage() {
        try {
            // 检查配置
            if (!this.settings.apiKey) {
                showError('请先在设置中配置 API Key');
                return;
            }

            showInfo('正在提取页面内容...');

            // 提取页面
            const page = await this.pageExtractor.extractFromWebViewer();

            if (!page) {
                showError('无法提取页面内容。请尝试使用"从剪贴板总结"命令');
                return;
            }

            showInfo('正在生成总结...');

            // 生成总结
            const summary = await this.aiService.summarize(page);

            // 生成笔记内容
            const noteContent = this.noteGenerator.generateNoteContent(
                page,
                summary,
                this.settings
            );

            // 保存笔记
            const file = await this.noteGenerator.saveNote(
                noteContent,
                page,
                this.settings
            );

            showSuccess(`笔记已保存：${file.path}`);

            // 打开笔记
            await this.noteGenerator.openNote(file);

        } catch (error) {
            console.error('总结失败:', error);
            showError('总结失败', error as Error);
        }
    }

    /**
     * 从剪贴板总结
     */
    async summarizeFromClipboard() {
        try {
            // 检查配置
            if (!this.settings.apiKey) {
                showError('请先在设置中配置 API Key');
                return;
            }

            showInfo('正在从剪贴板读取内容...');

            // 从剪贴板提取
            const page = await this.pageExtractor.extractFromClipboard();

            if (!page) {
                return; // 用户取消了
            }

            showInfo('正在生成总结...');

            // 生成总结
            const summary = await this.aiService.summarize(page);

            // 生成笔记内容
            const noteContent = this.noteGenerator.generateNoteContent(
                page,
                summary,
                this.settings
            );

            // 保存笔记
            const file = await this.noteGenerator.saveNote(
                noteContent,
                page,
                this.settings
            );

            showSuccess(`笔记已保存：${file.path}`);

            // 打开笔记
            await this.noteGenerator.openNote(file);

        } catch (error) {
            console.error('从剪贴板总结失败:', error);
            showError('总结失败', error as Error);
        }
    }

    /**
     * 打开 Chat 视图
     */
    async openChatView() {
        // 检查配置
        if (!this.settings.apiKey) {
            showError('请先在设置中配置 API Key');
            return;
        }

        // 检查是否已经打开
        const existing = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);

        if (existing.length > 0) {
            // 已存在，激活它
            this.app.workspace.revealLeaf(existing[0]);
            return;
        }

        // 在右侧边栏打开新的 Chat View
        const leaf = this.app.workspace.getRightLeaf(false);
        await leaf?.setViewState({
            type: CHAT_VIEW_TYPE,
            active: true
        });

        this.app.workspace.revealLeaf(leaf!);
    }

    /**
     * 加载设置
     */
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    /**
     * 保存设置
     */
    async saveSettings() {
        await this.saveData(this.settings);
        // 更新 AI Service 的设置
        this.aiService?.updateSettings(this.settings);
    }
}
