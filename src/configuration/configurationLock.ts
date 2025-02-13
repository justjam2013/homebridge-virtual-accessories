/* eslint-disable curly */

/**
 * 
 */
export class LockConfiguration {
  defaultState!: string;
  hardwareFinish!: string;
  hasAudioFeedback!: boolean;
  autoSecurityTimeout!: number;

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (this.defaultState !== undefined);
    const isValidHardwareFinish: boolean = (this.hardwareFinish !== undefined);

    const isValidAutoSecurityTimeout: boolean = (this.autoSecurityTimeout !== undefined);
    
    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push('defaultState');
    if (!isValidHardwareFinish) this.errorFields.push('hardwareFinish');
    if (!isValidAutoSecurityTimeout) this.errorFields.push('autoSecurityTimeout');

    return [
      (isValidDefaultState &&
        isValidHardwareFinish &&
        isValidAutoSecurityTimeout),
      this.errorFields,
    ];
  }
}
