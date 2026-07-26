/* eslint-disable brace-style */
import type { Characteristic, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { MeasurementSensor } from './measurementSensor.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { TemperatureUnit } from '../configuration/schema.js';

/**
 * TemperatureSensor - Sensor implementation
 */
export class TemperatureSensor extends MeasurementSensor<typeof Service.TemperatureSensor> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'TemperatureSensor';

  static readonly DEFAULT_TEMPERATURE_CELSIUS = 20;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.TemperatureSensor,
      TemperatureSensor.ACCESSORY_TYPE_NAME,
    );
  }

  protected getMeasurementCharacteristic(): WithUUID<{ new (): Characteristic; }> {
    return this.platform.Characteristic.CurrentTemperature;
  }

  protected getDefaultValue(): number {
    return TemperatureSensor.DEFAULT_TEMPERATURE_CELSIUS;
  }

  private getDegreeUnits(): string {
    let units: string;

    switch (this.Units) {
    case undefined: { units = 'º'; break; }
    case TemperatureUnit.Celsius: { units = 'ºC'; break; }
    case TemperatureUnit.Fahrenheit: { units = 'ºF'; break; }
    default: { units = 'º'; }
    }

    return units;
  }

  private toCelsius(temperature: number): number {
    const temperatureCelsius = (this.Units === TemperatureUnit.Celsius) ? temperature : (temperature - 32) * 5/9;

    return Math.round(temperatureCelsius * 10) / 10;
  }

  // Updatable Sensor interface

  updateMeasurementSensor(value: number, accessoryId: string): void {
    this.log.debug(`[${this.accessoryName}] Request update humidity sensor to ${value}${this.getDegreeUnits()}`);

    if (accessoryId !== this.accessoryId) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number') {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for Heater/Cooler sensor`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }
    else {
      this.log.debug(`[${this.accessoryName}] Updating temperature sensor to ${value}${this.getDegreeUnits()}`);

      this.Value = this.toCelsius(value);
    }
  }
}
