/* eslint-disable curly */

import { Utils } from '../../utils.js';

/**
 * 
 */
export class HeaterCoolerConfiguration {
  type!: string;
  heatingThreshold: number = 0;
  coolingThreshold: number = 100;
  temperatureDisplayUnits!: string;

  static prefix: string = 'heaterCooler';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidType: boolean = (
      (this.type !== undefined) &&
      [ 'auto', 'heater', 'cooler' ].includes(this.type)
    );

    const isValidHeatingThreshold: boolean = Utils.isPercentage(this.heatingThreshold);

    const isValidCoolingThreshold: boolean = Utils.isPercentage(this.coolingThreshold);

    const isValidThresholdWindow: boolean = (
      (this.heatingThreshold !== undefined) &&
      (this.coolingThreshold !== undefined) &&
      (this.coolingThreshold > this.heatingThreshold)
    );

    const isValidTemperatureDisplayUnits: boolean = (
      (this.temperatureDisplayUnits !== undefined) &&
      [ 'celsius', 'fahrenheit' ].includes(this.temperatureDisplayUnits)
    );

    // Store fields failing validation
    if (!isValidType) this.errorFields.push(HeaterCoolerConfiguration.prefix + '.type');
    if (!isValidHeatingThreshold) this.errorFields.push(HeaterCoolerConfiguration.prefix + '.heatingThreshold');
    if (!isValidCoolingThreshold) this.errorFields.push(HeaterCoolerConfiguration.prefix + '.coolingThreshold');
    if (!isValidThresholdWindow) {
      this.errorFields.push(HeaterCoolerConfiguration.prefix + '.heatingThreshold <= ' + HeaterCoolerConfiguration.prefix + '.coolingThreshold');
    }
    if (!isValidTemperatureDisplayUnits) this.errorFields.push(HeaterCoolerConfiguration.prefix + '.temperatureDisplayUnits');

    return [
      (isValidType &&
        isValidHeatingThreshold &&
        isValidCoolingThreshold &&
        isValidThresholdWindow &&
        isValidTemperatureDisplayUnits),
      this.errorFields,
    ];
  }
}
