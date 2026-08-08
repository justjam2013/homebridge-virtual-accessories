/* eslint-disable curly */

import { OpenableAccessoryConfiguration } from '../configurationOpenableAccesory.js';
import { OpenableState, TiltType } from '../schema.js';
import { Tilt } from '../../accessories/tilt.js';

import { Utils } from '../../utils/utils.js';

/**
 *
 */
export class WindowCoveringConfiguration extends OpenableAccessoryConfiguration {
  // defaultState!: string;
  // transitionDuration!: number;

  // Tilt
  hasTilt: boolean = false;
  tiltType!: string;
  minTiltAngle!: number;
  maxTiltAngle!: number;
  defaultTiltAngle!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    // Fall back to the HomeKit hard limits when the range is not configured
    const minTiltAngle: number = this.minTiltAngle ?? Tilt.ANGLE_MIN;
    const maxTiltAngle: number = this.maxTiltAngle ?? Tilt.ANGLE_MAX;

    const isValidDefaultState: boolean = (
      Utils.required(this.defaultState) &&
      OpenableState.States.includes(this.defaultState)
    );

    const isValidTransitionDuration: boolean = (
      this.transitionDuration !== undefined?
        Utils.isValidTransition(this.transitionDuration) :
        true
    );

    const isValidTiltType: boolean = (
      this.hasTilt ?
        (Utils.required(this.tiltType) && TiltType.Types.includes(this.tiltType)) :
        true
    );

    const isValidMinTiltAngle: boolean = (
      this.hasTilt && this.minTiltAngle !== undefined ?
        Utils.isValidTiltAngle(this.minTiltAngle) :
        true
    );

    const isValidMaxTiltAngle: boolean = (
      this.hasTilt && this.maxTiltAngle !== undefined ?
        Utils.isValidTiltAngle(this.maxTiltAngle) :
        true
    );

    const isValidTiltRange: boolean = (
      this.hasTilt ?
        (minTiltAngle < maxTiltAngle) :
        true
    );

    const isValidDefaultTiltAngle: boolean = (
      this.hasTilt && this.defaultTiltAngle !== undefined ?
        (this.defaultTiltAngle >= minTiltAngle && this.defaultTiltAngle <= maxTiltAngle) :
        true
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidTransitionDuration) this.errorFields.push(prefix + '.' + this.fieldNames.transitionDuration);
    if (!isValidTiltType) this.errorFields.push(prefix + '.' + this.fieldNames.tiltType);
    if (!isValidMinTiltAngle) this.errorFields.push(prefix + '.' + this.fieldNames.minTiltAngle);
    if (!isValidMaxTiltAngle) this.errorFields.push(prefix + '.' + this.fieldNames.maxTiltAngle);
    if (!isValidTiltRange) this.errorFields.push(prefix + '.' + this.fieldNames.minTiltAngle + ' < ' + prefix + '.' + this.fieldNames.maxTiltAngle);
    if (!isValidDefaultTiltAngle) this.errorFields.push(prefix + '.' + this.fieldNames.defaultTiltAngle);

    return [
      (isValidDefaultState &&
        isValidTransitionDuration &&
        isValidTiltType &&
        isValidMinTiltAngle &&
        isValidMaxTiltAngle &&
        isValidTiltRange &&
        isValidDefaultTiltAngle),
      this.errorFields,
    ];
  }
}
