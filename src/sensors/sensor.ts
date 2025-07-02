import type { Characteristic, CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from '../accessories/accessory.js';

import { AccessoryFactory } from '../accessoryFactory.js';
import { Trigger } from './triggers/trigger.js';
import { TriggerNotAllowedError, InvalidSensorValue } from '../errors.js';

/**
 * Sensor - Abstract accessory
 */
export abstract class Sensor extends Accessory {

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  static readonly NORMAL_INACTIVE: string = 'NORMAL-INACTIVE';
  static readonly TRIGGERED_ACTIVE: string = 'TRIGGERED-ACTIVE';

  static readonly NORMAL: number = 0;
  static readonly TRIGGERED: number = 1;

  protected trigger: Trigger | undefined;

  protected eventDetected: WithUUID<{ new (): Characteristic; }>;

  protected states = {
    SensorState: Sensor.NORMAL,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    this.eventDetected = this.getEventDetectedCharacteristic();

    const sensorService: WithUUID<typeof Service> = this.getService();
    this.service = this.accessory.getService(sensorService) || this.accessory.addService(sensorService as unknown as Service);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Sensor Current State: ${Sensor.getStateName(this.states.SensorState)}`);
    this.service.updateCharacteristic(this.eventDetected, (this.states.SensorState));

    // register handlers

    this.service.getCharacteristic(this.eventDetected)
      .onGet(this.getEventDetected.bind(this));

    // Create Trigger
    if (this.accessoryConfiguration.sensor !== undefined && this.accessoryConfiguration.sensor.trigger !== undefined) {
      this.trigger = AccessoryFactory.createTrigger(this, this.accessoryConfiguration.sensor.trigger, this.accessoryConfiguration.accessoryName + ' Trigger');
    }
  }

  getTrigger(): Trigger {
    return this.trigger!;
  }

  protected abstract getService(): WithUUID<typeof Service>;

  protected abstract getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }>;

  // Handlers

  async getEventDetected(): Promise<CharacteristicValue> {
    const sensorState = this.states.SensorState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Sensor Current State: ${Sensor.getStateName(sensorState)}`);

    return sensorState;
  }

  protected getJsonState(): string {
    return JSON.stringify({});
  }

  static getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case Sensor.NORMAL: { sensorStateName = Sensor.NORMAL_INACTIVE; break; }
    case Sensor.TRIGGERED: { sensorStateName = Sensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }

  /**
   * This method is called by this sensor's trigger
   */
  async triggerSensorState(sensorState: number, trigger: Trigger, isLoggingDisabled: boolean = false) {
    if (trigger.sensorConfig.accessoryID !== this.accessoryConfiguration.accessoryID) {
      throw new TriggerNotAllowedError(`Trigger ${trigger.name} is not allowed to trigger this sensor`);
    }

    if (![Sensor.NORMAL, Sensor.TRIGGERED].includes(sensorState)) {
      throw new InvalidSensorValue(`Sensor value ${Sensor.getStateName(sensorState)} is not a valid state`);
    }

    // Only update the sensor if the state has changed
    if (this.states.SensorState !== sensorState) {
      this.states.SensorState = sensorState;

      this.service!.updateCharacteristic(this.eventDetected, (this.states.SensorState));

      // eslint-disable-next-line max-len
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Sensor Current State: ${Sensor.getStateName(this.states.SensorState)}`, isLoggingDisabled);
    }
  }
}
