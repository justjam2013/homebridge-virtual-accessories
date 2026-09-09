import type { PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { MeasurementSensor } from './measurementSensor.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { TemperatureUnit } from '../configuration/schema.js';

/**
 * TemperatureSensor - Sensor implementation
 */
export class TemperatureSensor extends MeasurementSensor {

  static readonly DEFAULT_TEMPERATURE_CELSIUS: number = 20;

  private platformSettingsURL: string = 'http://localhost:8581/api/auth/settings';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.TemperatureSensor, CharacteristicType.CurrentTemperature);
  }

  protected getDefaultValue(): number {
    return TemperatureSensor.DEFAULT_TEMPERATURE_CELSIUS;
  }

  private getDegreeUnits(): string {
    let units: string;

    switch (this.SensorUnits) {
    case undefined: { units = 'º'; break; }
    case TemperatureUnit.Celsius: { units = 'ºC'; break; }
    case TemperatureUnit.Fahrenheit: { units = 'ºF'; break; }
    default: { units = 'º'; }
    }

    return units;
  }

  private toCelsius(temperature: number): number {
    const temperatureCelsius = (this.SensorUnits === TemperatureUnit.Celsius) ? temperature : (temperature - 32) * 5/9;

    return Math.round(temperatureCelsius * 10) / 10;
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

  // Updatable Sensor interface

  updateMeasurementSensor(value: number, accessoryId: string): void {
    this.log.debug(`[${this.accessoryName}] Request update temperature sensor to ${value}${this.getDegreeUnits()}`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number') {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for Heater/Cooler sensor`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }
    else {
      this.log.debug(`[${this.accessoryName}] Updating temperature sensor to ${value}${this.getDegreeUnits()}`);

      const SensorValue: number = this.toCelsius(value);
      this.service.setCharacteristic(this.MeasurementCharacteristic, (SensorValue));
    }
  }
}

interface SettingsResponse {
  environment: EnvironmentResponse;
  temperatureUnits?: string;
}

interface EnvironmentResponse {
  temperatureUnits?: string;
}
