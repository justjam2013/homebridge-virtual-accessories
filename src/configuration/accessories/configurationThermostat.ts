 
/* eslint-disable curly */

import { Validatable } from '../validatable.js';
import { TemperatureUnit, ThresholdTemperature } from '../schema.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class ThermostatConfiguration implements Validatable {
  temperatureDisplayUnits!: string;
  heatingThresholdCelsius!: number;
  coolingThresholdCelsius!: number;
  heatingThresholdFahrenheit!: number;
  coolingThresholdFahrenheit!: number;

  // HomeKit units: ºC
  heatingThreshold: number | undefined;
  coolingThreshold: number | undefined;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidTemperatureDisplayUnits: boolean = (
      Utils.required(this.temperatureDisplayUnits) &&
      TemperatureUnit.Units.includes(this.temperatureDisplayUnits)
    );

    this.heatingThreshold = this.getHeatingThreshold();
    this.coolingThreshold = this.getCoolingThreshold();

    const isValidHeatingThreshold: boolean = (
      this.isValidHeatingThreshold()
    );

    const isValidCoolingThreshold: boolean = (
      this.isValidCoolingThreshold()
    );

    const isValidThresholdWindow: boolean = (
      (this.heatingThreshold !== undefined) && (this.coolingThreshold !== undefined) ?
        (this.coolingThreshold > this.heatingThreshold) :
        true
    );

    // Store fields failing validation

    const heatingThresholdField = '.heatingThreshold' + this.capitalize(this.temperatureDisplayUnits);
    const coolingThresholdField = '.coolingThreshold' + this.capitalize(this.temperatureDisplayUnits);

    if (!isValidTemperatureDisplayUnits) this.errorFields.push(prefix + '.' + this.fieldNames.temperatureDisplayUnits);
    if (!isValidHeatingThreshold) this.errorFields.push(prefix + heatingThresholdField);
    if (!isValidCoolingThreshold) this.errorFields.push(prefix + coolingThresholdField);
    if (!isValidThresholdWindow) this.errorFields.push(prefix + heatingThresholdField + ' <= ' + prefix + coolingThresholdField);

    return [
      (isValidTemperatureDisplayUnits &&
        isValidHeatingThreshold &&
        isValidCoolingThreshold &&
        isValidThresholdWindow),
      this.errorFields,
    ];
  }

  private getHeatingThreshold(): number | undefined {
    let heatingThreshold: number | undefined = undefined;

    if (this.temperatureDisplayUnits === TemperatureUnit.Celsius) {
      heatingThreshold = this.heatingThresholdCelsius;
    }
    else if (this.temperatureDisplayUnits === TemperatureUnit.Fahrenheit) {
      heatingThreshold = this.heatingThresholdFahrenheit;
    }

    return this.toCelsius(heatingThreshold);
  }

  private getCoolingThreshold(): number | undefined {
    let coolingThreshold: number | undefined = undefined;

    if (this.temperatureDisplayUnits === TemperatureUnit.Celsius) {
      coolingThreshold = this.coolingThresholdCelsius;
    }
    else if (this.temperatureDisplayUnits === TemperatureUnit.Fahrenheit) {
      coolingThreshold = this.coolingThresholdFahrenheit;
    }

    return this.toCelsius(coolingThreshold);
  }

  private isValidHeatingThreshold(): boolean {
    let isValidHeatingThreshold = false;

    isValidHeatingThreshold =
      Utils.required(this.heatingThreshold) &&
        (this.heatingThreshold! >= ThresholdTemperature.HeatingThresholdMin &&
         this.heatingThreshold! <= ThresholdTemperature.HeatingThresholdMax);

    return isValidHeatingThreshold;
  }

  private isValidCoolingThreshold(): boolean {
    let isValidCoolingThreshold = false;

    isValidCoolingThreshold =
      Utils.required(this.coolingThreshold) &&
        (this.coolingThreshold! >= ThresholdTemperature.CoolingThresholdMin &&
         this.coolingThreshold! <= ThresholdTemperature.CoolingThresholdMax);

    return isValidCoolingThreshold;
  }

  private toCelsius(
    temperature: number | undefined,
  ): number | undefined {
    if (temperature === undefined) {
      return undefined;
    }

    const temperatureCelsius = (this.temperatureDisplayUnits === TemperatureUnit.Celsius) ? temperature : (temperature - 32) * 5/9;

    return Math.round(temperatureCelsius * 10) / 10;
  }

  private capitalize(value: string) {
    return String(value).charAt(0).toUpperCase() + String(value).slice(1);
  }
}
