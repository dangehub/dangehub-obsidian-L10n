import { TranslationRule } from './types/TranslationRule';

interface DOMSnapshot {
    element: Element;
    selector: string;
    text: string;
    domPath: string[];
    attributes: Record<string, string>;
    index: number;  // 在同级元素中的索引
}

interface TextNodeMapping {
    original: DOMSnapshot;
    translated: DOMSnapshot;
    confidence: number;
}

export class TranslationExtractor {
    private originalSnapshots: DOMSnapshot[] = [];
    private translatedSnapshots: DOMSnapshot[] = [];
    private mappings: TextNodeMapping[] = [];

    constructor() {
        this.reset();
    }

    reset() {
        this.originalSnapshots = [];
        this.translatedSnapshots = [];
        this.mappings = [];
    }

    // 收集原文快照
    captureOriginal() {
        const snapshots = this.captureTextNodes(document.body);
        this.originalSnapshots = snapshots.filter(item => this.isValidSelector(item.selector));
        console.log('捕获原文节点:', this.originalSnapshots.length);
    }

    // 收集译文快照
    captureTranslated() {
        const snapshots = this.captureTextNodes(document.body);
        this.translatedSnapshots = snapshots.filter(item => this.isValidSelector(item.selector));
        console.log('捕获译文节点:', this.translatedSnapshots.length);
    }

    // 生成翻译规则
    generateRules(pluginId: string): TranslationRule[] {
        this.matchNodes();
        return this.createRules(pluginId);
    }

    private isValidSelector(selector: string): boolean {
        // 只捕获设置面板内的元素
        const validPrefix = 'div.vertical-tab-content-container > div.vertical-tab-content';
        const isValid = selector.includes(validPrefix);
        console.log('Checking selector:', selector, 'isValid:', isValid);
        return isValid;
    }

    private captureTextNodes(root: Element): DOMSnapshot[] {
        const snapshots: DOMSnapshot[] = [];
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const text = node.textContent?.trim();
                    return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        let currentNode: Node | null;
        while (currentNode = walker.nextNode()) {
            const textNode = currentNode as Text;
            const text = textNode.textContent?.trim();
            if (text) {
                const element = textNode.parentElement;
                if (element) {
                    const selector = this.generateSelector(element);
                    console.log('Found text node:', {
                        text,
                        selector,
                        element
                    });
                    snapshots.push({
                        element,
                        selector,
                        text,
                        domPath: this.getDOMPath(element),
                        attributes: this.getKeyAttributes(element),
                        index: this.getElementIndex(element)
                    });
                }
            }
        }

        console.log('Total snapshots before filtering:', snapshots.length);
        return snapshots;
    }

    private generateSelector(element: Element): string {
        const path: string[] = [];
        let current: Element | null = element;
        
        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            
            // 添加类名
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.split(' ')
                    .filter(c => c && !c.includes(':'))
                    .map(c => '.' + c)
                    .join('');
                if (classes) {
                    selector += classes;
                }
            }

            path.unshift(selector);
            current = current.parentElement;
        }

        return path.join(' > ');
    }

    private getDOMPath(element: Element): string[] {
        const path: string[] = [];
        let current = element;
        
        while (current && current !== document.body) {
            const identifier = this.getNodeIdentifier(current);
            path.unshift(identifier);
            current = current.parentElement as Element;
        }
        
        return path;
    }

    private getNodeIdentifier(element: Element): string {
        const tag = element.tagName.toLowerCase();
        const classes = Array.from(element.classList).join('.');
        const id = element.id ? `#${element.id}` : '';
        const index = this.getElementIndex(element);
        
        return `${tag}${id}${classes ? `.${classes}` : ''}:nth-child(${index + 1})`;
    }

    private getKeyAttributes(element: Element): Record<string, string> {
        const attrs: Record<string, string> = {};
        const keyAttrs = ['id', 'class', 'name', 'title', 'aria-label'];
        
        keyAttrs.forEach(attr => {
            const value = element.getAttribute(attr);
            if (value) {
                attrs[attr] = value;
            }
        });
        
        return attrs;
    }

    private getElementIndex(element: Element): number {
        if (!element.parentElement) return 0;
        const siblings = Array.from(element.parentElement.children);
        return siblings.indexOf(element);
    }

    private matchNodes() {
        this.mappings = [];
        
        // 为每个原文节点寻找最佳匹配
        this.originalSnapshots.forEach(original => {
            let bestMatch: TextNodeMapping | null = null;
            let bestScore = 0;
            
            this.translatedSnapshots.forEach(translated => {
                const score = this.calculateMatchScore(original, translated);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = {
                        original,
                        translated,
                        confidence: score
                    };
                }
            });
            
            if (bestMatch && bestMatch.confidence >= 0.7) { // 设置最低置信度阈值
                this.mappings.push(bestMatch);
            }
        });
        
        console.log('找到匹配:', this.mappings.length);
    }

    private calculateMatchScore(original: DOMSnapshot, translated: DOMSnapshot): number {
        let score = 0;
        const weights = {
            domPath: 0.4,
            attributes: 0.3,
            position: 0.2,
            selector: 0.1
        };

        // DOM路径匹配
        score += this.calculatePathMatchScore(original.domPath, translated.domPath) * weights.domPath;
        
        // 属性匹配
        score += this.calculateAttributeMatchScore(original.attributes, translated.attributes) * weights.attributes;
        
        // 位置匹配
        score += (original.index === translated.index ? 1 : 0) * weights.position;
        
        // 选择器相似度
        score += this.calculateSelectorSimilarity(original.selector, translated.selector) * weights.selector;

        return score;
    }

    private calculatePathMatchScore(path1: string[], path2: string[]): number {
        if (path1.length !== path2.length) return 0;
        
        let matches = 0;
        for (let i = 0; i < path1.length; i++) {
            if (this.compareNodeIdentifiers(path1[i], path2[i])) {
                matches++;
            }
        }
        
        return matches / path1.length;
    }

    private compareNodeIdentifiers(id1: string, id2: string): boolean {
        // 忽略nth-child部分进行比较
        const clean1 = id1.replace(/:nth-child\(\d+\)/, '');
        const clean2 = id2.replace(/:nth-child\(\d+\)/, '');
        return clean1 === clean2;
    }

    private calculateAttributeMatchScore(attrs1: Record<string, string>, attrs2: Record<string, string>): number {
        const keys1 = Object.keys(attrs1);
        const keys2 = Object.keys(attrs2);
        
        if (keys1.length === 0 && keys2.length === 0) return 1;
        if (keys1.length === 0 || keys2.length === 0) return 0;
        
        let matches = 0;
        keys1.forEach(key => {
            if (attrs2[key] === attrs1[key]) {
                matches++;
            }
        });
        
        return matches / Math.max(keys1.length, keys2.length);
    }

    private calculateSelectorSimilarity(selector1: string, selector2: string): number {
        const parts1 = selector1.split(' > ');
        const parts2 = selector2.split(' > ');
        
        if (parts1.length !== parts2.length) return 0;
        
        let matches = 0;
        for (let i = 0; i < parts1.length; i++) {
            if (parts1[i] === parts2[i]) {
                matches++;
            }
        }
        
        return matches / parts1.length;
    }

    private createRules(pluginId: string): TranslationRule[] {
        return this.mappings
            .filter(mapping => mapping.confidence >= 0.7)
            .map(mapping => ({
                selector: mapping.original.selector,
                originalText: mapping.original.text,
                translatedText: mapping.translated.text,
                pluginId,
                timestamp: Date.now()
            }));
    }
}
