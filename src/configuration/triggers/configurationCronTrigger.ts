/* eslint-disable curly */

import { Validatable } from '../validatable.js';

import { Utils } from '../../utils/utils.js';

import { LocalDateTime, ZoneId } from '@js-joda/core';
import '@js-joda/timezone';

/**
 * 
 */
export class CronTriggerConfiguration implements Validatable {
  pattern!: string;
  zoneId!: string;
  startDateTime!: string;
  endDateTime!: string;
  disableTriggerEventLogging: boolean = false;
  isDisabled: boolean = false;

  // 5: minutes granularity
  // 6: seconds granularity
  // 7: milliseconds granularity
  private static cronMinutesGranularityPattern = '^((((\\d+,)+\\d+|(\\d+(\\/|-|#)\\d+)|\\d+L?|\\*(\\/\\d+)?|L(-\\d+)?|\\?|[A-Z]{3}(-[A-Z]{3})?) ?){5})$';
  private static isoTimeNoMillisPattern = '^\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d(:[0-5]\\d|)$';

  private errorFields: string[] = [];

  readonly fieldNames = Utils.proxiedPropertiesOf(this);

  isValid(prefix: string): [boolean, string[]] {
    const patternRegex = new RegExp(CronTriggerConfiguration.cronMinutesGranularityPattern);
    const isValidPattern: boolean = (
      Utils.required(this.pattern) &&
      patternRegex.test(this.pattern)
    );

    const isValidZoneId = (this.zoneId === undefined) || this.isValidZoneId(this.zoneId);

    const isoTimeRegex = new RegExp(CronTriggerConfiguration.isoTimeNoMillisPattern);
    const isValidStartDateTime = (
      (this.startDateTime !== undefined) ?
        isoTimeRegex.test(this.startDateTime):
        true
    );
    const isValidEndDateTime = (
      (this.endDateTime !== undefined) ?
        isoTimeRegex.test(this.endDateTime):
        true
    );

    let isValidExecutionRangeDateTime = true;
    if (this.startDateTime !== undefined && this.endDateTime !== undefined) {
      const startDate = LocalDateTime.parse(this.startDateTime);
      const endDate = LocalDateTime.parse(this.endDateTime);
      isValidExecutionRangeDateTime = endDate.isAfter(startDate);
    }

    if (!isValidPattern) this.errorFields.push(prefix + '.' + this.fieldNames.pattern!);
    if (!isValidZoneId) this.errorFields.push(prefix + '.' + this.fieldNames.zoneId!);
    if (!isValidStartDateTime) this.errorFields.push(prefix + '.' + this.fieldNames.startDateTime!);
    if (!isValidEndDateTime) this.errorFields.push(prefix + '.' + this.fieldNames.endDateTime!);
    if (!isValidExecutionRangeDateTime) this.errorFields.push(prefix + '.' + this.fieldNames.startDateTime!, prefix + '.' + this.fieldNames.endDateTime!);

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
