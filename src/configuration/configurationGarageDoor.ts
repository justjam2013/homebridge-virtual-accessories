/* eslint-disable curly */

/**
 * 
 */
export class GarageDoorConfiguration {
  defaultState!: string;

  static prefix: string = 'garageDoor';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      (this.defaultState !== undefined) &&
      (this.defaultState === 'closed' || this.defaultState === 'open')
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(GarageDoorConfiguration.prefix + '.defaultState');

    return [
      (isValidDefaultState),
      this.errorFields,
    ];
  }
}
