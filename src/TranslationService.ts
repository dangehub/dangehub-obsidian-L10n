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

    // 添加翻译规则
    addRule(rule: TranslationRule) {
        const key = this.generateRuleKey(rule.pluginId, rule.selector, rule.originalText);
        this.rules.set(key, rule);
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
        return `${pluginId}:${selector}:${originalText}`;
    }

    // 保存规则到本地
    async saveRules() {
        const data = {
            rules: Array.from(this.rules.values()),
            isEnabled: this.isEnabled
        };
        await this.plugin.saveData(data);
    }

    // 加载本地规则
    async loadRules() {
        const data = await this.plugin.loadData();
        if (data) {
            if (data.rules) {
                data.rules.forEach(rule => this.addRule(rule));
            }
            if (data.isEnabled) {
                this.enable();
            }
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
}