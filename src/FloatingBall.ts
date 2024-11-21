import { TranslationService } from './TranslationService';

export class FloatingBall {
    private element: HTMLElement;

    constructor(private translationService: TranslationService) {
        this.element = document.createElement('div');
        this.element.addClass('translation-floating-ball');
        this.element.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 40px;
            height: 40px;
            background: var(--interactive-accent);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            transition: transform 0.2s;
            user-select: none;
            opacity: 0.8;
            pointer-events: auto;
        `;
        
        this.element.innerHTML = '译';
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.element.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.element.style.transform = 'scale(1)';
                this.translationService.forceApplyAllRules();
            }, 100);
        });

        this.element.addEventListener('mouseenter', () => {
            this.element.style.opacity = '1';
        });

        this.element.addEventListener('mouseleave', () => {
            this.element.style.opacity = '0.8';
        });
    }

    show() {
        if (!document.body.contains(this.element)) {
            document.body.appendChild(this.element);
        }
        this.element.style.display = 'flex';
    }

    hide() {
        this.element.style.display = 'none';
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}