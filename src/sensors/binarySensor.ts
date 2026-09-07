import type { Characteristic, CharacteristicValue, PlatformAccessory, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from '../accessories/accessory.js';

import { AccessoryFactory } from '../accessoryFactory.js';
import { Trigger } from './triggers/trigger.js';
import { TriggerNotAllowedError, InvalidSensorValue } from '../errors.js';

/**
 * Sensor - Abstract accessory
 */
export abstract class BinarySensor extends Accessory {

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  static readonly NORMAL_INACTIVE: string = 'NORMAL-INACTIVE';
  static readonly TRIGGERED_ACTIVE: string = 'TRIGGERED-ACTIVE';

  protected trigger: Trigger | undefined;

  protected EventDetectedCharacteristic: WithUUID<{ new (): Characteristic; }>;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.EventDetectedCharacteristic = this.getEventDetectedCharacteristic();

    // First configure the device based on the accessory details
    const SensorState: number = BinarySensor.NORMAL;

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Sensor State: ${BinarySensor.getStateName(SensorState)}`);
    this.service.setCharacteristic(this.EventDetectedCharacteristic, (SensorState));

    // Last register handlers

    this.service.getCharacteristic(this.EventDetectedCharacteristic)
      .onGet(this.getEventDetectedHandler.bind(this));

    // Create Trigger
    if (this.accessoryConfiguration.sensor !== undefined && this.accessoryConfiguration.sensor.trigger !== undefined) {
      this.trigger = AccessoryFactory.createTrigger(this, this.accessoryConfiguration.sensor.trigger, this.accessoryName + ' Trigger');
    }
  }

  getTrigger(): Trigger {
    return this.trigger!;
  }

  getSensorState(): number {
    return this.getCharacteristicValue(this.EventDetectedCharacteristic) as number;
  }

  protected abstract getEventDetectedCharacteristic(): WithUUID<{ new (): Characteristic; }>;

  //
  // ****************************** Handlers ******************************
  //

  // EventDetected

  async getEventDetectedHandler(): Promise<CharacteristicValue> {
    const SensorState: number = this.getSensorState();
    this.log.debug(`[${this.accessoryName}] Getting Sensor Current State: ${BinarySensor.getStateName(SensorState)}`);

    return SensorState;
  }

  protected getJsonState(): string {
    return JSON.stringify({});
  }

  /**
   * This method is called by this sensor's trigger
   */
  async triggerSensorState(sensorState: number, trigger: Trigger, isLoggingDisabled: boolean = false) {
    if (trigger.sensorConfig.accessoryID !== this.accessoryConfiguration.accessoryID) {
      throw new TriggerNotAllowedError(`Trigger ${trigger.name} is not allowed to trigger this sensor`);
    }

    if (![BinarySensor.NORMAL, BinarySensor.TRIGGERED].includes(sensorState)) {
      throw new InvalidSensorValue(`Sensor value ${BinarySensor.getStateName(sensorState)} is not a valid state`);
    }

    // Only update the sensor if the state has changed
    let SensorState: number = this.getSensorState();
    if (SensorState !== sensorState) {
      SensorState = this.updateCharacteristicValue(this.EventDetectedCharacteristic, sensorState) as number;
       
      this.log.info(`[${this.accessoryName}] Setting Sensor Current State: ${BinarySensor.getStateName(SensorState)}`, isLoggingDisabled);
    }
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly NORMAL: number = 0;
  static readonly TRIGGERED: number = 1;

  static getStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case BinarySensor.NORMAL: { sensorStateName = BinarySensor.NORMAL_INACTIVE; break; }
    case BinarySensor.TRIGGERED: { sensorStateName = BinarySensor.TRIGGERED_ACTIVE; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}
