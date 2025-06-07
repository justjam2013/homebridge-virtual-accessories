/* eslint-disable curly */

import { AccessoryConfiguration } from './configurationAccessory.js';

import { Utils } from '../utils.js';

/**
 * 
 */
export class DurationConfiguration extends AccessoryConfiguration {

  static readonly SECONDS_MAX_VALUE: number = 59;
  static readonly MINUTES_MAX_VALUE: number = 59;
  static readonly HOURS_MAX_VALUE: number = 23;
  static readonly DAYS_MAX_VALUE: number = 7;

  days!: number;
  hours!: number;
  minutes!: number;
  seconds!: number;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidDays: boolean = (
      Utils.required(this.days) &&
      (this.days >= 0 && this.days <= 7)
    );

    const isValidHours: boolean = (
      Utils.required(this.hours) &&
      (this.hours >= 0 && this.hours <= 23)
    );

    const isValidMinutes: boolean = (
      Utils.required(this.minutes) &&
      (this.minutes >= 0 && this.minutes <= 59)
    );

    const isValidSeconds: boolean = (
      Utils.required(this.seconds) &&
      (this.seconds >= 0 && this.seconds <= 59)
    );

    if (!isValidDays) this.errorFields.push(prefix + '.' + this.fieldNames.days);
    if (!isValidHours) this.errorFields.push(prefix + '.' + this.fieldNames.hours);
    if (!isValidMinutes) this.errorFields.push(prefix + '.' + this.fieldNames.minutes);
    if (!isValidSeconds) this.errorFields.push(prefix + '.' + this.fieldNames.seconds);

    return [
      (isValidDays && 
        isValidHours &&
        isValidMinutes &&
        isValidSeconds),
      this.errorFields,
    ];
  }
}
