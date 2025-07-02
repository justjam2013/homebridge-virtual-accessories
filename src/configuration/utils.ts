import { AccessoryConfiguration } from './configurationAccessory.js';
import { WebhookServerConfiguration } from './configurationWebhookServer.js';
import { VirtualLogger } from '../utils/virtualLogger.js';

import { deserialize } from 'typeserializer';
import 'reflect-metadata';

/**
 * 
 */
export class ConfigurationUtils {

  private log: VirtualLogger;

  constructor(
    log: VirtualLogger,
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

  deserializeWebhookServerConfig(config: string | object): WebhookServerConfiguration | undefined {
    let sensorServerConfig: WebhookServerConfiguration | undefined;

    if (config !== undefined) {
      const json: string = (typeof config === 'object') ? JSON.stringify(config) : <string>config;
      try {
        sensorServerConfig = deserialize(json, WebhookServerConfiguration);
      } catch (error) {
        this.log.error(`[Configuration] SensorServer configuration error: ${JSON.stringify(error)}`);
      }
    } else {
      this.log.debug('[Configuration] No SensorServer configuration. Skipping');
    }

    return sensorServerConfig;
  }
}
