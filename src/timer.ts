
export class Timer {

  static Units = {
    Seconds: 'seconds',
    Minutes: 'minutes',
    Hours: 'hours',
    Days: 'days',
  };

  private timerId: ReturnType<typeof setTimeout> | undefined;
  private durationMillis: number = 0;   // Timer duration in seconds

  private endTime: number = 0;

  constructor();
  constructor(
    duration: number,
    units: string,
  );
  constructor(
    duration?: number,
    units?: string,
  ) {
    if (duration !== undefined) {
      this.setDuration(duration, units!);
    }
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
    // In case timer is running, stop it
    this.stop();

    if (duration !== undefined) {
      this.setDuration(duration, units!);
    }

    if (this.durationMillis > 0) {
      this.endTime = (new Date()).getTime() + this.durationMillis;

      this.timerId = setTimeout(() => {
        // Run timeout action
        callback();

        this.stop();
      }, this.durationMillis);
    }
  }

  stop(): void {
    clearTimeout(this.timerId);
  }

  /**
   * Returns duration in seconds
   */
  getDuration(): number {
    return this.durationMillis / 1000;
  }

  /**
   * Returns remaining time in seconds
   */
  getRemainingTime(): number {
    const now: number = (new Date()).getTime();
    const timediffMillis = this.endTime - now;
    const remaining: number = (timediffMillis <= 0) ? 0 : Math.trunc(timediffMillis / 1000);

    return remaining;
  }

  setDuration(
    duration: number,
    units: string,
  ) {
    this.durationMillis = duration;

    switch (units) {
    case Timer.Units.Days:
      this.durationMillis *= 24;
      // falls through
    case Timer.Units.Hours:
      this.durationMillis *= 60;
      // falls through
    case Timer.Units.Minutes:
      this.durationMillis *= 60;
      // falls through
    case Timer.Units.Seconds:
      this.durationMillis *= 1000;
      break;
    default:
      this.durationMillis = 0;
    }
  }
}
