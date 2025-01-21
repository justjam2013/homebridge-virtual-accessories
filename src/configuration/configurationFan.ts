/* eslint-disable curly */

import { isPowerState, isPercentage, isRotation } from '../customTypes.js';

/**
 * 
 */
export class FanConfiguration {
  defaultState!: string;
  rotationDirection!: string;
  rotationSpeed!: number;

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDefaultState: boolean = (
      (this.defaultState !== undefined) &&
      isPowerState(this.defaultState)
    );

    const isValidRotationDirection: boolean = (
      (this.rotationDirection !== undefined) &&
      (['clockwise', 'counterclockwise'].includes(this.rotationDirection))
    );

    const isValidRotationSpeed: boolean = (
      (this.rotationSpeed !== undefined) &&
      isPercentage(this.rotationSpeed)
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push('Fsn.defaultState');
    if (!isValidRotationDirection) this.errorFields.push('Fsn.rotationDirection');
    if (!isValidRotationSpeed) this.errorFields.push('Fsn.rotationSpeed');

    return [
      (isValidDefaultState &&
        isValidRotationDirection &&
        isValidRotationSpeed),
      this.errorFields,
    ];
  }
}
