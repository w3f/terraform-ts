import fs from 'fs-extra';
import tmp from 'tmp';
import { CmdManager } from '@w3f/cmd';
import { Logger } from '@w3f/logger';
import { TemplateManager } from '@w3f/template';


//export interface Terraform {
//  apply(config: string)
//}

export class Terraform {
  private readonly binaryPath: string;
  private readonly cmd: CmdManager;
  private readonly logger: Logger;
  private readonly tpl: TemplateManager;
  bucket: string

  constructor(){
    this.binaryPath = "";
    this.cmd = CmdManager;
    this.logger = Logger;
    this.bucket = "";
  }

  async apply(){

  }

  async plan(){

  }

  async destroy(){

  }

}
