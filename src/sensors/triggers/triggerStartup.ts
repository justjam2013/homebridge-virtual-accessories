import { Service } from 'homebridge';

import { BinarySensor } from '../binarySensor.js';
import { Trigger } from './trigger.js';
import { Utils } from '../../utils/utils.js';
import { TriggeredState } from '../sensorCharacteristics.js';

/**
 * StartupTrigger - Trigger implementation
 */
export class StartupTrigger extends Trigger {

  constructor(
    sensor: BinarySensor<typeof Service>,
    name: string,
  ) {
    super(sensor, name);

    // Hardcode reset delay
    const resetDelayMillis: number = 3 * 1000;     // 3 second reset delay

    this.start(resetDelayMillis);
  }

  async start(
    resetDelayMillis: number,
  ) {
    await Utils.delay(
      3000,
      this.accessoryName,
      this.log,
    );  // 3 second delay

    this.log.debug(`[${this.accessoryName}] Triggering sensor`);
    this.sensor.triggerSensorState(TriggeredState.TRIGGERED, this);
    await Utils.delay(
      resetDelayMillis,
      this.accessoryName,
      this.log,
    );
    this.log.debug(`[${this.accessoryName}] Resetting sensor`);
    this.sensor.triggerSensorState(TriggeredState.NORMAL, this);
  }
}
