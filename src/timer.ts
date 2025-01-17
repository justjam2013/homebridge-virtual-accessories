import { Logging } from 'homebridge';

export class Timer {

  static Units = {
    Seconds: 'seconds',
    Minutes: 'minutes',
    Hours: 'hours',
    Days: 'days',
  };

  private accessoryName: string;
  private log: Logging;

  private timerId: ReturnType<typeof setInterval> | undefined;
  private duration: number = 0;

  private remainingDuration: number = 0;

  constructor(
    accessoryName: string,
    log: Logging,
  );
  constructor(
    accessoryName: string,
    log: Logging,
    duration: number,
    units: string,
  );
  constructor(
    accessoryName: string,
    log: Logging,
    duration?: number,
    units?: string,
  ) {
    this.accessoryName = accessoryName;
    this.log = log;

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

    if (this.duration > 0) {
      this.remainingDuration = this.duration;
      this.log.info(`[${this.accessoryName} Timer] Duration: ${this.duration}`);

      this.timerId = setInterval(() => {
        this.remainingDuration--;

        if (this.remainingDuration % 10 === 0) {
          this.log.info(`[${this.accessoryName} Timer] Remaining Duration: ${this.remainingDuration}`);
        }

        if (this.remainingDuration === 0) {
          callback();
          this.stop();
        }
      }, 1000);
    }
  }

  stop(): void {
    clearInterval(this.timerId);
    this.remainingDuration = 0;
  }

  /**
   * Returns duration in seconds
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * Set duration in seconds/minutes/hours/days
   */
  setDuration(
    duration: number,
    units: string,
  ) {
    this.duration = duration;

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
      this.duration *= 1;
      break;
    default:
      this.duration = 0;
    }

    this.log.info(`[${this.accessoryName} Timer] Set Duration: ${this.duration}`);
  }

  /**
   * Returns remaining duration in seconds
   */
  getRemainingDuration(): number {
    return this.remainingDuration;
  }
}
