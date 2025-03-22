/* eslint-disable curly */

import { isPowerState, isPercentage } from '../../customTypes.js';

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
    const isValidDefaultState: boolean = (
      (this.defaultState !== undefined) &&
      isPowerState(this.defaultState)
    );

    const isValidRotationDirection: boolean = (
      (this.rotationDirection !== undefined) &&
      [ 'clockwise', 'counterclockwise' ].includes(this.rotationDirection)
    );

    const isValidRotationSpeed: boolean = (
      (this.rotationSpeed !== undefined) &&
      isPercentage(this.rotationSpeed)
    );

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
