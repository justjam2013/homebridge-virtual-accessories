import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Sensor } from './virtualSensor.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class MotionSensor extends Sensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'MotionSensor';

  static readonly MOTION_NOT_DETECTED: number = 0;  // No Charteristic exists for Motion sensor. Modeled on other sensors
  static readonly MOTION_DETECTED: number = 1;      // No Charteristic exists for Motion sensor. Modeled on other sensors

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory, platform.Service.MotionSensor, platform.Characteristic.MotionDetected, companionSensorName);
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case MotionSensor.MOTION_NOT_DETECTED: { sensorStateName = Sensor.NORMAL_INACTIVE; break; }
    case MotionSensor.MOTION_DETECTED: { sensorStateName = Sensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  protected getAccessoryTypeName(): string {
    return MotionSensor.ACCESSORY_TYPE_NAME;
  }
}
