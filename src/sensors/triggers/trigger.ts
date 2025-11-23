import { AccessoryConfiguration } from '../../configuration/configurationAccessory.js';
import { BinarySensor } from '../binarySensor.js';
import { VirtualLogger } from '../../utils/virtualLogger.js';

/**
 * Abstract Trigger
 */
export abstract class Trigger {

  protected sensor: BinarySensor;
  readonly sensorConfig: AccessoryConfiguration;

  readonly name: string;

  protected log: VirtualLogger;

  constructor(
    sensor: BinarySensor,
    name: string,
  ) {
    this.sensor = sensor;
    this.sensorConfig = this.sensor.accessoryConfiguration;

    this.name = name;

    this.log = this.sensor.platform.log;
  }
}
