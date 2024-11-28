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

    async loadRuleFile(filePath: string): Promise<TranslationRule[]> {
        try {
            const content = await this.plugin.app.vault.adapter.read(filePath);
            return JSON.parse(content);
        } catch (error) {
            console.log('No existing rules file found:', filePath);
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

    async saveRules(rules: TranslationRule[], pluginId: string): Promise<void> {
        try {
            const basePath = await this.ensureTranslationDir(pluginId);
            const filePath = this.getRulesFilePath(pluginId);
            
            const existingRules = await this.loadRuleFile(filePath);
            const allRules = [...existingRules, ...rules];
            
            await this.plugin.app.vault.adapter.write(
                filePath,
                JSON.stringify(allRules, null, 2)
            );
            
            console.log('Rules saved successfully');
        } catch (error) {
            console.error('Error saving rules:', error);
            new Notice('保存翻译规则失败');
        }
    }
}
