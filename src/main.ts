import { Plugin, Notice } from 'obsidian';
import { TranslationService } from './TranslationService';
import { ChangeRecorder } from './ChangeRecorder';
import { ControlWindow } from './ControlWindow';

export default class TranslationPlugin extends Plugin {
    public controlWindow: ControlWindow | null = null;
    private translationService: TranslationService;
    private changeRecorder: ChangeRecorder;

    async onload() {
        console.log('加载翻译插件');
        
        this.translationService = new TranslationService(this);
        this.changeRecorder = new ChangeRecorder(this);

        // 加载已保存的规则
        await this.translationService.loadRules();

    // 如果翻译状态为开启，则自动重启一次
    if (this.translationService.isTranslationEnabled) {
        console.log('检测到翻译状态为开启，自动重启翻译');
        this.translationService.disable();
        setTimeout(() => {
            this.translationService.enable();
            }, 100);
        }

        // 添加记录命令
        this.addCommand({
            id: 'start-translation-recording',
            name: '开始记录翻译修改',
            callback: () => {
                this.changeRecorder.startRecording();
                new Notice('开始记录翻译修改\n请打开开发者工具进行文本修改');
            }
        });

        this.addCommand({
            id: 'stop-translation-recording',
            name: '停止记录并生成规则',
            callback: () => {
                const changes = this.changeRecorder.stopRecording();
                if (changes.length > 0) {
                    const pluginId = this.getCurrentPluginId();
                    const rules = this.changeRecorder.generateRules(pluginId);
                    rules.forEach(rule => this.translationService.addRule(rule));
                    this.translationService.saveRules();
                    new Notice(`已生成 ${rules.length} 条翻译规则`);
                } else {
                    new Notice('未检测到任何文本修改');
                }
            }
        });

        // 添加切换翻译命令
        this.addCommand({
            id: 'toggle-translation',
            name: '切换翻译状态',
            callback: () => {
                const isEnabled = this.translationService.isTranslationEnabled;
                if (isEnabled) {
                    this.translationService.disable();
                    new Notice('翻译已停用');
                } else {
                    this.translationService.enable();
                    new Notice('翻译已启用');
                }
                this.translationService.saveRules();
            }
        });

        // 添加控制面板命令
        this.addCommand({
            id: 'open-translation-panel',
            name: '打开翻译控制面板',
            callback: () => {
                if (!this.controlWindow) {
                    this.controlWindow = new ControlWindow(this);
                }
                this.controlWindow.open();
            }
        });

    }

    private getCurrentPluginId(): string {
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
            name: plugin.manifest.name
        })));

        // 尝试通过名称匹配找到插件ID
        for (const [id, plugin] of Object.entries(plugins)) {
            if (plugin.manifest.name === pluginName) {
                console.log('通过名称匹配找到插件ID:', id);
                return id;
            }
        }

        console.log('未能找到插件ID，使用的插件名称:', pluginName);
        return '';
    }

    onunload() {
        this.translationService.destroy();
        console.log('卸载翻译插件');
        if (this.controlWindow) {
            this.controlWindow.close();
            this.controlWindow.destroy();
        }
    }

    // 提供给控制面板使用的方法
    startRecording() {
        this.changeRecorder.startRecording();
        new Notice('开始记录翻译修改');
    }

    stopRecording() {
        // 获取记录的更改
        const changes = this.changeRecorder.stopRecording();
        
        // 检查 changes 是否存在且有内容
        if (changes && changes.length > 0) {
            const pluginId = this.getCurrentPluginId();
            const rules = this.changeRecorder.generateRules(pluginId);
            rules.forEach(rule => this.translationService.addRule(rule));
            this.translationService.saveRules();
            new Notice(`已生成 ${rules.length} 条翻译规则`);
        } else {
            new Notice('未检测到任何文本修改');
        }
    }

    isTranslationEnabled(): boolean {
        return this.translationService.isTranslationEnabled;
    }

    toggleTranslation() {
        if (this.isTranslationEnabled()) {
            this.translationService.disable();
            new Notice('翻译已停用');
        } else {
            this.translationService.enable();
            new Notice('翻译已启用');
        }
        this.translationService.saveRules();
    }

    getAllRules(): TranslationRule[] {
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
}