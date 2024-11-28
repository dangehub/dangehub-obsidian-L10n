export interface TranslationRule {
    selector: string;           // CSS 选择器
    originalText: string;       // 原文
    translatedText: string;     // 译文
    timestamp?: number;         // 记录时间戳,用于排序和追踪
}

export interface TextNode {
    text: string;
    path: number[];  // 记录在DOM树中的路径
    depth: number;   // DOM树深度
    index: number;   // 同级元素中的位置
}

// 用于临时存储调试过程中的修改
export interface TextChange {
    element: Element;          // 被修改的元素
    originalText: string;      // 修改前的文本
    translatedText: string;    // 修改后的文本
    timestamp: number;        // 修改时间
}