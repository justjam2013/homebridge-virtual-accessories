/* eslint-disable brace-style */

import { Utils, shutdownSignal } from './utils.js';
import { VirtualLogger } from './virtualLogger.js';

import { ZonedDateTime } from '@js-joda/core';

/**
 * Timer
 */
export class Timer {

  private readonly oneSecond: number = 1000; // in milliseconds

  private accessoryName: string;
  private log: VirtualLogger;

  private id: ReturnType<typeof setInterval> | undefined;

  private timerIsResettable: boolean = false;
  private durationIsRandom: boolean = false;

  private defaultDuration: number = 0;
  private durationRandomMin: number = 0;
  private durationRandomMax: number = 0;

  private updateIntervalMillis: number = this.oneSecond;
  private startTime: ZonedDateTime;

  private _isRunning: boolean = false;
  private duration: number = 0;
  private remainingDurationMillis: number = 0;

  private logDebugCountdown: boolean = false;

  /**
   * Set duration in seconds
   */
  constructor(
    accessoryName: string,
    log: VirtualLogger,
  );
  constructor(
    accessoryName: string,
    log: VirtualLogger,
    timerIsResettable: boolean,
  );
  constructor(
    accessoryName: string,
    log: VirtualLogger,
    timerIsResettable: boolean,
    duration: number,       // seconds
  );
  constructor(
    accessoryName: string,
    log: VirtualLogger,
    timerIsResettable: boolean,
    duration: number,             // seconds
    durationIsRandom: boolean,
    durationMin: number,          // seconds
    durationMax: number,          // seconds
  );
  constructor(
    accessoryName: string,
    log: VirtualLogger,
    timerIsResettable: boolean = false,
    duration: number = 0,         // seconds
    durationIsRandom: boolean = false,
    durationRandomMin: number = 0,      // seconds
    durationRandomMax: number = 0,      // seconds
  ) {
    this.accessoryName = accessoryName;
    this.log = log;
    this.timerIsResettable = timerIsResettable;
    this.durationIsRandom = durationIsRandom;

    this.setDefaultDuration(duration);

    this.durationRandomMin = durationRandomMin;
    this.durationRandomMax = durationRandomMax;

    this.startTime = Utils.now();
  }

  /**
   * Set duration/oneOffDuration in seconds
   */
  start(
    callback: () => void,
  ): void;
  start(
    callback: () => void,
    oneOffDuration: number,
  ): void;
  start(
    callback: () => void,
    oneOffDuration: number,
    updateIntervalMillis: number,
  ): void;
  start(
    callback: () => void,
    oneOffDuration?: number,
    updateIntervalMillis?: number,
  ): void {
    if (this._isRunning && !this.timerIsResettable) {
      return;
    }

    // In case timer is running, stop it
    this.stop();

    // Now setup new run
    this.duration = (oneOffDuration === undefined) ? this.calculateDuration() : oneOffDuration;
    this.updateIntervalMillis = (updateIntervalMillis === undefined) ? this.oneSecond : updateIntervalMillis;
    this.log.debug(`[${this.accessoryName} Timer] Runtime: ${this.duration} seconds`);

    if (this.updateIntervalMillis < 1) {
      this.log.error(`[${this.accessoryName} Timer] updateIntervalMillis is less than 1: ${this.updateIntervalMillis} seconds. Setting to 1s/1000 ms`);
      this.updateIntervalMillis = this.oneSecond;
    }

    if (this.duration > 0) {
      this.remainingDurationMillis = this.duration * 1000;
      this.log.debug(`[${this.accessoryName} Timer] Start - Duration: ${this.duration} seconds`);

      this.id = setInterval(() => {
        if (shutdownSignal.isShuttingDown) {return;}

        this.remainingDurationMillis -= this.updateIntervalMillis;

        // We don't want this flooding the debug logs
        if (this.logDebugCountdown && this.remainingDurationMillis % 1000 === 0) {
          this.log.debug(`[${this.accessoryName} Timer] Remaining Duration: ${this.remainingDurationMillis} seconds`);
        }

        if (this.remainingDurationMillis <= 0) {
          this.stop();
          callback();
        }
      }, this.updateIntervalMillis)
        .unref();

      this.startTime = Utils.now();
      this._isRunning = true;
    }
    else {
      callback();
    }
  }

  stop(): void {
    clearInterval(this.id);

    this._isRunning = false;
    this.duration = 0;
    this.remainingDurationMillis = 0;
    this.updateIntervalMillis = this.oneSecond;

    this.logDebugCountdown = false;

    this.log.debug(`[${this.accessoryName} Timer] Stop - Cleared Duration: ${this.getRemainingDuration()} seconds`);
  }

  private calculateDuration(): number {
    // If the duration is random, get random duration between random max and random min
    if (this.durationIsRandom) {
      let randomDuration: number = 0;

      // Validate that random max and random min are not negative, and max is not less than min
      if (this.durationRandomMax < 0 ||
          this.durationRandomMin < 0 ||
          (this.durationRandomMax < this.durationRandomMin)) {
        return randomDuration;
      }

      // If random max and random min are the same value, return that value
      if (this.durationRandomMax === this.durationRandomMin) {
        return this.durationRandomMin;
      }

      // Calculate the random duration
      randomDuration = 
      Math.floor(
        Math.random() * (this.durationRandomMax - this.durationRandomMin + 1)
        + this.durationRandomMin,
      );
      return randomDuration;
    }
    else {
      return this.defaultDuration;
    }
  }

  getStartTime(): ZonedDateTime {
    return this.startTime;
  }

  /**
   * Returns runtime in seconds
   */
  getDuration(): number {
    return this.duration;
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

  isRunning(): boolean {
    return this._isRunning;
  }

  debugCountdown() {
    this.logDebugCountdown = true;
  }
}
