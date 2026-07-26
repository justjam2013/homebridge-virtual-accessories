import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';
import { LeakDetected } from './sensorCharacteristics.js';

/**
 * LeakSensor - Sensor implementation
 */
export class LeakSensor extends BinarySensor<typeof Service.LeakSensor> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'LeakSensor';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.LeakSensor,
      LeakSensor.ACCESSORY_TYPE_NAME,
    );
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.LeakDetected;
  }

  protected override getName(state: number): string {
    return LeakDetected.getName(state);
  }
}
