import TranslationPlugin from '../../main';

export class LoggerService {
    private isDebugMode: boolean = false;

    constructor(private plugin: TranslationPlugin) {}

    setDebugMode(enabled: boolean) {
        this.isDebugMode = enabled;
    }

    info(message: string, ...args: any[]) {
        if (this.isDebugMode) {
            console.log(`[L10n Info] ${message}`, ...args);
        }
    }

    warn(message: string, ...args: any[]) {
        if (this.isDebugMode) {
            console.warn(`[L10n Warning] ${message}`, ...args);
        }
    }

    error(message: string, ...args: any[]) {
        console.error(`[L10n Error] ${message}`, ...args);
    }
}
