import { Plugin, Notice } from 'obsidian';
import { TranslationService } from './TranslationService';
import { ChangeRecorder } from './ChangeRecorder';
import { ControlWindow } from './ControlWindow';

export default class TranslationPlugin extends Plugin {
    private translationService: TranslationService;
    private changeRecorder: ChangeRecorder;
    private controlWindow: ControlWindow;

    async onload() {
        console.log('加载翻译插件');
        
        this.translationService = new TranslationService(this);
        this.changeRecorder = new ChangeRecorder(this);

        // 加载已保存的规则
        await this.translationService.loadRules();

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
        if (!activeTab) return '';
        
        // 尝试从 data-tab-id 获取插件ID
        const tabId = activeTab.getAttribute('data-tab-id');
        if (tabId?.startsWith('plugin-')) {
            return tabId.replace('plugin-', '');
        }
        
        // 如果没有 data-tab-id，尝试从文本内容获取
        const pluginName = activeTab.textContent?.trim().toLowerCase() || '';
        // 将插件名称转换为插件ID格式（如 Dataview -> dataview）
        return pluginName;
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
    }
}