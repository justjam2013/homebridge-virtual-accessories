/* eslint-disable max-len */

import type { Characteristic, CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from '../accessories/accessory.js';

import { AccessoryFactory } from '../accessoryFactory.js';
import { Trigger } from './triggers/trigger.js';
import { TriggerNotAllowedError, InvalidSensorValue } from '../errors.js';
import { TriggeredState } from './sensorCharacteristics.js';

/**
 * Sensor - Abstract accessory
 */
export abstract class BinarySensor<S extends typeof Service> extends Accessory<S> {

  protected trigger: Trigger | undefined;

  protected eventDetected: WithUUID<{ new (): Characteristic; }>;

  // Device states
  protected State: number = TriggeredState.NORMAL;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    serviceType: S,
    accessoryTypeName: string,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      serviceType,
      accessoryTypeName,
    );

    this.eventDetected = this.getEventDetectedCharacteristic();

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Sensor Current State: ${TriggeredState.getName(this.State)}`);
    this.service.updateCharacteristic(this.eventDetected, (this.State));

    // register handlers

    this.service.getCharacteristic(this.eventDetected)
      .onGet(this.getEventDetected.bind(this));

    // Create Trigger
    if (this.accessoryConfiguration.sensor !== undefined && this.accessoryConfiguration.sensor.trigger !== undefined) {
      this.trigger = AccessoryFactory.createTrigger(this, this.accessoryConfiguration.sensor.trigger, this.accessoryName + ' Trigger');
    }
  }

  getTrigger(): Trigger {
    return this.trigger!;
  }

  getSensorState(): number {
    return this.State;
  }

  protected abstract getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }>;

  // Handlers

  async getEventDetected(): Promise<CharacteristicValue> {
    const sensorState = this.State;

    this.log.debug(`[${this.accessoryName}] Getting Sensor Current State: ${TriggeredState.getName(sensorState)}`);

    return sensorState;
  }

  protected override getJsonState(): string {
    return JSON.stringify({});
  }

  protected abstract getName(state: number): string;

  /**
   * This method is called by this sensor's trigger
   */
  async triggerSensorState(sensorState: number, trigger: Trigger, isLoggingDisabled: boolean = false) {
    if (trigger.sensorConfig.accessoryID !== this.accessoryId) {
      throw new TriggerNotAllowedError(`Trigger ${trigger.name} is not allowed to trigger this sensor`);
    }

    if (![TriggeredState.NORMAL, TriggeredState.TRIGGERED].includes(sensorState)) {
      throw new InvalidSensorValue(`Sensor value ${TriggeredState.getName(sensorState)} is not a valid state`);
    }

    // Only update the sensor if the state has changed
    if (this.State !== sensorState) {
      this.State = sensorState;

      this.service!.updateCharacteristic(this.eventDetected, (this.State));

       
      this.log.info(`[${this.accessoryName}] Setting Sensor Current State: ${TriggeredState.getName(this.State)} - ${this.getName(this.State)}`, isLoggingDisabled);
    }
  }
}
