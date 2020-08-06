import fs from 'fs-extra';
import ini from 'ini';
import tmp from 'tmp';
import { CmdManager, Cmd } from '@w3f/cmd';
import { Components } from '@w3f/components';
import { Logger, createLogger } from '@w3f/logger';

import {
    TerraformManager,
    TerraformConfig,
    TerraformAction,
    ModuleConfig,
} from './types';

const tfVersion = '0.12.29';

export class Terraform implements TerraformManager {
    private readonly binaryPath: string;
    private readonly cmd: CmdManager;
    private readonly logger: Logger

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

        this.cmd.setOptions({ verbose: true });
    }

    async apply(moduleCfg: ModuleConfig): Promise<void> {
        await this.commonActions(TerraformAction.Init, moduleCfg);
        await this.commonActions(TerraformAction.Apply, moduleCfg);
    }

    async destroy(moduleCfg: ModuleConfig): Promise<void> {
        await this.commonActions(TerraformAction.Init, moduleCfg);
        await this.commonActions(TerraformAction.Destroy, moduleCfg);
    }

    async plan(moduleCfg: ModuleConfig): Promise<object> {
        await this.commonActions(TerraformAction.Init, moduleCfg);
        return this.commonActions(TerraformAction.Plan, moduleCfg);
    }

    private async commonActions(action: TerraformAction, moduleCfg: ModuleConfig): Promise<object> {
        let varsFile = '';
        let planFile = '';
        let options: Array<string> = [action];
        switch (action) {
            case TerraformAction.Apply:
            case TerraformAction.Destroy:
                options.push('-auto-approve');
                if (moduleCfg.vars) {
                    varsFile = this.writeIniFile(moduleCfg.vars);

                    options.push('-var-file', varsFile);
                }
                break;
            case TerraformAction.Plan:
                const tmpobj = tmp.fileSync();
                planFile = tmpobj.name;

                options.push(`-out`, planFile);
                if (moduleCfg.vars) {
                    varsFile = this.writeIniFile(moduleCfg.vars);

                    options.push('-var-file', varsFile);
                }
                break;
            case TerraformAction.Init:
                if (moduleCfg.backendVars) {
                    varsFile = this.writeIniFile(moduleCfg.backendVars);

                    options.push('-backend-config', varsFile);
                }
                break;
        }

        try {
            await this.cmd.exec(`${this.binaryPath}`, ...options);
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

            let output = '';
            try {
                output = await this.cmd.exec(`${this.binaryPath}`, ...showOptions) as string;
            } finally {
                fs.unlink(planFile);
            }
            return JSON.parse(output);
        }
    }

    private writeIniFile(values: any): string {
        const tmpobj = tmp.fileSync();
        const file = tmpobj.name;

        fs.writeFileSync(file, ini.stringify(values));

        return file;
    }
}
