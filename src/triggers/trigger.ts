import { Logging } from 'homebridge';

import { Sensor } from '../sensors/virtualSensor.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';

/**
 * Abstract Trigger
 */
export abstract class Trigger {

  protected sensor: Sensor;
  readonly sensorConfig: AccessoryConfiguration;

  readonly name: string;

  protected log: Logging;

  constructor(
    sensor: Sensor,
    name: string,
  ) {
    this.sensor = sensor;
    this.sensorConfig = this.sensor.accessoryConfiguration;

    this.name = name;

    this.log = this.sensor.platform.log;
  }
}
