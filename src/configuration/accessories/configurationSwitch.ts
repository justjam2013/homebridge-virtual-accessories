/* eslint-disable curly */

import { Validatable } from '../validatable.js';
import { PowerState } from '../schema.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class SwitchConfiguration implements Validatable {
  defaultState!: string;
  hasResetTimer: boolean = false;
  hasCompanionSensor: boolean = false;
  muteLogging: boolean = false;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      Utils.required(this.defaultState) &&
      PowerState.States.includes(this.defaultState)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);

    return [
      (isValidDefaultState),
      this.errorFields,
    ];
  }
}
