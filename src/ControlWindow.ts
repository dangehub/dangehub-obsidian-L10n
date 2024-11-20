import { App, Plugin } from 'obsidian';
import { TranslationPlugin } from './main';

export class ControlWindow {
    private isRecording: boolean = false;
    private isDragging: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private initialLeft: number = 0;
    private initialTop: number = 0;
    private containerEl: HTMLElement;
    private isOpen: boolean = false;

    constructor(private plugin: TranslationPlugin) {
        // 创建容器元素
        this.containerEl = document.createElement('div');
        this.containerEl.addClass('translation-control-panel');
        this.containerEl.style.position = 'fixed';
        this.containerEl.style.top = '20%';
        this.containerEl.style.right = '20px';
        this.containerEl.style.width = '400px';
        this.containerEl.style.height = 'auto';
        this.containerEl.style.maxHeight = '70vh';
        this.containerEl.style.zIndex = '1000';
        this.containerEl.style.display = 'none';
        
        document.body.appendChild(this.containerEl);
    }

    open() {
        if (this.isOpen) return;
        
        this.containerEl.empty();
        this.containerEl.style.display = 'block';

        // 添加拖动条
        const dragHandle = this.containerEl.createDiv('drag-handle');
        dragHandle.setText('翻译控制面板');
        
        // 添加关闭按钮
        const closeButton = dragHandle.createEl('button', {
            cls: 'close-button',
            text: '×'
        });
        closeButton.onclick = () => this.close();

        // 设置拖动事件
        this.setupDrag(dragHandle);

        // 按钮容器和按钮
        const buttonContainer = this.containerEl.createDiv('button-container');
        this.createButtons(buttonContainer);

        // 规则列表容器
        const rulesContainer = this.containerEl.createDiv('rules-container');
        this.updateRulesList();

        this.isOpen = true;
    }

    close() {
        this.containerEl.style.display = 'none';
        this.isOpen = false;
    }

    private setupDrag(dragHandle: HTMLElement) {
        dragHandle.addEventListener('mousedown', (e: MouseEvent) => {
            if (e.target === dragHandle) {
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.initialLeft = this.containerEl.offsetLeft;
                this.initialTop = this.containerEl.offsetTop;
                dragHandle.addClass('dragging');
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (!this.isDragging) return;

            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;
            
            const newLeft = this.initialLeft + deltaX;
            const newTop = this.initialTop + deltaY;

            // 确保不会拖出视口
            const maxLeft = window.innerWidth - this.containerEl.offsetWidth;
            const maxTop = window.innerHeight - this.containerEl.offsetHeight;

            this.containerEl.style.left = `${Math.min(Math.max(0, newLeft), maxLeft)}px`;
            this.containerEl.style.top = `${Math.min(Math.max(0, newTop), maxTop)}px`;
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                dragHandle.removeClass('dragging');
            }
        });
    }

    private createButtons(buttonContainer: HTMLElement) {
        // 记录按钮
        const recordBtn = buttonContainer.createEl('button');
        recordBtn.setText('开始记录');
        recordBtn.onclick = () => {
            if (!this.isRecording) {
                this.plugin.startRecording();
                recordBtn.setText('停止记录');
                recordBtn.addClass('recording');
            } else {
                this.plugin.stopRecording();
                recordBtn.setText('开始记录');
                recordBtn.removeClass('recording');
                this.updateRulesList();
            }
            this.isRecording = !this.isRecording;
        };

        // 翻译开关
        const toggleBtn = buttonContainer.createEl('button');
        toggleBtn.setText(this.plugin.isTranslationEnabled() ? '停用翻译' : '启用翻译');
        toggleBtn.onclick = () => {
            this.plugin.toggleTranslation();
            toggleBtn.setText(this.plugin.isTranslationEnabled() ? '停用翻译' : '启用翻译');
        };

        // 删除按钮
        const deleteBtn = buttonContainer.createEl('button');
        deleteBtn.setText('删除选中');
        deleteBtn.addClass('mod-warning');
        deleteBtn.onclick = () => {
            const selectedRules = Array.from(this.containerEl.querySelectorAll('.rule-checkbox:checked'))
                .map(cb => (cb as HTMLInputElement).getAttribute('data-key'))
                .filter((key): key is string => key !== null);
            if (selectedRules.length > 0) {
                this.plugin.deleteRules(selectedRules);
                this.updateRulesList();
            }
        };
    }

    private updateRulesList() {
        const rulesContainer = this.containerEl.querySelector('.rules-container');
        if (!rulesContainer) return;

        rulesContainer.empty();
        const rules = this.plugin.getAllRules();

        rules.forEach(rule => {
            const ruleEl = rulesContainer.createDiv('rule-item');
            
            const checkbox = ruleEl.createEl('input', {
                type: 'checkbox',
                cls: 'rule-checkbox'
            });
            checkbox.setAttribute('data-key', `${rule.pluginId}:${rule.selector}:${rule.originalText}`);

            const ruleInfo = ruleEl.createDiv('rule-info');
            ruleInfo.createDiv('rule-plugin').setText(`插件: ${rule.pluginId}`);
            ruleInfo.createDiv('rule-original').setText(`原文: ${rule.originalText}`);
            ruleInfo.createDiv('rule-translated').setText(`译文: ${rule.translatedText}`);
        });
    }
}