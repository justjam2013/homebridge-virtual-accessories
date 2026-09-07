import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';

/**
 * OccupancySensor - Sensor implementation
 */
export class OccupancySensor extends BinarySensor {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.OccupancySensor;

  static readonly EVENT_DETECTED_CHARACTERISTIC: WithUUID<{ new (): Characteristic; }> = CharacteristicType.OccupancyDetected;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return OccupancySensor.ACCESSORY_SERVICE_TYPE;
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return OccupancySensor.EVENT_DETECTED_CHARACTERISTIC;
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
