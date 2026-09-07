import type { PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';

/**
 * OccupancySensor - Sensor implementation
 */
export class OccupancySensor extends BinarySensor {

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.OccupancySensor, CharacteristicType.OccupancyDetected);
  }

  protected getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case OccupancySensor.OCCUPANCY_NOT_DETECTED: { sensorStateName = BinarySensor.NORMAL_INACTIVE; break; }
    case OccupancySensor.OCCUPANCY_DETECTED: { sensorStateName = BinarySensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly OCCUPANCY_NOT_DETECTED: number =      CharacteristicType.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
  static readonly OCCUPANCY_DETECTED: number =          CharacteristicType.OccupancyDetected.OCCUPANCY_DETECTED;
}
