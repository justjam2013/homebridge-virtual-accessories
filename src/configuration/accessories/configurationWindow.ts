/* eslint-disable curly */

import { Utils } from '../../utils.js';

/**
 * 
 */
export class WindowConfiguration {
  defaultState!: string;
  transitionDuration!: number;

  static prefix: string = 'window';

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
    if (!isValidDefaultState) this.errorFields.push(WindowConfiguration.prefix + '.defaultState');
    if (!isValidTransitionDuration) this.errorFields.push(WindowConfiguration.prefix + '.transitionDuration');

    return [
      (isValidDefaultState &&
        isValidTransitionDuration),
      this.errorFields,
    ];
  }
}
