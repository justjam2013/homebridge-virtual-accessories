/* eslint-disable curly */

/**
 * 
 */
export class DurationConfiguration {
  days!: number;
  hours!: number;
  minutes!: number;
  seconds!: number;

  private errorFields: string[] = [];

  isValid(prefix: string): [boolean, string[]] {
    const isValidDays: boolean = (
      (this.days !== undefined) &&
      (this.days >= 0 && this.days <= 7)
    );

    const isValidHours: boolean = (
      (this.hours !== undefined) &&
      (this.hours >= 0 && this.hours <= 23)
    );

    const isValidMinutes: boolean = (
      (this.minutes !== undefined) &&
      (this.minutes >= 0 && this.minutes <= 59)
    );

    const isValidSeconds: boolean = (
      (this.seconds !== undefined) &&
      (this.seconds >= 0 && this.seconds <= 59)
    );

    if (!isValidDays) this.errorFields.push(prefix + '.days');
    if (!isValidHours) this.errorFields.push(prefix + '.hours');
    if (!isValidMinutes) this.errorFields.push(prefix + '.minutes');
    if (!isValidSeconds) this.errorFields.push(prefix + '.seconds');

    return [
      (isValidDays && 
        isValidHours &&
        isValidMinutes &&
        isValidSeconds),
      this.errorFields,
    ];
  }
}
