import { Plugin } from 'obsidian';
import { TextChange, TranslationRule } from './types/TranslationRule';

export class ChangeRecorder {
    private isRecording: boolean = false;
    private observer: MutationObserver;
    private lastChange: TextChange | null = null;
    private changes: TextChange[] = [];

    constructor(private plugin: Plugin) {
        this.observer = new MutationObserver((mutations) => {
            if (!this.isRecording) return;

            mutations.forEach(mutation => {
                if (mutation.type === 'characterData' && mutation.target.textContent) {
                    const element = mutation.target.parentElement;
                    if (!element) return;

                    const oldText = mutation.oldValue || '';
                    const newText = mutation.target.textContent;

                    if (oldText !== newText) {
                        this.handleTextChange(element, oldText, newText);
                    }
                }
            });
        });
    }

    private handleTextChange(element: Element, oldText: string, newText: string) {
        // 检查元素是否属于控制面板
        if (element.closest('.translation-control-panel')) {
            return;
        }

        const change: TextChange = {
            element,
            originalText: oldText,
            translatedText: newText,
            timestamp: Date.now()
        };

        // 保存最新的更改
        this.lastChange = change;

        // 自动生成并应用规则
        if (this.lastChange) {
            const pluginId = this.plugin.getCurrentPluginId();
            const rule = this.generateRule(this.lastChange, pluginId);
            this.plugin.translationService.addRule(rule);
            this.plugin.translationService.saveRules();
            new Notice(`已生成翻译规则: ${oldText} -> ${newText}`);
            
            // 更新控制面板的规则列表
            if (this.plugin.controlWindow) {
                this.plugin.controlWindow.updateRulesList();
            }
        }
    }

    private generateRule(change: TextChange, pluginId: string): TranslationRule {
        return {
            selector: this.generateSelector(change.element),
            originalText: change.originalText,
            translatedText: change.translatedText,
            pluginId,
            timestamp: change.timestamp
        };
    }

    startRecording() {
        this.isRecording = true;
        this.lastChange = null;
        console.log('开始记录文本变更');

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true
        });
    }

    stopRecording(): TextChange[] {
        this.isRecording = false;
        this.observer.disconnect();
        
        // 确保返回一个数组，即使是空数组
        const changes = this.changes || [];
        
        // 重置状态
        this.changes = [];
        this.lastChange = null;
        console.log('停止记录');
        
        return changes;
    }

    private generateSelector(element: Element): string {
        let selector = '';
        let current = element;
        
        while (current && current !== document.body) {
            let currentSelector = current.tagName.toLowerCase();
            
            // 选择特征类名
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

            // 检查选择器唯一性
            if (document.querySelectorAll(selector).length === 1) {
                break;
            }

            current = current.parentElement as Element;
        }

        return selector;
    }

    clear() {
        this.lastChange = null;
        this.observer.disconnect();
    }
}