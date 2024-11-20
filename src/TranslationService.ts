interface TranslationItem {
    pluginId: string;
    original: string;
    translated: string;
}

export class TranslationService {
    private translations: Map<string, TranslationItem> = new Map();
    private observers: Array<() => void> = [];

    // 生成唯一key
    private generateKey(pluginId: string, original: string): string {
        return `${pluginId}:${original}`;
    }

    // 添加或更新翻译
    addTranslation(pluginId: string, original: string, translated: string) {
        const key = this.generateKey(pluginId, original);
        this.translations.set(key, { pluginId, original, translated });
        
        // 通知观察者
        this.notifyObservers();
    }

    // 获取翻译
    getTranslation(pluginId: string, original: string): string | null {
        const key = this.generateKey(pluginId, original);
        return this.translations.get(key)?.translated || null;
    }

    // 获取所有翻译
    getAllTranslations(): TranslationItem[] {
        return Array.from(this.translations.values());
    }

    // 获取指定插件的所有翻译
    getPluginTranslations(pluginId: string): TranslationItem[] {
        return this.getAllTranslations().filter(item => item.pluginId === pluginId);
    }

    // 保存数据
    private async saveData() {
        // TODO: 实现数据持久化
    }

    // 加载数据
    async loadData() {
        // TODO: 实现数据加载
    }

    // 添加观察者
    addObserver(callback: () => void) {
        this.observers.push(callback);
    }

    // 移除观察者
    removeObserver(callback: () => void) {
        this.observers = this.observers.filter(cb => cb !== callback);
    }

    // 通知所有观察者
    private notifyObservers() {
        this.observers.forEach(callback => callback());
    }
} 