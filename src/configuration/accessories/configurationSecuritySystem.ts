/* eslint-disable curly */

import { Validatable } from '../validatable.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class SecuritySystemConfiguration implements Validatable {
  defaultState!: string;
  hasNightMode: boolean = false;
  awayArmingDelay: number = 0;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      Utils.required(this.defaultState)
    );

    const isValidAwayArmingDelay: boolean = (
      Utils.required(this.awayArmingDelay) &&
      (this.awayArmingDelay >= 0 && this.awayArmingDelay <= 60)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidAwayArmingDelay) this.errorFields.push(prefix + '.' + this.fieldNames.awayArmingDelay);

    return [
      (isValidDefaultState &&
        isValidAwayArmingDelay),
      this.errorFields,
    ];
  }
}
