import { VirtualLogger } from './virtualLogger';
import { Utils } from './utils.js';
import { ZonedDateTime } from '@js-joda/core';

export class Timer {

  static Units = {
    Seconds: 'seconds',
    Minutes: 'minutes',
    Hours: 'hours',
    Days: 'days',
  };

  private accessoryName: string;
  private log: VirtualLogger;

  private timerIsResettable: boolean = false;

  private timerId: ReturnType<typeof setInterval> | undefined;
  private duration: number = 0;
  private startTime: ZonedDateTime;

  private remainingDuration: number = 0;
  private timerIsRunning: boolean = false;

  constructor(
    accessoryName: string,
    log: VirtualLogger,
    timerIsResettable: boolean,
  );
  constructor(
    accessoryName: string,
    log: VirtualLogger,
    timerIsResettable: boolean,
    duration: number,
    units: string,
  );
  constructor(
    accessoryName: string,
    log: VirtualLogger,
    timerIsResettable: boolean = false,
    duration?: number,
    units?: string,
  ) {
    this.accessoryName = accessoryName;
    this.log = log;
    this.timerIsResettable = timerIsResettable;

    this.startTime = Utils.now();

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
    if (this.timerIsRunning && !this.timerIsResettable) {
      return;
    }

    // In case timer is running, stop it
    this.stop();

    if (duration !== undefined) {
      this.setDuration(duration, units!);
    }

    if (this.duration > 0) {
      this.remainingDuration = this.duration;
      this.log.debug(`[${this.accessoryName} Timer] Start - Duration: ${this.duration}`);

      this.timerId = setInterval(() => {
        this.remainingDuration--;

        if (this.remainingDuration % 10 === 0) {
          this.log.debug(`[${this.accessoryName} Timer] Remaining Duration: ${this.remainingDuration}`);
        }

        if (this.remainingDuration === 0) {
          callback();
          this.stop();
        }
      }, 1000);

      this.startTime = Utils.now();
      this.timerIsRunning = true;
    }
  }

  stop(): void {
    clearInterval(this.timerId);

    this.duration = 0;

    this.timerIsRunning = false;
    this.remainingDuration = 0;

    this.log.debug(`[${this.accessoryName} Timer] Stop - Cleared Duration: ${this.remainingDuration}`);
  }

  getStartTime(): ZonedDateTime {
    return this.startTime;
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

    this.log.debug(`[${this.accessoryName} Timer] Set Duration: ${this.duration}`);
  }

  /**
   * Returns remaining duration in seconds
   */
  getRemainingDuration(): number {
    return this.remainingDuration;
  }
}
