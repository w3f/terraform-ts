import { CmdManager } from '@w3f/cmd';
import { Logger } from '@w3f/logger';

export interface TerraformConfig {
    binaryPath: string;
    cmd: CmdManager;
    logger: Logger;
}

export interface ModuleConfig {
    moduleLocation: string;
    vars?: any;
    backendVars?: any;
}

export interface TerraformManager {
    apply(moduleCfg: ModuleConfig): Promise<void>;
    destroy(moduleCfg: ModuleConfig): Promise<void>;
    plan(moduleCfg: ModuleConfig): Promise<TerraformPlanRepresentation>;
}

export enum TerraformAction {
    Init = 'init',
    Apply = 'apply',
    Destroy = 'destroy',
    Plan = 'plan'
}

export enum TerraformChangeAction {
    NoOp = 'no-op',
    Create = 'create',
    Read = 'read',
    Update = 'update',
    Delete = 'delete'
}

export interface TerraformChangeRepresentation {
    actions: Array<TerraformChangeAction>;
}

export interface TerraformResourceChange {
    change: TerraformChangeRepresentation;
}

export interface TerraformPlanRepresentation {
    resource_changes: Array<TerraformResourceChange>;
}
