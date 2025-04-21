/* eslint-disable curly */

import { Utils } from '../../utils.js';

/**
 * 
 */
export class HumidifierDehumidifierConfiguration {
  type!: string;
  humidifierThreshold!: number;
  dehumidifierThreshold!: number;

  static prefix: string = 'humidifierDehumidifier';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidType: boolean = (
      (this.type !== undefined) &&
      [ 'auto', 'humidifier', 'dehumidifier' ].includes(this.type)
    );

    const isValidHumidifierThreshold: boolean = (
      (this.humidifierThreshold !== undefined) ?
        Utils.isPercentage(this.humidifierThreshold) :
        true
    );

    const isValidDehumidifierThreshold: boolean = (
      (this.dehumidifierThreshold !== undefined) ?
        Utils.isPercentage(this.dehumidifierThreshold) :
        true
    );

    const isValidThresholdWindow: boolean = (
      (this.humidifierThreshold !== undefined) && (this.dehumidifierThreshold !== undefined) ?
        (this.dehumidifierThreshold > this.humidifierThreshold) :
        true
    );

    // Store fields failing validation
    if (!isValidType) this.errorFields.push(HumidifierDehumidifierConfiguration.prefix + '.type');
    if (!isValidHumidifierThreshold) this.errorFields.push(HumidifierDehumidifierConfiguration.prefix + '.humidifierThreshold');
    if (!isValidDehumidifierThreshold) this.errorFields.push(HumidifierDehumidifierConfiguration.prefix + '.dehumidifierThreshold');
    if (!isValidThresholdWindow) {
      // eslint-disable-next-line max-len
      this.errorFields.push(HumidifierDehumidifierConfiguration.prefix + '.humidifierThreshold <= ' + HumidifierDehumidifierConfiguration.prefix + '.dehumidifierThreshold');
    }

    return [
      (isValidType &&
        isValidHumidifierThreshold &&
        isValidDehumidifierThreshold &&
        isValidThresholdWindow),
      this.errorFields,
    ];
  }
}
