/* eslint-disable curly */

import { Utils } from '../../utils.js';

/**
 * 
 */
export class HumidifierDehumidifierConfiguration {
  type!: string;
  humidifierThreshold: number = 0;
  dehumidifierThreshold: number = 100;

  static prefix: string = 'humidifierDehumidifier';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidType: boolean = (
      (this.type !== undefined) &&
      [ 'auto', 'humidifier', 'dehumidifier' ].includes(this.type)
    );

    const isValidHumidifierThreshold: boolean = Utils.isPercentage(this.humidifierThreshold);

    const isValidDehumidifierThreshold: boolean = Utils.isPercentage(this.dehumidifierThreshold);

    const isValidThresholdWindow: boolean = (
      (this.humidifierThreshold !== undefined) &&
      (this.dehumidifierThreshold !== undefined) &&
      (this.dehumidifierThreshold > this.humidifierThreshold)
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
