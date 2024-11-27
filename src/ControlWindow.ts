import TranslationPlugin from './main';
import { TranslationRule } from './types/TranslationRule';

export class ControlWindow {
    private isRecording: boolean = false;
    private isDragging: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private initialLeft: number = 0;
    private initialTop: number = 0;
    private containerEl: HTMLElement;
    private isOpen: boolean = false;
    private searchInput: HTMLInputElement | null = null;
    private pluginSelect: HTMLSelectElement | null = null;
    private isResizing = false;
    private initialX = 0;
    private initialY = 0;
    private initialWidth = 0;
    private initialHeight = 0;
    private rulesContainer: HTMLElement;

    constructor(private plugin: TranslationPlugin) {
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

        // 监听规则更新事件
        this.plugin.app.workspace.on('translation-rules-updated', () => {
            console.log('Rules updated event received');
            this.updateRulesList();
        });
    }

    open() {
        if (this.isOpen) return;
        
        this.containerEl.innerHTML = '';
        this.containerEl.style.display = 'flex';

        // 添加拖动条
        const dragHandle = this.containerEl.appendChild(document.createElement('div'));
        dragHandle.classList.add('drag-handle');
        dragHandle.innerText = '翻译控制面板';

        // 添加关闭按钮
        const closeButton = dragHandle.appendChild(document.createElement('button'));
        closeButton.classList.add('close-button');
        closeButton.innerText = '×';
        closeButton.onclick = () => this.close();

        // 设置拖动事件
        this.setupDrag(dragHandle);

        // 创建一个内容容器
        const contentContainer = this.containerEl.appendChild(document.createElement('div'));
        contentContainer.classList.add('content-container');
        contentContainer.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            padding: 10px;
        `;

        // 添加控制按钮
        this.createControlButtons(contentContainer);

        // 添加搜索栏
        this.createSearchBar(contentContainer);

        // 添加规则列表
        this.createRulesList(contentContainer);

        // 在创建其他元素后添加
        this.setupResize();
        
        this.isOpen = true;
    }

    close() {
        if (!this.isOpen) return;
        this.containerEl.style.display = 'none';
        this.isOpen = false;
    }

    private setupDrag(dragHandle: HTMLElement) {
        dragHandle.onmousedown = (e: MouseEvent) => {
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            const rect = this.containerEl.getBoundingClientRect();
            this.initialLeft = rect.left;
            this.initialTop = rect.top;
            document.onmousemove = this.onDrag.bind(this);
            document.onmouseup = this.stopDrag.bind(this);
        };
    }

    private onDrag(e: MouseEvent) {
        if (!this.isDragging) return;
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        this.containerEl.style.left = `${this.initialLeft + dx}px`;
        this.containerEl.style.top = `${this.initialTop + dy}px`;
    }

    private stopDrag() {
        this.isDragging = false;
        document.onmousemove = null;
        document.onmouseup = null;
    }

    private createControlButtons(container: HTMLElement) {
        // 主要功能按钮区域
        const mainButtonContainer = container.createDiv({ cls: 'translation-control-buttons' });
        mainButtonContainer.style.cssText = `
            margin-bottom: 10px;
            padding: 5px;
            border-bottom: 1px solid var(--background-modifier-border);
        `;

        // 启用/停用翻译按钮
        const toggleButton = mainButtonContainer.createEl('button', {
            text: this.plugin.isTranslationEnabled() ? '停用翻译' : '启用翻译'
        });
        toggleButton.onclick = () => {
            this.plugin.toggleTranslation();
            toggleButton.textContent = this.plugin.isTranslationEnabled() ? '停用翻译' : '启用翻译';
        };

        // 添加分隔符
        mainButtonContainer.createEl('span', { text: ' | ' });

        // 开始/停止记录按钮
        const recordButton = mainButtonContainer.createEl('button', {
            text: '开始记录'
        });
        recordButton.onclick = () => {
            if (recordButton.textContent === '开始记录') {
                this.plugin.startRecording();
                recordButton.textContent = '停止记录';
            } else {
                this.plugin.stopRecording();
                recordButton.textContent = '开始记录';
                this.updateRulesList();
            }
        };

        // 翻译提取器区域
        const extractorContainer = container.createDiv({ cls: 'translation-extractor-buttons' });
        extractorContainer.style.cssText = `
            margin-bottom: 10px;
            padding: 5px;
            border-bottom: 1px solid var(--background-modifier-border);
        `;

        // 添加标题
        extractorContainer.createEl('div', {
            text: '批量规则转换',
            cls: 'setting-item-heading'
        });

        // 添加翻译提取器按钮
        const captureOriginalButton = extractorContainer.createEl('button', {
            text: '捕获原文'
        });
        captureOriginalButton.onclick = () => this.onCaptureOriginalClick();

        // 添加分隔符
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

    private createSearchBar(container: HTMLElement) {
        const searchContainer = container.appendChild(document.createElement('div'));
        searchContainer.classList.add('search-container');
        searchContainer.style.cssText = `
            margin-bottom: 10px;
            padding: 5px;
            display: flex;
            gap: 5px;
        `;
        
        // 创建搜索框
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '搜索规则...';
        searchInput.classList.add('search-input');
        searchInput.style.cssText = `
            flex: 1;
            padding: 4px;
        `;
        searchContainer.appendChild(searchInput);
        
        // 创建插件选择下拉框
        const pluginSelect = document.createElement('select');
        pluginSelect.classList.add('plugin-select');
        pluginSelect.style.cssText = `
            min-width: 120px;
            padding: 4px;
        `;
        searchContainer.appendChild(pluginSelect);
        
        // 添加"全部插件"选项
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.text = '全部插件';
        pluginSelect.appendChild(allOption);
        
        // 获取所有规则
        const rules = this.plugin.getAllRules();
        
        // 获取所有唯一的插件ID
        const pluginIds = new Set(rules.map(rule => rule.pluginId).filter(id => id));
        
        // 按字母顺序排序插件ID
        Array.from(pluginIds).sort().forEach(pluginId => {
            if (pluginId) {
                const option = document.createElement('option');
                option.value = pluginId;
                option.text = pluginId;
                pluginSelect.appendChild(option);
            }
        });
        
        // 保存搜索框和选择框的引用
        this.searchInput = searchInput;
        this.pluginSelect = pluginSelect;
        
        // 添加搜索事件监听
        searchInput.addEventListener('input', () => {
            this.updateRulesList(searchInput.value, pluginSelect.value);
        });
        
        pluginSelect.addEventListener('change', () => {
            this.updateRulesList(searchInput.value, pluginSelect.value);
        });
    }

    private createRulesList(container: HTMLElement) {
        this.rulesContainer = container.appendChild(document.createElement('div'));
        this.rulesContainer.classList.add('rules-container');
        this.rulesContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            border: 1px solid var(--background-modifier-border);
            border-radius: 4px;
            padding: 10px;
        `;
        
        this.updateRulesList();
    }

