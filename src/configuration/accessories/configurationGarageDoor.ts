/* eslint-disable curly */

import { OpenableAccessoryConfiguration } from '../configurationOpenableAccesory.js'; 
import { OpenableState } from '../schema.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class GarageDoorConfiguration extends OpenableAccessoryConfiguration {
  // defaultState!: string;
  // transitionDuration!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      Utils.required(this.defaultState) &&
      OpenableState.States.includes(this.defaultState)
    );

    const isValidTransitionDuration: boolean = (
      this.transitionDuration !== undefined?
        Utils.isValidTransition(this.transitionDuration) :
        true
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidTransitionDuration) this.errorFields.push(prefix + '.' + this.fieldNames.transitionDuration);

    return [
      (isValidDefaultState &&
        isValidTransitionDuration),
      this.errorFields,
    ];
  }
}
