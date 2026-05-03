import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';
import { CarbonMonoxideDetected } from './sensorCharacteristics.js';

/**
 * CarbonMonoxideSensor - Sensor implementation
 */
export class CarbonMonoxideSensor extends BinarySensor<typeof Service.CarbonMonoxideSensor> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'CarbonMonoxideSensor';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.CarbonMonoxideSensor,
      CarbonMonoxideSensor.ACCESSORY_TYPE_NAME,
    );
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.CarbonMonoxideDetected;
  }

  protected override getName(state: number): string {
    return CarbonMonoxideDetected.getName(state);
  }
}
