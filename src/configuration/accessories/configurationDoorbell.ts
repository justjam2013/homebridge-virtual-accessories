/* eslint-disable curly */

import { Validatable } from '../validatable.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class DoorbellConfiguration implements Validatable {
  volume!: number;
  mute: boolean = false;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidVolume: boolean = (
      Utils.required(this.volume) &&
      Utils.isPercentage(this.volume)
    );

    // Store fields failing validation
    if (!isValidVolume) this.errorFields.push(prefix + '.' + this.fieldNames.volume);

    return [
      (isValidVolume),
      this.errorFields,
    ];
  }
}
