import { Plugin, Notice, App, PluginManifest } from 'obsidian';
import { TranslationService } from './TranslationService';
import { ChangeRecorder } from './ChangeRecorder';
import { ControlWindow } from './ControlWindow';
import { TranslationRule } from './types/TranslationRule';
import { TranslationExtractor } from './TranslationExtractor';

export default class TranslationPlugin extends Plugin {
    public controlWindow: ControlWindow | null = null;
    public translationService: TranslationService;
    private changeRecorder: ChangeRecorder;
    private translationExtractor: TranslationExtractor;
    public settings: TranslationPluginSettings;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.translationExtractor = new TranslationExtractor(this);
    }

    async onload() {
        console.log('加载翻译插件');
        
        // 加载设置
        await this.loadSettings();
        
        // 初始化服务
        this.translationService = new TranslationService(this);
        this.changeRecorder = new ChangeRecorder(this);
        
        // 初始化并加载所有规则
        console.log('开始加载所有翻译规则...');
        await this.translationService.loadAllRules();
        console.log('翻译规则加载完成，规则数量:', this.translationService.getRuleCount());

        // 如果上次是启用状态，自动应用翻译
        if (this.settings.isEnabled) {
            console.log('检测到翻译状态为启用，自动应用翻译');
            this.translationService.setEnabled(true);
        }

        // 初始化其他组件
        this.controlWindow = new ControlWindow(this);

        // 添加命令
        this.addCommand({
            id: 'toggle-translation',
            name: '切换翻译状态',
            callback: () => {
                const newState = !this.translationService.isTranslationEnabled();
                this.translationService.setEnabled(newState);
                new Notice(`翻译已${newState ? '启用' : '禁用'}`);
            }
        });

        this.addCommand({
            id: 'toggle-control-panel',
            name: '切换控制面板',
            callback: () => {
                if (this.controlWindow) {
                    this.controlWindow.toggle();
                }
            }
        });

        this.addCommand({
            id: 'start-recording',
            name: '开始记录翻译',
            callback: () => {
                if (this.controlWindow) {
                    this.controlWindow.startRecording();
                }
            }
        });

        this.addCommand({
            id: 'stop-recording',
            name: '停止记录翻译',
            callback: () => {
                if (this.controlWindow) {
                    this.controlWindow.stopRecording();
                }
            }
        });

        // 添加状态栏
        const statusBarItem = this.addStatusBarItem();
        statusBarItem.createEl('span', { text: '翻译' });
        statusBarItem.onclick = () => {
            this.controlWindow.toggle();
        };
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        // 保存当前状态
        this.translationService.saveTranslationState();
        if (this.controlWindow) {
            this.controlWindow.close();
            this.controlWindow.destroy();
        }
        console.log('卸载翻译插件');
    }

    public getCurrentPluginId(): string {
        const activeTab = document.querySelector('.vertical-tab-nav-item.is-active');
        if (!activeTab) {
            console.log('未找到活动标签');
            return '';
        }
        
        // 输出调试信息
        console.log('当前标签元素:', {
            element: activeTab,
            dataTabId: activeTab.getAttribute('data-tab-id'),
            textContent: activeTab.textContent
        });

        // 从 data-tab-id 获取插件ID
        const tabId = activeTab.getAttribute('data-tab-id');
        if (tabId?.startsWith('plugin-')) {
            const pluginId = tabId.replace('plugin-', '');
            console.log('找到插件ID:', pluginId);
            return pluginId;
        }
        
        // 如果没有 data-tab-id，尝试从插件列表中匹配
        const pluginName = activeTab.textContent?.trim() || '';
        const plugins = (this.app as any).plugins.plugins;
        
        // 输出所有插件信息用于调试
        console.log('所有已安装插件:', Object.entries(plugins).map(([id, plugin]) => ({
            id,
            name: (plugin as any).manifest.name
        })));


        // 尝试通过名称匹配找到插件ID
        for (const [id, plugin] of Object.entries(plugins) as [string, any][]) {
            if (plugin.manifest.name === pluginName) {
                console.log('通过名称匹配找到插件ID:', id);
                return id;
            }
        }

        console.log('未能找到插件ID，使用的插件名称:', pluginName);
        return '';
    }

    // 获取当前激活的插件ID
    private getActivePluginId(): string | null {
        // 检查当前激活的设置标签
        const activeTab = document.querySelector('.vertical-tab-header-group.is-active');
        if (activeTab) {
            const tabContent = activeTab.textContent?.trim();
            if (tabContent) {
                // 遍历所有已安装的插件
                const plugins = (this.app as any).plugins.plugins;
                for (const [id, plugin] of Object.entries(plugins)) {
                    const manifest = (plugin as Plugin).manifest;
                    if (manifest.name === tabContent) {
                        return id;
                    }
                }
            }
        }
        return null;
    }

    // 提供给控制面板使用的方法
    public isTranslationEnabled(): boolean {
        return this.translationService.isTranslationEnabled();
    }

    public toggleTranslation() {
        const newState = !this.isTranslationEnabled();
        this.translationService.setEnabled(newState);
        new Notice(`翻译已${newState ? '启用' : '禁用'}`);
    }

    public startRecording() {
        if (this.controlWindow) {
            this.controlWindow.startRecording();
        }
    }

    public stopRecording() {
        if (this.controlWindow) {
            this.controlWindow.stopRecording();
        }
    }

    public getAllRules(): TranslationRule[] {
        return this.translationService.getAllRules();
    }

    deleteRules(ruleKeys: string[]) {
        this.translationService.deleteRules(ruleKeys);
        this.translationService.saveRules();
        // 更新控制面板
        this.controlWindow?.updateRulesList();
    }

    updateRule(rule: TranslationRule) {
        this.translationService.updateRule(rule);
        this.translationService.saveRules();
        // 更新控制面板
        this.controlWindow?.updateRulesList();
    }

    // 添加公共方法
    public generateRuleKey(pluginId: string, selector: string, originalText: string): string {
        return this.translationService.generateRuleKey(pluginId, selector, originalText);
    }
}

const DEFAULT_SETTINGS: TranslationPluginSettings = {
    isEnabled: false,
};

interface TranslationPluginSettings {
    isEnabled: boolean;
}