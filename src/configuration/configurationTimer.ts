/* eslint-disable curly */

/**
 * 
 */
export class TimerConfiguration {
  durationIsRandom: boolean = false;
  duration!: number;
  durationRandomMin!: number;
  durationRandomMax!: number;
  units!: string;
  isResettable: boolean = false;

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const isValidDuration: boolean = (
      this.durationIsRandom === false ? (
        (this.duration !== undefined) &&
        (this.duration >= 0)
      ) :
        true
    );

    const isValidDurationRandomMin: boolean = (
      this.durationIsRandom === true ? (
        (this.durationRandomMin !== undefined) &&
        (this.durationRandomMin >= 0)
      ) :
        true
    );
    const isValidDurationRandomMax: boolean = (
      this.durationIsRandom === true ? (
        (this.durationRandomMax !== undefined) &&
        (this.durationRandomMax >= 0)
      ) :
        true
    );

    const isValidDurationRandomRange: boolean = (
      this.durationIsRandom === true ? (
        this.durationRandomMin < this.durationRandomMax
      ) :
        true
    );

    const isValidUnits: boolean = (this.units !== undefined);

    if (!isValidDuration) this.errorFields.push('duration');
    if (!isValidDurationRandomMin) this.errorFields.push('durationRandomMin');
    if (!isValidDurationRandomMax) this.errorFields.push('durationRandomMax');
    if (!isValidDurationRandomRange) this.errorFields.push('durationRandomMin', 'durationRandomMax');
    if (!isValidUnits) this.errorFields.push('units');

    return [
      (isValidDuration && 
        isValidDurationRandomMin &&
        isValidDurationRandomMax &&
        isValidDurationRandomRange &&
        isValidUnits),
      this.errorFields,
    ];
  }
}
