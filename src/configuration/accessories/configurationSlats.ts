/* eslint-disable curly */

import { Validatable } from '../validatable.js';
import { SlatType, SwingMode } from '../schema.js';
import { Tilt } from '../../accessories/tilt.js';

import { Utils } from '../../utils/utils.js';

/**
 *
 */
export class SlatsConfiguration implements Validatable {
  slatType!: string;
  defaultSwingMode!: string;
  minTiltAngle!: number;
  maxTiltAngle!: number;
  defaultTiltAngle!: number;
  transitionDuration!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    // Fall back to the HomeKit hard limits when the range is not configured
    const minTiltAngle: number = this.minTiltAngle ?? Tilt.ANGLE_MIN;
    const maxTiltAngle: number = this.maxTiltAngle ?? Tilt.ANGLE_MAX;

    const isValidSlatType: boolean = (
      Utils.required(this.slatType) &&
      SlatType.Types.includes(this.slatType)
    );

    const isValidDefaultSwingMode: boolean = (
      this.defaultSwingMode !== undefined ?
        SwingMode.Modes.includes(this.defaultSwingMode) :
        true
    );

    const isValidMinTiltAngle: boolean = (
      this.minTiltAngle !== undefined ?
        Utils.isValidTiltAngle(this.minTiltAngle) :
        true
    );

    const isValidMaxTiltAngle: boolean = (
      this.maxTiltAngle !== undefined ?
        Utils.isValidTiltAngle(this.maxTiltAngle) :
        true
    );

    const isValidTiltRange: boolean = (
      minTiltAngle < maxTiltAngle
    );

    const isValidDefaultTiltAngle: boolean = (
      this.defaultTiltAngle !== undefined ?
        (this.defaultTiltAngle >= minTiltAngle && this.defaultTiltAngle <= maxTiltAngle) :
        true
    );

    const isValidTransitionDuration: boolean = (
      this.transitionDuration !== undefined ?
        Utils.isValidTransition(this.transitionDuration) :
        true
    );

    // Store fields failing validation
    if (!isValidSlatType) this.errorFields.push(prefix + '.' + this.fieldNames.slatType);
    if (!isValidDefaultSwingMode) this.errorFields.push(prefix + '.' + this.fieldNames.defaultSwingMode);
    if (!isValidMinTiltAngle) this.errorFields.push(prefix + '.' + this.fieldNames.minTiltAngle);
    if (!isValidMaxTiltAngle) this.errorFields.push(prefix + '.' + this.fieldNames.maxTiltAngle);
    if (!isValidTiltRange) this.errorFields.push(prefix + '.' + this.fieldNames.minTiltAngle + ' < ' + prefix + '.' + this.fieldNames.maxTiltAngle);
    if (!isValidDefaultTiltAngle) this.errorFields.push(prefix + '.' + this.fieldNames.defaultTiltAngle);
    if (!isValidTransitionDuration) this.errorFields.push(prefix + '.' + this.fieldNames.transitionDuration);

    return [
      (isValidSlatType &&
        isValidDefaultSwingMode &&
        isValidMinTiltAngle &&
        isValidMaxTiltAngle &&
        isValidTiltRange &&
        isValidDefaultTiltAngle &&
        isValidTransitionDuration),
      this.errorFields,
    ];
  }
}
