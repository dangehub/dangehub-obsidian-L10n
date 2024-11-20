import { Plugin, Notice } from 'obsidian';
import { DOMObserver } from './DOMObserver';
import { TranslationService } from './TranslationService';
import { TranslationSettingTab } from './TranslationSettingTab';

export default class TranslationPlugin extends Plugin {
    public translationService: TranslationService;
    private domObserver: DOMObserver;
    private settingTab: TranslationSettingTab;

    async onload() {
        console.log('加载翻译插件');
        
        this.translationService = new TranslationService();
        await this.translationService.loadData();
        
        this.domObserver = new DOMObserver(this);
        
        this.settingTab = new TranslationSettingTab(this.app, this);
        this.addSettingTab(this.settingTab);
        
        this.addCommand({
            id: 'open-translation-settings',
            name: '打开翻译设置',
            callback: () => {
                this.app.setting.open();
                this.app.setting.openTabById(this.manifest.id);
            }
        });

        this.addCommand({
            id: 'scan-current-plugin-settings',
            name: '扫描当前插件设置文本',
            callback: () => {
                console.log('手动触发扫描');
                this.domObserver.checkAndObserve();
            }
        });

        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                console.log('布局变化事件触发');
                setTimeout(() => {
                    this.domObserver.checkAndObserve();
                }, 300);
            })
        );

        document.addEventListener('click', (e) => {
            const target = e.target as Element;
            if (target.closest('.vertical-tab-nav-item')) {
                console.log('检测到设置标签切换');
                setTimeout(() => {
                    this.domObserver.checkAndObserve();
                }, 100);
            }
        });
    }

    async onunload() {
        this.domObserver.disconnect();
    }
} 