 
/* eslint-disable brace-style */

import { Validatable } from './validatable.js';
import { DurationConfiguration } from './configurationDuration.js';

import { Utils } from '../utils/utils.js';

import { Type } from 'typeserializer';

/**
 * 
 */
export class TimerConfiguration implements Validatable {
  durationIsRandom: boolean = false;
  @Type(DurationConfiguration)
    duration!: DurationConfiguration;
  @Type(DurationConfiguration)
    durationRandomMin!: DurationConfiguration;
  @Type(DurationConfiguration)
    durationRandomMax!: DurationConfiguration;
  isResettable: boolean = false;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    let isValidDuration: boolean = true;
    let durationErrorFields: string[] = [];
    if (this.durationIsRandom === false) {
      if (this.duration !== undefined) {
        [isValidDuration, durationErrorFields] = this.duration.isValid(this.fieldNames.duration!);
      } 
      else {
        [isValidDuration, durationErrorFields] = [false, [ this.fieldNames.duration! ]];
      }
    }

    let isValidDurationRandomMin: boolean = true;
    let durationRandomMinErrorFields: string[] = [];
    if (this.durationIsRandom === true) {
      if (this.durationRandomMin !== undefined) {
        [isValidDurationRandomMin, durationRandomMinErrorFields] = this.durationRandomMin.isValid(this.fieldNames.durationRandomMin!);
      }
      else {
        [isValidDurationRandomMin, durationRandomMinErrorFields] = [false, [ this.fieldNames.durationRandomMin! ]];
      }
    }

    let isValidDurationRandomMax: boolean = true;
    let durationRandomMaxErrorFields: string[] = [];
    if (this.durationIsRandom === true) {
      if (this.durationRandomMax !== undefined) {
        [isValidDurationRandomMax, durationRandomMaxErrorFields] = this.durationRandomMax.isValid(this.fieldNames.durationRandomMax!);
      }
      else {
        [isValidDurationRandomMax, durationRandomMaxErrorFields] = [false, [ this.fieldNames.durationRandomMax! ]];
      }
    }

    const isValidDurationRandomRange: boolean = (
      (this.durationIsRandom === true &&
        this.durationRandomMin !== undefined &&
        this.durationRandomMax !== undefined) ?
        (
          this.durationRandomMin.toSeconds() < this.durationRandomMax.toSeconds()
        ) :
        true
    );

    if (!isValidDuration) {
      durationErrorFields.forEach( (errorField) => {
        this.errorFields.push(prefix + '.' + errorField);
      });
    }
    if (!isValidDurationRandomMin) {
      durationRandomMinErrorFields.forEach( (errorField) => {
        this.errorFields.push(prefix + '.' + errorField);
      });
    }
    if (!isValidDurationRandomMax) {
      durationRandomMaxErrorFields.forEach( (errorField) => {
        this.errorFields.push(prefix + '.' + errorField);
      });
    }
    if (!isValidDurationRandomRange) {this.errorFields.push(
      prefix + '.' + this.fieldNames.durationRandomMin,
      prefix + '.' + this.fieldNames.durationRandomMax);
    }

    return [
      (isValidDuration && 
        isValidDurationRandomMin &&
        isValidDurationRandomMax &&
        isValidDurationRandomRange),
      this.errorFields,
    ];
  }
}
