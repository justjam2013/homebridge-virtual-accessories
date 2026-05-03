import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { BinarySensor } from './binarySensor.js';
import { MotionDetected } from './sensorCharacteristics.js';

/**
 * MotionSensor - Sensor implementation
 */
export class MotionSensor extends BinarySensor<typeof Service.MotionSensor> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'MotionSensor';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.MotionSensor,
      MotionSensor.ACCESSORY_TYPE_NAME,
    );
  }

  protected getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.MotionDetected;
  }

  protected override getName(state: number): string {
    return MotionDetected.getName(state);
  }
}
