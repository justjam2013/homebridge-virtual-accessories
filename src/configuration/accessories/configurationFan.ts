/* eslint-disable curly */

import { Validatable } from '../validatable.js';
import { RotationDirection } from '../schema.js';

import { Utils } from '../../utils/utils.js';

/**
 * 
 */
export class FanConfiguration implements Validatable {
  rotationDirection!: string;
  rotationSpeed!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidRotationDirection: boolean = (
      Utils.required(this.rotationDirection) &&
      RotationDirection.Directions.includes(this.rotationDirection)
    );

    const isValidRotationSpeed: boolean = (
      Utils.required(this.rotationSpeed) &&
      Utils.isPercentage(this.rotationSpeed)
    );

    // Store fields failing validation
    if (!isValidRotationDirection) this.errorFields.push(prefix + '.' + this.fieldNames.rotationDirection);
    if (!isValidRotationSpeed) this.errorFields.push(prefix + '.' + this.fieldNames.rotationSpeed);

    return [
      (isValidRotationDirection &&
        isValidRotationSpeed),
      this.errorFields,
    ];
  }
}
