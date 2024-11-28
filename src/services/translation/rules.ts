import { Notice } from 'obsidian';
import { TranslationRule } from '../../types/TranslationRule';
import { isValidSelector } from '../../utils/dom';
import TranslationPlugin from '../../main';

export class RuleManager {
    private rules: Map<string, TranslationRule> = new Map();
    private translationRules: TranslationRule[] = [];

    constructor(private plugin: TranslationPlugin) {}

    addRule(rule: TranslationRule) {
        if (!this.isValidRule(rule)) {
            console.warn('Invalid rule:', rule);
            return;
        }

        const key = this.generateRuleKey(rule.pluginId, rule.selector, rule.originalText);
        this.rules.set(key, rule);
        console.log('Rule added:', rule);
    }

    private isValidRule(rule: TranslationRule): boolean {
        return (
            rule &&
            typeof rule.selector === 'string' &&
            typeof rule.originalText === 'string' &&
            typeof rule.translatedText === 'string' &&
            isValidSelector(rule.selector)
        );
    }

    generateRuleKey(pluginId: string, selector: string, originalText: string): string {
        return `${pluginId}-${selector}-${originalText}`;
    }

    findExistingRuleBySelector(selector: string): TranslationRule | undefined {
        return Array.from(this.rules.values()).find(rule => rule.selector === selector);
    }

    findMatchingRule(pluginId: string, selector: string, originalText: string): TranslationRule | null {
        const key = this.generateRuleKey(pluginId, selector, originalText);
        return this.rules.get(key) || null;
    }

    getAllRules(): TranslationRule[] {
        return Array.from(this.rules.values());
    }

    deleteRules(ruleKeys: string[]) {
        ruleKeys.forEach(key => this.rules.delete(key));
    }

    getRuleCount(): number {
        return this.rules.size;
    }

    updateRule(rule: TranslationRule) {
        const key = this.generateRuleKey(rule.pluginId, rule.selector, rule.originalText);
        if (this.rules.has(key)) {
            this.rules.set(key, rule);
        }
    }

    // 去重方法
    removeDuplicateRules(rules: TranslationRule[]): TranslationRule[] {
        const uniqueRules = new Map<string, TranslationRule>();
        
        rules.forEach(rule => {
            const key = this.generateRuleKey(rule.pluginId, rule.selector, rule.originalText);
            if (!uniqueRules.has(key)) {
                uniqueRules.set(key, rule);
            }
        });

        return Array.from(uniqueRules.values());
    }

    clear() {
        this.rules.clear();
    }
}