    updateRulesList(searchTerm: string = '', selectedPluginId: string = '') {
        // 清空现有规则列表
        this.rulesContainer.empty();

        // 获取所有规则
        const rules = this.plugin.getAllRules();
        console.log('Updating rules list with', rules.length, 'rules');

        // 过滤规则
        let filteredRules = rules;

        if (selectedPluginId) {
            filteredRules = filteredRules.filter(rule => rule.pluginId === selectedPluginId);
        }

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filteredRules = filteredRules.filter(rule => 
                rule.originalText.toLowerCase().includes(lowerSearch) || 
                rule.translatedText.toLowerCase().includes(lowerSearch)
            );
        }

        // 创建规则列表
        const rulesList = this.rulesContainer.createEl('div', { cls: 'rules-list' });
        rulesList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // 显示规则数量
        const countEl = rulesList.createEl('div', { 
            cls: 'rules-count',
            text: `共 ${filteredRules.length} 条规则`
        });
        countEl.style.cssText = `
            font-weight: bold;
            margin-bottom: 8px;
            padding: 4px;
            background: var(--background-secondary);
            border-radius: 4px;
        `;

        // 显示规则
        filteredRules.forEach((rule, index) => {
            const ruleItem = rulesList.createEl('div', { cls: 'rule-item' });
            ruleItem.style.cssText = `
                padding: 8px;
                background: var(--background-primary-alt);
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
            `;
            
            const ruleText = ruleItem.createEl('div', { 
                cls: 'rule-text',
                text: `${index + 1}. ${rule.originalText} → ${rule.translatedText}`
            });
            ruleText.style.cssText = `
                margin-bottom: 4px;
                word-break: break-all;
            `;

            if (rule.pluginId) {
                const pluginIdEl = ruleItem.createEl('div', {
                    cls: 'rule-plugin-id',
                    text: `插件: ${rule.pluginId}`
                });
                pluginIdEl.style.cssText = `
                    font-size: 0.9em;
                    color: var(--text-muted);
                `;
            }
        });
    }

    private setupResize() {
        const resizeHandle = this.containerEl.createDiv({ cls: 'resize-handle' });
        
        const startResize = (e: MouseEvent) => {
            if (e.button !== 0) return; // 只响应左键
            this.isResizing = true;
            this.initialWidth = this.containerEl.offsetWidth;
            this.initialHeight = this.containerEl.offsetHeight;
            this.initialX = e.clientX;
            this.initialY = e.clientY;
            
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        };

        const resize = (e: MouseEvent) => {
            if (!this.isResizing) return;
            
            const newWidth = this.initialWidth + (e.clientX - this.initialX);
            const newHeight = this.initialHeight + (e.clientY - this.initialY);
            
            // 限制最小和最大尺寸
            const minWidth = 300;
            const minHeight = 200;
            const maxWidth = 800;
            const maxHeight = 600;
            
            this.containerEl.style.width = `${Math.min(Math.max(newWidth, minWidth), maxWidth)}px`;
            this.containerEl.style.height = `${Math.min(Math.max(newHeight, minHeight), maxHeight)}px`;
        };

        const stopResize = () => {
            this.isResizing = false;
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        };

        resizeHandle.addEventListener('mousedown', startResize);
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    startRecording() {
        if (!this.isRecording) {
            this.isRecording = true;
            this.plugin.changeRecorder.startRecording();
            new Notice('开始记录翻译');
        }
    }

    stopRecording() {
        if (this.isRecording) {
            this.isRecording = false;
            this.plugin.changeRecorder.stopRecording();
            new Notice('停止记录翻译');
            this.updateRulesList();
        }
    }

    destroy() {
        if (this.containerEl && this.containerEl.parentNode) {
            this.containerEl.parentNode.removeChild(this.containerEl);
        }
    }
}