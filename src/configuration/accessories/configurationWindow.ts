/* eslint-disable curly */

import { OpenableAccessoryConfiguration } from '../configurationOpenableAccesory.js';
import { OpenableState } from '../configurationSchema.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class WindowConfiguration extends OpenableAccessoryConfiguration {
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
