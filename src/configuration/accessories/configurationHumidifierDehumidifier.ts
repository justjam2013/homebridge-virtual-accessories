/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { HumidifierType } from '../configurationSchema.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class HumidifierDehumidifierConfiguration extends AccessoryConfiguration {
  type!: string;
  humidifierThreshold!: number;
  dehumidifierThreshold!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidType: boolean = (
      Utils.required(this.type) &&
      HumidifierType.Types.includes(this.type)
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
    if (!isValidType) this.errorFields.push(prefix + '.' + this.fieldNames.type);
    if (!isValidHumidifierThreshold) this.errorFields.push(prefix + '.' + this.fieldNames.humidifierThreshold);
    if (!isValidDehumidifierThreshold) this.errorFields.push(prefix + '.' + this.fieldNames.dehumidifierThreshold);
    if (!isValidThresholdWindow) this.errorFields.push(
      prefix + '.' + this.fieldNames.humidifierThreshold! + ' <= ' + prefix + '.' + this.fieldNames.dehumidifierThreshold);

    return [
      (isValidType &&
        isValidHumidifierThreshold &&
        isValidDehumidifierThreshold &&
        isValidThresholdWindow),
      this.errorFields,
    ];
  }
}
