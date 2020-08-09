import fs from 'fs-extra';
import tmp from 'tmp';
import { CmdManager, Cmd } from '@w3f/cmd';
import { Components } from '@w3f/components';
import { Logger, createLogger } from '@w3f/logger';

import {
    TerraformManager,
    TerraformConfig,
    TerraformAction,
    ModuleConfig,
    ModuleMap,
    TerraformPlanRepresentation
} from './types';


const tfVersion = '0.12.29';

export class Terraform implements TerraformManager {
    private readonly binaryPath: string;
    private readonly cmd: CmdManager;
    private readonly logger: Logger
    private readonly moduleMap: ModuleMap = {};

    static async createBare(): Promise<Terraform> {
        const logger = createLogger();

        return this.create(logger);
    }

    static async create(logger: Logger): Promise<Terraform> {
        const cmCfg = {
            'terraform': `https://w3f.github.io/components-ts/downloads/linux-amd64/terraform/${tfVersion}/terraform.tar.gz`
        };
        const cm = new Components('terraform-bin', cmCfg, logger);
        const binaryPath = await cm.path('terraform');

        const cmd = new Cmd(logger);
        const cfg = {
            binaryPath,
            cmd,
            logger
        };

        return new Terraform(cfg);
    }

    constructor(tfCfg: TerraformConfig) {
        this.binaryPath = tfCfg.binaryPath;
        this.cmd = tfCfg.cmd;
        this.logger = tfCfg.logger;
    }

    async initialize(moduleCfg: ModuleConfig): Promise<void> {
        if (!this.moduleMap[moduleCfg.moduleLocation]) {
            const dir = tmp.dirSync();
            this.moduleMap[moduleCfg.moduleLocation] = dir.name;
        }
        await this.commonActions(TerraformAction.Init, moduleCfg);
    }

    async apply(moduleCfg: ModuleConfig): Promise<void> {
        await this.initialize(moduleCfg);

        await this.commonActions(TerraformAction.Apply, moduleCfg);
    }

    async destroy(moduleCfg: ModuleConfig): Promise<void> {
        await this.initialize(moduleCfg);

        await this.commonActions(TerraformAction.Destroy, moduleCfg);
    }

    async plan(moduleCfg: ModuleConfig): Promise<TerraformPlanRepresentation> {
        await this.initialize(moduleCfg);

        return this.commonActions(TerraformAction.Plan, moduleCfg);
    }

    async output(moduleCfg: ModuleConfig, name: string): Promise<any> {
        await this.initialize(moduleCfg);

        const result = await this.commonActions(TerraformAction.Output, moduleCfg) as string;
        const output = JSON.parse(result);
        if (!(name in output)) {
            throw new Error(`${name} output not found in terraform state`);
        }
        return output[name]['value'];
    }

    private async commonActions(action: TerraformAction, moduleCfg: ModuleConfig): Promise<any> {
        let varsFile = '';
        let planFile = '';

        this.cmd.setOptions({
            verbose: true,
            cwd: this.moduleMap[moduleCfg.moduleLocation]
        });

        const options: Array<string> = [action];
        switch (action) {
            case TerraformAction.Apply:
            case TerraformAction.Destroy:
                options.push('-auto-approve');
                if (moduleCfg.vars) {
                    varsFile = this.writeIniFile(moduleCfg.vars);

                    options.push('-var-file', varsFile);
                }
                break;
            case TerraformAction.Plan: {
                const tmpobj = tmp.fileSync();
                planFile = tmpobj.name;

                options.push(`-out`, planFile);
                if (moduleCfg.vars) {
                    varsFile = this.writeIniFile(moduleCfg.vars);

                    options.push('-var-file', varsFile);
                }
                break;
            }
            case TerraformAction.Init:
                if (moduleCfg.backendVars) {
                    varsFile = this.writeIniFile(moduleCfg.backendVars);

                    options.push('-backend-config', varsFile);
                }
                break;
            case TerraformAction.Output: {
                options.push('-json');
            }
        }

        if (action !== TerraformAction.Output) {
            options.push(moduleCfg.moduleLocation);
        }

        let output = '';
        try {
            output = await this.cmd.exec(`${this.binaryPath}`, ...options) as string;
        } finally {
            if (varsFile) {
                fs.unlink(varsFile);
            }
        }

        if (action === TerraformAction.Plan) {
            const showOptions = [
                'show',
                '-json',
                planFile
            ];

            try {
                output = await this.cmd.exec(`${this.binaryPath}`, ...showOptions) as string;
            } finally {
                fs.unlink(planFile);
            }
            return JSON.parse(output) as TerraformPlanRepresentation;
        }
        return output;
    }

    private writeIniFile(values: object): string {
        const tmpobj = tmp.fileSync();
        const target = tmpobj.name;

        const tfvarsContent = [];
        for (const [key, value] of Object.entries(values)) {
            tfvarsContent.push(`${key} = "${value}"`);
        }
        fs.writeFileSync(target, tfvarsContent.join("\n"));

        return target;
    }
}
