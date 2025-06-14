/* eslint-disable @typescript-eslint/no-explicit-any */

import { Instant, ZonedDateTime, ZoneId } from '@js-joda/core';
import '@js-joda/timezone';

/**
 * Utils
 */
export class Utils {

  static now(): ZonedDateTime {
    const now = ZonedDateTime.ofInstant(Instant.now(), ZoneId.SYSTEM);
    return now;
  }

  static zonedDateTime(datetime: string): ZonedDateTime {
    const zonedDateTime = ZonedDateTime.parse(datetime);
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
  ): (...args: any[]) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function(this: any, ...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const context = this;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(context, args);
      }, delayMillis);
    };
  }

  static async delay(millis: number) {
    return new Promise(resolve => setTimeout(resolve, millis));
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

  static required(field: number | string | string[]): boolean {
    return (field !== undefined);
  }

  static notEmpty(field: string | string[]): boolean {
    let notEmpty = false;
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
}
