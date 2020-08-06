import { CmdManager } from '@w3f/cmd';
import { Logger } from '@w3f/logger';

export interface TerraformConfig {
    binaryPath: string;
    cmd: CmdManager;
    logger: Logger;
}

export interface ModuleConfig {
    moduleLocation: string;
    values?: any;
}

export interface HelmManager {
    apply(moduleCfg: ModuleConfig): Promise<void>;
    destroy(moduleCfg: ModuleConfig): Promise<void>;
    init(moduleCfg: ModuleConfig): Promise<void>;
    plan(moduleCfg: ModuleConfig): Promise<void>;
}