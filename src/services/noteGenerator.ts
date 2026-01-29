import { App, TFile, normalizePath } from 'obsidian';
import { PluginSettings, ExtractedPage } from '../types';
import {
    formatFileName,
    generateFrontmatter,
    ensureFolderExists,
    getUniqueFileName
} from '../utils/helpers';

/**
 * 笔记生成服务
 */
export class NoteGeneratorService {
    constructor(private app: App) { }

    /**
     * 生成笔记内容
     */
    generateNoteContent(page: ExtractedPage, summary: string, settings: PluginSettings): string {
        const parts: string[] = [];

        // 添加 Frontmatter
        if (settings.includeFrontmatter) {
            parts.push(generateFrontmatter(page));
        }

        // 添加标题
        parts.push(`# ${page.title}\n`);

        // 添加源信息
        parts.push(`**来源**：${page.url}\n`);
        parts.push(`**抓取时间**：${new Date(page.capturedAt).toLocaleString('zh-CN')}\n`);

        // 添加分割线
        parts.push('---\n');

        // 添加总结内容
        parts.push(summary);

        return parts.join('\n');
    }

    /**
     * 保存笔记到 Vault
     */
    async saveNote(
        content: string,
        page: ExtractedPage,
        settings: PluginSettings
    ): Promise<TFile> {
        try {
            // 确保目标文件夹存在
            const normalizedFolder = normalizePath(settings.saveFolder);
            await ensureFolderExists(this.app, normalizedFolder);

            // 生成文件名
            const fileName = formatFileName(settings.fileNameTemplate, page);
            const uniqueFileName = await getUniqueFileName(this.app, normalizedFolder, fileName);

            // 完整路径
            const filePath = normalizePath(`${normalizedFolder}/${uniqueFileName}`);

            // 创建文件
            const file = await this.app.vault.create(filePath, content);

            return file;
        } catch (error) {
            console.error('保存笔记失败:', error);
            throw new Error(`保存笔记失败: ${error.message}`);
        }
    }

    /**
     * 打开笔记
     */
    async openNote(file: TFile): Promise<void> {
        const leaf = this.app.workspace.getLeaf('tab');
        await leaf.openFile(file);
    }

    /**
     * 生成 Q&A 笔记（用于 Chat）
     */
    generateQANote(page: ExtractedPage, messages: Array<{ role: string; content: string }>, settings: PluginSettings): string {
        const parts: string[] = [];

        // 添加 Frontmatter
        if (settings.includeFrontmatter) {
            parts.push(generateFrontmatter(page));
        }

        // 添加标题
        parts.push(`# Q&A: ${page.title}\n`);

        // 添加源信息
        parts.push(`**来源**：${page.url}\n`);
        parts.push(`**创建时间**：${new Date().toLocaleString('zh-CN')}\n`);
        parts.push('---\n');

        // 添加对话内容
        for (const msg of messages) {
            if (msg.role === 'user') {
                parts.push(`## 🙋 提问\n\n${msg.content}\n`);
            } else if (msg.role === 'assistant') {
                parts.push(`## 🤖 回答\n\n${msg.content}\n`);
            }
        }

        return parts.join('\n');
    }
}
