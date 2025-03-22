/* eslint-disable curly */

/**
 * 
 */
export class SwitchConfiguration {
  defaultState!: string;
  hasResetTimer: boolean = false;
  hasCompanionSensor: boolean = false;
  muteLogging: boolean = false;

  static prefix: string = 'switch';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {  
    const isValidDefaultState: boolean = (
      (this.defaultState !== undefined) &&
      [ 'on', 'off' ].includes(this.defaultState)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(SwitchConfiguration.prefix + '.defaultState');

    return [
      (isValidDefaultState),
      this.errorFields,
    ];
  }
}
