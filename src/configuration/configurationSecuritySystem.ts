/* eslint-disable curly */

/**
 * 
 */
export class SecuritySystemConfiguration {
  defaultState!: string;

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (this.defaultState !== undefined);

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push('securitySystem.defaultState');

    return [
      (isValidDefaultState),
      this.errorFields,
    ];
  }
}
