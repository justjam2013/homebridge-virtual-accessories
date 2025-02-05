import { SunEventsTriggerConfiguration } from '../configuration/configurationSunEventsTrigger.js';
import { VirtualSensor } from '../sensors/virtualSensor.js';
import { Trigger } from './trigger.js';
import { Utils } from '../utils.js';

import { Cron } from 'croner';
import { Type, deserialize } from 'typeserializer';
import 'reflect-metadata';

/**
 * SunEventsTrigger - Trigger implementation
 */
export class SunEventsTrigger extends Trigger {

  private SunTimesURL = (latitude: string, longitude: string) => `https://api.sunrisesunset.io/json?lat=${latitude}&lng=${longitude}`;

  private triggerCronJob!: Cron;
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

    // Data retrieval cron job

    const pattern: string = '1 0 * * *';    // Every day at 00:01 - one minute after midnight
    const timezone: string = triggerConfig.zoneId;

    this.log.debug(`[${this.sensorConfig.accessoryName}] Creating data cron job: pattern ${pattern}; timezone ${timezone}`);

    this.dataCronJob = new Cron(
      pattern,
      {
        name: 'Fetch Sun Data Cron Job',
        timezone: timezone,
      },
      (async () => {
        this.log.debug(`[${this.sensorConfig.accessoryName}] Matched data cron job pattern '${pattern}'. Triggering sensor`);

        this.setupSunEvent(triggerConfig, sensor);

        this.displayNextRun(this.dataCronJob);
      }),
    );

    this.displayNextRun(this.dataCronJob);
  }

  private displayNextRun(
    cronJob: Cron,
  ) {
    let nextRunTimestamp: string | undefined = cronJob.nextRun()?.toISOString();
    nextRunTimestamp = (nextRunTimestamp === undefined) ?
      'None scheduled' :
      `${nextRunTimestamp.split('.')[0]} (count: ${cronJob.options.maxRuns})`;
    this.log.debug(`[${this.sensorConfig.accessoryName}] Next ${cronJob.name} run: ${nextRunTimestamp}`);
  }

  private async setupSunEvent(
    triggerConfig: SunEventsTriggerConfiguration,
    sensor: VirtualSensor,
  ) {
    await this.getSunEventsData(triggerConfig.latitude, triggerConfig.longitude)
      .then(
        (async (response: SunEventsResponse | undefined) => {
          if (response !== undefined) {
            if (response.status !== SunEventsResponse.OK) {
              this.log.error(`[${this.sensorConfig.accessoryName}] Sunrise/sunset server returned error response: ${response.status}`);
            } else {
              await this.setupTriggerCron(triggerConfig.event, response.results, sensor);
            }
          }
        }),
      );
  }
  
  private async getSunEventsData(
    latitude: string,
    longitude: string,
  ): Promise<SunEventsResponse | undefined> {
    let response: SunEventsResponse | undefined;

    const request = new Request(this.SunTimesURL(latitude, longitude), { method: 'GET' });
    this.log.debug(`[${this.sensorConfig.accessoryName}] Requesting sunrise/sunset data from: ${(request.url)}`);

    const maxAttempts: number = 5;
    const millis: number = 60 * 1000;
    const waitMinutes: number = 2;
    // Attempts over 30 minutes
    // Backoff / retry schedule:
    // 1 * 2 = 2 mins   / :00 + 2 mins = :02
    // 2 * 2 = 4 mins   / :02 + 4 mins = :06
    // 3 * 2 = 6 mins   / :06 + 6 mins = :12
    // 4 * 2 = 8 mins   / :12 + 8 mins = :20
    // 5 * 2 = 10 mins  / :20 + 10 mins = :30

    let dataResponse: string | undefined;
    let gaveUp: boolean = false;

    try {
      let attempts: number = 0;
      let dataFetchResponse: globalThis.Response;
      do {
        dataFetchResponse = await fetch(request);
        if (!dataFetchResponse.ok) {
          this.log.error(`[${this.sensorConfig.accessoryName}] Error fetching sunrise/sunset data. Response status: ${dataFetchResponse.status}`);
          attempts++;
          
          const baseErrorMsg: string = `Failed ${attempts} of ${maxAttempts} attempts.`;

          if (attempts === maxAttempts) {
            gaveUp = true;
            this.log.error(`[${this.sensorConfig.accessoryName}] ${baseErrorMsg} Giving up`);
          } else {
            const backoffMinutes: number = (attempts * waitMinutes);
            this.log.error(`[${this.sensorConfig.accessoryName}] ${baseErrorMsg} Waiting ${backoffMinutes} minutes until next attempt`);
            await new Promise(resolve => setTimeout(resolve, backoffMinutes * millis));
          }
        }
      } while (!dataFetchResponse.ok && attempts < maxAttempts);

      if (!gaveUp) {
        dataResponse = await dataFetchResponse.text();
        this.log.debug(`[${this.sensorConfig.accessoryName}] Fetched sunrise/sunset data: ${(dataResponse)}`);

        response = this.desrializeSunEventsResponse(dataResponse);
      }
    } catch (error) {
      this.log.error(`[${this.sensorConfig.accessoryName}] Failed getting sunrise/sunset data: ${JSON.stringify(error)}`);
    }

    return response;
  }

  desrializeSunEventsResponse(
    dataResponse: string,
  ): SunEventsResponse | undefined {
    let response: SunEventsResponse | undefined;

    try {
      response = deserialize(dataResponse, SunEventsResponse);
    } catch (error) {
      this.log.error(`[${this.sensorConfig.accessoryName}] Error deserializing response data: ${JSON.stringify(error)}`);
      this.log.debug(`[${this.sensorConfig.accessoryName}] Response data: ${response}`);
    }

    return response;
  }

  private async setupTriggerCron(
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

    // Just in case
    if (this.triggerCronJob !== undefined) {
      this.triggerCronJob.stop();
    }

    this.triggerCronJob = new Cron(
      cronRunTimestamp,
      {
        name: 'Sun Events Cron Job',
        maxRuns: 1,
        timezone: runTimezone,
      },
      (async () => {
        const now = Utils.now().toString();
        this.log.debug(`[${this.sensorConfig.accessoryName}] Now ${now} matched event time '${cronRunTimestamp}'. Triggering sensor`);

        sensor.triggerKeySensorState(this.sensor.OPEN_TRIGGERED, this);
        await this.delay(resetDelayMillis);
        sensor.triggerKeySensorState(this.sensor.CLOSED_NORMAL, this);
      }),
    );

    this.displayNextRun(this.triggerCronJob);
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

class SunEventsResponse {

  static readonly OK: string = 'OK';

  @Type(DailyDetails)
    results!: DailyDetails;

  status!: string;
}
