/* eslint-disable curly */

import { AccessoryConfiguration } from './configurationAccessory.js';

import { Utils } from '../utils.js';

/**
 * 
 */
export class DurationConfiguration extends AccessoryConfiguration {

  static readonly DAYS_MAX_VALUE: number = 7;
  static readonly HOURS_MAX_VALUE: number = 23;
  static readonly MINUTES_MAX_VALUE: number = 59;
  static readonly SECONDS_MAX_VALUE: number = 59;

  days!: number;
  hours: number = 0;
  minutes: number = 0;
  seconds: number = 0;

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const isValidDays: boolean = (
      Utils.required(this.days) &&
      (this.days >= 0 && this.days <= DurationConfiguration.DAYS_MAX_VALUE)
    );

    // Do not exceed maximum value (DAYS_MAX_VALUE)
    if (isValidDays && this.days === DurationConfiguration.DAYS_MAX_VALUE) {
      this.hours = 0;
      this.minutes = 0;
      this.seconds = 0;
    }

    const isValidHours: boolean = (
      Utils.required(this.hours) &&
      (this.hours >= 0 && this.hours <= DurationConfiguration.HOURS_MAX_VALUE)
    );

    const isValidMinutes: boolean = (
      Utils.required(this.minutes) &&
      (this.minutes >= 0 && this.minutes <= DurationConfiguration.MINUTES_MAX_VALUE)
    );

    const isValidSeconds: boolean = (
      Utils.required(this.seconds) &&
      (this.seconds >= 0 && this.seconds <= DurationConfiguration.SECONDS_MAX_VALUE)
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

  toSeconds(): number {
    const seconds: number = Utils.daysHoursMinutesSecondsToSeconds(this.days, this.hours, this.minutes, this.seconds);
    return seconds;
  }
}
