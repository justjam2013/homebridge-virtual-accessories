import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';
import { ContactSensorState } from './sensorCharacteristics.js';

/**
 * ContactSensor - Sensor implementation
 */
export class ContactSensor extends BinarySensor<typeof Service.ContactSensor> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'ContactSensor';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.ContactSensor,
      ContactSensor.ACCESSORY_TYPE_NAME,
    );
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.ContactSensorState;
  }

  protected override getName(state: number): string {
    return ContactSensorState.getName(state);
  }
}
