/* eslint-disable curly */

import { Validatable } from '../validatable.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class PingTriggerConfiguration implements Validatable {
  host!: string;
  failureRetryCount!: number;
  interval: number = 1;
  isDisabled: boolean = false;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidHost: boolean = (
      Utils.required(this.host)
    );

    const isValidFailureRetryCount: boolean = (
      Utils.required(this.failureRetryCount)
    );

    const isValidInterval: boolean = (
      this.interval >= 1 && this.interval <= 15
    );

    if (!isValidHost) this.errorFields.push(prefix + '.' + this.fieldNames.host!);
    if (!isValidFailureRetryCount) this.errorFields.push(prefix + '.' + this.fieldNames.failureRetryCount!);
    if (!isValidInterval) this.errorFields.push(prefix + '.' + this.fieldNames.interval!);

    return [
      (isValidHost &&
        isValidFailureRetryCount &&
        isValidInterval),
      this.errorFields,
    ];
  }
}
