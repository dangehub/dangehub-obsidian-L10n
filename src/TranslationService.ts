import { Plugin } from 'obsidian';
import { TranslationRule } from './types/TranslationRule';

export class TranslationService {
    private rules: Map<string, TranslationRule> = new Map();
    private isEnabled: boolean = false;
    private originalTexts: Map<string, string> = new Map();
    private observer: MutationObserver;
    private clickHandler: (e: MouseEvent) => void;

    constructor(private plugin: Plugin) {
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
                // 延迟执行以等待内容加载
                setTimeout(() => {
                    if (this.isEnabled) {
                        console.log('重新应用翻译规则');
                        this.clearOriginalTexts(); // 清除旧的记录
                        this.applyAllRules();
                    }
                }, 100);
            }
        };
    }

    // 清除原始文本记录
    private clearOriginalTexts() {
        this.originalTexts.clear();
    }

    // 启用翻译
    enable() {
        if (!this.isEnabled) {
            this.isEnabled = true;
            this.startObserving();
            this.applyAllRules();
            console.log('翻译已启用');
        }
    }

    // 停用翻译
    disable() {
        if (this.isEnabled) {
            this.isEnabled = false;
            this.stopObserving();
            this.restoreOriginalTexts();
            console.log('翻译已停用');
        }
    }

    // 开始观察页面变化
    private startObserving() {
        // 观察设置页面容器
        const settingsContainer = document.querySelector('.vertical-tab-content-container');
        if (settingsContainer) {
            this.observer.observe(settingsContainer, {
                childList: true,
                subtree: true,
                characterData: true
            });
            console.log('开始观察设置页面变化');
        }

        // 添加标签切换监听
        document.addEventListener('click', this.clickHandler);
    }

    // 停止观察
    private stopObserving() {
        this.observer.disconnect();
        document.removeEventListener('click', this.clickHandler);
        console.log('停止观察页面变化');
    }

    // 应用单个规则
    private applyRule(rule: TranslationRule) {
        const elements = document.querySelectorAll(rule.selector);
        elements.forEach(element => {
            const elementKey = this.getElementKey(element);
            
            // 检查元素内容是否匹配原文
            if (element.textContent === rule.originalText) {
                // 保存原始文本（如果还没保存）
                if (!this.originalTexts.has(elementKey)) {
                    this.originalTexts.set(elementKey, element.textContent);
                    element.textContent = rule.translatedText;
                    console.log('应用翻译:', {
                        selector: rule.selector,
                        from: rule.originalText,
                        to: rule.translatedText
                    });
                }
            }
        });
    }

    // 清理资源
    destroy() {
        this.disable();
        this.observer.disconnect();
        document.removeEventListener('click', this.clickHandler);
    }

    // 获取启用状态
    get isTranslationEnabled(): boolean {
        return this.isEnabled;
    }

    private findExistingRuleBySelector(selector: string): TranslationRule | undefined {
        return Array.from(this.rules.values()).find(rule => rule.selector === selector);
    }

    addRule(rule: TranslationRule) {
        // 检查是否已存在相同选择器的规则
        const existingRule = this.findExistingRuleBySelector(rule.selector);
        if (existingRule) {
            // 如果新规则的原文与现有规则的译文相同，说明这是一个链式翻译
            if (rule.originalText === existingRule.translatedText) {
                // 创建一个新规则，保留原始规则的原文和新规则的译文
                const mergedRule = {
                    ...rule,
                    originalText: existingRule.originalText
                };
                const key = this.generateRuleKey(mergedRule.pluginId, mergedRule.selector, mergedRule.originalText);
                this.rules.set(key, mergedRule);
                console.log('合并链式翻译规则:', {
                    original: existingRule,
                    new: rule,
                    merged: mergedRule
                });
            } else {
                // 如果不是链式翻译，则按原方式添加
                const key = this.generateRuleKey(rule.pluginId, rule.selector, rule.originalText);
                this.rules.set(key, rule);
            }
        } else {
            // 如果不存在相同选择器的规则，直接添加
            const key = this.generateRuleKey(rule.pluginId, rule.selector, rule.originalText);
            this.rules.set(key, rule);
        }

        if (this.isEnabled) {
            this.applyRule(rule);
        }
    }

    // 应用所有规则
    private applyAllRules() {
        this.rules.forEach(rule => this.applyRule(rule));
    }

    // 恢复原始文本
    private restoreOriginalTexts() {
        this.originalTexts.forEach((originalText, elementKey) => {
            const [selector, index] = elementKey.split('::');
            const elements = document.querySelectorAll(selector);
            const element = elements[parseInt(index)];
            if (element) {
                element.textContent = originalText;
            }
        });
        this.originalTexts.clear();
    }

    // 生成元素的唯一键
    private getElementKey(element: Element): string {
        const selector = this.generateSelector(element);
        const elements = document.querySelectorAll(selector);
        const index = Array.from(elements).indexOf(element);
        return `${selector}::${index}`;
    }

    // 生成选择器
    private generateSelector(element: Element): string {
        let selector = '';
        let current = element;
        
        while (current && current !== document.body) {
            let currentSelector = current.tagName.toLowerCase();
            
            const significantClasses = Array.from(current.classList)
                .filter(cls => 
                    cls.includes('setting') || 
                    cls.includes('nav') || 
                    cls.includes('title') ||
                    cls.includes('content')
                );
            
            if (significantClasses.length > 0) {
                currentSelector += '.' + significantClasses.join('.');
            }

            selector = selector ? `${currentSelector} > ${selector}` : currentSelector;

            if (document.querySelectorAll(selector).length === 1) {
                break;
            }

            current = current.parentElement as Element;
        }

        return selector;
    }

    // 生成规则的唯一键
    private generateRuleKey(pluginId: string, selector: string, originalText: string): string {
        return `${pluginId}::${selector}::${originalText}`;
    }

    private async ensureTranslationDir(pluginId: string): Promise<string> {
        // 修改目录结构：.obsidian/plugins/aqu-L10n/translation/{pluginId}/zh-cn
        const baseDir = `.obsidian/plugins/aqu-L10n/translation/${pluginId}`;
        const langDir = `${baseDir}/zh-cn`;
        
        // 确保目录存在
        if (!await this.plugin.app.vault.adapter.exists(baseDir)) {
            await this.plugin.app.vault.adapter.mkdir(baseDir);
        }
        if (!await this.plugin.app.vault.adapter.exists(langDir)) {
            await this.plugin.app.vault.adapter.mkdir(langDir);
        }
        
        return langDir;
    }

    async saveRules() {
        // 按插件ID分组规则
        const rulesByPlugin = new Map<string, TranslationRule[]>();
        this.rules.forEach(rule => {
            if (!rulesByPlugin.has(rule.pluginId)) {
                rulesByPlugin.set(rule.pluginId, []);
            }
            rulesByPlugin.get(rule.pluginId)?.push(rule);
        });

        // 获取现有的规则目录
        const baseDir = '.obsidian/plugins/aqu-L10n/translation';
        if (await this.plugin.app.vault.adapter.exists(baseDir)) {
            const pluginDirs = await this.plugin.app.vault.adapter.list(baseDir);
            
            // 处理需要删除的插件目录
            for (const pluginDir of pluginDirs.folders) {
                const pluginId = pluginDir.split('/').pop() || '';
                // 只有当插件目录不是 zh-cn 且没有任何规则时才删除
                if (pluginId !== 'zh-cn' && !rulesByPlugin.has(pluginId)) {
                    try {
                        await this.plugin.app.vault.adapter.rmdir(pluginDir, true);
                        console.log(`删除空规则目录: ${pluginDir}`);
                    } catch (error) {
                        console.error(`删除目录 ${pluginDir} 失败:`, error);
                    }
                }
            }
        }

        // 保存有规则的插件文件
        for (const [pluginId, rules] of rulesByPlugin) {
            try {
                const targetPlugin = (this.plugin.app as any).plugins.plugins[pluginId];
                const version = targetPlugin?.manifest?.version || 'latest';
                
                // 修正路径拼接，避免双斜杠
                const dir = await this.ensureTranslationDir(pluginId);
                const filePath = `${dir}/${version}.json`.replace(/\/+/g, '/');
                
                if (rules.length === 0) {
                    // 如果规则为空，删除文件
                    if (await this.plugin.app.vault.adapter.exists(filePath)) {
                        await this.plugin.app.vault.adapter.remove(filePath);
                        console.log(`删除空规则文件: ${filePath}`);
                    }
                    // 检查并删除空目录（但不删除 zh-cn 目录）
                    const dirToCheck = dir.replace(/\/+/g, '/');
                    if (dirToCheck.split('/').pop() !== 'zh-cn' && 
                        (await this.plugin.app.vault.adapter.list(dirToCheck)).files.length === 0) {
                        await this.plugin.app.vault.adapter.rmdir(dirToCheck, true);
                        console.log(`删除空插件目录: ${dirToCheck}`);
                    }
                } else {
                    // 有规则则保存
                    await this.plugin.app.vault.adapter.write(
                        filePath,
                        JSON.stringify(rules, null, 2)
                    );
                    console.log(`保存规则到文件: ${filePath}, 规则数: ${rules.length}`);
                }
            } catch (error) {
                console.error(`处理插件 ${pluginId} 的规则时出错:`, error);
            }
        }

        // 保存启用状态
        await this.plugin.saveData({
            isEnabled: this.isEnabled
        });
    }

    async loadRules() {
        // 加载启用状态
        const data = await this.plugin.loadData();
        if (data?.isEnabled) {
            this.isEnabled = true;
        }

        const baseDir = '.obsidian/plugins/aqu-L10n/translation';
        if (await this.plugin.app.vault.adapter.exists(baseDir)) {
            // 获取所有插件目录
            const pluginDirs = await this.plugin.app.vault.adapter.list(baseDir);
            
            // 遍历所有插件目录加载规则
            for (const pluginDir of pluginDirs.folders) {
                try {
                    const pluginId = pluginDir.split('/').pop() || '';
                    const targetPlugin = (this.plugin.app as any).plugins.plugins[pluginId];
                    if (!targetPlugin) continue;

                    const version = targetPlugin.manifest.version;
                    const langDir = `${pluginDir}/zh-cn`;
                    const rulesPath = `${langDir}/${version}.json`;
                    
                    if (await this.plugin.app.vault.adapter.exists(rulesPath)) {
                        const rulesJson = await this.plugin.app.vault.adapter.read(rulesPath);
                        const rules = JSON.parse(rulesJson);
                        if (Array.isArray(rules)) {
                            rules.forEach((rule: TranslationRule) => {
                                // 确保规则包含所有必要字段
                                if (rule.pluginId && rule.selector && rule.originalText && rule.translatedText) {
                                    this.addRule(rule);
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error(`加载插件 ${pluginDir} 的规则时出错:`, error);
                }
            }
        }

        // 如果之前是启用状态，则应用规则
        if (this.isEnabled) {
            this.enable();
        }
    }

    // 获取所有规则
    getAllRules(): TranslationRule[] {
        return Array.from(this.rules.values());
    }

    // 删除指定规则
    deleteRules(ruleKeys: string[]) {
        ruleKeys.forEach(key => {
            this.rules.delete(key);
        });
        
        // 如果翻译已启用，重新应用剩余规则
        if (this.isEnabled) {
            this.restoreOriginalTexts();
            this.applyAllRules();
        }
    }

    // 获取规则数量
    getRuleCount(): number {
        return this.rules.size;
    }

    updateRule(rule: TranslationRule) {
        // 添加日志跟踪当前规则状态
        console.log('更新前的规则总数:', this.rules.size);
        console.log('准备更新的规则:', rule);

        const key = this.generateRuleKey(rule.pluginId, rule.selector, rule.originalText);
        
        // 检查规则是否存在
        const existingRule = this.rules.get(key);
        if (!existingRule) {
            console.warn('未找到要更新的规则:', key);
            return;
        }

        // 更新规则
        this.rules.set(key, rule);
        
        // 验证更新后的状态
        console.log('更新后的规则总数:', this.rules.size);
        console.log('更新后的规则列表:', Array.from(this.rules.values()));

        if (this.isEnabled) {
            this.restoreOriginalTexts();
            this.applyAllRules();
        }

        // 立即保存更改
        this.saveRules();
    }

    // 添加新方法用于扫描文本
    async scanForTranslatableText(): Promise<Array<{
        element: Element,
        text: string,
        selector: string
    }>> {
        const results: Array<{
            element: Element,
            text: string,
            selector: string
        }> = [];
        
        const settingsContainer = document.querySelector('.vertical-tab-content-container');
        if (!settingsContainer) {
            console.log('未找到设置面板');
            return results;
        }

        // 递归遍历元素
        const traverse = (element: Element) => {
            // 跳过翻译控制面板
            if (element.closest('.translation-control-panel')) {
                return;
            }

            // 检查元素是否只包含文本节点
            if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
                const text = element.textContent?.trim();
                if (text && text.length > 1) { // 忽略单字符文本
                    // 检查是否已经有这个文本的规则
                    const selector = this.generateSelector(element);
                    const isExisting = Array.from(this.rules.values()).some(rule => 
                        rule.originalText === text || rule.translatedText === text
                    );
                    
                    if (!isExisting) {
                        results.push({
                            element,
                            text,
                            selector
                        });
                    }
                }
            }

            // 将 HTMLCollection 转换为数组后再遍历
            Array.from(element.children).forEach(child => traverse(child));
        };

        traverse(settingsContainer);
        console.log(`扫描完成，找到 ${results.length} 个待翻译文本`);
        return results;
    }

    // 添加一个方法来验证规则集的完整性
    private validateRules() {
        const rulesArray = Array.from(this.rules.values());
        console.log('当前规则验证:', {
            totalRules: this.rules.size,
            uniqueRules: new Set(rulesArray.map(r => this.generateRuleKey(r.pluginId, r.selector, r.originalText))).size,
            rules: rulesArray
        });
    }
}