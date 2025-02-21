/* eslint-disable curly */

/**
 * 
 */
export class SwitchConfiguration {
  defaultState!: string;
  hasResetTimer: boolean = false;
  hasCompanionSensor: boolean = false;

  static prefix: string = 'switch';

  private errorFields: string[] = [];

  isValid(
    accessoryIsStateful: boolean | undefined, 
  ): [boolean, string[]] {  
    const isValidDefaultState: boolean = (
      (this.defaultState !== undefined) &&
      [ 'on', 'off' ].includes(this.defaultState)
    );

    const isValidHasResetTimer: boolean = (!(accessoryIsStateful && this.hasResetTimer));

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(SwitchConfiguration.prefix + '.defaultState');
    if (!isValidHasResetTimer) this.errorFields.push('accessoryIsStateful', SwitchConfiguration.prefix + 'hasResetTimer');

    return [
      (isValidDefaultState &&
        isValidHasResetTimer),
      this.errorFields,
    ];
  }
}
