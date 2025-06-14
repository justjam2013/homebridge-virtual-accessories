/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class InputSourceConfiguration extends AccessoryConfiguration {
  name!: string;
  inputSourceType!: number;
  identifier!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidName: boolean = (
      Utils.required(this.name) &&
      (this.name.length > 0)
    );

    const isValidInputSourceType: boolean = (
      Utils.required(this.inputSourceType)
    );

    const isValidIdentifier: boolean = (
      Utils.required(this.identifier)
    );

    // Store fields failing validation
    if (!isValidName) this.errorFields.push(prefix + '.' + this.fieldNames.name);
    if (!isValidInputSourceType) this.errorFields.push(prefix + '.' + this.fieldNames.inputSourceType);
    if (!isValidIdentifier) this.errorFields.push(prefix + '.' + this.fieldNames.identifier);

    return [
      (isValidName &&
        isValidInputSourceType &&
        isValidIdentifier),
      this.errorFields,
    ];
  }
}
