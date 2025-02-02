import { Logging } from 'homebridge';

import { VirtualSensor } from '../sensors/virtualSensor.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';

/**
 * Abstract Trigger
 */
export abstract class Trigger {

  protected sensor: VirtualSensor;
  readonly sensorConfig: AccessoryConfiguration;

  readonly name: string;

  protected log: Logging;

  constructor(
    sensor: VirtualSensor,
    name: string,
  ) {
    this.sensor = sensor;
    this.sensorConfig = this.sensor.accessoryConfiguration;

    this.name = name;

    this.log = this.sensor.platform.log;
  }
}
