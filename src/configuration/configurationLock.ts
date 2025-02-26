/* eslint-disable curly */

/**
 * 
 */
export class LockConfiguration {
  defaultState!: string;
  hardwareFinish!: string;
  hasAudioFeedback!: boolean;
  autoSecurityTimeout!: number;

  static prefix: string = 'lock';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      (this.defaultState !== undefined) &&
      [ 'locked', 'unlocked' ].includes(this.defaultState)
    );

    const isValidHardwareFinish: boolean = (this.hardwareFinish !== undefined);

    const isValidAutoSecurityTimeout: boolean = (
      (this.autoSecurityTimeout !== undefined) &&
      (this.autoSecurityTimeout >= 0)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(LockConfiguration.prefix + '.defaultState');
    if (!isValidHardwareFinish) this.errorFields.push(LockConfiguration.prefix + '.hardwareFinish');
    if (!isValidAutoSecurityTimeout) this.errorFields.push(LockConfiguration.prefix + '.autoSecurityTimeout');

    return [
      (isValidDefaultState &&
        isValidHardwareFinish &&
        isValidAutoSecurityTimeout),
      this.errorFields,
    ];
  }
}
