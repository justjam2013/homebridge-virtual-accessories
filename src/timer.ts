import { Utils } from './utils.js';
import { VirtualAccessoriesLogger } from './virtualLogger.js';

import { ZonedDateTime } from '@js-joda/core';

export class Timer {

  private accessoryName: string;
  private log: VirtualAccessoriesLogger;

  private timerIsResettable: boolean = false;

  private id: ReturnType<typeof setInterval> | undefined;
  private defaultDuration: number = 0;
  private startTime: ZonedDateTime;

  private isRunning: boolean = false;
  private runtime: number = 0;
  private remainingDuration: number = 0;

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
      this.setDefaultDuration(duration);
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
    oneOffDuration?: number,
  ): void {
    if (this.isRunning && !this.timerIsResettable) {
      return;
    }

    // In case timer is running, stop it
    this.stop();

    this.runtime = (oneOffDuration === undefined) ? this.defaultDuration : oneOffDuration;

    if (this.runtime > 0) {
      this.remainingDuration = this.runtime;
      this.log.debug(`[${this.accessoryName} Timer] Start - Duration: ${this.runtime}`);

      this.id = setInterval(() => {
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
      this.isRunning = true;
    }
  }

  stop(): void {
    clearInterval(this.id);

    this.isRunning = false;
    this.runtime = 0;
    this.remainingDuration = 0;

    this.logDebugCountdown = false;

    this.log.debug(`[${this.accessoryName} Timer] Stop - Cleared Duration: ${this.remainingDuration}`);
  }

  getStartTime(): ZonedDateTime {
    return this.startTime;
  }

  getRuntime(): number {
    return this.runtime;
  }

  /**
   * Returns duration in seconds
   */
  getDefaultDuration(): number {
    return this.defaultDuration;
  }

  /**
   * Set duration in seconds
   */
  setDefaultDuration(
    duration: number,
  ) {
    this.defaultDuration = duration;

    this.log.debug(`[${this.accessoryName} Timer] Set Duration: ${this.defaultDuration}`);
  }

  /**
   * Returns remaining duration in seconds
   */
  getRemainingDuration(): number {
    return this.remainingDuration;
  }

  isTimerRunning(): boolean {
    return this.isRunning;
  }

  debugCountdown() {
    this.logDebugCountdown = true;
  }
}
