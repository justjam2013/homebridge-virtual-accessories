/* eslint-disable curly */

import { Type } from 'typeserializer';

/**
 * 
 */
export class TelevisionInput {
  name!: string;
}

/**
 * 
 */
export class TelevisionConfiguration {

  @Type(TelevisionInput)
    inputs!: TelevisionInput[];

  static prefix: string = 'television';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {  
    const isValidInputsArray: boolean = (
      (this.inputs !== undefined) &&
      (this.inputs.length > 0)
    );

    let isValidInputNames: boolean = true;
    const inputNames: string[] = [];
    this.inputs.forEach(input => {
      isValidInputNames &&=
        input.name.length > 0 &&
        !inputNames.includes(input.name);

      inputNames.push(input.name);
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
