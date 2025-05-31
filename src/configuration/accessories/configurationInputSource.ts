/* eslint-disable curly */

/**
 * 
 */
export class InputSourceConfiguration {
  name!: string;
  inputSourceType!: number;
  identifier!: number;

  static prefix: string = 'input';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {  
    const isValidName: boolean = (
      (this.name !== undefined) &&
      (this.name.length > 0)
    );

    const isValidIdentifier: boolean = (
      (this.identifier !== undefined)
    );

    // Store fields failing validation
    if (!isValidName) this.errorFields.push(InputSourceConfiguration.prefix + '.name');
    if (!isValidIdentifier) this.errorFields.push(InputSourceConfiguration.prefix + '.identifier');

    return [
      (isValidName &&
        isValidIdentifier),
      this.errorFields,
    ];
  }
}
