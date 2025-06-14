/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { SecuritySystemState } from '../configurationSchema.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class SecuritySystemConfiguration extends AccessoryConfiguration {
  defaultState!: string;
  armedModes!: string[];

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      Utils.required(this.defaultState) &&
      SecuritySystemState.States.includes(this.defaultState) &&
      this.armedModes.includes(this.defaultState)
    );

    const isValidArmedModes: boolean = (
      Utils.notEmpty(this.armedModes)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidArmedModes) this.errorFields.push(prefix + '.' + this.fieldNames.armedModes);

    return [
      (isValidDefaultState &&
        isValidArmedModes),
      this.errorFields,
    ];
  }
}
