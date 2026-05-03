import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';
import { CarbonDioxideDetected } from './sensorCharacteristics.js';

/**
 * CarbonDioxideSensor - Sensor implementation
 */
export class CarbonDioxideSensor extends BinarySensor<typeof Service.CarbonDioxideSensor> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'CarbonDioxideSensor';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.CarbonDioxideSensor,
      CarbonDioxideSensor.ACCESSORY_TYPE_NAME,
    );
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.CarbonDioxideDetected;
  }

  protected override getName(state: number): string {
    return CarbonDioxideDetected.getName(state);
  }
}
