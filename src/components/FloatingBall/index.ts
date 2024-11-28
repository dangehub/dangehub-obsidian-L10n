import { Notice } from 'obsidian';
import TranslationPlugin from '../../main';
import { floatingBallStyles } from './styles';
import { FloatingMenu, MenuItem } from './Menu';
import { DragManager } from './DragManager';

export class FloatingBall {
    private containerEl: HTMLElement;
    private menu: FloatingMenu;
    private dragManager: DragManager;
    private isEnabled: boolean = false;

    constructor(private plugin: TranslationPlugin) {
        this.isEnabled = this.plugin.translationService.isTranslationEnabled();
        this.createBall();
        this.setupMenu();
        this.setupDrag();
    }

    private createBall() {
        this.containerEl = document.createElement('div');
        this.containerEl.classList.add('translation-floating-ball');
        this.containerEl.style.cssText = floatingBallStyles.container;

        // 添加图标
        const iconEl = document.createElement('div');
        iconEl.style.cssText = floatingBallStyles.icon;
        iconEl.textContent = '译';
        this.containerEl.appendChild(iconEl);

        document.body.appendChild(this.containerEl);
    }

    private setupMenu() {
        const menuItems: MenuItem[] = [
            {
                text: '显示控制面板',
                onClick: () => {
                    if (this.plugin.controlWindow) {
                        this.plugin.controlWindow.toggle();
                    }
                }
            },
            {
                text: this.isEnabled ? '禁用翻译' : '启用翻译',
                onClick: () => this.toggleTranslation()
            },
            {
                text: '捕获原文',
                onClick: () => this.captureOriginal()
            },
            {
                text: '捕获译文',
                onClick: () => this.captureTranslation()
            }
        ];

        this.menu = new FloatingMenu(this.containerEl, menuItems);

        // 点击悬浮球显示/隐藏菜单
        this.containerEl.onclick = (e) => {
            if (!this.dragManager.isDragging) {
                this.menu.toggle();
            }
        };
    }

    private setupDrag() {
        this.dragManager = new DragManager(this.containerEl);
        this.dragManager.loadSavedPosition();
    }

    private toggleTranslation() {
        this.isEnabled = !this.isEnabled;
        if (this.isEnabled) {
            this.plugin.translationService.enable();
        } else {
            this.plugin.translationService.disable();
        }
        
        // 更新菜单项文本
        this.updateMenuItems();
        
        // 更新悬浮球状态
        this.containerEl.classList.toggle('active', this.isEnabled);
        
        new Notice(this.isEnabled ? '翻译已启用' : '翻译已禁用');
    }

    private async captureOriginal() {
        try {
            this.plugin.takeSnapshot();
        } catch (error) {
            console.error('Error capturing original:', error);
            new Notice('捕获原文失败');
        }
    }

    private async captureTranslation() {
        try {
            this.plugin.takeSnapshot();
        } catch (error) {
            console.error('Error capturing translation:', error);
            new Notice('捕获译文失败');
        }
    }

    private updateMenuItems() {
        // 重新创建菜单项
        const menuItems: MenuItem[] = [
            {
                text: '显示控制面板',
                onClick: () => {
                    if (this.plugin.controlWindow) {
                        this.plugin.controlWindow.toggle();
                    }
                }
            },
            {
                text: this.isEnabled ? '禁用翻译' : '启用翻译',
                onClick: () => this.toggleTranslation()
            },
            {
                text: '捕获原文',
                onClick: () => this.captureOriginal()
            },
            {
                text: '捕获译文',
                onClick: () => this.captureTranslation()
            }
        ];

        // 重新创建菜单
        this.menu.destroy();
        this.menu = new FloatingMenu(this.containerEl, menuItems);
    }

    show() {
        this.containerEl.style.display = 'flex';
    }

    hide() {
        this.containerEl.style.display = 'none';
    }

    destroy() {
        this.menu.destroy();
        this.dragManager.destroy();
        this.containerEl.remove();
    }
}
