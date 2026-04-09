/* eslint-disable max-len */
/* eslint-disable brace-style */
/* eslint-disable curly */

import { Validatable } from '../validatable.js';
import { HeaterType, TemperatureUnit, ThresholdTemperature } from '../schema.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class HeaterCoolerConfiguration implements Validatable {
  type!: string;
  hasFan: boolean = false;
  temperatureDisplayUnits!: string;
  heatingThresholdCelsius!: number;
  coolingThresholdCelsius!: number;
  heatingThresholdFahrenheit!: number;
  coolingThresholdFahrenheit!: number;

  saunaHeatingThresholdCelsius!: number;
  saunaHeatingThresholdFahrenheit!: number;

  // HomeKit units: ºC
  heatingThreshold: number | undefined;
  coolingThreshold: number | undefined;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidType: boolean = (
      Utils.required(this.type) &&
      HeaterType.Types.includes(this.type)
    );

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

    if (!isValidType) this.errorFields.push(prefix + '.type');
    if (!isValidTemperatureDisplayUnits) this.errorFields.push(prefix + '.' + this.fieldNames.temperatureDisplayUnits);
    if (!isValidHeatingThreshold) this.errorFields.push(prefix + heatingThresholdField);
    if (!isValidCoolingThreshold) this.errorFields.push(prefix + coolingThresholdField);
    if (!isValidThresholdWindow) this.errorFields.push(prefix + heatingThresholdField + ' <= ' + prefix + coolingThresholdField);

    return [
      (isValidType &&
        isValidTemperatureDisplayUnits &&
        isValidHeatingThreshold &&
        isValidCoolingThreshold &&
        isValidThresholdWindow),
      this.errorFields,
    ];
  }

  private getHeatingThreshold(): number | undefined {
    let heatingThreshold: number | undefined = undefined;

    if (this.temperatureDisplayUnits === TemperatureUnit.Celsius) {
      heatingThreshold = (this.type === HeaterType.Sauna) ? this.saunaHeatingThresholdCelsius : this.heatingThresholdCelsius;
    }
    else if (this.temperatureDisplayUnits === TemperatureUnit.Fahrenheit) {
      heatingThreshold = (this.type === HeaterType.Sauna) ? this.saunaHeatingThresholdFahrenheit : this.heatingThresholdFahrenheit;
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

    // If it's a cooler only, then no heating threshold is valid
    if (this.type === HeaterType.Cooler) {
      isValidHeatingThreshold = this.heatingThreshold === undefined;
    }
    else {
      const HeatingThresholdMin: number = (this.type === HeaterType.Sauna) ? ThresholdTemperature.SaunaHeatingThresholdMin : ThresholdTemperature.HeatingThresholdMin;
      const HeatingThresholdMax: number = (this.type === HeaterType.Sauna) ? ThresholdTemperature.SaunaHeatingThresholdMax : ThresholdTemperature.HeatingThresholdMax;

      isValidHeatingThreshold =
        Utils.required(this.heatingThreshold) &&
        (this.heatingThreshold! >= HeatingThresholdMin &&
         this.heatingThreshold! <= HeatingThresholdMax);
    }

    return isValidHeatingThreshold;
  }

  private isValidCoolingThreshold(): boolean {
    let isValidCoolingThreshold = false;

    // If it's a heater only, then no cooling threshold is valid
    if (this.type === HeaterType.Heater || this.type === HeaterType.Sauna) {
      isValidCoolingThreshold = (this.coolingThreshold === undefined);
    }
    else {
      isValidCoolingThreshold =
        Utils.required(this.coolingThreshold) &&
        (this.coolingThreshold! >= ThresholdTemperature.CoolingThresholdMin &&
         this.coolingThreshold! <= ThresholdTemperature.CoolingThresholdMax);
    }

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
