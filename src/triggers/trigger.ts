import { PlatformConfiguration } from '../configuration/configurationPlatform.js';
import { Sensor } from '../sensors/virtualSensor.js';
import { VirtualAccessoriesLogger } from '../virtualLogger.js';

/**
 * Abstract Trigger
 */
export abstract class Trigger {

  protected sensor: Sensor;
  readonly sensorConfig: PlatformConfiguration;

  readonly name: string;

  protected log: VirtualAccessoriesLogger;

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
