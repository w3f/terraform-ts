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
const valuesName = 'test-tf-with-values';

let subject: Terraform;
let subjectFromFactory: Terraform;

const moduleLocation = path.join(__dirname, 'modules', 'test');
const moduleCfg: ModuleConfig = {
    moduleLocation
};
const docker = new Docker();

async function checkField(key: string, value: string, present = true): Promise<void> {
    let dockerCmd = '';
    const dockerHost = process.env['DOCKER_HOST'];
    if (dockerHost) {
        dockerCmd = `-H ${dockerHost}`;
    }
    const data = await docker.command(`${dockerCmd} ps`);
    let found = false;
    data['containerList'].forEach(container => {
        if (container[key] === value) {
            found = true;
        }
    });
    found.should.eq(present);
}

async function checkDestroy(subject: Terraform, name = 'test-tf'): Promise<void> {
    await subject.destroy(moduleCfg);

    await checkField('names', name, false);
}

async function checkInstall(subject: Terraform, name = 'test-tf'): Promise<void> {
    await subject.apply(moduleCfg);

    await checkField('names', name);
}

async function checkInstallWithValues(subject: Terraform, vars: object): Promise<void> {
    const moduleCfg: ModuleConfig = {
        moduleLocation,
        vars
    };

    await subject.apply(moduleCfg);

    await checkField('names', vars['name']);
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
                await checkDestroy(subject, valuesName);
            });

            it('should allow to pass values', async () => {
                await checkInstallWithValues(subject, { name: valuesName });
            });
        });
        describe('plan', () => {
            it('should return a json wih the plan output', async () => {
                const result = await subject.plan(moduleCfg);

                result.resource_changes.forEach((resourceChange) => {
                    resourceChange.change.actions[0].should.eq(TerraformChangeAction.Create);
                });
            });
            it('after apply, the plan should contain no-ops', async () => {
                await checkInstall(subject);

                const result = await subject.plan(moduleCfg);

                result.resource_changes.forEach((resourceChange) => {
                    resourceChange.change.actions[0].should.eq(TerraformChangeAction.NoOp);
                });
                await checkDestroy(subject, valuesName);
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
            await checkInstallWithValues(subjectFromFactory, { name: valuesName });
        });
    });

    describe('static factory, logger params', () => {
        before(async () => {
            subjectFromFactory = await Terraform.create(logger);

            subjectFromFactory.should.exist;
        });
    });
});
