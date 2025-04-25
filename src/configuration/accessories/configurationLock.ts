/* eslint-disable curly */

import { Utils } from '../../utils.js';

/**
 * 
 */
export class LockConfiguration {
  defaultState!: string;
  autoSecurityTimeout!: number;

  static prefix: string = 'lock';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      (this.defaultState !== undefined) &&
      [ 'locked', 'unlocked' ].includes(this.defaultState)
    );

    const isValidAutoSecurityTimeout: boolean = Utils.isTimeout(this.autoSecurityTimeout);

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(LockConfiguration.prefix + '.defaultState');
    if (!isValidAutoSecurityTimeout) this.errorFields.push(LockConfiguration.prefix + '.autoSecurityTimeout');

    return [
      (isValidDefaultState &&
        isValidAutoSecurityTimeout),
      this.errorFields,
    ];
  }
}
