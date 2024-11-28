import { TranslationRule } from '../../types/TranslationRule';
import TranslationPlugin from '../../main';
import { Notice } from 'obsidian';

export class RuleStorage {
    constructor(private plugin: TranslationPlugin) {}

    async ensureTranslationDir(pluginId: string): Promise<string> {
        const basePath = this.plugin.app.vault.configDir + '/plugins/aqu-L10n/translation/' + pluginId;
        await this.plugin.app.vault.adapter.mkdir(basePath);
        return basePath;
    }

    getRulesFilePath(pluginId: string): string {
        const plugin = this.plugin.app.plugins.plugins[pluginId];
        if (!plugin || !plugin.manifest) {
            console.warn(`Plugin ${pluginId} not found or has no manifest`);
            return `${this.plugin.app.vault.configDir}/plugins/aqu-L10n/translation/${pluginId}/unknown.json`;
        }
        const version = plugin.manifest.version;
        return `${this.plugin.app.vault.configDir}/plugins/aqu-L10n/translation/${pluginId}/${version}.json`;
    }

    private getRuleFileInfo(filePath: string): { pluginId: string; version: string } {
        // 从路径中提取 pluginId 和 version
        // 例如: .obsidian/plugins/aqu-L10n/translation/dataview/0.5.67.json
        const parts = filePath.split('/');
        const pluginId = parts[parts.length - 2]; // dataview
        const version = parts[parts.length - 1].replace('.json', ''); // 0.5.67
        return { pluginId, version };
    }

    async loadRuleFile(filePath: string): Promise<TranslationRule[]> {
        try {
            const exists = await this.plugin.app.vault.adapter.exists(filePath);
            if (!exists) {
                this.plugin.logger.info('Rule file does not exist:', filePath);
                return [];
            }

            const content = await this.plugin.app.vault.adapter.read(filePath);
            const rules = JSON.parse(content) as TranslationRule[];
            const { pluginId, version } = this.getRuleFileInfo(filePath);

            // 为每个规则添加 pluginId 和 version 属性
            const rulesWithMeta = rules.map(rule => ({
                ...rule,
                _pluginId: pluginId,
                _version: version
            }));

            this.plugin.logger.info('Rules loaded:', rulesWithMeta);
            return rulesWithMeta;
        } catch (error) {
            this.plugin.logger.error('Error loading rules:', error);
            return [];
        }
    }

    async loadAllRules(): Promise<TranslationRule[]> {
        const baseDir = this.plugin.app.vault.configDir + '/plugins/aqu-L10n/translation';
        try {
            const allRules: TranslationRule[] = [];
            
            // 确保基础目录存在
            await this.plugin.app.vault.adapter.mkdir(baseDir);
            
            // 获取所有插件目录
            const pluginDirs = await this.plugin.app.vault.adapter.list(baseDir);
            if (!pluginDirs.folders) return [];
            
            // 遍历每个插件目录
            for (const pluginDir of pluginDirs.folders) {
                try {
                    // 获取插件目录中的所有文件
                    const versionFiles = await this.plugin.app.vault.adapter.list(pluginDir);
                    if (!versionFiles.files) continue;
                    
                    // 遍历每个版本文件
                    for (const file of versionFiles.files) {
                        if (file.endsWith('.json')) {
                            try {
                                const rules = await this.loadRuleFile(file);
                                allRules.push(...rules);
                            } catch (error) {
                                console.error(`Error loading rules from ${file}:`, error);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error loading plugin directory ${pluginDir}:`, error);
                }
            }
            
            return allRules;
        } catch (error) {
            console.error('Error loading all rules:', error);
            return [];
        }
    }

    private async mergeRules(existingRules: TranslationRule[], newRules: TranslationRule[]): Promise<TranslationRule[]> {
        const ruleMap = new Map<string, TranslationRule>();
        
        // 使用选择器和原文作为键
        const getKey = (rule: TranslationRule) => `${rule.selector}|${rule.originalText}`;
        
        // 添加现有规则
        existingRules.forEach(rule => {
            const { pluginId, ...ruleWithoutId } = rule as any;
            ruleMap.set(getKey(rule), ruleWithoutId);
        });
        
        // 添加新规则
        newRules.forEach(rule => {
            const { pluginId, ...ruleWithoutId } = rule as any;
            ruleMap.set(getKey(rule), ruleWithoutId);
        });
        
        return Array.from(ruleMap.values());
    }

    async saveRules(rules: TranslationRule[], pluginId: string): Promise<void> {
        try {
            const basePath = await this.ensureTranslationDir(pluginId);
            const filePath = this.getRulesFilePath(pluginId);
            
            const existingRules = await this.loadRuleFile(filePath);
            const mergedRules = await this.mergeRules(existingRules, rules);
            
            // 保存时移除内部属性
            const rulesToSave = mergedRules.map(({ _pluginId, _version, ...rule }) => rule);
            
            await this.plugin.app.vault.adapter.write(
                filePath,
                JSON.stringify(rulesToSave, null, 2)
            );
            
            this.plugin.logger.info('Rules saved successfully');
        } catch (error) {
            this.plugin.logger.error('Error saving rules:', error);
            new Notice('保存翻译规则失败');
        }
    }
}
