/* eslint-disable brace-style */
import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { MeasurementSensor } from './measurementSensor.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';

/**
 * HumiditySensor - Sensor implementation
 */
export class HumiditySensor extends MeasurementSensor<typeof Service.HumiditySensor> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'HumiditySensor';

  static readonly DEFAULT_RELATIVE_HUMIDITY = 50;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.HumiditySensor,
      HumiditySensor.ACCESSORY_TYPE_NAME,
    );
  }

  protected getMeasurementCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.CurrentRelativeHumidity;
  }

  protected getDefaultValue(): number {
    return HumiditySensor.DEFAULT_RELATIVE_HUMIDITY;
  }

  // Updatable Sensor interface

  updateMeasurementSensor(value: number, accessoryId: string):void {
    this.log.debug(`[${this.accessoryName}] Request update humidity sensor to ${value}%`);

    if (accessoryId !== this.accessoryId) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number') {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for Humidifier/Dehumidifier sensor`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }
    else {
      this.log.debug(`[${this.accessoryName}] Updating humidity sensor to ${value}%`);

      this.Value = value;
    }
  }
}
