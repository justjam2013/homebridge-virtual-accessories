/* eslint-disable curly */

import { ZoneId } from '@js-joda/core';
import '@js-joda/timezone';

/**
 * 
 */
export class CronTriggerConfiguration {
  pattern!: string;
  zoneId!: string;
  startDateTime!: string;
  endDateTime!: string;
  disableTriggerEventLogging: boolean = false;
  isDisabled: boolean = false;

  // private static cronPattern = '^((((\\d+,)+\\d+|(\\d+(\\/|-|#)\\d+)|\\d+L?|\\*(\\/\\d+)?|L(-\\d+)?|\\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$';
  // 5: minutes granularity
  // 6: seconds granularity
  // 7: milliseconds granularity
  private static cronMinutesGranularityPattern = '^((((\\d+,)+\\d+|(\\d+(\\/|-|#)\\d+)|\\d+L?|\\*(\\/\\d+)?|L(-\\d+)?|\\?|[A-Z]{3}(-[A-Z]{3})?) ?){5})$';
  //private static isoTimeNoMillisPattern = '^\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d([+-][0-2]\\d:[0-5]\\d|Z)$';
  private static isoTimeNoMillisPattern = '^\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d(Z|)$';

  private errorFields: string[] = [];

  isValid(): [boolean, string[]] {
    const patternRegex = new RegExp(CronTriggerConfiguration.cronMinutesGranularityPattern);
    const isValidPattern: boolean = (
      (this.pattern !== undefined) &&
      patternRegex.test(this.pattern)
    );

    const isValidZoneId = this.isValidZoneId(this.zoneId);

    const isoTimeRegex = new RegExp(CronTriggerConfiguration.isoTimeNoMillisPattern);
    const isValidStartDateTime = (
      (this.startDateTime !== undefined) ?
        isoTimeRegex.test(this.startDateTime) :
        true
    );
    const isValidEndDateTime = (
      (this.endDateTime !== undefined) ?
        isoTimeRegex.test(this.endDateTime) :
        true
    );

    let isValidExecutionRangeDateTime = true;
    if (this.startDateTime !== undefined && this.endDateTime !== undefined) {
      const startDate = new Date(this.startDateTime);
      const endDate = new Date(this.endDateTime);
      isValidExecutionRangeDateTime = endDate.getTime() > startDate.getTime();
    }

    if (!isValidPattern) this.errorFields.push('pattern');
    if (!isValidZoneId) this.errorFields.push('zoneId');
    if (!isValidStartDateTime) this.errorFields.push('startDateTime');
    if (!isValidEndDateTime) this.errorFields.push('endDateTime');
    if (!isValidExecutionRangeDateTime) this.errorFields.push('startDateTime', 'endDateTime');

    return [
      (isValidPattern &&
        isValidZoneId &&
        isValidStartDateTime &&
        isValidEndDateTime &&
        isValidExecutionRangeDateTime),
      this.errorFields,
    ];
  }

  private isValidZoneId(zoneId: string): boolean {
    const availableZoneIds: string[] = ZoneId.getAvailableZoneIds();

    const isValidZoneId: boolean = availableZoneIds.includes(zoneId);

    return isValidZoneId;
  }
}
