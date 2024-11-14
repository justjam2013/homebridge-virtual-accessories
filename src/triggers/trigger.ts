import { Logging } from 'homebridge';

import { VirtualSensor } from '../sensors/virtualSensor.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';

/**
 * Abstract Trigger
 */
export abstract class Trigger {

  protected sensor: VirtualSensor;
  protected sensorConfig: AccessoryConfiguration;

  protected log: Logging;

  constructor(
    sensor: VirtualSensor,
  ) {
    this.sensor = sensor;
    this.sensorConfig = this.sensor.accessoryConfiguration;

    this.log = this.sensor.platform.log;
  }
}
