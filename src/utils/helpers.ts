import { App, WorkspaceLeaf, Notice } from 'obsidian';
import { ExtractedPage } from '../types';

/**
 * 格式化文件名（替换模板变量）
 */
export function formatFileName(template: string, page: ExtractedPage): string {
    const date = new Date(page.capturedAt);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS

    // 清理标题：移除非法字符
    const cleanTitle = page.title
        .replace(/[\\/:*?"<>|]/g, '-') // 替换非法字符
        .replace(/\s+/g, ' ') // 合并多个空格
        .trim()
        .substring(0, 100); // 限制长度

    let result = template;
    result = result.replace(/\{\{title\}\}/g, cleanTitle);
    result = result.replace(/\{\{date\}\}/g, dateStr);
    result = result.replace(/\{\{time\}\}/g, timeStr);
    result = result.replace(/\{\{url\}\}/g, page.url);

    // 确保有 .md 扩展名
    if (!result.endsWith('.md')) {
        result += '.md';
    }

    return result;
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxChars: number): { text: string; truncated: boolean } {
    if (text.length <= maxChars) {
        return { text, truncated: false };
    }

    const truncated = text.substring(0, maxChars);
    return {
        text: truncated + '\n\n[... 内容已截断，原文超出字符限制 ...]',
        truncated: true
    };
}

/**
 * 清理文本内容
 */
export function cleanContent(content: string): string {
    return content
        .replace(/\n{3,}/g, '\n\n') // 合并多个空行
        .replace(/[ \t]+/g, ' ') // 合并多个空格/制表符
        .trim();
}

/**
 * 检查是否为 Web Viewer Leaf
 * 改进：使用更通用的检测方法
 */
export function isWebViewerLeaf(leaf: WorkspaceLeaf): boolean {
    try {
        const viewType = leaf.view.getViewType();
        const view = leaf.view as any;

        // 方法 1：检查常见的 view type 名称
        const commonWebViewTypes = [
            'web-browser', 'webpage', 'browser',
            'web-view', 'obsidian-web-browser', 'web'
        ];
        if (commonWebViewTypes.includes(viewType)) {
            return true;
        }

        // 方法 2：检查是否有 getState 方法并包含 url 属性
        if (view.getState && typeof view.getState === 'function') {
            const state = view.getState();
            if (state && state.url) {
                return true;
            }
        }

        // 方法 3：检查是否直接有 url 属性
        if (view.url || view.currentUrl) {
            return true;
        }

        // 方法 4：检查是否有 webContents 或 executeJavaScript（Electron webview）
        if (view.webContents || view.executeJavaScript) {
            return true;
        }

        return false;
    } catch (error) {
        console.error('检查 Web Viewer Leaf 时出错:', error);
        return false;
    }
}

/**
 * 获取当前激活的 Web Viewer Leaf
 * 改进：使用更全面的查找策略
 */
export function getCurrentWebViewerLeaf(app: App): WorkspaceLeaf | null {
    const activeLeaf = app.workspace.activeLeaf;

    // 优先检查当前激活的 leaf
    if (activeLeaf && isWebViewerLeaf(activeLeaf)) {
        console.log('[Web AI] 找到激活的 Web Viewer:', activeLeaf.view.getViewType());
        return activeLeaf;
    }

    // 遍历所有打开的 leaves 查找 Web Viewer
    let foundLeaf: WorkspaceLeaf | null = null;
    app.workspace.iterateAllLeaves((leaf) => {
        if (!foundLeaf && isWebViewerLeaf(leaf)) {
            console.log('[Web AI] 找到 Web Viewer leaf:', leaf.view.getViewType());
            foundLeaf = leaf;
        }
    });

    if (foundLeaf) {
        return foundLeaf;
    }

    // 尝试常见的 view type 名称
    const commonTypes = [
        'web-browser', 'webpage', 'browser',
        'web-view', 'obsidian-web-browser', 'web'
    ];

    for (const type of commonTypes) {
        const leaves = app.workspace.getLeavesOfType(type);
        if (leaves.length > 0) {
            console.log(`[Web AI] 通过类型 "${type}" 找到 Web Viewer`);
            return leaves[0];
        }
    }

    console.error('[Web AI] 未找到任何 Web Viewer leaf');
    return null;
}

/**
 * 生成 Frontmatter
 */
export function generateFrontmatter(page: ExtractedPage): string {
    const yaml = [
        '---',
        'source: web',
        `url: "${page.url}"`,
        `title: "${page.title.replace(/"/g, '\\"')}"`,
        `captured_at: ${page.capturedAt}`,
    ];

    if (page.metadata?.author) {
        yaml.push(`author: "${page.metadata.author}"`);
    }

    if (page.metadata?.publishedDate) {
        yaml.push(`published_date: "${page.metadata.publishedDate}"`);
    }

    yaml.push('---');
    yaml.push(''); // 空行

    return yaml.join('\n');
}

/**
 * 显示错误通知
 */
export function showError(message: string, error?: Error): void {
    const errorMsg = error ? `${message}: ${error.message}` : message;
    new Notice(errorMsg, 8000);
    console.error('[Web AI]', errorMsg, error);
}

/**
 * 显示成功通知
 */
export function showSuccess(message: string): void {
    new Notice(message, 4000);
}

/**
 * 显示信息通知
 */
export function showInfo(message: string): void {
    new Notice(message, 3000);
}

/**
 * 检查并创建文件夹
 */
export async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
        await app.vault.createFolder(folderPath);
    }
}

/**
 * 生成唯一文件名（处理重名）
 */
export async function getUniqueFileName(app: App, folderPath: string, fileName: string): Promise<string> {
    const baseName = fileName.replace(/\.md$/, '');
    let finalName = fileName;
    let counter = 1;

    while (app.vault.getAbstractFileByPath(`${folderPath}/${finalName}`)) {
        finalName = `${baseName} ${counter}.md`;
        counter++;
    }

    return finalName;
}
