/* eslint-disable curly */

/**
 * 
 */
export class PingTriggerConfiguration {
  host!: string;
  failureRetryCount!: number;
  isDisabled: boolean = false;

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidHost: boolean = (this.host !== undefined);
    const isValidFailureRetryCount: boolean = (this.failureRetryCount !== undefined);

    if (!isValidHost) this.errorFields.push('host');
    if (!isValidFailureRetryCount) this.errorFields.push('failureRetryCount');

    return [
      (isValidHost &&
        isValidFailureRetryCount),
      this.errorFields,
    ];
  }
}
