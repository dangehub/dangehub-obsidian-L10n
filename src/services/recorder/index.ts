import { Notice } from 'obsidian';
import { TextChange, TranslationRule, TextNode } from '../../types/TranslationRule';
import { generateSelector } from '../../utils/dom';
import TranslationPlugin from '../../main';

export class ChangeRecorder {
    private firstSnapshot: TextNode[] = [];
    private isFirstSnapshot = true;

    constructor(private plugin: TranslationPlugin) {}

    private getCurrentTexts(): TextNode[] {
        const texts: TextNode[] = [];
        const container = document.querySelector('.vertical-tab-content-container');
        if (!container) return texts;

        // 深度优先遍历DOM树
        const processNode = (node: Node, path: number[] = [], depth: number = 0) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim();
                if (text && !this.isUnwantedText(text)) {
                    texts.push({
                        text,
                        path: [...path],
                        depth,
                        index: path[path.length - 1] || 0
                    });
                }
            }

            let childIndex = 0;
            node.childNodes.forEach(child => {
                processNode(child, [...path, childIndex], depth + 1);
                childIndex++;
            });
        };

        processNode(container);
        return texts;
    }

    private isUnwantedText(text: string): boolean {
        // 过滤掉不需要翻译的文本
        return text.length === 0 || 
               /^[\d\s\p{P}]+$/u.test(text) || // 仅包含数字、空白和标点
               text.includes('{{') || // 模板语法
               text.includes('}}');
    }

    private compareSnapshots(first: TextNode[], second: TextNode[]): TranslationRule[] {
        const rules: TranslationRule[] = [];

        // 按深度和位置排序
        first.sort((a, b) => a.depth - b.depth || a.index - b.index);
        second.sort((a, b) => a.depth - b.depth || a.index - b.index);

        // 一一对应比较
        for (let i = 0; i < Math.min(first.length, second.length); i++) {
            if (first[i].text !== second[i].text) {
                const element = this.findElementByPath(first[i].path);
                if (element) {
                    rules.push({
                        selector: generateSelector(element),
                        originalText: first[i].text,
                        translatedText: second[i].text,
                        timestamp: Date.now()
                    });
                }
            }
        }

        return rules;
    }

    private findElementByPath(path: number[]): Element | null {
        const container = document.querySelector('.vertical-tab-content-container');
        if (!container) {
            this.plugin.logger.warn('Container not found');
            return null;
        }

        let current: Node = container;
        
        try {
            for (const index of path) {
                if (!current || !current.childNodes || index >= current.childNodes.length) {
                    this.plugin.logger.warn('Invalid path:', {
                        path,
                        currentIndex: index,
                        hasChildNodes: current?.childNodes?.length
                    });
                    return null;
                }
                current = current.childNodes[index];
            }

            // 如果当前节点是元素，直接返回
            if (current instanceof Element) {
                return current;
            }
            
            // 如果是文本节点，返回其父元素
            if (current instanceof Text && current.parentElement) {
                return current.parentElement;
            }

            this.plugin.logger.warn('Node is neither Element nor Text:', current);
            return null;
        } catch (error) {
            this.plugin.logger.error('Error in findElementByPath:', error);
            return null;
        }
    }

    // 公共方法
    takeSnapshot(): void {
        const currentTexts = this.getCurrentTexts();
        
        if (this.isFirstSnapshot) {
            // 第一次快照，保存为原文
            this.firstSnapshot = currentTexts;
            this.isFirstSnapshot = false;
            new Notice('已捕获原文');
            this.plugin.logger.info('First snapshot taken', currentTexts);
        } else {
            try {
                // 第二次快照，比较并生成规则
                const rules = this.compareSnapshots(this.firstSnapshot, currentTexts);
                
                // 保存规则
                rules.forEach(rule => {
                    this.plugin.translationService.addRule(rule);
                });
                
                // 重置状态
                this.clear();
                new Notice(`已生成 ${rules.length} 条翻译规则`);
                this.plugin.logger.info('Rules generated:', rules);
            } catch (error) {
                this.plugin.logger.error('Error capturing translation:', error);
                new Notice('捕获译文失败');
            }
        }
    }

    clear() {
        this.firstSnapshot = [];
        this.isFirstSnapshot = true;
    }
}
