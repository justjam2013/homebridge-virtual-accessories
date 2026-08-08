/* eslint-disable curly */

import { Validatable } from '../validatable.js';
import { SlatType, SwingMode } from '../schema.js';

import { Utils } from '../../utils/utils.js';

/**
 *
 */
export class SlatsConfiguration implements Validatable {
  slatType!: string;
  defaultSwingMode!: string;
  defaultTiltAngle!: number;
  transitionDuration!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidSlatType: boolean = (
      Utils.required(this.slatType) &&
      SlatType.Types.includes(this.slatType)
    );

    const isValidDefaultSwingMode: boolean = (
      this.defaultSwingMode !== undefined ?
        SwingMode.Modes.includes(this.defaultSwingMode) :
        true
    );

    const isValidDefaultTiltAngle: boolean = (
      this.defaultTiltAngle !== undefined ?
        Utils.isValidTiltAngle(this.defaultTiltAngle) :
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
    if (!isValidDefaultTiltAngle) this.errorFields.push(prefix + '.' + this.fieldNames.defaultTiltAngle);
    if (!isValidTransitionDuration) this.errorFields.push(prefix + '.' + this.fieldNames.transitionDuration);

    return [
      (isValidSlatType &&
        isValidDefaultSwingMode &&
        isValidDefaultTiltAngle &&
        isValidTransitionDuration),
      this.errorFields,
    ];
  }
}
