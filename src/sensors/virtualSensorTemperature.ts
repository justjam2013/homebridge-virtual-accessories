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
export class TemperatureSensor extends MeasurementSensor {

  static readonly ACCESSORY_TYPE_NAME: string = 'TemperatureSensor';

  static readonly DEFAULT_TEMPERATURE_CELSIUS: number = 20;

  private platformSettingsURL: string = 'http://localhost:8581/api/auth/settings';

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

  // Updatable Sensor interface

  async updateMeasurementSensor(value: number, accessoryId: string): Promise<void> {
    if (this.states.SensorUnits === '') {
      this.states.SensorUnits = await this.getPlatformTemperatureUnits();
    }

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Request update temperature sensor to ${value}${this.getDegreeUnits()}`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number') {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Value ${value} is not valid for Heater/Cooler sensor`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }
    else {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Updating temperature sensor to ${value}${this.getDegreeUnits()}`);

      this.states.SensorValue = this.toCelsius(value);
    }
  }

  private getDegreeUnits(): string {
    let units: string;

    switch (this.states.SensorUnits) {
    case undefined: { units = 'º'; break; }
    case TemperatureUnit.Celsius: { units = 'ºC'; break; }
    case TemperatureUnit.Fahrenheit: { units = 'ºF'; break; }
    default: { units = 'º'; }
    }

    return units;
  }

  private async getPlatformTemperatureUnits(): Promise<string> {
    let sensorUnits: string = TemperatureUnit.Celsius;

    try {
      const response = await fetch(this.platformSettingsURL);

      if (response.ok) {
        const jsonString: string = await response.text();
        const hbSettings: SettingsResponse = JSON.parse(jsonString);

        const temperatureUnits: string | undefined =  (hbSettings.environment.temperatureUnits ?? hbSettings.temperatureUnits ?? 'c').toUpperCase();
        sensorUnits = (temperatureUnits === 'F') ? TemperatureUnit.Fahrenheit : TemperatureUnit.Celsius;
      }
      else {
        this.log.error(`[${this.accessoryName}] Error retrieving temperature units: ${JSON.stringify(response.status)}`);
      }
    }
    catch (error) {
      this.log.error(`[${this.accessoryName}] Error retrieving temperature units: ${JSON.stringify(error)}`);
      this.log.error(`[${this.accessoryName}] Defaulting to Celsius (ºC)`);
    }

    return sensorUnits;
  }

  private toCelsius(temperature: number): number {
    const temperatureCelsius = (this.states.SensorUnits === TemperatureUnit.Celsius) ? temperature : (temperature - 32) * 5/9;

    return Math.round(temperatureCelsius * 10) / 10;
  }
}

interface SettingsResponse {
  environment: EnvironmentResponse;
  temperatureUnits?: string;
}

interface EnvironmentResponse {
  temperatureUnits?: string;
}
