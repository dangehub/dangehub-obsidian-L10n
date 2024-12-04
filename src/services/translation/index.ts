import { Plugin } from 'obsidian';
import { TranslationRule } from '../../types/TranslationRule';
import { RuleManager } from './rules';
import { RuleStorage } from './storage';
import { generateSelector, getElementKey } from '../../utils/dom';
import TranslationPlugin from '../../main';

export class TranslationService {
    private isEnabled: boolean = false;
    private originalTexts: Map<string, string> = new Map();
    private observer: MutationObserver;
    private clickHandler: (e: MouseEvent) => void;
    private modalObserver: MutationObserver;
    private commandObserver: MutationObserver;
    private ruleManager: RuleManager;
    private ruleStorage: RuleStorage;

    constructor(private plugin: TranslationPlugin) {
        this.ruleManager = new RuleManager(plugin);
        this.ruleStorage = new RuleStorage(plugin);

        // 创建观察器来监听页面变化
        this.observer = new MutationObserver((mutations) => {
            if (this.isEnabled) {
                // 延迟执行以确保 DOM 已更新
                setTimeout(() => {
                    this.applyAllRules();
                }, 50);
            }
        });

        // 创建点击事件处理器
        this.clickHandler = (e: MouseEvent) => {
            const target = e.target as Element;
            if (target.closest('.vertical-tab-nav-item')) {
                console.log('检测到设置标签切换');
                setTimeout(() => {
                    if (this.isEnabled) {
                        console.log('重新应用翻译规则');
                        this.clearOriginalTexts();
                        this.applyAllRules();
                    }
                }, 100);
            }
        };
    }

    // 公共方法
    enable() {
        this.isEnabled = true;
        this.startObserving();
    }

    disable() {
        this.isEnabled = false;
        this.stopObserving();
        this.restoreOriginalTexts();
    }

    isTranslationEnabled(): boolean {
        return this.isEnabled;
    }

    addRule(rule: TranslationRule) {
        this.ruleManager.addRule(rule);
        if (this.isEnabled) {
            this.applyAllRules();
        }
    }

    changeRecorderSaveRules(rules: TranslationRule[]) {
        const pluginId = this.getCurrentPluginId();
        this.ruleStorage.saveRules(rules, pluginId);
    }

    async saveRules(rules?: TranslationRule[]): Promise<void> {
        const rulesToSave = rules || this.ruleManager.getAllRules();
        const pluginId = rulesToSave[0]?.pluginId || this.getCurrentPluginId();
        
        if (!pluginId) {
            console.error('No plugin ID available');
            return;
        }

        await this.ruleStorage.saveRules(rulesToSave, pluginId);
    }

    async changeRecorderSaveRulesAsync(rules: TranslationRule[]): Promise<void> {
        const uniqueRules = this.ruleManager.removeDuplicateRules(rules);
        await this.saveRules(uniqueRules);
    }

