import { AccessoryConfiguration } from './configurationAccessory.js';

import { deserialize } from 'typeserializer';
import 'reflect-metadata';
import { VirtualAccessoriesLogger } from '../virtualLogger.js';

export class Configuration {

  private log: VirtualAccessoriesLogger;

  constructor(
    log: VirtualAccessoriesLogger,
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
