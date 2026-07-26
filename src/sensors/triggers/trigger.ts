import { Service } from 'homebridge';

import { AccessoryConfiguration } from '../../configuration/configurationAccessory.js';
import { BinarySensor } from '../binarySensor.js';
import { VirtualLogger } from '../../utils/virtualLogger.js';

/**
 * Abstract Trigger
 */
export abstract class Trigger {

  protected sensor: BinarySensor<typeof Service>;
  readonly sensorConfig: AccessoryConfiguration;

  readonly name: string;

  protected accessoryName: string;
  protected log: VirtualLogger;

  constructor(
    sensor: BinarySensor<typeof Service>,
    name: string,
  ) {
    this.sensor = sensor;
    this.sensorConfig = this.sensor.accessoryConfiguration;
    this.accessoryName = this.sensorConfig.accessoryName;

    this.name = name;

    this.log = this.sensor.platform.log;
  }
}
