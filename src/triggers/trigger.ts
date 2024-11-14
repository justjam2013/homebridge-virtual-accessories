import { Logging } from 'homebridge';

import { VirtualSensor } from '../sensors/virtualSensor.js';

/**
 * Abstract Trigger
 */
export abstract class Trigger {

  protected sensor: VirtualSensor;
  protected sensorConfig;

  protected log: Logging;

  constructor(
    sensor: VirtualSensor,
  ) {
    this.sensor = sensor;
    this.sensorConfig = this.sensor.accessory.context.deviceConfiguration;

    this.log = this.sensor.platform.log;
  }
}
