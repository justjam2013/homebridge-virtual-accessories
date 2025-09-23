 

import { Sensor } from '../sensor.js';
import { Trigger } from './trigger.js';
import { Utils } from '../../utils/utils.js';

/**
 * WebhookTrigger - Trigger implementation
 */
export class StartupTrigger extends Trigger {

  constructor(
    sensor: Sensor,
    name: string,
  ) {
    super(sensor, name);

    // Hardcode reset delay
    const resetDelayMillis: number = 3 * 1000;     // 3 second reset delay

    this.triggerSensor(resetDelayMillis);
  }

  async triggerSensor(
    resetDelayMillis: number,
  ) {
    await Utils.delay(3000);  // 3 second delay

    this.log.debug(`[${this.sensorConfig.accessoryName}] Triggering sensor`);
    this.sensor.triggerSensorState(Sensor.TRIGGERED, this);
    await Utils.delay(resetDelayMillis);
    this.log.debug(`[${this.sensorConfig.accessoryName}] Resetting sensor`);
    this.sensor.triggerSensorState(Sensor.NORMAL, this);
  }
}
