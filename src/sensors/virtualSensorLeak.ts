import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Sensor } from './virtualSensor.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class LeakSensor extends Sensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'LeakSensor';

  static readonly LEAK_NOT_DETECTED: number = 0;  // Characteristic.LeakDetected.LEAK_NOT_DETECTED;
  static readonly LEAK_DETECTED: number = 1;      // Characteristic.LeakDetected.LEAK_DETECTED;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory, platform.Service.LeakSensor, platform.Characteristic.LeakDetected, companionSensorName);
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case LeakSensor.LEAK_NOT_DETECTED: { sensorStateName = Sensor.NORMAL_INACTIVE; break; }
    case LeakSensor.LEAK_DETECTED: { sensorStateName = Sensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  protected getAccessoryTypeName(): string {
    return LeakSensor.ACCESSORY_TYPE_NAME;
  }
}
