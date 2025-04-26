/* eslint-disable curly */

/**
 * 
 */
export class DynamicAlarmConfiguration {

  static readonly MINUTES_MIN_VALUE: number = 59;
  static readonly HOUR24_MIN_VALUE: number = 0;
  static readonly HOUR12_AM_MIN_VALUE: number = 0;
  static readonly HOUR12_PM_MIN_VALUE: number = 1;

  static readonly MINUTES_MAX_VALUE: number = 59;
  static readonly HOUR24_MAX_VALUE: number = 23;
  static readonly HOUR12_AM_MAX_VALUE: number = 11;
  static readonly HOUR12_PM_MAX_VALUE: number = 12;

  clockType!: string;
  hour12!: number;
  hour24!: number;
  minutes!: number;
  ampm!: string;

  static prefix: string = 'dynamicAlarm';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidClockType: boolean = (
      (this.clockType !== undefined) &&
      [ '12hour', '24hour' ].includes(this.clockType)
    );

    const isValidAmPm: boolean = (
      (isValidClockType && this.clockType === '12hour') ?
        (
          this.ampm !== undefined &&
          [ 'am', 'pm' ].includes(this.ampm)
        ) :
        true
    );

    const isVakidHour12: boolean = (
      (isValidClockType && this.clockType === '12hour') ?
        (
          this.hour12 !== undefined &&
          this.hour12 >= this.getHourMinValue() &&
          this.hour12 <= this.getHourMaxValue()
        ) :
        true
    );

    const isVakidHour24: boolean = (
      (isValidClockType && this.clockType === '24hour') ?
        (
          this.hour24 !== undefined &&
          this.hour24 >= this.getHourMinValue() &&
          this.hour24 <= this.getHourMaxValue()
        ) :
        true
    );

    const isValidMinutes: boolean = (
      (this.minutes !== undefined) &&
      (this.minutes >= 0 && this.minutes <= 59)
    );

    // Store fields failing validation
    if (!isValidClockType) this.errorFields.push(DynamicAlarmConfiguration.prefix + '.clockType');
    if (!isValidMinutes) this.errorFields.push(DynamicAlarmConfiguration.prefix + '.minutes');

    if (!isVakidHour12) this.errorFields.push(DynamicAlarmConfiguration.prefix + '.hour12');
    if (!isVakidHour24) this.errorFields.push(DynamicAlarmConfiguration.prefix + '.hour24');

    if (!isValidAmPm) this.errorFields.push(DynamicAlarmConfiguration.prefix + '.ampm');

    return [
      (isValidClockType &&
        isValidAmPm),
      this.errorFields,
    ];
  }

  getHour(): number {
    return (this.clockType === '24hour') ? this.hour24 : this.hour12;
  }

  getHourMinValue(): number {
    return (this.clockType === '24hour') ?
      DynamicAlarmConfiguration.HOUR24_MIN_VALUE : 
      (this.ampm === 'am') ?
        DynamicAlarmConfiguration.HOUR12_AM_MIN_VALUE :
        DynamicAlarmConfiguration.HOUR12_PM_MIN_VALUE;
  }

  getHourMaxValue(): number {
    return (this.clockType === '24hour') ?
      DynamicAlarmConfiguration.HOUR24_MAX_VALUE : 
      (this.ampm === 'am') ?
        DynamicAlarmConfiguration.HOUR12_AM_MAX_VALUE :
        DynamicAlarmConfiguration.HOUR12_PM_MAX_VALUE;
  }
}
