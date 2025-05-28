/* eslint-disable curly */

/**
 * 
 */
export class InputSourceConfiguration {
  name!: string;
  inputSourceType!: number;

  static prefix: string = 'input';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {  
    const isValidName: boolean = (
      (this.name !== undefined) &&
      (this.name.length > 0)
    );

    // Store fields failing validation
    if (!isValidName) this.errorFields.push(InputSourceConfiguration.prefix + '.name');

    return [
      (isValidName),
      this.errorFields,
    ];
  }
}
