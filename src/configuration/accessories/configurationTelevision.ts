/* eslint-disable curly */

/**
 * 
 */
export class TelevisionConfiguration {

  inputs!: string[];

  static prefix: string = 'television';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {  
    const isValidInputsArray: boolean = (
      (this.inputs !== undefined) &&
      (this.inputs.length > 0)
    );

    let isValidInputNames: boolean = true;
    const namesSet: Set<string> = new Set();
    this.inputs.forEach(input => {
      isValidInputNames &&=
        input.length > 0 &&
        !namesSet.has(input);

      namesSet.add(input);
    });

    // Store fields failing validation
    if (!isValidInputsArray) this.errorFields.push(TelevisionConfiguration.prefix + '.inputs');
    if (!isValidInputNames) this.errorFields.push(TelevisionConfiguration.prefix + '.inputs');

    return [
      (isValidInputsArray &&
        isValidInputNames),
      this.errorFields,
    ];
  }
}
