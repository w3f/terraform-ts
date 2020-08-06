import { should } from 'chai';
import { Docker } from 'docker-cli-js';
import * as path from 'path';
import { Cmd } from '@w3f/cmd';
import { Components } from '@w3f/components';
import { createLogger } from '@w3f/logger';

import { Terraform } from '../src/index';
import {
    ModuleConfig,
    TerraformChangeAction
} from '../src/types';

should();

const logger = createLogger();

const cmCfg = {
    'terraform': 'https://w3f.github.io/components-ts/downloads/linux-amd64/terraform/0.12.29/terraform.tar.gz'
};
const cm = new Components('tf-test', cmCfg, logger);
const cmd = new Cmd(logger);

let subject: Terraform;
let subjectFromFactory: Terraform;

const moduleLocation = path.join(__dirname, 'modules', 'test');
const moduleCfg: ModuleConfig = {
    moduleLocation
};
const docker = new Docker();

async function checkName(name: string, present = true): Promise<void> {
    const data = await docker.command('ps');
    let found = false;
    data['containerList'].forEach(container => {
        if (container['names'] === name) {
            found = true;
        }
    });
    found.should.eq(present);
}

async function checkDestroy(subject: Terraform, name = 'test-tf'): Promise<void> {
    await subject.destroy(moduleCfg);

    await checkName(name, false);
}

async function checkInstall(subject: Terraform, name = 'test-tf'): Promise<void> {
    await subject.apply(moduleCfg);

    await checkName(name);
}

async function checkInstallWithValues(subject: Terraform, name: string): Promise<void> {
    const vars = { name };

    const moduleCfg: ModuleConfig = {
        moduleLocation,
        vars
    };

    await subject.apply(moduleCfg);

    await checkName(name);
}

describe('Terraform', () => {
    before(async () => {
        const binaryPath = await cm.path('terraform');

        const tfCfg = {
            binaryPath,
            cmd,
            logger
        }
        subject = new Terraform(tfCfg);
    });

    describe('constructor', () => {
        describe('apply/destroy no values', () => {
            afterEach(async () => {
                await checkDestroy(subject);
            });

            it('should apply a module', async () => {
                await checkInstall(subject);
            });
        });
        describe('apply/destroy values', () => {
            afterEach(async () => {
                await checkDestroy(subject, 'test-tf-with-values');
            });

            it('should allow to pass values', async () => {
                await checkInstallWithValues(subject, 'test-tf-with-values');
            });
        });
        describe('plan', () => {
            it('should return a json wih the plan output', async () => {
                const result = await subject.plan(moduleCfg);

                result.resource_changes.forEach((resourceChange) => {
                    resourceChange.change.actions[0].should.eq(TerraformChangeAction.Create);
                })
            });
        });
    });

    describe('static factory', () => {
        before(async () => {
            subjectFromFactory = await Terraform.createBare();

            subjectFromFactory.should.exist;
        });
        afterEach(async () => {
            await subjectFromFactory.destroy(moduleCfg);
        });

        it('should allow to apply modules', async () => {
            await checkInstall(subjectFromFactory);
        });
        it('should allow to pass values', async () => {
            await checkInstallWithValues(subjectFromFactory, 'test-tf-with-values');
        });
    });

    describe('static factory, logger params', () => {
        before(async () => {
            subjectFromFactory = await Terraform.create(logger);

            subjectFromFactory.should.exist;
        });
    });
});
