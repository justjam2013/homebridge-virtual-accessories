/* eslint-disable brace-style */

import { Service } from 'homebridge';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../../errors.js';
import { BinarySensor } from '../binarySensor.js';
import { TriggerableSensor } from '../triggerableSensor.js';
import { Trigger } from './trigger.js';
import { TriggeredState } from '../sensorCharacteristics.js';

/**
 * WebhookTrigger - Trigger implementation
 */
export class WebhookTrigger extends Trigger implements TriggerableSensor {

  constructor(
    sensor: BinarySensor<typeof Service>,
    name: string,
  ) {
    super(sensor, name);
  }

  triggerSensor(
    value: boolean,
    accessoryId: string,
  ): void {
    this.log.debug(`[${this.accessoryName}] Request update triggered state to ${value}`);

    if (accessoryId !== this.sensorConfig.accessoryID) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'boolean') {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for a Security System triggered state`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }

    const sensorState: number = value ? TriggeredState.TRIGGERED : TriggeredState.NORMAL;
    this.sensor.triggerSensorState(sensorState, this);
  }
}
