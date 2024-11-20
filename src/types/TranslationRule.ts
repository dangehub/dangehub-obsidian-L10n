export interface TranslationRule {
    selector: string;           // CSS 选择器
    originalText: string;       // 原文
    translatedText: string;     // 译文
    pluginId: string;          // 所属插件ID
    timestamp: number;         // 记录时间戳,用于排序和追踪
}

// 用于临时存储调试过程中的修改
export interface TextChange {
    element: Element;          // 被修改的元素
    originalText: string;      // 修改前的文本
    translatedText: string;    // 修改后的文本
    timestamp: number;        // 修改时间
}