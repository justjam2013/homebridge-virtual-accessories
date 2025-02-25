import type { PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Sensor } from './virtualSensor.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class OccupancySensor extends Sensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'OccupancySensor';

  static readonly OCCUPANCY_NOT_DETECTED: number = 0;   // Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
  static readonly OCCUPANCY_DETECTED: number = 1;       // Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory, platform.Service.OccupancySensor, platform.Characteristic.OccupancyDetected, companionSensorName);
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case OccupancySensor.OCCUPANCY_NOT_DETECTED: { sensorStateName = Sensor.NORMAL_INACTIVE; break; }
    case OccupancySensor.OCCUPANCY_DETECTED: { sensorStateName = Sensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  protected getAccessoryTypeName(): string {
    return OccupancySensor.ACCESSORY_TYPE_NAME;
  }
}
