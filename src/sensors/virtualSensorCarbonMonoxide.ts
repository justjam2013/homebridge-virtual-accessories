import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Sensor } from './virtualSensor.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class CarbonMonoxideSensor extends Sensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'CarbonMonoxideSensor';

  static readonly CO_LEVELS_NORMAL: number = 0;     // Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
  static readonly CO_LEVELS_ABNORMAL: number = 1;   // Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory, platform.Service.CarbonMonoxideSensor, platform.Characteristic.CarbonMonoxideDetected, companionSensorName);
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case CarbonMonoxideSensor.CO_LEVELS_NORMAL: { sensorStateName = Sensor.NORMAL_INACTIVE; break; }
    case CarbonMonoxideSensor.CO_LEVELS_ABNORMAL: { sensorStateName = Sensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  protected getAccessoryTypeName(): string {
    return CarbonMonoxideSensor.ACCESSORY_TYPE_NAME;
  }
}
