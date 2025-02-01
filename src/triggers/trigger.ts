import { Logging } from 'homebridge';

import { VirtualSensor } from '../sensors/virtualSensor.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';

import { Instant, ZonedDateTime, ZoneId } from '@js-joda/core';
import '@js-joda/timezone';

/**
 * Abstract Trigger
 */
export abstract class Trigger {

  protected sensor: VirtualSensor;
  readonly sensorConfig: AccessoryConfiguration;

  readonly name: string;

  protected log: Logging;

  constructor(
    sensor: VirtualSensor,
    name: string,
  ) {
    this.sensor = sensor;
    this.sensorConfig = this.sensor.accessoryConfiguration;

    this.name = name;

    this.log = this.sensor.platform.log;
  }

  protected now() {
    const now = ZonedDateTime.ofInstant(Instant.now(), ZoneId.SYSTEM);
    return now;
  }
}
