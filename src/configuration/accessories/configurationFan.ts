/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { PowerState, RotationDirection } from '../configurationSchema.js';

import { Utils } from '../../utils.js';

/**
 * 
 */
export class FanConfiguration extends AccessoryConfiguration {
  defaultState!: string;
  rotationDirection!: string;
  rotationSpeed!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      Utils.required(this.defaultState) &&
      PowerState.States.includes(this.defaultState)
    );

    const isValidRotationDirection: boolean = (
      Utils.required(this.rotationDirection) &&
      RotationDirection.Directions.includes(this.rotationDirection)
    );

    const isValidRotationSpeed: boolean = (
      Utils.required(this.rotationSpeed) &&
      Utils.isPercentage(this.rotationSpeed)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidRotationDirection) this.errorFields.push(prefix + '.' + this.fieldNames.rotationDirection);
    if (!isValidRotationSpeed) this.errorFields.push(prefix + '.' + this.fieldNames.rotationSpeed);

    return [
      (isValidDefaultState &&
        isValidRotationDirection &&
        isValidRotationSpeed),
      this.errorFields,
    ];
  }
}
