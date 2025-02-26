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
}
