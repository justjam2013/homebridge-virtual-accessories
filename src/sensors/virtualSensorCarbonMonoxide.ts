import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { VirtualSensor } from './virtualSensor.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class VirtualCarbonMonoxideSensor extends VirtualSensor {

  static readonly CO_LEVELS_NORMAL: number = 0;     // Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
  static readonly CO_LEVELS_ABNORMAL: number = 1;   // Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory, platform.Service.CarbonMonoxideSensor, platform.Characteristic.CarbonMonoxideDetected, companionSensorName);
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case VirtualCarbonMonoxideSensor.CO_LEVELS_NORMAL: { sensorStateName = VirtualSensor.NORMAL_CLOSED; break; }
    case VirtualCarbonMonoxideSensor.CO_LEVELS_ABNORMAL: { sensorStateName = VirtualSensor.TRIGGERED_OPEN; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}
