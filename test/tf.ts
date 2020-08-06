import { should } from 'chai';
import * as path from 'path';
import { Cmd } from '@w3f/cmd';
import { Components } from '@w3f/components';
import { createLogger } from '@w3f/logger';

import { Terraform } from '../src/index';
import { ModuleConfig } from '../src/types';

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


async function checkInstall(subject: Terraform): Promise<void> {
    await subject.apply(moduleCfg);

    // check install
}

async function checkInstallWithValues(subject: Terraform): Promise<void> {
    const replicas = 5;

    const vars = { replicas };

    const moduleCfg: ModuleConfig = {
        moduleLocation,
        vars
    };

    await subject.apply(moduleCfg);

    // check install
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
        describe('apply/destroy', () => {
            afterEach(async () => {
                await subject.destroy(moduleCfg);
            });

            it('should apply a module', async () => {
                await checkInstall(subject);
            });

            it('should allow to pass values', async () => {
                await checkInstallWithValues(subject);
            });
        });
        describe('plan', () => {
            it('should return a json wih the plan output', async () => {
                const result = await subject.plan(moduleCfg);

                result.metadata.labels.release.should.eq(name);
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
            await checkInstallWithValues(subjectFromFactory);
        });
    });

    describe('static factory, logger params', () => {
        before(async () => {
            subjectFromFactory = await Terraform.create(logger);

            subjectFromFactory.should.exist;
        });
    });
});
