/* eslint-disable curly */

import { Utils } from '../../utils.js';

/**
 * 
 */
export class HeaterCoolerConfiguration {
  type!: string;
  temperatureDisplayUnits!: string;
  heatingThresholdCelsius!: number;
  coolingThresholdCelsius!: number;
  heatingThresholdFahrenheit!: number;
  coolingThresholdFahrenheit!: number;

  static prefix: string = 'heaterCooler';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidType: boolean = (
      (this.type !== undefined) &&
      [ 'auto', 'heater', 'cooler' ].includes(this.type)
    );

    const isValidTemperatureDisplayUnits: boolean = (
      (this.temperatureDisplayUnits !== undefined) &&
      [ 'celsius', 'fahrenheit' ].includes(this.temperatureDisplayUnits)
    );

    const heatingThreshold: number | undefined = this.getHeatingThreshold();
    const coolingThreshold: number | undefined = this.getCoolingThreshold();

    const isValidHeatingThreshold: boolean = (
      (heatingThreshold !== undefined) ?
        Utils.isPercentage(heatingThreshold) :
        true
    );

    const isValidCoolingThreshold: boolean = (
      (coolingThreshold !== undefined) ?
        Utils.isPercentage(coolingThreshold):
        true
    );

    const isValidThresholdWindow: boolean = (
      (heatingThreshold !== undefined) && (coolingThreshold !== undefined) ?
        (coolingThreshold > heatingThreshold) :
        true
    );

    // Store fields failing validation

    const heatingThresholdField = '.heatingThreshold' + this.capitalize(this.temperatureDisplayUnits);
    const coolingThresholdField = '.coolingThreshold' + this.capitalize(this.temperatureDisplayUnits);

    if (!isValidType) this.errorFields.push(HeaterCoolerConfiguration.prefix + '.type');
    if (!isValidTemperatureDisplayUnits) this.errorFields.push(HeaterCoolerConfiguration.prefix + '.temperatureDisplayUnits');
    if (!isValidHeatingThreshold) this.errorFields.push(HeaterCoolerConfiguration.prefix + heatingThresholdField);
    if (!isValidCoolingThreshold) this.errorFields.push(HeaterCoolerConfiguration.prefix + coolingThresholdField);
    if (!isValidThresholdWindow) {
      this.errorFields.push(HeaterCoolerConfiguration.prefix + heatingThresholdField + ' <= ' + HeaterCoolerConfiguration.prefix + coolingThresholdField);
    }

    return [
      (isValidType &&
        isValidTemperatureDisplayUnits &&
        isValidHeatingThreshold &&
        isValidCoolingThreshold &&
        isValidThresholdWindow),
      this.errorFields,
    ];
  }

  getHeatingThreshold() {
    return (this.temperatureDisplayUnits === 'celsius') ? this.heatingThresholdCelsius : this.heatingThresholdFahrenheit;
  }

  getCoolingThreshold() {
    return (this.temperatureDisplayUnits === 'celsius') ? this.coolingThresholdCelsius : this.coolingThresholdFahrenheit;
  }

  private capitalize(value: string) {
    return String(value).charAt(0).toUpperCase() + String(value).slice(1);
  }
}
