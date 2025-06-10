/* eslint-disable brace-style */
/* eslint-disable curly */

import { AccessoryConfiguration } from '../configurationAccessory.js';
import { ValveType } from '../configurationSchema.js';

import { Utils } from '../../utils.js';

import { Type } from 'typeserializer';

/**
 * 
 */
class ValveDurationConfiguration extends AccessoryConfiguration {

  static readonly SECONDS_MAX_VALUE: number = 59;
  static readonly MINUTES_MAX_VALUE: number = 60;

  minutes!: number;
  seconds!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidMinutes: boolean = (
      Utils.required(this.minutes) &&
      (this.minutes >= 0 && this.minutes <= ValveDurationConfiguration.MINUTES_MAX_VALUE)
    );

    const isValidSeconds: boolean = (
      Utils.required(this.seconds) &&
      (this.seconds >= 0 && this.seconds <= ValveDurationConfiguration.SECONDS_MAX_VALUE)
    );

    if (!isValidMinutes) this.errorFields.push(prefix + '.' + this.fieldNames.minutes);
    if (!isValidSeconds) this.errorFields.push(prefix + '.' + this.fieldNames.seconds);

    return [
      (isValidMinutes &&
        isValidSeconds),
      this.errorFields,
    ];
  }

  toSeconds(): number {
    const seconds: number = Utils.daysHoursMinutesSecondsToSeconds(0, 0, this.minutes, this.seconds);
    return seconds;
  }
}

/**
 * 
 */
export class ValveConfiguration extends AccessoryConfiguration {
  type!: string;
  @Type(ValveDurationConfiguration)
    duration!: ValveDurationConfiguration;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidType: boolean = (
      Utils.required(this.type) &&
      ValveType.Types.includes(this.type)
    );

    let isValidDuration: boolean = true;
    let durationErrorFields: string[] = [];
    if (this.duration !== undefined) {
      [isValidDuration, durationErrorFields] = this.duration.isValid(this.fieldNames.duration!);
    } 
    else {
      [isValidDuration, durationErrorFields] = [false, [ this.fieldNames.duration! ]];
    }

    // Store fields failing validation
    if (!isValidType) this.errorFields.push(prefix + '.' + this.fieldNames.type);
    if (!isValidDuration) {
      durationErrorFields.forEach( (errorField) => {
        this.errorFields.push(prefix + '.' + errorField);
      });
    }

    return [
      (isValidType &&
        isValidDuration),
      this.errorFields,
    ];
  }
}
