/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { SecuritySystemState } from '../configurationSchema.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class SecuritySystemConfiguration extends AccessoryConfiguration {
  defaultState!: string;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      Utils.required(this.defaultState) &&
      SecuritySystemState.States.includes(this.defaultState)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);

    return [
      (isValidDefaultState),
      this.errorFields,
    ];
  }
}
