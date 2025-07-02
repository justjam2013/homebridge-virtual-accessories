/* eslint-disable curly */

import { Validatable } from '../validatable.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class BatteryConfiguration implements Validatable {
  isRechargeable: boolean = false;
  lowLevelThreshold!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {    
    const isValidLowLevelThreshold: boolean = (
      Utils.required(this.lowLevelThreshold) &&
      (this.lowLevelThreshold >= 5 && this.lowLevelThreshold <= 25)
    );

    // Store fields failing validation
    if (!isValidLowLevelThreshold) this.errorFields.push(prefix + '.' + this.fieldNames.lowLevelThreshold);

    return [
      (isValidLowLevelThreshold),
      this.errorFields,
    ];
  }
}
