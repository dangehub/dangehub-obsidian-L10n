import { Plugin } from 'obsidian';
import { TextChange, TranslationRule } from './types/TranslationRule';

export class ChangeRecorder {
    private changes: TextChange[] = [];
    private isRecording: boolean = false;
    private observer: MutationObserver;

    constructor(private plugin: Plugin) {
        // 创建 MutationObserver
        this.observer = new MutationObserver((mutations) => {
            if (!this.isRecording) return;

            mutations.forEach(mutation => {
                if (mutation.type === 'characterData') {
                    // 文本节点变化
                    const element = mutation.target.parentElement;
                    const newText = mutation.target.textContent;
                    const oldText = mutation.oldValue;

                    if (element && oldText && newText && oldText !== newText) {
                        this.recordChange(element, oldText, newText);
                    }
                } else if (mutation.type === 'childList') {
                    // 子节点变化（可能是文本被完全替换）
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const element = node.parentElement;
                            const newText = node.textContent;
                            const oldText = mutation.removedNodes[0]?.textContent;

                            if (element && oldText && newText && oldText !== newText) {
                                this.recordChange(element, oldText, newText);
                            }
                        }
                    });
                }
            });
        });
    }

    startRecording() {
        this.isRecording = true;
        this.changes = [];
        console.log('开始记录文本变更');

        // 开始观察整个文档
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
        console.log('停止记录,共捕获变更:', this.changes.length);
        return this.changes;
    }

    recordChange(element: Element, oldText: string, newText: string) {
        console.log('记录变更:', { oldText, newText });
        this.changes.push({
            element,
            originalText: oldText,
            translatedText: newText,
            timestamp: Date.now()
        });
    }

    generateRules(pluginId: string): TranslationRule[] {
        return this.changes.map(change => ({
            selector: this.generateSelector(change.element),
            originalText: change.originalText,
            translatedText: change.translatedText,
            pluginId,
            timestamp: change.timestamp
        }));
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
        this.changes = [];
        this.observer.disconnect();
    }
}