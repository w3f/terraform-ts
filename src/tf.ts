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

    async init(moduleCfg: ModuleConfig): Promise<void> {
        await this.commonActions(TerraformAction.Init, moduleCfg);
    }

    async apply(moduleCfg: ModuleConfig): Promise<void> {
        await this.commonActions(TerraformAction.Apply, moduleCfg);
    }

    async destroy(moduleCfg: ModuleConfig): Promise<void> {
        await this.commonActions(TerraformAction.Destroy, moduleCfg);
    }

    async plan(moduleCfg: ModuleConfig): Promise<object> {
        return this.commonActions(TerraformAction.Plan, moduleCfg);
    }

    private async commonActions(action: TerraformAction, moduleCfg: ModuleConfig): Promise<object> {
        let valuesFile = '';
        let planFile = '';
        let options: Array<string> = [action];
        switch (action) {
            case TerraformAction.Apply:
            case TerraformAction.Destroy:
                options.push('-auto-approve');
                break;
            case TerraformAction.Plan:
                const tmpobj = tmp.fileSync();
                planFile = tmpobj.name;

                options.push(`-out`, planFile);
                break;
        }

        if (moduleCfg.values) {
            const tmpobj = tmp.fileSync();
            valuesFile = tmpobj.name;

            fs.writeFileSync(valuesFile, ini.stringify(moduleCfg.values));

            let optionName = '-var-file';
            if (action === TerraformAction.Init) {
                optionName = '-backend-config';
            }
            options.push(optionName, valuesFile);
        }

        let result;
        try {
            result = await this.cmd.exec(`${this.binaryPath}`, ...options);
        } catch (e) {
            if (valuesFile) {
                fs.unlink(valuesFile);
            }
            throw (e);
        }
        if (action === TerraformAction.Plan) {
            const showOptions = [
                'show',
                '-json',
                planFile
            ];

            const output = await this.cmd.exec(`${this.binaryPath}`, ...showOptions);
            fs.unlink(planFile);
            return JSON.parse(output as string);
        }
        return result;
    }
}
