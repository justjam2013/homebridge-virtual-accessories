import { Utils } from './utils.js';
import { VirtualAccessoriesLogger } from './virtualLogger.js';

import { ZonedDateTime } from '@js-joda/core';

export class Timer {

  private accessoryName: string;
  private log: VirtualAccessoriesLogger;

  private timerIsResettable: boolean = false;

  private timerId: ReturnType<typeof setInterval> | undefined;
  private initiDuration: number = 0;
  private startTime: ZonedDateTime;

  private remainingDuration: number = 0;
  private timerIsRunning: boolean = false;

  private logDebugCountdown: boolean = false;

  constructor(
    accessoryName: string,
    log: VirtualAccessoriesLogger,
    timerIsResettable: boolean,
  );
  constructor(
    accessoryName: string,
    log: VirtualAccessoriesLogger,
    timerIsResettable: boolean,
    duration: number,
  );
  constructor(
    accessoryName: string,
    log: VirtualAccessoriesLogger,
    timerIsResettable: boolean = false,
    duration?: number,
  ) {
    this.accessoryName = accessoryName;
    this.log = log;
    this.timerIsResettable = timerIsResettable;

    this.startTime = Utils.now();

    if (duration !== undefined) {
      this.setDuration(duration);
    }
  }

  start(
    callback: () => void,
  ): void;
  start(
    callback: () => void,
    duration: number,
  ): void;
  start(
    callback: () => void,
    duration?: number,
  ): void {
    if (this.timerIsRunning && !this.timerIsResettable) {
      return;
    }

    // In case timer is running, stop it
    this.stop();

    if (duration !== undefined) {
      this.setDuration(duration);
    }

    const runtime = (duration === undefined) ? this.initiDuration : duration;

    if (runtime > 0) {
      this.remainingDuration = runtime;
      this.log.debug(`[${this.accessoryName} Timer] Start - Duration: ${runtime}`);

      this.timerId = setInterval(() => {
        this.remainingDuration--;

        // We don't want this floodin the debug logs
        if (this.logDebugCountdown && this.remainingDuration % 10 === 0) {
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

    this.timerIsRunning = false;
    this.remainingDuration = 0;

    this.logDebugCountdown = false;

    this.log.debug(`[${this.accessoryName} Timer] Stop - Cleared Duration: ${this.remainingDuration}`);
  }

  getStartTime(): ZonedDateTime {
    return this.startTime;
  }

  /**
   * Returns duration in seconds
   */
  getDuration(): number {
    return this.initiDuration;
  }

  /**
   * Set duration in seconds
   */
  setDuration(
    duration: number,
  ) {
    this.initiDuration = duration;

    this.log.debug(`[${this.accessoryName} Timer] Set Duration: ${this.initiDuration}`);
  }

  /**
   * Returns remaining duration in seconds
   */
  getRemainingDuration(): number {
    return this.remainingDuration;
  }

  isTimerRunning(): boolean {
    return this.timerIsRunning;
  }

  debugCountdown() {
    this.logDebugCountdown = true;
  }
}
