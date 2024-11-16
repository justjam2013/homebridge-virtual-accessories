import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { VirtualSensor } from './virtualSensor.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class VirtualLeakSensor extends VirtualSensor {

  static readonly LEAK_NOT_DETECTED: number = 0;  // Characteristic.LeakDetected.LEAK_NOT_DETECTED;
  static readonly LEAK_DETECTED: number = 1;      // Characteristic.LeakDetected.LEAK_DETECTED;

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory, platform.Service.LeakSensor, platform.Characteristic.LeakDetected, companionSensorName);
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case VirtualLeakSensor.LEAK_NOT_DETECTED: { sensorStateName = VirtualSensor.NORMAL_CLOSED; break; }
    case VirtualLeakSensor.LEAK_DETECTED: { sensorStateName = VirtualSensor.TRIGGERED_OPEN; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}
