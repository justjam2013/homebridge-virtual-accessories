import { Logging } from 'homebridge';

import { VirtualSensor } from '../sensors/virtualSensor.js';

// import transformer from 'class-transformer';
import 'reflect-metadata';

/**
 * Abstract Trigger Configuration class
 */
export abstract class TriggerConfig {}

/**
 * Abstract Trigger class
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

    this.config = this.transformConfig(this.sensorConfig);
  }

  /**
   * Protected methods
   */

  protected abstract transformConfig(sensorConfig): TriggerConfig;
  // {
  //   const config: TriggerConfig = transformer.plainToInstance(this.getConfigClass(), sensorConfig.pingTrigger, { excludeExtraneousValues: true });
  //   return config;
  // }
}
