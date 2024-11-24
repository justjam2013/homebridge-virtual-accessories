
export class Timer {

  static Units = {
    Seconds: 'seconds',
    Minutes: 'minutes',
    Hours: 'hours',
    Days: 'days',
  };

  private timerId: ReturnType<typeof setTimeout> | undefined;
  private duration: number = 0;   // Timer duration in seconds

  private startTime: number = 0;

  constructor();
  constructor(
    duration: number,
    units: string,
  );
  constructor(
    duration?: number,
    units?: string,
  ) {
    this.setDuration(duration, units);
  }

  start(
    callback: () => void,
  ): void;
  start(
    callback: () => void,
    duration: number,
    units: string,
  ): void;
  start(
    callback: () => void,
    duration?: number,
    units?: string,
  ): void {
    this.stop();

    this.setDuration(duration, units);

    if (this.duration > 0) {
      this.startTime = (new Date()).getTime();

      this.timerId = setTimeout(() => {
        callback();
        this.timerId = undefined;
      }, this.duration * 1000);
    }
  }

  stop(): void {
    clearTimeout(this.timerId);
    this.startTime = 0;
  }

  /**
   * Returns duration in seconds
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * Returns remaining time in seconds
   */
  getRemainingTime(): number {
    const now: number = (new Date()).getTime();
    const remaining: number = ((this.startTime === 0) ? 0 : now - this.startTime) / 1000;

    return remaining;
  }

  private setDuration(
    duration?: number,
    units?: string,
  ) {
    this.duration = duration ? duration : 0;

    if (this.duration > 0 && units !== undefined) {
      switch (units) {
      case Timer.Units.Days:
        this.duration *= 24;
      // falls through
      case Timer.Units.Hours:
        this.duration *= 60;
      // falls through
      case Timer.Units.Minutes:
        this.duration *= 60;
      // falls through
      case Timer.Units.Seconds:
        this.duration *= 1000;
        break;
      default:
        this.duration = 0;
      }
    }
  }
}
