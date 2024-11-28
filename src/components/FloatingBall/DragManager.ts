export class DragManager {
    private isDragging: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private initialLeft: number = 0;
    private initialTop: number = 0;

    constructor(private element: HTMLElement) {
        this.setupDrag();
    }

    private setupDrag() {
        this.element.onmousedown = this.startDrag.bind(this);
    }

    private startDrag(e: MouseEvent) {
        // 如果点击的是菜单项，不启动拖拽
        if ((e.target as HTMLElement).closest('.menu-item')) {
            return;
        }

        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.initialLeft = this.element.offsetLeft;
        this.initialTop = this.element.offsetTop;

        // 添加临时事件监听器
        document.addEventListener('mousemove', this.onDrag.bind(this));
        document.addEventListener('mouseup', this.stopDrag.bind(this));

        // 防止文本选择
        e.preventDefault();
    }

    private onDrag(e: MouseEvent) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;

        // 计算新位置
        let newLeft = this.initialLeft + deltaX;
        let newTop = this.initialTop + deltaY;

        // 确保不超出视窗边界
        const maxX = window.innerWidth - this.element.offsetWidth;
        const maxY = window.innerHeight - this.element.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));

        // 更新位置
        this.element.style.left = `${newLeft}px`;
        this.element.style.top = `${newTop}px`;
    }

    private stopDrag() {
        this.isDragging = false;
        
        // 移除临时事件监听器
        document.removeEventListener('mousemove', this.onDrag.bind(this));
        document.removeEventListener('mouseup', this.stopDrag.bind(this));

        // 保存位置到本地存储
        this.savePosition();
    }

    private savePosition() {
        const position = {
            left: this.element.offsetLeft,
            top: this.element.offsetTop
        };
        localStorage.setItem('floatingBallPosition', JSON.stringify(position));
    }

    loadSavedPosition() {
        const savedPosition = localStorage.getItem('floatingBallPosition');
        if (savedPosition) {
            const { left, top } = JSON.parse(savedPosition);
            this.element.style.left = `${left}px`;
            this.element.style.top = `${top}px`;
        } else {
            // 默认位置
            this.element.style.right = '20px';
            this.element.style.bottom = '20px';
        }
    }

    destroy() {
        this.element.onmousedown = null;
    }
}
