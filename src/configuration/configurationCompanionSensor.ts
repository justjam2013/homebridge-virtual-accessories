/* eslint-disable curly */

import { Validatable } from './validatable.js';

import { Utils } from '../utils/utils.js';

/**
 * 
 */
export class CompanionSensorConfiguration implements Validatable {
  name!: string;
  type!: string;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidName: boolean = (
      Utils.required(this.name)
    );

    const isValidType: boolean = (
      Utils.required(this.type)
    );

    if (!isValidName) this.errorFields.push(prefix + '.' + this.fieldNames.name);
    if (!isValidType) this.errorFields.push(prefix + '.' + this.fieldNames.type);

    return [
      (isValidName &&
        isValidType),
      this.errorFields,
    ];
  }
}
