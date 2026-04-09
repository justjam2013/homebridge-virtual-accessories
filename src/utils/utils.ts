/* eslint-disable @typescript-eslint/no-explicit-any */

import { Timer } from './timer.js';
import { VirtualLogger } from './virtualLogger.js';

import { Duration, Instant, ZonedDateTime, ZoneId } from '@js-joda/core';
import '@js-joda/timezone';

/**
 * shutdownSignal
 */
export const shutdownSignal = {
  isShuttingDown: false,
};

/**
 * Utils
 */
export class Utils {

  static base64DecodeToHexString(base64String: string): string {
    const hexString: string = Buffer.from(base64String, 'base64').toString('hex');

    return hexString;
  }

  static hexStringEncodeToBase64(hexString: string): string {
    const base64String: string = Buffer.from(hexString, 'hex').toString('base64');

    return base64String;
  }

  static concatenate(num1: number, num2: number): number {
    return (num1 * 100) + num2;
  }

  static now(): ZonedDateTime {
    const now: ZonedDateTime = ZonedDateTime.ofInstant(Instant.now(), ZoneId.SYSTEM);
    return now;
  }

  static zonedDateTime(datetime: string): ZonedDateTime {
    const zonedDateTime: ZonedDateTime = ZonedDateTime.parse(datetime);
    return zonedDateTime;
  }

  static secondsToHHmmss(seconds: number): string {
    let secondsDuration: number = Math.max(seconds, 0);

    const hours: number = Math.floor(secondsDuration / 3600);
    secondsDuration = secondsDuration - (hours * 3600);
    const mins: number = Math.floor(secondsDuration / 60);
    secondsDuration = secondsDuration - (mins * 60);
    const secs: number = secondsDuration;

    let hhmmss: string = '';

    if (hours > 0) {
      hhmmss += hours.toString().padStart(2, '0') + 'h';
    }
    if (mins > 0 || hours > 0) {
      hhmmss += mins.toString().padStart(2, '0') + 'm';
    }
    hhmmss += secs.toString().padStart(2, '0') + 's';

    return hhmmss;
  }

  static daysHoursMinutesSecondsToSeconds(
    days: number,
    hours: number,
    minutes: number,
    seconds: number,
  ) {
    if (days < 0 || hours < 0 || minutes < 0 || seconds < 0) {
      return 0;
    }

    const convertedSeconds: number = (((days * 24) + hours) * 60 + minutes) * 60 + seconds;
    return convertedSeconds;
  }

  static secondsToDaysHoursMinutesSeconds(
    seconds: number,
  ): [number, number, number, number] {
    if (seconds <= 0) {
      return [0, 0, 0, 0];
    }

    const convertedDays: number = Math.trunc(((seconds / 60) / 60) / 24);
    seconds = seconds - convertedDays * 24 * 60 * 60;
    const convertedHours: number = Math.trunc((seconds / 60) / 60);
    seconds = seconds - convertedHours * 60 * 60;
    const convertedMinutes: number = Math.trunc((seconds / 60));
    seconds = seconds - convertedMinutes * 60;
    const convertedSeconds: number = seconds;

    return [convertedDays, convertedHours, convertedMinutes, convertedSeconds];
  }

  private static readonly debounceMillis: number = 300;

  static debounce<T extends (...args: any[]) => void>(
    func: T,
    delayMillis: number = Utils.debounceMillis,
    accessoryName: string,
    log: VirtualLogger,
  ): ((...args: any[]) => void) | undefined {
    if (delayMillis <= 0) {
      log.error(`[${accessoryName}] Invalid delay: ${delayMillis}`);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    return function(this: any, ...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const context = this;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(context, args);
      }, delayMillis)
        .unref();
    };
  }

  static async delay(
    millis: number,
    accessoryName: string,
    log: VirtualLogger,
  ): Promise<unknown> {
    if (millis <= 0) {
      log.error(`[${accessoryName}] Invalid delay: ${millis}`);
      return;
    }
    return new Promise(resolve =>
      setTimeout(resolve, millis)
        .unref(),
    );
  }

  // serialise Map to JSON
  static mapToJson(map: Map<string, string>): string {
    return JSON.stringify(Array.from(map.entries()));
  }

  // de-serialise JSON to Map
  static jsonToMap(json: string): Map<string, string> {
    return new Map(JSON.parse(json));
  }

  /**
   * Get the field name 
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static proxiedPropertiesOf<TObj>(obj?: TObj) {
    return new Proxy({}, {
      get: (_, prop) => prop,
      set: () => {
        throw Error('Set not supported');
      },
    }) as {
        [P in keyof TObj]?: P;
    };
  }

  static required(field: number | string | string[] | undefined): boolean {
    return (field !== undefined);
  }

  static notEmpty(field: string | string[]): boolean {
    let notEmpty: boolean = false;
    if (Utils.required(field)) {
      notEmpty = Array.isArray(field) ? field.length > 0 : field !== '';
    }

    return notEmpty;
  }

  static isPercentage(value: number): boolean {
    return (value >= 0 && value <= 100);
  }

  static isDegrees(value: number): boolean {
    return (value >= 0 && value <= 360);
  }

  static isValidTransition(value: number): boolean {
    return (value >= 0);
  }

  static isValidTimeout(value: number): boolean {
    return (value >= 0);
  }

  static restoreRunningTimer(
    timer: Timer,
    cachedStartTime: string,
    cachedDuration: number,
    callback: () => void,
    accessoryName: string,
    log: VirtualLogger,
  ): void {
    if (cachedDuration < 0) {
      log.error(`[${accessoryName}] Invalid cached duration: ${cachedDuration}`);
      return;
    }

    const elapsedTime: number = Math.trunc(Duration.between(Utils.zonedDateTime(cachedStartTime), Utils.now()).toMillis() / 1000); // seconds
    log.debug(`[${accessoryName}] Elapsed Time: ${elapsedTime}`);
    if (elapsedTime < 0) {
      log.error(`[${accessoryName}] Invalid elapsed time: ${elapsedTime}. Start time cannot be in the future`);
      return;
    }

    let timeRemaining: number = (cachedDuration - elapsedTime);
    log.debug(`[${accessoryName}] Time Remaining: ${timeRemaining}`);

    // If the timer is expired, set timer to 1 second to issue trigger switch off
    timeRemaining = (timeRemaining <= 0) ? 1 : timeRemaining;

    if (timeRemaining === 1) {
      log.debug(`[${accessoryName}] Timer expired. Setting timer to 1 second to trigger switch off`);
    } else {
      log.debug(`[${accessoryName}] Setting Timer for remaining time of (${timeRemaining} seconds)`);
    }

    timer.stop();
    timer.start(
      callback,
      timeRemaining,
    );
  }
}
