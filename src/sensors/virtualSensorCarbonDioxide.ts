import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Sensor } from './virtualSensor.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class CarbonDioxideSensor extends Sensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'CarbonDioxideSensor';

  static readonly CO2_LEVELS_NORMAL: number = 0;    // Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
  static readonly CO2_LEVELS_ABNORMAL: number = 1;  // Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory, platform.Service.CarbonDioxideSensor, platform.Characteristic.CarbonDioxideDetected, companionSensorName);
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case CarbonDioxideSensor.CO2_LEVELS_NORMAL: { sensorStateName = Sensor.NORMAL_INACTIVE; break; }
    case CarbonDioxideSensor.CO2_LEVELS_ABNORMAL: { sensorStateName = Sensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  protected getAccessoryTypeName(): string {
    return CarbonDioxideSensor.ACCESSORY_TYPE_NAME;
  }
}
