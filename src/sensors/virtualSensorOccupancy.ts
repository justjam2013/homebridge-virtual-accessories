import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';
import { OccupancyDetected } from './sensorCharacteristics.js';

/**
 * OccupancySensor - Sensor implementation
 */
export class OccupancySensor extends BinarySensor<typeof Service.OccupancySensor> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'OccupancySensor';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.OccupancySensor,
      OccupancySensor.ACCESSORY_TYPE_NAME,
    );
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.OccupancyDetected;
  }

  protected override getName(state: number): string {
    return OccupancyDetected.getName(state);
  }
}
