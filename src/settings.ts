import { App, PluginSettingTab, Setting } from 'obsidian';
import TranslationPlugin from './main';

export class SettingTab extends PluginSettingTab {
    plugin: TranslationPlugin;

    constructor(app: App, plugin: TranslationPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: '翻译插件设置' });

        new Setting(containerEl)
            .setName('启用翻译')
            .setDesc('开启或关闭翻译功能')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.isEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.isEnabled = value;
                    if (value) {
                        this.plugin.translationService.enable();
                    } else {
                        this.plugin.translationService.disable();
                    }
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('显示悬浮球')
            .setDesc('在界面右下角显示翻译控制球')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFloatingBall)
                .onChange(async (value) => {
                    this.plugin.settings.showFloatingBall = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('调试模式')
            .setDesc('开启后会在控制台输出更多调试信息')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));
    }
}
