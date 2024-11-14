import { Logging } from 'homebridge';

import { AccessoryConfiguration } from './configurationAccessory.js';

import { deserialize } from 'typeserializer';
import 'reflect-metadata';

export class Configuration {

  private log: Logging;

  constructor(
    log: Logging,
  ) {
    this.log = log;
  }

  deserializeConfig(config: string | object): AccessoryConfiguration | undefined {
    let accessoryConfig: AccessoryConfiguration | undefined;

    const json: string = (typeof config === 'object') ? JSON.stringify(config) : <string>config;
    try {
      accessoryConfig = deserialize(json, AccessoryConfiguration);
    } catch (error) {
      this.log.error(`[Configuration] Error: ${JSON.stringify(error)}`);
    }

    return accessoryConfig;
  }
}