    // 私有方法
    private startObserving() {
        document.addEventListener('click', this.clickHandler);
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    private stopObserving() {
        document.removeEventListener('click', this.clickHandler);
        this.observer.disconnect();
    }

    private applyAllRules() {
        const pluginId = this.getCurrentPluginId();
        if (!pluginId) {
            console.warn('No plugin ID available');
            return;
        }

        document.querySelectorAll('*').forEach(element => {
            if (element.textContent?.trim()) {
                const selector = generateSelector(element);
                const rule = this.ruleManager.findMatchingRule(
                    pluginId,
                    selector, 
                    element.textContent.trim()
                );
                
                if (rule) {
                    const key = getElementKey(element);
                    if (!this.originalTexts.has(key)) {
                        this.originalTexts.set(key, element.textContent);
                    }
                    element.textContent = rule.translatedText;
                }
            }
        });
    }

    private restoreOriginalTexts() {
        this.originalTexts.forEach((originalText, key) => {
            try {
                // 从 key 中提取选择器和索引
                const [selector, index] = key.split('|');
                if (!selector) return;

                // 找到所有匹配的元素
                const elements = document.querySelectorAll(selector);
                const element = elements[parseInt(index) || 0];
                
                if (element && element.textContent !== originalText) {
                    console.log('Restoring text:', {
                        selector,
                        index,
                        from: element.textContent,
                        to: originalText
                    });
                    element.textContent = originalText;
                }
            } catch (error) {
                console.error('Error restoring text for key:', key, error);
            }
        });
        this.originalTexts.clear();
    }

    private clearOriginalTexts() {
        this.originalTexts.clear();
    }

    private handleClick(event: MouseEvent) {
        const target = event.target as Element;
        if (target.closest('.vertical-tab-nav-item')) {
            this.plugin.logger.info('检测到设置标签切换');
            setTimeout(() => {
                if (this.isEnabled) {
                    this.plugin.logger.info('重新应用翻译规则');
                    this.clearOriginalTexts();
                    this.applyAllRules();
                }
            }, 100);
        }
    }

    private translateCommandPalette() {
        // 命令面板翻译逻辑
        // TODO: 实现命令面板翻译
    }

    // 工具方法
    getCurrentPluginId(): string {
        try {
            // 获取当前活动的插件设置标签
            const activeTab = document.querySelector('body > div.modal-container.mod-dim > div.modal.mod-settings.mod-sidebar-layout > div.modal-content.vertical-tabs-container > div.vertical-tab-header > div:nth-child(3) > div.vertical-tab-header-group-items > div.vertical-tab-nav-item.is-active');
            
            if (activeTab) {
                // 从标签文本中提取插件 ID
                const tabText = activeTab.textContent?.trim() || '';
                // 如果是核心插件，直接返回 'core'
                if (tabText === 'Core plugins') {
                    return 'core';
                }
                // 如果是社区插件，从标签文本中提取插件名称
                const pluginMatch = tabText.match(/^(.+?)(?:\s+\(.*\))?$/);
                if (pluginMatch) {
                    const pluginName = pluginMatch[1];
                    // 在已安装的插件中查找匹配的插件
                    const plugins = this.plugin.app.plugins.plugins;
                    for (const [id, plugin] of Object.entries(plugins)) {
                        if (plugin.manifest && plugin.manifest.name === pluginName) {
                            console.log(`Found plugin: ${id} (${plugin.manifest.version})`);
                            return id;
                        }
                    }
                }
            }

            // 如果找不到活动标签，尝试从 URL 获取
            const hash = window.location.hash;
            if (hash.startsWith('#')) {
                const parts = hash.substring(1).split('/');
                if (parts.length > 1) {
                    const pluginId = parts[1];
                    if (this.plugin.app.plugins.plugins[pluginId]) {
                        return pluginId;
                    }
                }
            }

            // 如果都找不到，使用默认值
            console.warn('No plugin ID available from UI, using default');
            return 'default';
        } catch (error) {
            console.error('Error getting plugin ID:', error);
            return 'default';
        }
    }

    async init() {
        const rules = await this.ruleStorage.loadAllRules();
        rules.forEach(rule => this.ruleManager.addRule(rule));
    }

    getAllRules(): TranslationRule[] {
        return this.ruleManager.getAllRules();
    }

    deleteRules(ruleKeys: string[]) {
        this.ruleManager.deleteRules(ruleKeys);
    }

    updateRule(rule: TranslationRule) {
        this.ruleManager.updateRule(rule);
    }

    destroy() {
        this.disable();
        this.ruleManager.clear();
    }

    private detectPluginId(): string {
        try {
            // 获取当前活动的插件设置标签
            const pluginTab = document.querySelector('.plugin-tab-content.is-active');
            if (pluginTab) {
                const pluginInfo = pluginTab.querySelector('.plugin-info');
                if (pluginInfo && pluginInfo.textContent) {
                    const text = pluginInfo.textContent;
                    const match = text.match(/^([^(]+)\s*\(([^)]+)\)/);
                    if (match) {
                        const [, id, version] = match;
                        this.plugin.logger.info(`Found plugin: ${id.trim()} (${version.trim()})`);
                        return id.trim();
                    }
                }
            }

            // 如果在插件设置页面找不到，尝试从其他地方获取
            const plugins = this.plugin.app.plugins.plugins;
            for (const [id, plugin] of Object.entries(plugins)) {
                const elements = document.querySelectorAll(`[data-plugin-id="${id}"]`);
                if (elements.length > 0) {
                    this.plugin.logger.info(`Found plugin by element: ${id}`);
                    return id;
                }
            }

            return '';
        } catch (error) {
            this.plugin.logger.error('Error getting plugin ID:', error);
            return '';
        }
    }
}
