/* eslint-disable curly */

/**
 * 
 */
export class SecuritySystemConfiguration {
  defaultState!: string;

  static prefix: string = 'securitySystem';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      (this.defaultState !== undefined) &&
      [ 'awayarm', 'stayarm', 'nightarm', 'disarmed' ].includes(this.defaultState)
    );


    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(SecuritySystemConfiguration.prefix + '.defaultState');

    return [
      (isValidDefaultState),
      this.errorFields,
    ];
  }
}
