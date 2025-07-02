/* eslint-disable brace-style */
/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { HeaterType, TemperatureUnit, ThresholdTemperature } from '../configurationSchema.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class HeaterCoolerConfiguration extends AccessoryConfiguration {
  type!: string;
  manualOperation: boolean = false;
  temperatureDisplayUnits!: string;
  heatingThresholdCelsius!: number;
  coolingThresholdCelsius!: number;
  heatingThresholdFahrenheit!: number;
  coolingThresholdFahrenheit!: number;

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

    const heatingThreshold: number | undefined = this.getHeatingThreshold();
    const coolingThreshold: number | undefined = this.getCoolingThreshold();

    const isValidHeatingThreshold: boolean = (
      (this.manualOperation === false) ?
        this.isValidHeatingThreshold() :
        true
    );

    const isValidCoolingThreshold: boolean = (
      (this.manualOperation === false) ?
        this.isValidCoolingThreshold() :
        true
    );

    const isValidThresholdWindow: boolean = (
      (this.manualOperation === false) && (heatingThreshold !== undefined) && (coolingThreshold !== undefined) ?
        (coolingThreshold > heatingThreshold) :
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

  getHeatingThreshold(): number | undefined {
    let heatingThreshold: number | undefined = undefined;

    if (this.temperatureDisplayUnits === TemperatureUnit.Celsius) {
      heatingThreshold = this.heatingThresholdCelsius;
    }
    else if (this.temperatureDisplayUnits === TemperatureUnit.Fahrenheit) {
      heatingThreshold = this.heatingThresholdFahrenheit;
    }

    return heatingThreshold;
  }

  getCoolingThreshold(): number | undefined {
    let coolingThreshold: number | undefined = undefined;

    if (this.temperatureDisplayUnits === TemperatureUnit.Celsius) {
      coolingThreshold = this.coolingThresholdCelsius;
    }
    else if (this.temperatureDisplayUnits === TemperatureUnit.Fahrenheit) {
      coolingThreshold = this.coolingThresholdFahrenheit;
    }

    return coolingThreshold;
  }

  private isValidHeatingThreshold(): boolean {
    let isValidHeatingThreshold = false;

    // If it's a cooler onlu, then no heating threshold is valid
    if (this.type === HeaterType.Cooler) {
      isValidHeatingThreshold = true;
    }
    else if (this.temperatureDisplayUnits === TemperatureUnit.Celsius) {
      isValidHeatingThreshold =
        Utils.required(this.heatingThresholdCelsius) &&
        (this.heatingThresholdCelsius >= ThresholdTemperature.HeatingThresholdCelsiusMin &&
         this.heatingThresholdCelsius <= ThresholdTemperature.HeatingThresholdCelsiusMax);
    }
    else if (this.temperatureDisplayUnits === TemperatureUnit.Fahrenheit) {
      isValidHeatingThreshold =
        Utils.required(this.heatingThresholdFahrenheit) &&
        (this.heatingThresholdFahrenheit >= ThresholdTemperature.HeatingThresholdFahrenheitMin &&
         this.heatingThresholdFahrenheit <= ThresholdTemperature.HeatingThresholdFahrenheitMax);
    }

    return isValidHeatingThreshold;
  }

  private isValidCoolingThreshold(): boolean {
    let isValidCoolingThreshold = false;

    // If it's a heater onlu, then no cooling threshold is valid
    if (this.type === HeaterType.Heater) {
      isValidCoolingThreshold = true;
    }
    else if (this.temperatureDisplayUnits === TemperatureUnit.Celsius) {
      isValidCoolingThreshold =
        Utils.required(this.coolingThresholdCelsius) &&
        (this.coolingThresholdCelsius >= ThresholdTemperature.CoolingThresholdCelsiusMin &&
         this.coolingThresholdCelsius <= ThresholdTemperature.CoolingThresholdCelsiusMax);
    }
    else if (this.temperatureDisplayUnits === TemperatureUnit.Fahrenheit) {
      isValidCoolingThreshold =
        Utils.required(this.coolingThresholdFahrenheit) &&
        (this.coolingThresholdFahrenheit >= ThresholdTemperature.CoolingThresholdFahrenheitMin &&
         this.coolingThresholdFahrenheit <= ThresholdTemperature.CoolingThresholdFahrenheitMax);
    }

    return isValidCoolingThreshold;
  }

  private capitalize(value: string) {
    return String(value).charAt(0).toUpperCase() + String(value).slice(1);
  }
}
