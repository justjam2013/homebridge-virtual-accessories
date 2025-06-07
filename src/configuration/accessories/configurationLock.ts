/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { LockState } from '../configurationSchema.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class LockConfiguration extends AccessoryConfiguration {
  defaultState!: string;
  autoSecurityTimeout!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      Utils.required(this.defaultState) &&
      LockState.States.includes(this.defaultState)
    );

    const isValidAutoSecurityTimeout: boolean = (
      Utils.required(this.autoSecurityTimeout) &&
      Utils.isValidTimeout(this.autoSecurityTimeout)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidAutoSecurityTimeout) this.errorFields.push(prefix + '.' + this.fieldNames.autoSecurityTimeout);

    return [
      (isValidDefaultState &&
        isValidAutoSecurityTimeout),
      this.errorFields,
    ];
  }
}
