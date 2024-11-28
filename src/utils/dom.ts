export function generateSelector(element: Element): string {
    let selector = '';
    let current = element;
    
    while (current && current !== document.body) {
        let currentSelector = current.tagName.toLowerCase();
        
        // 选择特征类名
        const significantClasses = Array.from(current.classList)
            .filter(cls => 
                cls.includes('setting') || 
                cls.includes('nav') || 
                cls.includes('title') ||
                cls.includes('content') ||
                cls.includes('modal') ||
                cls.includes('menu') ||
                cls.includes('button') ||
                cls.includes('input')
            );
        
        if (significantClasses.length > 0) {
            currentSelector += '.' + significantClasses.join('.');
        }

        selector = selector ? `${currentSelector} > ${selector}` : currentSelector;

        // 检查选择器唯一性
        if (document.querySelectorAll(selector).length === 1) {
            break;
        }

        current = current.parentElement as Element;
    }

    return selector;
}

export function isValidSelector(selector: string): boolean {
    try {
        document.querySelector(selector);
        return true;
    } catch {
        return false;
    }
}

export function getElementKey(element: Element): string {
    const selector = generateSelector(element);
    const elements = document.querySelectorAll(selector);
    const index = Array.from(elements).indexOf(element);
    return `${selector}|${index}`;
}
