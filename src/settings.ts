import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { SUMMARY_TEMPLATES } from './utils/prompts';
import type { PluginSettings } from './types';

/**
 * 设置页面
 */
export class WebAISettingTab extends PluginSettingTab {
    plugin: Plugin & {
        settings: PluginSettings;
        saveSettings: () => Promise<void>;
    };

    constructor(app: App, plugin: Plugin & { settings: PluginSettings; saveSettings: () => Promise<void> }) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Web Viewer AI Summarizer 设置' });

        // ===== AI Provider 配置 =====
        containerEl.createEl('h3', { text: 'AI 服务配置' });

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('OpenAI 或兼容服务的 API Key')
            .addText(text => {
                text.inputEl.type = 'password';
                text
                    .setPlaceholder('sk-...')
                    .setValue(this.plugin.settings.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.apiKey = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Base URL')
            .setDesc('API 基础地址（默认为 OpenAI）')
            .addText(text => text
                .setPlaceholder('https://api.openai.com/v1')
                .setValue(this.plugin.settings.baseUrl)
                .onChange(async (value) => {
                    this.plugin.settings.baseUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('模型')
            .setDesc('使用的 AI 模型名称')
            .addText(text => text
                .setPlaceholder('gpt-3.5-turbo')
                .setValue(this.plugin.settings.model)
                .onChange(async (value) => {
                    this.plugin.settings.model = value;
                    await this.plugin.saveSettings();
                }));

        // 自定义 Prompt 容器（初始隐藏）
        const customPromptContainer = containerEl.createDiv();

        const updateCustomPromptVisibility = () => {
            customPromptContainer.empty();
            if (this.plugin.settings.summaryTemplate === 'custom') {
                new Setting(customPromptContainer)
                    .setName('自定义 Prompt')
                    .setDesc('支持变量：{{title}}（页面标题）、{{url}}（网页地址）、{{content}}（网页内容）')
                    .addTextArea(text => text
                        .setPlaceholder('请对以下网页内容进行总结：\n\n网页标题：{{title}}\n网页 URL：{{url}}\n\n网页内容：\n{{content}}\n\n请用 Markdown 格式输出总结。')
                        .setValue(this.plugin.settings.customPrompt)
                        .onChange(async (value) => {
                            this.plugin.settings.customPrompt = value;
                            await this.plugin.saveSettings();
                        }))
                    .then(setting => {
                        const textArea = setting.controlEl.querySelector('textarea');
                        if (textArea) {
                            textArea.style.width = '100%';
                            textArea.style.height = '150px';
                            textArea.style.fontFamily = 'monospace';
                        }
                    });
            }
        };

        new Setting(containerEl)
            .setName('总结模板')
            .setDesc('选择生成总结时使用的模板')
            .addDropdown(dropdown => {
                for (const [key, template] of Object.entries(SUMMARY_TEMPLATES)) {
                    dropdown.addOption(key, template.name);
                }
                dropdown
                    .setValue(this.plugin.settings.summaryTemplate)
                    .onChange(async (value: any) => {
                        this.plugin.settings.summaryTemplate = value;
                        await this.plugin.saveSettings();
                        updateCustomPromptVisibility();
                    });
            });

        // 初始化时检查是否显示自定义 Prompt
        updateCustomPromptVisibility();

        new Setting(containerEl)
            .setName('保存文件夹')
            .setDesc('生成的笔记保存路径（相对于 Vault 根目录）')
            .addText(text => text
                .setPlaceholder('Inbox/Web')
                .setValue(this.plugin.settings.saveFolder)
                .onChange(async (value) => {
                    this.plugin.settings.saveFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('文件命名规则')
            .setDesc('支持变量：{{title}}（页面标题）、{{date}}（日期）、{{time}}（时间）')
            .addText(text => text
                .setPlaceholder('{{title}} - {{date}}')
                .setValue(this.plugin.settings.fileNameTemplate)
                .onChange(async (value) => {
                    this.plugin.settings.fileNameTemplate = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('包含 Frontmatter')
            .setDesc('是否在生成的笔记中添加 YAML Frontmatter（包含 URL、标题等元数据）')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeFrontmatter)
                .onChange(async (value) => {
                    this.plugin.settings.includeFrontmatter = value;
                    await this.plugin.saveSettings();
                }));

        // ===== 高级配置 =====
        containerEl.createEl('h3', { text: '高级配置' });

        new Setting(containerEl)
            .setName('最大字符数')
            .setDesc('提取页面内容的最大字符限制（超出部分将被截断）')
            .addText(text => text
                .setPlaceholder('30000')
                .setValue(String(this.plugin.settings.maxCharacters))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.maxCharacters = num;
                        await this.plugin.saveSettings();
                    }
                }));

        // ===== 隐私提示 =====
        containerEl.createEl('h3', { text: '隐私提醒' });
        const privacyNotice = containerEl.createEl('div', {
            cls: 'setting-item-description'
        });
        privacyNotice.innerHTML = `
            <p><strong>⚠️ 重要提示：</strong></p>
            <ul>
                <li>本插件会将网页内容发送到您配置的 AI 服务（如 OpenAI）进行处理</li>
                <li>API Key 仅保存在本地 Obsidian 设置中</li>
                <li>请自行评估隐私风险，避免发送敏感或机密内容</li>
            </ul>
        `;
    }
}
