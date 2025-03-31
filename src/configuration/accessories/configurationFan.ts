/* eslint-disable curly */

import { Utils } from '../../utils.js';

/**
 * 
 */
export class FanConfiguration {
  defaultState!: string;
  rotationDirection!: string;
  rotationSpeed!: number;

  static prefix: string = 'fan';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = Utils.isPoweredState(this.defaultState);

    const isValidRotationDirection: boolean = Utils.isRotationDirection(this.rotationDirection);

    const isValidRotationSpeed: boolean = Utils.isPercentage(this.rotationSpeed);

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(FanConfiguration.prefix + '.defaultState');
    if (!isValidRotationDirection) this.errorFields.push(FanConfiguration.prefix + '.rotationDirection');
    if (!isValidRotationSpeed) this.errorFields.push(FanConfiguration.prefix + '.rotationSpeed');

    return [
      (isValidDefaultState &&
        isValidRotationDirection &&
        isValidRotationSpeed),
      this.errorFields,
    ];
  }
}
