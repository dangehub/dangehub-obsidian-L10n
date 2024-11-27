import { Plugin } from 'obsidian';
import { TranslationRule } from './types/TranslationRule';
import { FloatingBall } from './FloatingBall';
import { ChangeRecorder } from './ChangeRecorder';

interface TextNode {
    text: string;
    path: number[];  // DOM树路径
    depth: number;   // DOM树深度
    index: number;   // 同级位置
    element: Element | null; // 关联的DOM元素
}

interface TranslationRule {
    selector: string;
    originalText: string;
    translatedText: string;
    pluginId?: string;
    timestamp?: number;
    pluginVersion?: string;  // 添加版本信息
}

const specialCases: { [key: string]: string } = {
    // 示例:
    // "SomePluginName": "some-plugin-id",
};

export class TranslationService {
    private rules: Map<string, TranslationRule> = new Map();
    private isEnabled: boolean = false;
    private originalTexts: Map<string, string> = new Map();
    private observer: MutationObserver;
    private clickHandler: (e: MouseEvent) => void;
    private modalObserver: MutationObserver;
    private commandObserver: MutationObserver;
    private floatingBall: FloatingBall;
    private changeRecorder: ChangeRecorder;
    private translationRules: TranslationRule[] = [];

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

        this.floatingBall = new FloatingBall(this);
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
            this.floatingBall.show();
            console.log('翻译已启用');
        }
    }

    // 停用翻译
    disable() {
        if (this.isEnabled) {
            this.isEnabled = false;
            this.stopObserving();
            this.restoreOriginalTexts();
            this.floatingBall.hide();
            console.log('翻译已停用');
        }
    }

    // 开始观察页面变化
    private startObserving() {
        // 观察整个 document.body
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        console.log('开始观察页面变化');

        // 添加标签切换监听
        document.addEventListener('click', this.clickHandler);

        // 设置 Modal 观察器
        this.modalObserver = new MutationObserver((mutations) => {
            if (this.isEnabled) {
                // 延迟执行以确保 DOM 已更新
                setTimeout(() => {
                    console.log('Modal 内容变化，重新应用翻译');
                    this.applyAllRules();
                }, 50);
            }
        });

        // 观察 Modal 容器
        const modalContainer = document.body;
        if (modalContainer) {
            this.modalObserver.observe(modalContainer, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['class', 'style']  // 主要关注这些属性的变化
            });
            console.log('Modal 观察器已启动');
        }
    }

    // 停止观察
    private stopObserving() {
        this.observer.disconnect();
        document.removeEventListener('click', this.clickHandler);
        
        if (this.modalObserver) {
            this.modalObserver.disconnect();
            console.log('Modal 观察器已停止');
        }
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
        this.floatingBall.destroy();
        this.observer.disconnect();
        if (this.modalObserver) {
            this.modalObserver.disconnect();
        }
        if (this.commandObserver) {
            this.commandObserver.disconnect();
        }
        document.removeEventListener('click', this.clickHandler);
    }

    // 获取启用状态
    public isTranslationEnabled(): boolean {
        return this.isEnabled;
    }

    public setEnabled(enabled: boolean) {
        this.isEnabled = enabled;
        if (enabled) {
            this.enable();
        } else {
            this.disable();
        }
    }

    private findExistingRuleBySelector(selector: string): TranslationRule | undefined {
        return Array.from(this.rules.values()).find(rule => rule.selector === selector);
    }

    addRule(rule: TranslationRule) {
        // 如果规则没有pluginId，尝试从选择器推断
        if (!rule.pluginId) {
            const modalElement = document.querySelector(rule.selector)?.closest('.modal-container');
            if (modalElement instanceof HTMLElement) {
                rule.pluginId = this.getPluginIdFromModal(modalElement);
                console.log('从弹窗推断插件ID:', rule.pluginId);
            }
        }

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
    public generateSelector(element: Element): string {
        const path: string[] = [];
        let current = element;
        
        while (current && current !== document.body && current.parentElement) {
            let selector = current.tagName.toLowerCase();
            
            // 添加重要的类名
            const classes = Array.from(current.classList).filter(cls => 
                cls.includes('setting-') || 
                cls.includes('modal-') || 
                cls.includes('vertical-tab-')
            );
            
            if (classes.length > 0) {
                selector += '.' + classes.join('.');
            }
            
            // 添加位置索引
            const parent = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children);
                const index = siblings.indexOf(current);
                if (siblings.length > 1) {
                    selector += `:nth-child(${index + 1})`;
                }
            }
            
            path.unshift(selector);
            current = current.parentElement;
        }
        
        return path.join(' > ');
    }

    private isValidSelector(selector: string): boolean {
        // 检查选择器是否包含必要的类名
        return selector.includes('modal-') || 
               selector.includes('setting-') || 
               selector.includes('vertical-tab-') ||
               selector.includes('workspace-');
    }

    public generateRuleKey(pluginId: string, selector: string, originalText: string): string {
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

    async loadRules() {
        try {
            console.log('开始加载规则...');
            
            // 加载启用状态
            const data = await this.plugin.loadData();
            if (data?.isEnabled) {
                this.isEnabled = true;
                console.log('检测到翻译已启用');
            }

            const pluginId = this.getCurrentPluginId();
            if (!pluginId) {
                console.warn('无法获取插件ID，无法加载规则');
                return;
            }

            const version = this.getPluginVersion(pluginId);
            const rulesPath = `${this.plugin.app.vault.configDir}/plugins/aqu-L10n/translation/${pluginId}/${version}.json`;
            console.log(`Loading rules from: ${rulesPath}`);

            // 检查文件是否存在
            if (await this.plugin.app.vault.adapter.exists(rulesPath)) {
                const content = await this.plugin.app.vault.adapter.read(rulesPath);
                const rules: TranslationRule[] = JSON.parse(content);

                // 更新规则
                this.rules.clear();
                rules.forEach(rule => {
                    const key = this.generateRuleKey(pluginId, rule.selector, rule.originalText);
                    this.rules.set(key, { ...rule, pluginId });
                });

                console.log(`Loaded ${rules.length} rules for plugin ${pluginId} (version ${version})`);
            } else {
                // 检查是否存在旧版本的规则文件
                const oldRulesPath = `${this.plugin.app.vault.configDir}/plugins/aqu-L10n/translation/${pluginId}/rules.json`;
                if (await this.plugin.app.vault.adapter.exists(oldRulesPath)) {
                    console.log('Found old rules file, migrating...');
                    const oldContent = await this.plugin.app.vault.adapter.read(oldRulesPath);
                    const oldRules: TranslationRule[] = JSON.parse(oldContent);
                    
                    // 保存到新的版本化文件
                    await this.saveRules(oldRules);
                    
                    // 删除旧文件
                    await this.plugin.app.vault.adapter.remove(oldRulesPath);
                    console.log('Migration complete');
                } else {
                    console.log(`No rules file found for plugin ${pluginId}`);
                }
            }
        } catch (error) {
            console.error('Error loading rules:', error);
            throw error;
        }
    }

    async saveRules(rules?: TranslationRule[]): Promise<void> {
        console.log('Saving rules:', rules);
        
        // 从第一条规则中获取 pluginId，如果没有则获取当前插件ID
        const pluginId = rules?.[0]?.pluginId || this.getCurrentPluginId();
        console.log('Current plugin ID:', pluginId);

        if (!pluginId) {
            console.warn('No plugin ID available, cannot save rules');
            return;
        }

        try {
            // 确保目录存在
            const dirPath = `${this.plugin.app.vault.configDir}/plugins/aqu-L10n/translation/${pluginId}`;
            console.log('Creating directory:', dirPath);
            await this.plugin.app.vault.adapter.mkdir(dirPath);

            // 读取现有规则（如果存在）
            const rulesPath = this.getRulesFilePath(pluginId);
            let existingRules: TranslationRule[] = [];
            try {
                const existingContent = await this.plugin.app.vault.adapter.read(rulesPath);
                existingRules = JSON.parse(existingContent);
                console.log('Successfully loaded existing rules:', existingRules.length);
            } catch (e) {
                console.log('No existing rules found or error reading rules');
            }

            // 准备新规则
            const newRules = rules?.map(rule => ({
                ...rule,
                timestamp: Date.now()
            })) || [];

            // 合并规则并去重
            const mergedRules = this.removeDuplicateRules([...existingRules, ...newRules]);

            if (mergedRules.length === 0) {
                console.log('No rules to save after merging');
                return;
            }

            // 保存合并后的规则
            await this.plugin.app.vault.adapter.write(
                rulesPath,
                JSON.stringify(mergedRules, null, 2)
            );

            // 更新内存中的规则集合
            mergedRules.forEach(rule => {
                const key = this.generateRuleKey(rule.pluginId, rule.selector, rule.originalText);
                this.rules.set(key, rule);
            });

            // 如果翻译已启用，重新应用规则
            if (this.isEnabled) {
                this.restoreOriginalTexts();
                this.applyAllRules();
            }

            // 触发规则更新事件
            this.emit('rulesUpdated', Array.from(this.rules.values()));

            console.log(`Successfully saved ${mergedRules.length} rules for plugin ${pluginId}`);
        } catch (error) {
            console.error('Error saving rules:', error);
            throw error;
        }
    }

    // 新增：触发规则更新事件的方法
    private emit(event: string, data: any) {
        if (event === 'rulesUpdated') {
            // 通知控制面板更新
            console.log('Emitting rules updated event with rules:', data);
            this.plugin.controlWindow?.updateRulesList(data);
        }
    }

    // 获取所有规则
    public getAllRules(): TranslationRule[] {
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

    // 新增方法：扫描文本
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

    // 新增方法：更新翻译规则匹配逻辑，增加选择器特征匹配和规范化
    private findMatchingRule(pluginId: string, selector: string, originalText: string): TranslationRule | null {
        const rules = this.rules;

        // 1. 首先尝试精确匹配
        const exactMatch = Array.from(rules.values()).find(rule => 
            rule.selector === selector && 
            rule.originalText === originalText
        );
        if (exactMatch) return exactMatch;

        // 2. 如果没有精确匹配，尝试基于选择器特征匹配
        const selectorParts = selector.split('>').map(part => part.trim());
        const lastPart = selectorParts[selectorParts.length - 1];

        return Array.from(rules.values()).find(rule => {
            const ruleParts = rule.selector.split('>').map(part => part.trim());
            const ruleLastPart = ruleParts[ruleParts.length - 1];

            // 检查最后一个选择器部分是否匹配
            const selectorMatch = ruleLastPart === lastPart;

            // 检查原文是否匹配
            const textMatch = rule.originalText === originalText;

            // 同时满足选择器和原文匹配
            return selectorMatch && textMatch;
        }) || null;
    }

    private normalizeSelector(selector: string): string {
        // 提取最重要的类名特征
        const importantClasses = [
            'setting-item-name',
            'setting-item-description',
            'vertical-tab-content',
            'modal-content'
        ];

        const parts = selector.split('>').map(part => part.trim());
        return parts.filter(part => 
            importantClasses.some(cls => part.includes(cls))
        ).join(' > ');
    }

    // 新增方法：基于文本位置的匹配系统
    async takeSnapshot() {
        this.changeRecorder.takeSnapshot();
    }

    // 合并两个 saveRules 方法
    private async saveRules(rules?: TranslationRule[]): Promise<void> {
        console.log('Saving rules:', rules);
        
        // 从第一条规则中获取 pluginId，如果没有则获取当前插件ID
        const pluginId = rules?.[0]?.pluginId || this.getCurrentPluginId();
        console.log('Current plugin ID:', pluginId);

        if (!pluginId) {
            console.warn('No plugin ID available, cannot save rules');
            return;
        }

        try {
            // 确保目录存在
            const dirPath = `${this.plugin.app.vault.configDir}/plugins/aqu-L10n/translation/${pluginId}`;
            console.log('Creating directory:', dirPath);
            await this.plugin.app.vault.adapter.mkdir(dirPath);

            // 读取现有规则（如果存在）
            const rulesPath = this.getRulesFilePath(pluginId);
            let existingRules: TranslationRule[] = [];
            try {
                const existingContent = await this.plugin.app.vault.adapter.read(rulesPath);
                existingRules = JSON.parse(existingContent);
                console.log('Successfully loaded existing rules:', existingRules.length);
            } catch (e) {
                console.log('No existing rules found or error reading rules');
            }

            // 准备新规则
            const newRules = rules?.map(rule => ({
                ...rule,
                timestamp: Date.now()
            })) || [];

            // 合并规则并去重
            const mergedRules = this.removeDuplicateRules([...existingRules, ...newRules]);

            if (mergedRules.length === 0) {
                console.log('No rules to save after merging');
                return;
            }

            // 保存合并后的规则
            await this.plugin.app.vault.adapter.write(
                rulesPath,
                JSON.stringify(mergedRules, null, 2)
            );

            // 更新内存中的规则集合
            mergedRules.forEach(rule => {
                const key = this.generateRuleKey(rule.pluginId, rule.selector, rule.originalText);
                this.rules.set(key, rule);
            });

            // 如果翻译已启用，重新应用规则
            if (this.isEnabled) {
                this.restoreOriginalTexts();
                this.applyAllRules();
            }

            // 触发规则更新事件
            this.emit('rulesUpdated', Array.from(this.rules.values()));

            console.log(`Successfully saved ${mergedRules.length} rules for plugin ${pluginId}`);
        } catch (error) {
            console.error('Error saving rules:', error);
            throw error;
        }
    }

    // 新增方法：ChangeRecorder 保存规则
    public async changeRecorderSaveRules(rules: TranslationRule[]): Promise<void> {
        if (!rules || rules.length === 0) {
            console.log('No rules to save');
            return;
        }

        // 使用 saveRules 方法来保存规则，确保使用版本化路径
        await this.saveRules(rules);
    }

    // 添加去重方法
    private removeDuplicateRules(rules: TranslationRule[]): TranslationRule[] {
        const uniqueRules = new Map<string, TranslationRule>();
        
        rules.forEach(rule => {
            const key = `${rule.selector}|${rule.originalText}`;
            // 如果规则已存在，保留较新的版本
            if (!uniqueRules.has(key) || 
                (rule.timestamp && uniqueRules.get(key)?.timestamp && 
                 rule.timestamp > uniqueRules.get(key)!.timestamp!)) {
                uniqueRules.set(key, rule);
            }
        });
        
        return Array.from(uniqueRules.values());
    }

    // 获取当前插件ID
    public getCurrentPluginId(): string {
        try {
            // 1. 首先尝试从 Modal 获取
            const modalPluginId = this.getPluginIdFromModal();
            if (modalPluginId) {
                console.log('从 Modal 获取到插件ID:', modalPluginId);
                return modalPluginId;
            }

            // 2. 尝试从活动标签获取
            const activeTab = document.querySelector('.vertical-tab-nav-item.is-active');
            if (activeTab) {
                const pluginId = activeTab.getAttribute('data-tab');
                if (pluginId) {
                    console.log('从活动标签获取插件ID:', pluginId);
                    return pluginId;
                }

                // 从标签文本获取
                const tabText = activeTab.textContent?.trim();
                if (tabText) {
                    const id = tabText.toLowerCase().replace(/\s+/g, '-');
                    console.log('从标签文本生成插件ID:', id);
                    return id;
                }
            }

            // 3. 尝试从 URL 获取
            const hash = window.location.hash;
            const match = hash.match(/plugin\/([^\/]+)/);
            if (match) {
                console.log('从URL获取插件ID:', match[1]);
                return match[1];
            }

            // 4. 尝试从设置标签获取
            const settingsTab = document.querySelector('.vertical-tab-content.is-active');
            if (settingsTab) {
                const heading = settingsTab.querySelector('.setting-item-heading');
                if (heading) {
                    const headingText = heading.textContent?.trim();
                    if (headingText) {
                        const id = headingText.toLowerCase().replace(/\s+settings$/, '').replace(/\s+/g, '-');
                        console.log('从设置标签获取插件ID:', id);
                        return id;
                    }
                }
            }

            console.warn('无法获取插件ID');
            return 'unknown';
        } catch (error) {
            console.error('获取插件ID时出错:', error);
            return 'unknown';
        }
    }

    // 获取插件版本号
    private getPluginVersion(pluginId: string): string {
        try {
            // @ts-ignore
            const plugins = this.plugin.app.plugins;
            
            // 从插件实例获取版本
            const plugin = plugins.plugins[pluginId];
            if (plugin?.manifest?.version) {
                console.log(`Found version ${plugin.manifest.version} for plugin ${pluginId}`);
                return plugin.manifest.version;
            }

            // 如果无法获取版本，使用默认版本
            console.warn(`No version found for plugin: ${pluginId}, using default version`);
            return '1.0.0';
        } catch (error) {
            console.error(`Error getting plugin version for ${pluginId}:`, error);
            return '1.0.0';
        }
    }

    // 获取规则文件路径
    private getRulesFilePath(pluginId: string): string {
        const version = this.getPluginVersion(pluginId);
        const path = `${this.plugin.app.vault.configDir}/plugins/aqu-L10n/translation/${pluginId}/${version}.json`;
        console.log(`Generated rules file path: ${path}`);
        return path;
    }

    // 从 Modal 获取插件 ID
    private getPluginIdFromModal(): string {
        try {
            // 从设置对话框获取插件ID
            const settingsModal = document.querySelector('.modal-container');
            if (settingsModal) {
                // 尝试从标题获取
                const title = settingsModal.querySelector('.setting-item-heading, .modal-title');
                if (title) {
                    const titleText = title.textContent?.trim();
                    if (titleText) {
                        // 移除 "Settings" 等后缀
                        const pluginName = titleText.replace(/\s+Settings$/, '');
                        return pluginName.toLowerCase().replace(/\s+/g, '-');
                    }
                }

                // 尝试从数据属性获取
                const dataPluginId = settingsModal.getAttribute('data-plugin-id');
                if (dataPluginId) {
                    return dataPluginId;
                }
            }
            return '';
        } catch (error) {
            console.error('从 Modal 获取插件ID失败:', error);
            return '';
        }
    }

    // 加载单个规则文件
    private async loadRuleFile(filePath: string) {
        try {
            const rulesJson = await this.plugin.app.vault.adapter.read(filePath);
            const rules = JSON.parse(rulesJson);
            if (Array.isArray(rules)) {
                rules.forEach((rule: TranslationRule) => {
                    // 确保规则包含所有必要字段
                    if (rule.pluginId && rule.selector && 
                        rule.originalText && rule.translatedText) {
                        this.addRule(rule);
                        console.log('成功加载规则:', rule);
                    }
                });
            }
        } catch (error) {
            console.error(`加载规则文件 ${filePath} 失败:`, error);
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

    // 新增方法：扫描文本
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

    // 新增方法：更新翻译规则匹配逻辑，增加选择器特征匹配和规范化
    private findMatchingRule(pluginId: string, selector: string, originalText: string): TranslationRule | null {
        const rules = this.rules;

        // 1. 首先尝试精确匹配
        const exactMatch = Array.from(rules.values()).find(rule => 
            rule.selector === selector && 
            rule.originalText === originalText
        );
        if (exactMatch) return exactMatch;

        // 2. 如果没有精确匹配，尝试基于选择器特征匹配
        const selectorParts = selector.split('>').map(part => part.trim());
        const lastPart = selectorParts[selectorParts.length - 1];

        return Array.from(rules.values()).find(rule => {
            const ruleParts = rule.selector.split('>').map(part => part.trim());
            const ruleLastPart = ruleParts[ruleParts.length - 1];

            // 检查最后一个选择器部分是否匹配
            const selectorMatch = ruleLastPart === lastPart;

            // 检查原文是否匹配
            const textMatch = rule.originalText === originalText;

            // 同时满足选择器和原文匹配
            return selectorMatch && textMatch;
        }) || null;
    }

    private normalizeSelector(selector: string): string {
        // 提取最重要的类名特征
        const importantClasses = [
            'setting-item-name',
            'setting-item-description',
            'vertical-tab-content',
            'modal-content'
        ];

        const parts = selector.split('>').map(part => part.trim());
        return parts.filter(part => 
            importantClasses.some(cls => part.includes(cls))
        ).join(' > ');
    }

    // 新增方法：基于文本位置的匹配系统
    async takeSnapshot() {
        this.changeRecorder.takeSnapshot();
    }

    // 合并两个 saveRules 方法
    private async saveRules(rules?: TranslationRule[]): Promise<void> {
        console.log('Saving rules:', rules);
        
        // 从第一条规则中获取 pluginId，如果没有则获取当前插件ID
        const pluginId = rules?.[0]?.pluginId || this.getCurrentPluginId();
        console.log('Current plugin ID:', pluginId);

        if (!pluginId) {
            console.warn('No plugin ID available, cannot save rules');
            return;
        }

        try {
            // 确保目录存在
            const dirPath = `${this.plugin.app.vault.configDir}/plugins/aqu-L10n/translation/${pluginId}`;
            console.log('Creating directory:', dirPath);
            await this.plugin.app.vault.adapter.mkdir(dirPath);

            // 读取现有规则（如果存在）
            const rulesPath = this.getRulesFilePath(pluginId);
            let existingRules: TranslationRule[] = [];
            try {
                const existingContent = await this.plugin.app.vault.adapter.read(rulesPath);
                existingRules = JSON.parse(existingContent);
                console.log('Successfully loaded existing rules:', existingRules.length);
            } catch (e) {
                console.log('No existing rules found or error reading rules');
            }

            // 准备新规则
            const newRules = rules?.map(rule => ({
                ...rule,
                timestamp: Date.now()
            })) || [];

            // 合并规则并去重
            const mergedRules = this.removeDuplicateRules([...existingRules, ...newRules]);

            if (mergedRules.length === 0) {
                console.log('No rules to save after merging');
                return;
            }

            // 保存合并后的规则
            await this.plugin.app.vault.adapter.write(
                rulesPath,
                JSON.stringify(mergedRules, null, 2)
            );

            // 更新内存中的规则集合
            mergedRules.forEach(rule => {
                const key = this.generateRuleKey(rule.pluginId, rule.selector, rule.originalText);
                this.rules.set(key, rule);
            });

            // 如果翻译已启用，重新应用规则
            if (this.isEnabled) {
                this.restoreOriginalTexts();
                this.applyAllRules();
            }

            // 触发规则更新事件
            this.emit('rulesUpdated', Array.from(this.rules.values()));

            console.log(`Successfully saved ${mergedRules.length} rules for plugin ${pluginId}`);
        } catch (error) {
            console.error('Error saving rules:', error);
            throw error;
        }
    }

    // 新增方法：ChangeRecorder 保存规则
    public async changeRecorderSaveRules(rules: TranslationRule[]): Promise<void> {
        if (!rules || rules.length === 0) {
            console.log('No rules to save');
            return;
        }

        // 使用 saveRules 方法来保存规则，确保使用版本化路径
        await this.saveRules(rules);
    }

    // 添加去重方法
    private removeDuplicateRules(rules: TranslationRule[]): TranslationRule[] {
        const uniqueRules = new Map<string, TranslationRule>();
        
        rules.forEach(rule => {
            const key = `${rule.selector}|${rule.originalText}`;
            // 如果规则已存在，保留较新的版本
            if (!uniqueRules.has(key) || 
                (rule.timestamp && uniqueRules.get(key)?.timestamp && 
                 rule.timestamp > uniqueRules.get(key)!.timestamp!)) {
                uniqueRules.set(key, rule);
            }
        });
        
        return Array.from(uniqueRules.values());
    }

    // 获取当前插件ID
    public getCurrentPluginId(): string {
        try {
            // 1. 首先尝试从 Modal 获取
            const modalPluginId = this.getPluginIdFromModal();
            if (modalPluginId) {
                console.log('从 Modal 获取到插件ID:', modalPluginId);
                return modalPluginId;
            }

            // 2. 尝试从活动标签获取
            const activeTab = document.querySelector('.vertical-tab-nav-item.is-active');
            if (activeTab) {
                const pluginId = activeTab.getAttribute('data-tab');
                if (pluginId) {
                    console.log('从活动标签获取插件ID:', pluginId);
                    return pluginId;
                }

                // 从标签文本获取
                const tabText = activeTab.textContent?.trim();
                if (tabText) {
                    const id = tabText.toLowerCase().replace(/\s+/g, '-');
                    console.log('从标签文本生成插件ID:', id);
                    return id;
                }
            }

            // 3. 尝试从 URL 获取
            const hash = window.location.hash;
            const match = hash.match(/plugin\/([^\/]+)/);
            if (match) {
                console.log('从URL获取插件ID:', match[1]);
                return match[1];
            }

            // 4. 尝试从设置标签获取
            const settingsTab = document.querySelector('.vertical-tab-content.is-active');
            if (settingsTab) {
                const heading = settingsTab.querySelector('.setting-item-heading');
                if (heading) {
                    const headingText = heading.textContent?.trim();
                    if (headingText) {
                        const id = headingText.toLowerCase().replace(/\s+settings$/, '').replace(/\s+/g, '-');
                        console.log('从设置标签获取插件ID:', id);
                        return id;
                    }
                }
            }

            console.warn('无法获取插件ID');
            return 'unknown';
        } catch (error) {
            console.error('获取插件ID时出错:', error);
            return 'unknown';
        }
    }

    // 获取插件版本号
    private getPluginVersion(pluginId: string): string {
        try {
            // @ts-ignore
            const plugins = this.plugin.app.plugins;
            
            // 从插件实例获取版本
            const plugin = plugins.plugins[pluginId];
            if (plugin?.manifest?.version) {
                console.log(`Found version ${plugin.manifest.version} for plugin ${pluginId}`);
                return plugin.manifest.version;
            }

            // 如果无法获取版本，使用默认版本
            console.warn(`No version found for plugin: ${pluginId}, using default version`);
            return '1.0.0';
        } catch (error) {
            console.error(`Error getting plugin version for ${pluginId}:`, error);
            return '1.0.0';
        }
    }

    // 获取规则文件路径
    private getRulesFilePath(pluginId: string): string {
        const version = this.getPluginVersion(pluginId);
        const path = `${this.plugin.app.vault.configDir}/plugins/aqu-L10n/translation/${pluginId}/${version}.json`;
        console.log(`Generated rules file path: ${path}`);
        return path;
    }

    // 加载所有规则
    public async loadAllRules() {
        console.log('开始加载所有规则...');
        
        try {
            // 获取翻译目录
            const translationDir = `${this.plugin.app.vault.configDir}/plugins/aqu-L10n/translation`;
            
            // 确保目录存在
            if (!await this.plugin.app.vault.adapter.exists(translationDir)) {
                console.log('翻译目录不存在，创建目录:', translationDir);
                await this.plugin.app.vault.adapter.mkdir(translationDir);
                return;
            }

            // 获取所有插件目录
            const pluginDirs = await this.plugin.app.vault.adapter.list(translationDir);
            console.log('发现插件目录:', pluginDirs.folders);
            
            // 遍历所有插件目录
            for (const dir of pluginDirs.folders) {
                const pluginId = dir.split('/').pop();
                if (!pluginId) continue;

                console.log(`加载插件 ${pluginId} 的规则...`);
                
                // 获取插件的所有版本规则文件
                const versionFiles = await this.plugin.app.vault.adapter.list(dir);
                console.log(`插件 ${pluginId} 的版本文件:`, versionFiles.files);
                
                // 遍历所有版本文件
                for (const file of versionFiles.files) {
                    try {
                        const content = await this.plugin.app.vault.adapter.read(file);
                        const rules: TranslationRule[] = JSON.parse(content);
                        
                        // 将规则添加到内存中
                        rules.forEach(rule => {
                            const key = this.generateRuleKey(rule.pluginId || pluginId, rule.selector, rule.originalText);
                            this.rules.set(key, { ...rule, pluginId: rule.pluginId || pluginId });
                        });
                        
                        console.log(`成功加载 ${rules.length} 条规则，来自文件: ${file}`);
                    } catch (e) {
                        console.warn(`读取规则文件失败: ${file}`, e);
                    }
                }
            }
            
            console.log(`规则加载完成，总共加载 ${this.rules.size} 条规则`);
        } catch (e) {
            console.error('加载规则失败:', e);
        }
    }

    // 设置翻译状态
    public setEnabled(enabled: boolean) {
        console.log(`设置翻译状态: ${enabled}`);
        this.isEnabled = enabled;
        
        if (enabled) {
            console.log('启用翻译，应用所有规则...');
            this.applyAllRules();
        } else {
            console.log('停用翻译，恢复原文...');
            this.restoreOriginalTexts();
        }

        // 保存状态到设置
        this.plugin.settings.isEnabled = enabled;
        this.plugin.saveSettings();
    }

    // 应用所有规则
    public applyAllRules() {
        if (!this.isEnabled) {
            console.log('翻译未启用，跳过应用规则');
            return;
        }

        console.log(`开始应用 ${this.rules.size} 条规则...`);
        Array.from(this.rules.values()).forEach(rule => {
            try {
                this.applyRule(rule);
            } catch (e) {
                console.warn(`应用规则失败:`, rule, e);
            }
        });
    }
}