import { floatingBallStyles } from './styles';

export interface MenuItem {
    text: string;
    onClick: () => void;
}

export class FloatingMenu {
    private menuEl: HTMLElement;

    constructor(
        private containerEl: HTMLElement,
        private items: MenuItem[]
    ) {
        this.createMenu();
    }

    private createMenu() {
        this.menuEl = document.createElement('div');
        this.menuEl.style.cssText = floatingBallStyles.menu;
        this.containerEl.appendChild(this.menuEl);

        this.items.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.style.cssText = floatingBallStyles.menuItem;
            menuItem.textContent = item.text;
            menuItem.onclick = (e) => {
                e.stopPropagation();
                item.onClick();
                this.hide();
            };
            this.menuEl.appendChild(menuItem);
        });

        // 点击外部关闭菜单
        document.addEventListener('click', (e) => {
            if (!this.containerEl.contains(e.target as Node)) {
                this.hide();
            }
        });
    }

    show() {
        this.menuEl.style.display = 'block';
        this.containerEl.classList.add('active');
    }

    hide() {
        this.menuEl.style.display = 'none';
        this.containerEl.classList.remove('active');
    }

    toggle() {
        if (this.menuEl.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    }

    destroy() {
        this.menuEl.remove();
    }
}
