import { Plugin, Notice, App, PluginManifest, PluginSettingTab, Setting } from 'obsidian';
import { TranslationService } from './services/translation';
import { ChangeRecorder } from './services/recorder';
import { ControlWindow } from './components/ControlWindow';
import { FloatingBall } from './components/FloatingBall';
import { TranslationRule } from './types/TranslationRule';
import { LoggerService } from './services/logger';

export class AquL10nSettingTab extends PluginSettingTab {
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

interface TranslationPluginSettings {
    isEnabled: boolean;
    showFloatingBall: boolean;
    debugMode: boolean;
}

const DEFAULT_SETTINGS: TranslationPluginSettings = {
    isEnabled: true,
    showFloatingBall: true,
    debugMode: false,
};

export default class TranslationPlugin extends Plugin {
    public controlWindow: ControlWindow | null = null;
    public translationService: TranslationService;
    public changeRecorder: ChangeRecorder;
    public logger: LoggerService;
    private floatingBall: FloatingBall;
    public settings: TranslationPluginSettings;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
    }

    async onload() {
        console.log('加载翻译插件');
        
        // 初始化日志服务
        this.logger = new LoggerService(this);

        // 加载设置
        await this.loadSettings();
        this.logger.setDebugMode(this.settings.debugMode);
        
        // 初始化服务
        this.translationService = new TranslationService(this);
        this.changeRecorder = new ChangeRecorder(this);
        
        // 初始化并加载所有规则
        console.log('开始加载所有翻译规则...');
        await this.translationService.init();
        console.log('翻译规则加载完成');

        // 如果上次是启用状态，自动应用翻译
        if (this.settings.isEnabled) {
            console.log('检测到翻译状态为启用，自动应用翻译');
            this.translationService.enable();
        }

        // 初始化组件
        this.controlWindow = new ControlWindow(this);
        if (this.settings.showFloatingBall) {
            this.floatingBall = new FloatingBall(this);
        }

        // 添加命令
        this.addCommands();

        // 添加状态栏
        this.addStatusBar();

        // 添加设置选项
        this.addSettingTab(new AquL10nSettingTab(this.app, this));
    }

    private addCommands() {
        // 切换翻译状态
        this.addCommand({
            id: 'toggle-translation',
            name: '切换翻译状态',
            callback: () => {
                const newState = !this.translationService.isEnabled;
                if (newState) {
                    this.translationService.enable();
                } else {
                    this.translationService.disable();
                }
                new Notice(`翻译已${newState ? '启用' : '禁用'}`);
            }
        });

        // 切换控制面板
        this.addCommand({
            id: 'toggle-control-panel',
            name: '切换控制面板',
            callback: () => {
                if (this.controlWindow) {
                    this.controlWindow.toggle();
                }
            }
        });

        // 切换悬浮球
        this.addCommand({
            id: 'toggle-floating-ball',
            name: '切换悬浮球',
            callback: () => {
                this.settings.showFloatingBall = !this.settings.showFloatingBall;
                this.saveSettings();
                
                if (this.settings.showFloatingBall) {
                    if (!this.floatingBall) {
                        this.floatingBall = new FloatingBall(this);
                    }
                    this.floatingBall.show();
                } else {
                    if (this.floatingBall) {
                        this.floatingBall.hide();
                    }
                }
                
                new Notice(`悬浮球已${this.settings.showFloatingBall ? '显示' : '隐藏'}`);
            }
        });
    }

    private addStatusBar() {
        const statusBarItem = this.addStatusBarItem();
        statusBarItem.createEl('span', { text: '翻译' });
        statusBarItem.onclick = () => {
            if (this.controlWindow) {
                this.controlWindow.toggle();
            }
        };
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.logger.setDebugMode(this.settings.debugMode);
    }

    onunload() {
        // 保存当前状态
        this.translationService.saveTranslationState();
        
        // 清理组件
        if (this.controlWindow) {
            this.controlWindow.destroy();
        }
        if (this.floatingBall) {
            this.floatingBall.destroy();
        }
        
        console.log('卸载翻译插件');
    }

    public getCurrentPluginId(): string {
        const activeTab = document.querySelector('.vertical-tab-nav-item.is-active');
        if (!activeTab) {
            console.log('未找到活动标签');
            return '';
        }

        // 从 data-tab-id 获取插件ID
        const tabId = activeTab.getAttribute('data-tab-id');
        if (tabId?.startsWith('plugin-')) {
            return tabId.replace('plugin-', '');
        }
        
        // 如果没有 data-tab-id，尝试从插件列表中匹配
        const pluginName = activeTab.textContent?.trim() || '';
        const plugins = (this.app as any).plugins.plugins;
        
        for (const [id, plugin] of Object.entries(plugins) as [string, any][]) {
            if (plugin.manifest.name === pluginName) {
                return id;
            }
        }

        return '';
    }

    public isTranslationEnabled(): boolean {
        return this.translationService.isEnabled;
    }

    public toggleTranslation() {
        const newState = !this.isTranslationEnabled();
        if (newState) {
            this.translationService.enable();
        } else {
            this.translationService.disable();
        }
        new Notice(`翻译已${newState ? '启用' : '禁用'}`);
    }

    public getAllRules(): TranslationRule[] {
        return this.translationService.getAllRules();
    }

    // 公共方法
    takeSnapshot() {
        this.changeRecorder.takeSnapshot();
    }
}