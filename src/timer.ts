import { Utils } from './utils.js';
import { VirtualAccessoriesLogger } from './virtualLogger.js';

import { ZonedDateTime } from '@js-joda/core';

/**
 * 
 */
export class Timer {

  private readonly oneSecond: number = 1000; // in milliseconds

  private accessoryName: string;
  private log: VirtualAccessoriesLogger;

  private timerIsResettable: boolean = false;

  private id: ReturnType<typeof setInterval> | undefined;
  private defaultDuration: number = 0;
  private updateIntervalMillis = this.oneSecond;
  private startTime: ZonedDateTime;

  private isRunning: boolean = false;
  private runtime: number = 0;
  private remainingDurationMillis: number = 0;

  private logDebugCountdown: boolean = false;

  /**
   * Set duration in seconds
   */
  constructor(
    accessoryName: string,
    log: VirtualAccessoriesLogger,
    timerIsResettable: boolean,
  );
  constructor(
    accessoryName: string,
    log: VirtualAccessoriesLogger,
    timerIsResettable: boolean,
    duration: number,       // seconds
  );
  constructor(
    accessoryName: string,
    log: VirtualAccessoriesLogger,
    timerIsResettable: boolean = false,
    duration?: number,       // seconds
  ) {
    this.accessoryName = accessoryName;
    this.log = log;
    this.timerIsResettable = timerIsResettable;

    this.startTime = Utils.now();

    if (duration !== undefined) {
      this.setDefaultDuration(duration);
    }
  }

  /**
   * Set duration/oneOffDuration in seconds
   */
  start(
    callback: () => void,
  ): void;
  start(
    callback: () => void,
    duration: number,
  ): void;
  start(
    callback: () => void,
    duration: number,
    updateIntervalMillis: number,
  ): void;
  start(
    callback: () => void,
    oneOffDuration?: number,
    updateIntervalMillis?: number,
  ): void {
    if (this.isRunning && !this.timerIsResettable) {
      return;
    }

    // In case timer is running, stop it
    this.stop();

    // Now setup new run
    this.runtime = (oneOffDuration === undefined) ? this.defaultDuration : oneOffDuration;
    this.updateIntervalMillis = (updateIntervalMillis === undefined) ? this.oneSecond : updateIntervalMillis;

    if (this.runtime > 0) {
      this.remainingDurationMillis = this.runtime * 1000;
      this.log.debug(`[${this.accessoryName} Timer] Start - Duration: ${this.runtime} seconds`);

      this.id = setInterval(() => {
        this.remainingDurationMillis -= this.updateIntervalMillis;

        // We don't want this flooding the debug logs
        if (this.logDebugCountdown && this.remainingDurationMillis % 1000 === 0) {
          this.log.debug(`[${this.accessoryName} Timer] Remaining Duration: ${this.remainingDurationMillis} seconds`);
        }

        if (this.remainingDurationMillis <= 0) {
          callback();
          this.stop();
        }
      }, this.updateIntervalMillis);

      this.startTime = Utils.now();
      this.isRunning = true;
    }
  }

  stop(): void {
    clearInterval(this.id);

    this.isRunning = false;
    this.runtime = 0;
    this.remainingDurationMillis = 0;
    this.updateIntervalMillis = this.oneSecond;

    this.logDebugCountdown = false;

    this.log.debug(`[${this.accessoryName} Timer] Stop - Cleared Duration: ${this.getRemainingDuration()} seconds`);
  }

  getStartTime(): ZonedDateTime {
    return this.startTime;
  }

  /**
   * Returns runtime in seconds
   */
  getRuntime(): number {
    return this.runtime;
  }

  /**
   * Returns interval in milliseconds
   */
  getUpdateIntervalMillis(): number {
    return this.updateIntervalMillis;
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

    this.log.debug(`[${this.accessoryName} Timer] Set Duration: ${this.defaultDuration} seconds`);
  }

  /**
   * Returns remaining duration in seconds
   */
  getRemainingDuration(): number {
    return Math.ceil(this.remainingDurationMillis / 1000);
  }

  /**
   * Returns remaining duration in milliseconds
   */
  getRemainingDurationMillis(): number {
    return this.remainingDurationMillis;
  }

  isTimerRunning(): boolean {
    return this.isRunning;
  }

  debugCountdown() {
    this.logDebugCountdown = true;
  }
}
