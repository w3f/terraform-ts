import { should } from 'chai';
import * as path from 'path';
import { Cmd, CmdOptions } from '@w3f/cmd';
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

async function checkField(key: string, value: string, present = true): Promise<void> {
    const cmd = new Cmd(logger);
    const options: CmdOptions = {
        verbose: true,
        shell: true
    };
    options.env = {};
    const dockerEnvVars = ['DOCKER_HOST', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH', 'DOCKER_MACHINE_NAME'];
    dockerEnvVars.forEach(dockerEnvVar => {
        if (process.env[dockerEnvVar]) {
            options.env[dockerEnvVar] = process.env[dockerEnvVar];
        }
    });
    cmd.setOptions(options);

    const result = await cmd.exec('docker', 'ps') as string;

    let found = false;
    result.split("\n").forEach(line => {
        if (line.includes(value)) {
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
        describe('output', () => {
            beforeEach(async () => {
                await checkInstall(subject);
            });
            afterEach(async () => {
                await checkDestroy(subject, valuesName);
            });

            it('should return an existing output', async () => {
                const result = await subject.output(moduleCfg, 'network_data');
                result[0]['network_name'].should.eq('bridge');
            });
            it('should throw on unexisting output', async () => {
                (async () => await subject.output(moduleCfg, 'unexisting')).should.throw;
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
