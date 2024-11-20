import { App, PluginSettingTab, Setting, ButtonComponent } from 'obsidian';
import TranslationPlugin from './main';

export class TranslationSettingTab extends PluginSettingTab {
    private plugin: TranslationPlugin;

    constructor(app: App, plugin: TranslationPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: '插件翻译设置' });

        // 添加说明
        containerEl.createEl('p', { 
            text: '使用方法：\n1. 打开要翻译的插件设置页面\n2. 使用命令面板执行"扫描当前插件设置文本"\n3. 在下方编辑对应的翻译' 
        });

        // 添加刷新按钮
        new Setting(containerEl)
            .setName('刷新翻译列表')
            .setDesc('手动刷新翻译条目列表')
            .addButton(button => button
                .setButtonText('刷新')
                .onClick(() => {
                    this.display();
                }));

        // 获取所有翻译条目
        const translations = this.plugin.translationService.getAllTranslations();
        const pluginIds = new Set(translations.map(t => t.pluginId));

        if (pluginIds.size === 0) {
            containerEl.createEl('p', { 
                text: '还没有检测到需要翻译的文本。请先打开要翻译的插件设置页面，然后使用命令面板执行"扫描当前插件设置文本"。' 
            });
            return;
        }

        // 按插件分组显示翻译
        for (const pluginId of pluginIds) {
            const pluginTranslations = this.plugin.translationService.getPluginTranslations(pluginId);
            
            const pluginSection = containerEl.createEl('div', { cls: 'translation-plugin-section' });
            
            // 插件标题
            pluginSection.createEl('h3', { text: pluginId });

            // 添加该插件的所有翻译条目
            for (const item of pluginTranslations) {
                new Setting(pluginSection)
                    .setName('原文：' + item.original)
                    .setDesc('请输入译文：')
                    .addText(text => text
                        .setValue(item.translated)
                        .onChange(async (value) => {
                            this.plugin.translationService.addTranslation(
                                item.pluginId,
                                item.original,
                                value
                            );
                        }));
            }
        }
    }
} 