import { CronTriggerConfiguration } from '../configuration/configurationCronTrigger.js';
import { Trigger } from './trigger.js';
import { VirtualSensor } from '../sensors/virtualSensor.js';
import { Utils } from '../utils.js';

import { DateTimeFormatter, LocalDateTime, ZonedDateTime, ZoneId } from '@js-joda/core';
import '@js-joda/timezone';
import { Cron } from 'croner';

/**
 * CronTrigger - Trigger implementation
 */
export class CronTrigger extends Trigger {

  private cronJob!: Cron;

  constructor(
    sensor: VirtualSensor,
    name: string,
  ) {
    super(sensor, name);

    const triggerConfig: CronTriggerConfiguration = this.sensorConfig.cronTrigger;

    if (triggerConfig.isDisabled) {
      this.log.info(`[${this.sensorConfig.accessoryName}] Cron trigger is disabled`);
      return;
    }

    if (triggerConfig.disableTriggerEventLogging) {
      this.log.info(`[${this.sensorConfig.accessoryName}] Cron trigger event logging is disabled. Sensor state changes will not be displayed in the logs`);
    }

    // Hardcode reset delay
    const resetDelayMillis: number = 3 * 1000;     // 3 second reset delay

    // System settings - date/time formatting - timezone
    const timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;  // 'America/Los_Angeles'
    this.log.debug(`[${this.sensorConfig.accessoryName}] Setting cron timeZone to '${timeZone}'`);

    // User entered zone id - it is never undefined
    const zoneId: ZoneId = (triggerConfig.zoneId === undefined) ? ZoneId.SYSTEM : ZoneId.of(triggerConfig.zoneId);
    this.log.debug(`[${this.sensorConfig.accessoryName}] Setting ZoneId to '${zoneId}'`);

    const cronStart: ZonedDateTime | undefined = this.getZonedDateTime(triggerConfig.startDateTime, zoneId);
    const cronEnd: ZonedDateTime | undefined = this.getZonedDateTime(triggerConfig.endDateTime, zoneId);

    this.log.debug(`[${this.sensorConfig.accessoryName}] Start time: '${cronStart?.format(DateTimeFormatter.ISO_ZONED_DATE_TIME)}'`);
    this.log.debug(`[${this.sensorConfig.accessoryName}] End time:   '${cronEnd?.format(DateTimeFormatter.ISO_ZONED_DATE_TIME)}'`);
    this.log.debug(`[${this.sensorConfig.accessoryName}] Now time:   '${Utils.now().format(DateTimeFormatter.ISO_ZONED_DATE_TIME)}'`);

    // If we're past the end date, don't even bother starting up the cron job
    if (cronEnd && Utils.now().isAfter(cronEnd)) {
      this.log.info(`[${this.sensorConfig.accessoryName}] After cron end: '${triggerConfig.endDateTime}'. Not setting up cron job`);
      return;

      // eslint-disable-next-line brace-style
    }
    else if (cronStart && (Utils.now().isEqual(cronStart) || Utils.now().isBefore(cronStart))) {
      this.log.info(`[${this.sensorConfig.accessoryName}] Before cron start: '${triggerConfig.startDateTime}'. Waiting for start time`);
    }

    let firstTrigger: boolean = true;
    this.cronJob = new Cron(
      triggerConfig.pattern,
      {
        name: 'Schedule Cron Job',
        startAt: triggerConfig.startDateTime, 
        stopAt: triggerConfig.endDateTime,
        timezone: triggerConfig.zoneId,
      },
      (async () => {
        if (firstTrigger) {
          this.log.info(`[${this.sensorConfig.accessoryName}] Starting cron job`);
          firstTrigger = false;
        }

        this.log.debug(`[${this.sensorConfig.accessoryName}] Matched cron pattern '${triggerConfig.pattern}'. Triggering sensor`);

        sensor.triggerKeySensorState(this.sensor.OPEN_TRIGGERED, this, triggerConfig.disableTriggerEventLogging);
        await this.delay(resetDelayMillis);
        sensor.triggerKeySensorState(this.sensor.CLOSED_NORMAL, this, triggerConfig.disableTriggerEventLogging);
      }),
    );

    this.displayNextRun(this.cronJob);
  }

  /**
   * Private methods
   */

  private displayNextRun(
    cronJob: Cron,
  ) {
    let nextRunTimestamp: string | undefined = cronJob.nextRun()?.toISOString();
    nextRunTimestamp = (nextRunTimestamp === undefined) ?
      'None scheduled' :
      `${nextRunTimestamp.split('.')[0]} (count: ${cronJob.options.maxRuns})`;
    this.log.debug(`[${this.sensorConfig.accessoryName}] Next ${cronJob.name} run: ${nextRunTimestamp}`);
  }

  private delay(millis: number) {
    return new Promise(resolve => setTimeout(resolve, millis));
  }

  private getZonedDateTime(datetime: string | undefined, zoneId: ZoneId): ZonedDateTime | undefined {
    if (datetime === undefined) {
      return undefined;
    }

    const localDateTimeLength = 'yyyy:MM:ddThh:mm:ss'.length;
    const localDatetime = datetime.substring(0, localDateTimeLength);

    const zonedDateTime: ZonedDateTime = ZonedDateTime.of(LocalDateTime.parse(localDatetime), zoneId);
    return zonedDateTime;
  }
}

export const dynamicTrigger = CronTrigger;
