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
            this.plugin.logger.warn('Invalid rule:', rule);
            return;
        }

        const key = this.generateRuleKey(rule.selector, rule.originalText);
        this.rules.set(key, rule);
        this.plugin.logger.info('Rule added:', rule);
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

    generateRuleKey(selector: string, originalText: string): string {
        return `${selector}-${originalText}`;
    }

    findExistingRuleBySelector(selector: string): TranslationRule | undefined {
        return Array.from(this.rules.values()).find(rule => rule.selector === selector);
    }

    findMatchingRule(pluginId: string, selector: string, originalText: string): TranslationRule | null {
        // 首先按 pluginId 过滤规则
        const pluginRules = Array.from(this.rules.values()).filter(rule => 
            rule._pluginId === pluginId
        );

        // 在过滤后的规则中查找匹配的规则
        const key = this.generateRuleKey(selector, originalText);
        const matchingRule = pluginRules.find(rule => 
            this.generateRuleKey(rule.selector, rule.originalText) === key
        );

        if (matchingRule) {
            this.plugin.logger.info('Rule matched:', matchingRule);
        }

        return matchingRule || null;
    }

    getAllRules(): TranslationRule[] {
        return Array.from(this.rules.values()).map(({ _pluginId, _version, ...rule }) => rule);
    }

    getRulesByPluginId(pluginId: string): TranslationRule[] {
        return Array.from(this.rules.values())
            .filter(rule => rule._pluginId === pluginId)
            .map(({ _pluginId, _version, ...rule }) => rule);
    }

    deleteRules(ruleKeys: string[]) {
        ruleKeys.forEach(key => this.rules.delete(key));
    }

    getRuleCount(): number {
        return this.rules.size;
    }

    updateRule(rule: TranslationRule) {
        const key = this.generateRuleKey(rule.selector, rule.originalText);
        if (this.rules.has(key)) {
            this.rules.set(key, rule);
        }
    }

    // 去重方法
    removeDuplicateRules(rules: TranslationRule[]): TranslationRule[] {
        const uniqueRules = new Map<string, TranslationRule>();
        
        rules.forEach(rule => {
            const key = this.generateRuleKey(rule.selector, rule.originalText);
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
