import { Notice } from 'obsidian';
import TranslationPlugin from './main';

export class DOMObserver {
    private observer: MutationObserver;
    private observing: boolean = false;
    private scanButton: HTMLElement | null = null;

    constructor(private plugin: TranslationPlugin) {
        this.observer = new MutationObserver(this.handleMutation.bind(this));
    }

    checkAndObserve() {
        console.log('检查设置页面...');
        
        // 如果已经在观察中且按钮存在，则不需要重新初始化
        if (this.observing && this.scanButton) {
            console.log('已经在观察中且按钮存在');
            return;
        }
        
        // 修改选择器以匹配设置窗口
        const settingsModal = document.querySelector('.modal.mod-settings');
        if (!settingsModal) {
            console.log('未找到设置模态框，尝试其他选择器...');
            // 尝试其他可能的选择器
            const altSettingsModal = document.querySelector('.vertical-tab-header-group');
            if (!altSettingsModal) {
                console.log('无法找到设置界面');
                return;
            }
            console.log('找到替代设置界面');
            this.addScanButton(altSettingsModal);
            return;
        }

        console.log('找到设置模态框');
        this.addScanButton(settingsModal);

        // 开始观察变化
        if (!this.observing) {
            const contentContainer = document.querySelector('.vertical-tab-content-container');
            if (contentContainer) {
                this.observer.observe(contentContainer, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
                this.observing = true;
                console.log('开始观察设置页面变化');
            }
        }
    }

    private addScanButton(settingsModal: Element) {
        // 如果按钮已存在，不重复添加
        if (this.scanButton) {
            console.log('扫描按钮已存在');
            return;
        }

        // 查找合适的插入位置
        const headerGroup = settingsModal.querySelector('.vertical-tab-header-group');
        if (!headerGroup) {
            console.log('未找到标题组');
            return;
        }

        // 创建一个容器来放置按钮
        const buttonContainer = document.createElement('div');
        buttonContainer.style.padding = '10px';
        buttonContainer.style.borderBottom = '1px solid var(--background-modifier-border)';

        // 创建扫描按钮
        this.scanButton = document.createElement('button');
        this.scanButton.className = 'mod-cta';
        this.scanButton.style.width = '100%';
        this.scanButton.textContent = '扫描当前页面文本';
        this.scanButton.onclick = () => {
            const activeContent = document.querySelector('.vertical-tab-content.is-active');
            if (activeContent) {
                const pluginId = this.getPluginName();
                if (this.shouldSkipPlugin(pluginId)) {
                    new Notice('不能扫描 L10n 插件自身的设置页面');
                    return;
                }
                
                console.log('开始处理当前页面内容');
                this.processExistingContent(activeContent);
                new Notice('已扫描当前页面文本，请在插件设置中查看');
            } else {
                console.log('未找到活动内容页面');
                new Notice('未找到可扫描的内容');
            }
        };

        // 添加按钮到容器
        buttonContainer.appendChild(this.scanButton);

        // 将容器插入到标题组的开始位置
        headerGroup.insertBefore(buttonContainer, headerGroup.firstChild);
        console.log('成功添加扫描按钮');
    }

    private processExistingContent(element: Element) {
        console.log('处理页面内容...');
        const pluginId = this.getPluginName();
        console.log('当前插件:', pluginId);
        
        // 检查是否应该跳过当前插件
        if (this.shouldSkipPlugin(pluginId)) {
            console.log('跳过自身插件设置页面');
            return;
        }
        
        // 获取所有设置项
        const settingItems = element.querySelectorAll('.setting-item');
        console.log('找到设置项数量:', settingItems.length);

        settingItems.forEach((item, index) => {
            // 处理名称
            const nameEl = item.querySelector('.setting-item-name');
            if (nameEl && nameEl.textContent) {
                const original = nameEl.textContent.trim();
                console.log(`[${index}] 设置项名称:`, original);
                
                // 获取已有翻译
                const translated = this.plugin.translationService.getTranslation(pluginId, original);
                if (translated) {
                    // 如果有翻译，注入翻译内容
                    this.injectTranslation(nameEl, original, translated);
                } else {
                    // 如果没有翻译，添加到翻译服务
                    this.plugin.translationService.addTranslation(pluginId, original, '');
                }
            }

            // 处理描述
            const descEl = item.querySelector('.setting-item-description');
            if (descEl && descEl.textContent) {
                const original = descEl.textContent.trim();
                console.log(`[${index}] 设置项描述:`, original);
                
                // 获取已有翻译
                const translated = this.plugin.translationService.getTranslation(pluginId, original);
                if (translated) {
                    // 如果有翻译，注入翻译内容
                    this.injectTranslation(descEl, original, translated);
                } else {
                    // 如果没有翻译，添加到翻译服务
                    this.plugin.translationService.addTranslation(pluginId, original, '');
                }
            }
        });
    }

    private injectTranslation(element: Element, original: string, translated: string) {
        // 如果元素已经被注入过翻译，不重复注入
        if (element.getAttribute('data-original-text')) {
            return;
        }

        // 保存原文
        element.setAttribute('data-original-text', original);

        // 创建翻译后的显示格式
        const translatedText = document.createElement('span');
        translatedText.className = 'translation-text';
        translatedText.textContent = translated;
        translatedText.style.display = 'block';
        // 可以添加一些样式来区分原文和译文
        translatedText.style.color = 'var(--text-accent)';
        translatedText.style.fontSize = '0.9em';
        translatedText.style.marginTop = '2px';

        // 将翻译插入到原文后面
        element.appendChild(translatedText);
    }

    // 添加一个方法来更新已注入的翻译
    public updateInjectedTranslations() {
        const activeContent = document.querySelector('.vertical-tab-content.is-active');
        if (activeContent) {
            this.processExistingContent(activeContent);
        }
    }

    private handleMutation(mutations: MutationRecord[]) {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                const target = mutation.target as Element;
                if (target.classList.contains('vertical-tab-content')) {
                    console.log('检测到设置内容变化');
                    this.processExistingContent(target);
                }
            }
        });
    }

    private getPluginName(): string {
        const activeNavItem = document.querySelector('.vertical-tab-nav-item.is-active');
        const pluginName = activeNavItem?.textContent?.trim() || '未知插件';
        console.log('获取到插件名称:', pluginName);
        return pluginName;
    }

    private shouldSkipPlugin(pluginName: string): boolean {
        // 跳过自身插件
        const skipPlugins = [
            'L10n',
            'obsidian-L10n',  // 可能的其他名称形式
            this.plugin.manifest.name  // 使用插件清单中的名称
        ];
        
        return skipPlugins.some(name => 
            pluginName.toLowerCase().includes(name.toLowerCase())
        );
    }

    disconnect() {
        console.log('断开观察器连接');
        this.observer.disconnect();
        this.observing = false;
        // 移除扫描按钮
        this.scanButton?.remove();
        this.scanButton = null;
    }
}