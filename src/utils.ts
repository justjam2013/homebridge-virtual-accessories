import { Instant, ZonedDateTime, ZoneId } from '@js-joda/core';
import '@js-joda/timezone';

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
    let time: number = seconds;
    const hours = Math.floor(time / 3600);
    time = time - (hours * 3600);
    const mins = Math.floor(time / 60);
    const secs = time - (mins * 60);

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
    const convertedSeconds: number = (((days * 24) + hours) * 60 + minutes) * 60 + seconds;

    return convertedSeconds;
  }

  static secondsToDaysHoursMinutesSeconds(
    seconds: number,
  ): [number, number, number, number] {
    if (seconds === 0) {
      return [0, 0, 0, 0];
    }

    const convertedDays = Math.trunc(((seconds / 60) / 60) / 24);
    seconds = seconds - convertedDays * 24 * 60 * 60;
    const convertedHours = Math.trunc((seconds / 60) / 60);
    seconds = seconds - convertedHours * 60 * 60;
    const convertedMinutes = Math.trunc((seconds / 60));
    seconds = seconds - convertedMinutes * 60;
    const convertedSeconds = seconds;

    return [convertedDays, convertedHours, convertedMinutes, convertedSeconds];
  }


  static isPoweredState(value: string): boolean {
    let isPowerState = false;

    if ((value !== undefined) &&
        [ 'on', 'off' ].includes(value)
    ) {
      isPowerState = true;
    }

    return isPowerState;
  }

  static isPercentage(value: number): boolean {
    let isPercentage = false;

    if ((value !== undefined) &&
        (value >= 0 && value <= 100)
    ) {
      isPercentage = true;
    }

    return isPercentage;
  }

  static isRotationDirection(value: string): boolean {
    let isRotation = false;

    if ((value !== undefined) &&
        [ 'clockwise', 'counterclockwise' ].includes(value)
    ) {
      isRotation = true;
    }

    return isRotation;
  }

  static isTransitionDuration(value: number): boolean {
    let isTransitionDuration = false;

    if ((value !== undefined) &&
        (value >= 0)
    ) {
      isTransitionDuration = true;
    }

    return isTransitionDuration;
  }

  static isTimeout(value: number): boolean {
    return Utils.isTransitionDuration(value);
  }
}
