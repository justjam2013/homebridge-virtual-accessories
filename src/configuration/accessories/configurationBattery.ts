/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';

import { Utils } from '../../utils.js';

// This class is just a placeholder for consistency with all other accessories

/**
 * 
 */
export class BatteryConfiguration extends AccessoryConfiguration {
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
