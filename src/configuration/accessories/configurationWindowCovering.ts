/* eslint-disable curly */

import { OpenableAccessoryConfiguration } from '../configurationOpenableAccesory.js';
import { OpenableState, TiltType } from '../schema.js';

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
  defaultTiltAngle!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
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

    const isValidDefaultTiltAngle: boolean = (
      this.hasTilt && this.defaultTiltAngle !== undefined ?
        Utils.isValidTiltAngle(this.defaultTiltAngle) :
        true
    );

    // Store fields failing validation
    if (!isValidDefaultState) this.errorFields.push(prefix + '.' + this.fieldNames.defaultState);
    if (!isValidTransitionDuration) this.errorFields.push(prefix + '.' + this.fieldNames.transitionDuration);
    if (!isValidTiltType) this.errorFields.push(prefix + '.' + this.fieldNames.tiltType);
    if (!isValidDefaultTiltAngle) this.errorFields.push(prefix + '.' + this.fieldNames.defaultTiltAngle);

    return [
      (isValidDefaultState &&
        isValidTransitionDuration &&
        isValidTiltType &&
        isValidDefaultTiltAngle),
      this.errorFields,
    ];
  }
}
