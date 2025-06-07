/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { ValveDuration, ValveType } from '../configurationSchema.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class ValveConfiguration extends AccessoryConfiguration {
  type!: string;
  duration!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidType: boolean = (
      Utils.required(this.type) &&
      ValveType.Types.includes(this.type)
    );

    const isValidDuration: boolean = (
      Utils.required(this.duration) &&
      (this.duration >= ValveDuration.DurationMin && this.duration <= ValveDuration.DurationMax)
    );

    // Store fields failing validation
    if (!isValidType) this.errorFields.push(prefix + '.' + this.fieldNames.type);
    if (!isValidDuration) this.errorFields.push(prefix + '.' + this.fieldNames.duration);

    return [
      (isValidType &&
        isValidDuration),
      this.errorFields,
    ];
  }
}
