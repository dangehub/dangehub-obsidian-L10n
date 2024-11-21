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

        // 添加搜索栏
        this.createSearchBar(contentContainer);

        // 添加按钮容器
        this.createButtonContainer(contentContainer);

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

    private createSearchBar(container: HTMLElement) {
        const searchContainer = container.appendChild(document.createElement('div'));
        searchContainer.classList.add('search-container');
        
        // 创建搜索框
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '搜索规则...';
        searchInput.classList.add('search-input');
        searchContainer.appendChild(searchInput);
        
        // 创建插件选择下拉框
        const pluginSelect = document.createElement('select');
        pluginSelect.classList.add('plugin-select');
        searchContainer.appendChild(pluginSelect);
        
        // 添加"全部插件"选项
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.text = '全部插件';
        pluginSelect.appendChild(allOption);
        
        // 获取所有唯一的插件ID
        const pluginIds = new Set(this.plugin.getAllRules().map(rule => rule.pluginId));
        pluginIds.forEach(pluginId => {
            const option = document.createElement('option');
            option.value = pluginId;
            option.text = pluginId;
            pluginSelect.appendChild(option);
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

    private createButtonContainer(container: HTMLElement) {
        const buttonContainer = container.appendChild(document.createElement('div'));
        buttonContainer.classList.add('button-container');
        
        // 添加记录按钮
        const recordButton = document.createElement('button');
        recordButton.textContent = '开始记录';
        recordButton.onclick = () => {
            if (!this.isRecording) {
                this.isRecording = true;
                recordButton.textContent = '停止记录';
                recordButton.classList.add('recording');
                this.plugin.startRecording();
            } else {
                this.isRecording = false;
                recordButton.textContent = '开始记录';
                recordButton.classList.remove('recording');
                this.plugin.stopRecording();
            }
        };
        buttonContainer.appendChild(recordButton);
        
        // 添加翻译开关按钮
        const toggleButton = document.createElement('button');
        toggleButton.textContent = this.plugin.isTranslationEnabled() ? '停用翻译' : '启用翻译';
        toggleButton.onclick = () => {
            this.plugin.toggleTranslation();
            toggleButton.textContent = this.plugin.isTranslationEnabled() ? '停用翻译' : '启用翻译';
        };
        buttonContainer.appendChild(toggleButton);
    }

    private createRulesList(container: HTMLElement) {
        const list = container.appendChild(document.createElement('div'));
        list.classList.add('rules-list');
        list.style.overflowY = 'auto';
        list.style.flex = '1';

        this.updateRulesList();
    }

    updateRulesList(searchTerm: string = '', selectedPluginId: string = '') {
        const list = this.containerEl.querySelector('.rules-list') as HTMLElement;
        if (!list) return;

        list.innerHTML = '';
        let rules = this.plugin.getAllRules();

        if (selectedPluginId) {
            rules = rules.filter((rule: TranslationRule) => rule.pluginId === selectedPluginId);
        }

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            rules = rules.filter((rule: TranslationRule) => 
                rule.originalText.toLowerCase().includes(lowerSearch) || 
                rule.translatedText.toLowerCase().includes(lowerSearch)
            );
        }

        rules.forEach((rule: TranslationRule) => {
            const ruleEl = document.createElement('div');
            ruleEl.classList.add('rule-item');
            
            // 创建原文显示
            const originalText = document.createElement('div');
            originalText.innerHTML = `<strong>原文:</strong> ${rule.originalText}`;
            
            // 创建译文输入框
            const translationContainer = document.createElement('div');
            const translationInput = document.createElement('input');
            translationInput.type = 'text';
            translationInput.value = rule.translatedText;
            translationInput.style.width = '100%';
            translationInput.style.marginTop = '4px';
            translationInput.placeholder = '输入译文...';
            
            // 添加输入事件
            translationInput.addEventListener('change', () => {
                const updatedRule = {
                    ...rule,
                    translatedText: translationInput.value
                };
                this.plugin.updateRule(updatedRule);
            });
            
            translationContainer.innerHTML = '<strong>译文:</strong> ';
            translationContainer.appendChild(translationInput);
            
            // 创建删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '删除';
            deleteButton.style.float = 'right';
            deleteButton.onclick = () => {
                this.plugin.deleteRules([this.plugin.generateRuleKey(rule.pluginId, rule.selector, rule.originalText)]);
            };
            
            // 组装规则项
            ruleEl.appendChild(originalText);
            ruleEl.appendChild(translationContainer);
            ruleEl.appendChild(deleteButton);
            list.appendChild(ruleEl);
        });
    }

    private updatePluginSelect() {
        const pluginSelect = this.containerEl.querySelector('.plugin-select') as HTMLSelectElement;
        if (!pluginSelect) return;

        // 保存当前选中的值
        const currentValue = pluginSelect.value;
        
        // 清空现有选项
        pluginSelect.innerHTML = '';
        
        // 添加"全部插件"选项
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.text = '全部插件';
        pluginSelect.appendChild(allOption);
        
        // 获取所有唯一的插件ID
        const pluginIds = new Set(this.plugin.getAllRules().map(rule => rule.pluginId));
        pluginIds.forEach(pluginId => {
            const option = document.createElement('option');
            option.value = pluginId;
            option.text = pluginId;
            pluginSelect.appendChild(option);
        });
        
        // 恢复之前的选择
        pluginSelect.value = currentValue;
    }

    destroy() {
        // 移除事件监听器
        const searchInput = this.containerEl.querySelector('.search-input') as HTMLInputElement;
        const pluginSelect = this.containerEl.querySelector('.plugin-select') as HTMLSelectElement;
        
        if (searchInput) {
            searchInput.removeEventListener('input', () => this.updateRulesList());
        }
        if (pluginSelect) {
            pluginSelect.removeEventListener('change', () => this.updateRulesList());
        }

        // 从 DOM 中移除控制面板
        if (this.containerEl && this.containerEl.parentNode) {
            this.containerEl.parentNode.removeChild(this.containerEl);
        }
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
}