import { Instant, ZonedDateTime, ZoneId } from '@js-joda/core';
import '@js-joda/timezone';

export class Utils {

  static now(): ZonedDateTime {
    const now = ZonedDateTime.ofInstant(Instant.now(), ZoneId.SYSTEM);
    return now;
  }

  static zonedDateTime(datetime: string) {
    const zonedDateTime = ZonedDateTime.parse(datetime);
    return zonedDateTime;
  }
}
