import { DateTimeFormatter, Instant, LocalDateTime, ZonedDateTime, ZoneId } from '@js-joda/core';
import '@js-joda/timezone';

import { Trigger } from './trigger.js';
import { VirtualSensor } from './virtualSensor.js';

import { CronJob } from 'cron';

export class CronTrigger extends Trigger {

  private cronJob;

  constructor(
    sensor: VirtualSensor,
  ) {
    super(sensor);

    const trigger = this.sensorConfig.cronTrigger;
    if (trigger.isDisabled) {
      this.sensor.platform.log.info(`[${this.sensorConfig.accessoryName}] Cron trigger is disabled`);
      return;
    }

    // Hardcode reset delay
    const resetDelayMillis: number = 3 * 1000;     // 3 second reset delay

    const timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;  // 'America/Los_Angeles'

    if (!this.isValidCronPattern(trigger.pattern)) {
      this.sensor.platform.log.error(`[${this.sensorConfig.accessoryName}] Cron time ${trigger.pattern} is not valid`);
      return;
    }

    let zoneId: ZoneId;
    if (trigger.zoneId === undefined) {
      zoneId = ZoneId.SYSTEM;

      // eslint-disable-next-line brace-style
    }
    else if (!this.isValidZoneId(trigger.zoneId)) {
      this.sensor.platform.log.error(`[${this.sensorConfig.accessoryName}] ZoneId ${trigger.zoneId} is not valid. Cron trigger was not created`);
      return;

      // eslint-disable-next-line brace-style
    }
    else {
      this.sensor.platform.log.debug(`[${this.sensorConfig.accessoryName}] Setting ZoneId to '${trigger.zoneId}'`);
      zoneId = ZoneId.of(trigger.zoneId);
    }

    const cronStart: ZonedDateTime | undefined = this.getZonedDateTime(trigger.startDateTime, zoneId);
    const cronEnd: ZonedDateTime | undefined = this.getZonedDateTime(trigger.endDateTime, zoneId);

    this.sensor.platform.log.debug(`[${this.sensorConfig.accessoryName}] Start time: '${cronStart?.format(DateTimeFormatter.ISO_ZONED_DATE_TIME)}'`);
    this.sensor.platform.log.debug(`[${this.sensorConfig.accessoryName}] End time:   '${cronEnd?.format(DateTimeFormatter.ISO_ZONED_DATE_TIME)}'`);
    this.sensor.platform.log.debug(`[${this.sensorConfig.accessoryName}] Now time:   '${this.now().format(DateTimeFormatter.ISO_ZONED_DATE_TIME)}'`);

    // If we're past the end date, don't even bother starting up the cron job
    if (cronEnd && this.now().isAfter(cronEnd)) {
      this.sensor.platform.log.info(`[${this.sensorConfig.accessoryName}] After cron end: '${trigger.endDateTime}'. Not setting up cron job`);
      return;

      // eslint-disable-next-line brace-style
    }
    else if (cronStart && (this.now().isEqual(cronStart) || this.now().isBefore(cronStart))) {
      this.sensor.platform.log.info(`[${this.sensorConfig.accessoryName}] Before cron start: '${trigger.startDateTime}'. Waiting for start time`);
    }

    let firstTrigger: boolean = true;
    this.cronJob = new CronJob(
      trigger.pattern,
      (async () => {
        // If we're before the start date, skip
        if (cronStart && this.now().isBefore(cronStart)) {
          this.sensor.platform.log.debug(`[${this.sensorConfig.accessoryName}] Before cron start: '${trigger.startDateTime}'. Not triggering sensor`);

          // eslint-disable-next-line brace-style
        }
        else {
          if (firstTrigger) {
            this.sensor.platform.log.info(`[${this.sensorConfig.accessoryName}] Starting cron job`);
            firstTrigger = false;
          }

          this.sensor.platform.log.debug(`[${this.sensorConfig.accessoryName}] Matched cron pattern '${trigger.pattern}'. Triggering sensor`);

          sensor.setSensorState(this.sensor.OPEN_TRIGGERED);
          await this.delay(resetDelayMillis);
          sensor.setSensorState(this.sensor.CLOSED_NORMAL);
        }

        // If we're after the end date, terminate the cron job
        if (cronEnd && this.now().isAfter(cronEnd)) {
          this.sensor.platform.log.debug(`[${this.sensorConfig.accessoryName}] After cron end: '${trigger.endDateTime}'. Stopping cron job`);

          this.sensor.platform.log.info(`[${this.sensorConfig.accessoryName}] Stopping cron job`);
          this.cronJob.stop();
        }
      }),                       // onTick
      null,                     // onComplete
      false,                    // start
      timeZone,                 // timeZone
    );
    this.cronJob.start();
  }

  private delay(millis: number) {
    return new Promise(resolve => setTimeout(resolve, millis));
  }

  private isValidCronPattern(cronTime: string): boolean {
    // Constrain trigger frequency to minute granularity
    const cronPattern = '^((((\\d+,)+\\d+|(\\d+(\\/|-|#)\\d+)|\\d+L?|\\*(\\/\\d+)?|L(-\\d+)?|\\?|[A-Z]{3}(-[A-Z]{3})?) ?){5})$';
    // const cronPattern = '^((((\\d+,)+\\d+|(\\d+(\\/|-|#)\\d+)|\\d+L?|\\*(\\/\\d+)?|L(-\\d+)?|\\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$';
    const regex = new RegExp(cronPattern);
    return regex.test(cronTime);
  }

  private isValidZoneId(zoneId: string): boolean {
    const availableZoneIds: string[] = ZoneId.getAvailableZoneIds();
    const isValidZoneId: boolean = availableZoneIds.includes(zoneId);

    if (!isValidZoneId) {
      this.sensor.platform.log.debug(`[${this.sensorConfig.accessoryName}] Zone id ${zoneId} not found (available zone ids: ${availableZoneIds.length})`);
    }

    return isValidZoneId;
  }

  private getZonedDateTime(datetime: string, zoneId: ZoneId): ZonedDateTime | undefined {
    if (datetime === undefined) {
      return undefined;
    }

    const localDateTimeLength = 'yyyy:MM:ddThh:mm:ss'.length;
    const localDatetime = datetime.substring(0, localDateTimeLength);

    const zonedDateTime: ZonedDateTime = ZonedDateTime.of(LocalDateTime.parse(localDatetime), zoneId);
    return zonedDateTime;
  }

  private now() {
    const now = ZonedDateTime.ofInstant(Instant.now(), ZoneId.SYSTEM);
    return now;
  }
}

export const dynamicTrigger = CronTrigger;
