import { PlatformConfiguration } from './configurationPlatform.js';
import { SensorServerConfiguration } from './configurationSensorServer.js';
import { VirtualAccessoriesLogger } from '../virtualLogger.js';

import { deserialize } from 'typeserializer';
import 'reflect-metadata';

/**
 * 
 */
export class Configuration {

  private log: VirtualAccessoriesLogger;

  constructor(
    log: VirtualAccessoriesLogger,
  ) {
    this.log = log;
  }

  deserializeAccessoryConfig(config: string | object): PlatformConfiguration | undefined {
    let accessoryConfig: PlatformConfiguration | undefined;

    const json: string = (typeof config === 'object') ? JSON.stringify(config) : <string>config;
    try {
      accessoryConfig = deserialize(json, PlatformConfiguration);
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
