import { AccessoryConfiguration } from './configurationAccessory.js';
import { SensorServerConfiguration } from './configurationSensorServer.js';
import { VirtualAccessoriesLogger } from '../virtualLogger.js';

import { deserialize } from 'typeserializer';
import 'reflect-metadata';

export class Configuration {

  private log: VirtualAccessoriesLogger;

  constructor(
    log: VirtualAccessoriesLogger,
  ) {
    this.log = log;
  }

  deserializeAccessoryConfig(config: string | object): AccessoryConfiguration | undefined {
    let accessoryConfig: AccessoryConfiguration | undefined;

    const json: string = (typeof config === 'object') ? JSON.stringify(config) : <string>config;
    try {
      accessoryConfig = deserialize(json, AccessoryConfiguration);
    } catch (error) {
      this.log.error(`[Configuration] Error: ${JSON.stringify(error)}`);
    }

    return accessoryConfig;
  }

  deserializeSensorServerConfig(config: string | object): SensorServerConfiguration | undefined {
    let sensorServerConfig: SensorServerConfiguration | undefined;

    if (config !== undefined) {
      const json: string = (typeof config === 'object') ? JSON.stringify(config) : <string>config;
      try {
        sensorServerConfig = deserialize(json, SensorServerConfiguration);
      } catch (error) {
        this.log.error(`[Configuration] SensorServer configuration error: ${JSON.stringify(error)}`);
      }
    } else {
      this.log.debug('[Configuration] No SensorServer configuration. Skipping');
    }

    return sensorServerConfig;
  }
}
