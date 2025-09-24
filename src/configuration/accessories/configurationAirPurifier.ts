/* eslint-disable curly */

import { Validatable } from '../validatable.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class AirPurifierConfiguration implements Validatable {
  rotationSpeed!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidRotationSpeed: boolean = (
      Utils.required(this.rotationSpeed) &&
      Utils.isPercentage(this.rotationSpeed)
    );

    // Store fields failing validation
    if (!isValidRotationSpeed) this.errorFields.push(prefix + '.' + this.fieldNames.rotationSpeed);

    return [
      (isValidRotationSpeed),
      this.errorFields,
    ];
  }
}
