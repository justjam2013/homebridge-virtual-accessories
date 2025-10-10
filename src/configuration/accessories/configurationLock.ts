/* eslint-disable curly */

import { Validatable } from '../validatable.js';
import { LockState, WalletKeyColor } from '../schema.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class LockConfiguration implements Validatable {
  defaultState!: string;
  autoSecurityTimeout!: number;
  walletKeyColor: string = 'tan';

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

    const isValidWalletKeyColor: boolean = (
      Utils.required(this.walletKeyColor) &&
      WalletKeyColor.Colors.includes(this.walletKeyColor)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidAutoSecurityTimeout) this.errorFields.push(prefix + '.' + this.fieldNames.autoSecurityTimeout);
    if (!isValidWalletKeyColor) this.errorFields.push(prefix + '.' + this.fieldNames.walletKeyColor);

    return [
      (isValidDefaultState &&
        isValidAutoSecurityTimeout &&
        isValidWalletKeyColor),
      this.errorFields,
    ];
  }
}
