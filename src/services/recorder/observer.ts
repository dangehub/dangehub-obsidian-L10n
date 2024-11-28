import { TextChange } from '../../types/TranslationRule';

export class DOMObserver {
    private observer: MutationObserver;
    private isRecording: boolean = false;
    private readonly MAX_CHANGES = 100;
    private changes: TextChange[] = [];
    private lastChange: TextChange | null = null;

    constructor(private onTextChange: (change: TextChange) => void) {
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

        this.addChange(change);
        this.onTextChange(change);
    }

    private addChange(change: TextChange) {
        if (this.changes.length >= this.MAX_CHANGES) {
            this.changes.shift(); // 移除最旧的记录
        }
        this.changes.push(change);
        this.lastChange = change;
    }

    startRecording() {
        try {
            this.isRecording = true;
            this.lastChange = null;
            console.log('开始记录文本变更');

            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
                characterDataOldValue: true
            });
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.isRecording = false;
        }
    }

    stopRecording(): TextChange[] {
        this.isRecording = false;
        this.observer.disconnect();
        const changes = this.changes;
        this.changes = [];
        this.lastChange = null;
        return changes;
    }

    getLastChange(): TextChange | null {
        return this.lastChange;
    }

    getAllChanges(): TextChange[] {
        return [...this.changes];
    }

    clear() {
        this.stopRecording();
    }
}
