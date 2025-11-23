import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { MeasurementSensor } from './measurementSensor.js';

/**
 * TemperatureSensor - Sensor implementation
 */
export class TemperatureSensor extends MeasurementSensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'TemperatureSensor';

  static readonly DEFAULT_TEMPERATURE_CELSIUS = 20;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);
  }

  protected getService(): WithUUID<typeof Service> {
    return this.platform.Service.TemperatureSensor;
  }

  protected getMeasurementCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.CurrentTemperature;
  }

  protected getDefaultValue(): number {
    return TemperatureSensor.DEFAULT_TEMPERATURE_CELSIUS;
  }

  protected getAccessoryTypeName(): string {
    return TemperatureSensor.ACCESSORY_TYPE_NAME;
  }
}
