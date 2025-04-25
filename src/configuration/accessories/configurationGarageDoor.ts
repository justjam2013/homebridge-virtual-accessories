/* eslint-disable curly */

import { Utils } from '../../utils.js';

/**
 * 
 */
export class GarageDoorConfiguration {
  defaultState!: string;
  transitionDuration!: number;

  static prefix: string = 'garageDoor';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      (this.defaultState !== undefined) &&
      [ 'closed', 'open' ].includes(this.defaultState)
    );

    const isValidTransitionDuration: boolean = (
      this.transitionDuration === undefined?
        true :
        Utils.isTransitionDuration(this.transitionDuration)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(GarageDoorConfiguration.prefix + '.defaultState');
    if (!isValidTransitionDuration) this.errorFields.push(GarageDoorConfiguration.prefix + '.transitionDuration');

    return [
      (isValidDefaultState &&
        isValidTransitionDuration),
      this.errorFields,
    ];
  }
}
