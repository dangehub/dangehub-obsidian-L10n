import { Notice } from 'obsidian';
import TranslationPlugin from '../../main';
import { SearchBar } from './SearchBar';
import { RulesList } from './RulesList';

export class ControlWindow {
    private containerEl: HTMLElement;
    private isOpen: boolean = false;
    private isDragging: boolean = false;
    private isResizing: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private initialLeft: number = 0;
    private initialTop: number = 0;
    private initialX = 0;
    private initialY = 0;
    private initialWidth = 0;
    private initialHeight = 0;

    private searchBar: SearchBar;
    private rulesList: RulesList;

    constructor(private plugin: TranslationPlugin) {
        this.createWindow();
        this.setupComponents();
        this.setupDragAndResize();
    }

    private createWindow() {
        this.containerEl = document.createElement('div');
        this.containerEl.classList.add('translation-control-panel');
        this.containerEl.style.cssText = `
            position: fixed;
            top: 20%;
            right: 20px;
            width: 400px;
            height: 70vh;
            display: flex;
            flex-direction: column;
            background: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 4px;
            z-index: 1000;
            display: none;
        `;
        
        document.body.appendChild(this.containerEl);

        // 创建标题栏
        const titleBar = this.containerEl.createDiv({
            cls: 'title-bar'
        });
        titleBar.style.cssText = `
            padding: 10px;
            border-bottom: 1px solid var(--background-modifier-border);
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        titleBar.createSpan({
            text: '翻译控制面板',
            cls: 'title'
        });

        const closeButton = titleBar.createEl('button', {
            text: '×',
            cls: 'close-button'
        });
        closeButton.onclick = () => this.close();
    }

    private setupComponents() {
        // 创建控制按钮容器
        const controlsContainer = this.containerEl.createDiv({
            cls: 'controls-container'
        });
        controlsContainer.style.padding = '10px';

        this.createControlButtons(controlsContainer);

        // 创建搜索栏
        this.searchBar = new SearchBar(this.containerEl, (searchTerm, pluginId) => {
            this.updateRulesList(searchTerm, pluginId);
        });

        // 创建规则列表
        this.rulesList = new RulesList(this.containerEl, (ruleKey) => {
            this.plugin.translationService.deleteRules([ruleKey]);
            this.updateRulesList();
        });
    }

    private createControlButtons(container: HTMLElement) {
        const buttonsContainer = container.createDiv({
            cls: 'buttons-container'
        });
        buttonsContainer.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        `;

        // 添加启用/禁用按钮
        const toggleButton = buttonsContainer.createEl('button', {
            text: this.plugin.isTranslationEnabled() ? '禁用翻译' : '启用翻译'
        });
        toggleButton.onclick = () => {
            this.plugin.toggleTranslation();
            toggleButton.textContent = this.plugin.isTranslationEnabled() ? '禁用翻译' : '启用翻译';
        };

        // 添加记录控制按钮
        const recordButton = buttonsContainer.createEl('button', {
            text: '开始记录',
            cls: 'record-button'
        });

        let isRecording = false;
        recordButton.onclick = () => {
            if (isRecording) {
                this.plugin.changeRecorder.stopRecording();
                recordButton.textContent = '开始记录';
                recordButton.style.background = '';
            } else {
                this.plugin.changeRecorder.startRecording();
                recordButton.textContent = '停止记录';
                recordButton.style.background = 'var(--background-modifier-error)';
            }
            isRecording = !isRecording;
        };

        // 添加批量规则转换按钮组
        const extractorContainer = container.createDiv();
        extractorContainer.createEl('div', {
            text: '批量规则转换',
            cls: 'setting-item-heading'
        });

        const captureOriginalButton = extractorContainer.createEl('button', {
            text: '捕获原文'
        });
        captureOriginalButton.onclick = () => this.onCaptureOriginalClick();

        extractorContainer.createEl('span', { text: ' | ' });

        const captureTranslatedButton = extractorContainer.createEl('button', {
            text: '捕获译文'
        });
        captureTranslatedButton.onclick = () => this.onCaptureTranslatedClick();
    }

    private async onCaptureOriginalClick() {
        try {
            await this.plugin.translationService.takeSnapshot();
            new Notice('已捕获原文');
        } catch (error) {
            console.error('Error capturing original:', error);
            new Notice('捕获原文失败');
        }
    }

    private async onCaptureTranslatedClick() {
        try {
            await this.plugin.translationService.takeSnapshot();
            new Notice('已捕获译文');
        } catch (error) {
            console.error('Error capturing translation:', error);
            new Notice('捕获译文失败');
        }
    }

    private setupDragAndResize() {
        const titleBar = this.containerEl.querySelector('.title-bar');
        if (titleBar) {
            this.setupDrag(titleBar as HTMLElement);
        }
        this.setupResize();
    }

    private setupDrag(dragHandle: HTMLElement) {
        dragHandle.onmousedown = (e: MouseEvent) => {
            if (e.target !== dragHandle) return;
            
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.initialLeft = this.containerEl.offsetLeft;
            this.initialTop = this.containerEl.offsetTop;

            document.onmousemove = this.onDrag.bind(this);
            document.onmouseup = this.stopDrag.bind(this);
        };
    }

    private onDrag(e: MouseEvent) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;

        this.containerEl.style.left = `${this.initialLeft + deltaX}px`;
        this.containerEl.style.top = `${this.initialTop + deltaY}px`;
    }

    private stopDrag() {
        this.isDragging = false;
        document.onmousemove = null;
        document.onmouseup = null;
    }

    private setupResize() {
        const resizeHandle = this.containerEl.createDiv({
            cls: 'resize-handle'
        });
        resizeHandle.style.cssText = `
            position: absolute;
            right: 0;
            bottom: 0;
            width: 10px;
            height: 10px;
            cursor: se-resize;
        `;

        resizeHandle.onmousedown = this.startResize.bind(this);
    }

    private startResize(e: MouseEvent) {
        this.isResizing = true;
        this.initialX = e.clientX;
        this.initialY = e.clientY;
        this.initialWidth = this.containerEl.offsetWidth;
        this.initialHeight = this.containerEl.offsetHeight;

        document.onmousemove = this.resize.bind(this);
        document.onmouseup = this.stopResize.bind(this);
    }

    private resize(e: MouseEvent) {
        if (!this.isResizing) return;

        const deltaX = e.clientX - this.initialX;
        const deltaY = e.clientY - this.initialY;

        const newWidth = Math.max(300, this.initialWidth + deltaX);
        const newHeight = Math.max(200, this.initialHeight + deltaY);

        this.containerEl.style.width = `${newWidth}px`;
        this.containerEl.style.height = `${newHeight}px`;
    }

    private stopResize() {
        this.isResizing = false;
        document.onmousemove = null;
        document.onmouseup = null;
    }

    updateRulesList(searchTerm: string = '', selectedPluginId: string = '') {
        const rules = this.plugin.translationService.getAllRules();
        this.rulesList.updateRules(rules, searchTerm, selectedPluginId);
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.containerEl.style.display = 'flex';
        this.updateRulesList();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.containerEl.style.display = 'none';
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    destroy() {
        this.containerEl.remove();
    }
}
