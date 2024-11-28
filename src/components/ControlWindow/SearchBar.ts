export class SearchBar {
    private searchInput: HTMLInputElement | null = null;
    private pluginSelect: HTMLSelectElement | null = null;

    constructor(
        private container: HTMLElement,
        private onSearch: (searchTerm: string, pluginId: string) => void
    ) {
        this.createSearchBar();
    }

    private createSearchBar() {
        const searchContainer = this.container.createDiv();
        searchContainer.classList.add('search-container');
        searchContainer.style.cssText = `
            margin-bottom: 10px;
            padding: 5px;
            display: flex;
            gap: 5px;
        `;

        // 创建搜索输入框
        this.searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: '搜索规则...'
        });
        this.searchInput.style.cssText = `
            flex: 1;
            padding: 5px;
            border: 1px solid var(--background-modifier-border);
            border-radius: 4px;
        `;

        // 创建插件选择下拉框
        this.pluginSelect = searchContainer.createEl('select');
        this.pluginSelect.style.cssText = `
            padding: 5px;
            border: 1px solid var(--background-modifier-border);
            border-radius: 4px;
            background: var(--background-primary);
        `;

        // 添加默认选项
        const defaultOption = this.pluginSelect.createEl('option', {
            value: '',
            text: '所有插件'
        });

        // 添加事件监听
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.pluginSelect.addEventListener('change', () => this.handleSearch());
    }

    private handleSearch() {
        const searchTerm = this.searchInput?.value || '';
        const selectedPluginId = this.pluginSelect?.value || '';
        this.onSearch(searchTerm, selectedPluginId);
    }

    updatePluginsList(plugins: string[]) {
        if (!this.pluginSelect) return;

        // 清除现有选项，保留默认选项
        while (this.pluginSelect.options.length > 1) {
            this.pluginSelect.remove(1);
        }

        // 添加新的插件选项
        plugins.forEach(pluginId => {
            this.pluginSelect?.add(new Option(pluginId, pluginId));
        });
    }

    clear() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        if (this.pluginSelect) {
            this.pluginSelect.value = '';
        }
    }
}
