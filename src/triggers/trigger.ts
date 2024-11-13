import { VirtualSensor } from '../sensors/virtualSensor.js';

export abstract class Trigger {

  protected sensor: VirtualSensor;
  protected sensorConfig;

  constructor(
    sensor: VirtualSensor,
  ) {
    this.sensor = sensor;
    this.sensorConfig = this.sensor.accessory.context.deviceConfiguration;
  }
}
