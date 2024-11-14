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

  isValid(): boolean {
    const validUnits: boolean = (this.units !== undefined);
    const validDuration: boolean = (
      this.durationIsRandom === false ?
        (
          (this.duration !== undefined) &&
          (this.duration >= 0)
        ) :
        (
          (this.durationRandomMin !== undefined && this.durationRandomMax !== undefined) &&
          (this.durationRandomMin >= 0 && this.durationRandomMax >= 0) &&
          (this.durationRandomMin < this.durationRandomMax)
        )
    );

    return (validUnits && validDuration);
  }
}
