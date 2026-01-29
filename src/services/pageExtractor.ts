import { App, Modal, Notice, requestUrl } from 'obsidian';
import { ExtractedPage } from '../types';
import { cleanContent, getCurrentWebViewerLeaf, showError, showInfo } from '../utils/helpers';

/**
 * 页面提取服务
 */
export class PageExtractorService {
    constructor(private app: App) { }

    /**
     * 从 Web Viewer 提取内容（方案 A）
     */
    async extractFromWebViewer(): Promise<ExtractedPage | null> {
        try {
            const webViewerLeaf = getCurrentWebViewerLeaf(this.app);

            if (!webViewerLeaf) {
                showError('未找到打开的 Web Viewer 页面');
                return null;
            }

            // 尝试从 Web Viewer 获取内容
            // 注意：这部分 API 可能需要根据实际情况调整
            const view = webViewerLeaf.view as any;

            // 尝试获取 URL
            let url = '';
            if (view.getState && typeof view.getState === 'function') {
                const state = view.getState();
                url = state?.url || '';
            }

            if (!url) {
                showError('无法获取当前页面 URL');
                return null;
            }

            showInfo('正在提取页面内容...');

            // 尝试执行 JavaScript 获取内容
            // 这里使用两种可能的方法
            let title = '';
            let content = '';

            try {
                // 方法 1：如果 view 有 executeJavaScript 方法
                if (view.executeJavaScript && typeof view.executeJavaScript === 'function') {
                    const result = await view.executeJavaScript(`
						JSON.stringify({
							title: document.title,
							content: document.body.innerText || document.documentElement.outerHTML
						})
					`);
                    const data = JSON.parse(result);
                    title = data.title;
                    content = data.content;
                }
                // 方法 2：如果有 webContents 属性（Electron）
                else if (view.webContents) {
                    const result = await view.webContents.executeJavaScript(`
						JSON.stringify({
							title: document.title,
							content: document.body.innerText || document.documentElement.outerHTML
						})
					`);
                    const data = JSON.parse(result);
                    title = data.title;
                    content = data.content;
                }
                // 方法 3：使用 fetch 获取（可能受 CORS 限制）
                else {
                    throw new Error('无法访问 Web Viewer DOM');
                }
            } catch (error) {
                console.error('无法从 Web Viewer 提取 DOM 内容:', error);
                // 如果无法提取 DOM，尝试通过 fetch 获取
                try {
                    const response = await requestUrl({ url });
                    const html = response.text;

                    // 简单的 HTML 解析：提取 title 和 body
                    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
                    title = titleMatch ? titleMatch[1] : new URL(url).hostname;

                    // 移除脚本和样式标签
                    const bodyContent = html
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>');

                    content = cleanContent(bodyContent);
                } catch (fetchError) {
                    console.error('无法通过 fetch 获取页面:', fetchError);
                    return null;
                }
            }

            if (!content || content.trim().length === 0) {
                showError('提取的页面内容为空');
                return null;
            }

            return {
                title: title || '未命名页面',
                url,
                content: cleanContent(content),
                capturedAt: new Date().toISOString(),
            };
        } catch (error) {
            console.error('提取页面失败:', error);
            showError('页面提取失败', error as Error);
            return null;
        }
    }

    /**
     * 从剪贴板提取内容（方案 B - 兜底方案）
     */
    async extractFromClipboard(): Promise<ExtractedPage | null> {
        try {
            // 从剪贴板读取文本
            const clipboardText = await navigator.clipboard.readText();

            if (!clipboardText || clipboardText.trim().length === 0) {
                showError('剪贴板为空，请先复制网页内容');
                return null;
            }

            // 弹出模态框让用户输入 URL 和标题
            return new Promise((resolve) => {
                new ClipboardInputModal(this.app, clipboardText, (result) => {
                    resolve(result);
                }).open();
            });
        } catch (error) {
            console.error('从剪贴板读取失败:', error);
            showError('无法读取剪贴板内容', error as Error);
            return null;
        }
    }
}

/**
 * 剪贴板输入模态框
 */
class ClipboardInputModal extends Modal {
    private result: ExtractedPage | null = null;

    constructor(
        app: App,
        private clipboardContent: string,
        private onSubmit: (result: ExtractedPage | null) => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: '从剪贴板创建笔记' });
        contentEl.createEl('p', {
            text: '已从剪贴板读取内容。请输入网页的 URL 和标题：',
            cls: 'setting-item-description'
        });

        // URL 输入
        const urlSetting = contentEl.createDiv({ cls: 'setting-item' });
        urlSetting.createDiv({ cls: 'setting-item-name', text: 'URL' });
        const urlInput = urlSetting.createEl('input', {
            type: 'text',
            placeholder: 'https://example.com',
            cls: 'setting-item-control'
        });
        urlInput.style.width = '100%';

        // 标题输入
        const titleSetting = contentEl.createDiv({ cls: 'setting-item' });
        titleSetting.createDiv({ cls: 'setting-item-name', text: '标题' });
        const titleInput = titleSetting.createEl('input', {
            type: 'text',
            placeholder: '网页标题',
            cls: 'setting-item-control'
        });
        titleInput.style.width = '100%';

        // 按钮
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        const submitButton = buttonContainer.createEl('button', {
            text: '确定',
            cls: 'mod-cta'
        });
        submitButton.addEventListener('click', () => {
            const url = urlInput.value.trim();
            const title = titleInput.value.trim();

            if (!url) {
                new Notice('请输入 URL');
                return;
            }

            this.result = {
                title: title || '未命名页面',
                url,
                content: cleanContent(this.clipboardContent),
                capturedAt: new Date().toISOString(),
            };

            this.close();
        });

        const cancelButton = buttonContainer.createEl('button', { text: '取消' });
        cancelButton.addEventListener('click', () => {
            this.result = null;
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.onSubmit(this.result);
    }
}
