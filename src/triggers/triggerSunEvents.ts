import { SunEventsTriggerConfiguration } from '../configuration/configurationSunEventsTrigger.js';
import { VirtualSensor } from '../sensors/virtualSensor.js';
import { Trigger } from './trigger.js';

import { Cron } from 'croner';
import { Type, deserialize } from 'typeserializer';
import 'reflect-metadata';

/**
 * SunEventsTrigger - Trigger implementation
 */
export class SunEventsTrigger extends Trigger {

  private SunTimesURL = (latitude: string, longitude: string) => `https://api.sunrisesunset.io/json?lat=${latitude}&lng=${longitude}`;

  private eventCronJob!: Cron;
  private dataCronJob!: Cron;

  private timezone: string | undefined;

  constructor(
    sensor: VirtualSensor,
    name: string,
  ) {
    super(sensor, name);

    const triggerConfig: SunEventsTriggerConfiguration = this.sensorConfig.sunEventsTrigger;

    if (triggerConfig.isDisabled) {
      this.log.info(`[${this.sensorConfig.accessoryName}] Sun Events trigger is disabled`);
      return;
    }

    // TODO: This could create race condition if it runs at 00:01
    this.setupSunEvent(triggerConfig, sensor);

    const pattern: string = '1 0 * * *';    // Every day at 00:01 - one minute after midnight
    const timezone: string = triggerConfig.zoneId;

    this.log.debug(`[${this.sensorConfig.accessoryName}] Creating data cron job: pattern ${pattern}; timezone ${timezone}`);

    this.dataCronJob = new Cron(
      pattern,
      {
        timezone: timezone,
      },
      (async () => {
        this.log.debug(`[${this.sensorConfig.accessoryName}] Matched cron pattern '${pattern}'. Triggering sensor`);

        this.setupSunEvent(triggerConfig, sensor);
      }),
    );
  }

  private async setupSunEvent(
    triggerConfig: SunEventsTriggerConfiguration,
    sensor: VirtualSensor,
  ) {
    await this.getSunEventsData(triggerConfig.latitude, triggerConfig.longitude)
      .then(
        (async (response: Response | undefined) => {
          if (response !== undefined) {
            if (response.status !== Response.OK) {
              this.log.error(`[${this.sensorConfig.accessoryName}] Sunrise/sunset server returned error response: ${response.status}`);
            } else {
              await this.setupEventCron(triggerConfig.event, response.results, sensor);
            }
          }
        }),
      );
  }
  
  private async getSunEventsData(
    latitude: string,
    longitude: string,
  ): Promise<Response | undefined> {
    const url: string = this.SunTimesURL(latitude, longitude);

    this.log.debug(`[${this.sensorConfig.accessoryName}] Retrieving sunrise/sunset data from: ${(url)}`);

    const dataFetchResponse = await fetch(url);
    const dataResponse = await dataFetchResponse.text();

    this.log.debug(`[${this.sensorConfig.accessoryName}] Retrieved sunrise/sunset data: ${(dataResponse)}`);

    let response: Response | undefined;
    try {
      response = deserialize(dataResponse, Response);
    } catch (error) {
      this.log.error(`[${this.sensorConfig.accessoryName}] Error deserializing sunrise/sunset data: ${JSON.stringify(error)}`);
    }

    return response;
  }

  private async setupEventCron(
    event: string,
    dailyDetails: DailyDetails,
    sensor: VirtualSensor,
  ) {
    let eventTime: string | undefined;
    switch (event) {
    case 'sunrise':
      eventTime = dailyDetails.sunrise;
      break;
    case 'sunset':
      eventTime = dailyDetails.sunset;
      break;
    case 'goldenhour':
      eventTime = dailyDetails.golden_hour;
      break;
    default:
      this.log.error(`[${this.sensorConfig.accessoryName}] Error creating sunrise/sunset trigger. Invalid event: ${event}`);
      return;
    }

    const cronRunTimestamp: string = `${dailyDetails.date}T${this.militaryTime(eventTime)}`;
    const runTimezone: string = dailyDetails.timezone;
    this.log.debug(`[${this.sensorConfig.accessoryName}] Creating cron for: event ${event}; timestamp ${cronRunTimestamp}; timezone ${runTimezone}`);

    // Hardcode reset delay
    const resetDelayMillis: number = 3 * 1000;     // 3 second reset delay

    if (this.eventCronJob !== undefined) {
      this.eventCronJob.stop();
    }

    this.eventCronJob = new Cron(
      cronRunTimestamp,
      {
        maxRuns: 1,
        timezone: runTimezone,
      },
      (async () => {
        this.log.debug(`[${this.sensorConfig.accessoryName}] Matched event time '${cronRunTimestamp}'. Triggering sensor`);

        sensor.triggerKeySensorState(this.sensor.OPEN_TRIGGERED, this);
        await this.delay(resetDelayMillis);
        sensor.triggerKeySensorState(this.sensor.CLOSED_NORMAL, this);
      }),
    );
  }

  private delay(millis: number) {
    return new Promise(resolve => setTimeout(resolve, millis));
  }

  private militaryTime(
    time: string,
  ): string {
    const timeParts: string[] = time.split(' ', 2);
    const unitParts: string[] = timeParts[0].split(':', 3);

    if (timeParts[1] === 'PM') {
      unitParts[0] = String(Number(unitParts[0]) + 12);
    }

    if (unitParts[0].length === 1) {
      unitParts[0] = `0${unitParts[0]}`;
    }

    return unitParts.join(':');
  }
}

class DailyDetails {

  date!: string;
  sunrise!: string;
  sunset!: string;
  first_light!: string;
  last_light!: string;
  dawn!: string;
  dusk!: string;
  solar_noon!: string;
  golden_hour!: string;
  day_length!: string;
  timezone!: string;
  utc_offset!: string;
}

class Response {

  static readonly OK: string = 'OK';

  @Type(DailyDetails)
    results!: DailyDetails;

  status!: string;
}
