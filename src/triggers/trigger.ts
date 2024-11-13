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
  ) {
    this.sensor = sensor;
    this.sensorConfig = this.sensor.accessory.context.deviceConfiguration;

    this.log = this.sensor.platform.log;

    this.config = this.deserializeConfig(this.sensorConfig);
  }

  /**
   * Protected methods
   */

  protected abstract getConfigClass(): TriggerConfig;

  /**
   * Private methods
   */

  private deserializeConfig(sensorConfig): TriggerConfig {
    const configClass = this.getConfigClass();
    const config: TriggerConfig = deserialize(sensorConfig, configClass);
    return config;
  }

}
