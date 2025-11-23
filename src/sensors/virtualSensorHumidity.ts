import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { MeasurementSensor } from './measurementSensor.js';

/**
 * HumiditySensor - Sensor implementation
 */
export class HumiditySensor extends MeasurementSensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'HumiditySensor';

  static readonly DEFAULT_RELATIVE_HUMIDITY = 50;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getService(): WithUUID<typeof Service> {
    return this.platform.Service.HumiditySensor;
  }

  protected getMeasurementCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.CurrentRelativeHumidity;
  }

  protected getDefaultValue(): number {
    return HumiditySensor.DEFAULT_RELATIVE_HUMIDITY;
  }

  protected getAccessoryTypeName(): string {
    return HumiditySensor.ACCESSORY_TYPE_NAME;
  }
}
