import { Logging } from 'homebridge';

import { VirtualSensor } from '../sensors/virtualSensor.js';

import { deserialize } from 'typeserializer';
import 'reflect-metadata';

/**
 * Abstract Trigger Configuration
 */
export abstract class TriggerConfig {}

/**
 * Abstract Trigger
 */
export abstract class Trigger {

  protected sensor: VirtualSensor;
  protected sensorConfig;
  protected config: TriggerConfig;

  protected log: Logging;

  constructor(
    sensor: VirtualSensor,
    triggerConfigName: string,
    triggerConfigClass: TriggerConfig,
  ) {
    this.sensor = sensor;
    this.sensorConfig = this.sensor.accessory.context.deviceConfiguration;

    this.log = this.sensor.platform.log;

    this.config = this.deserializeConfig(this.sensorConfig[triggerConfigName], triggerConfigClass);
  }

  /**
   * Private methods
   */

  private deserializeConfig(triggerConfig, triggerConfigClass: TriggerConfig): TriggerConfig {
    // const configClass = this.getConfigClass();
    const json = JSON.stringify(triggerConfig);
    // const config: TriggerConfig = deserialize(json, configClass);
    const config: TriggerConfig = deserialize(json, triggerConfigClass);
    return config;
  }
}
