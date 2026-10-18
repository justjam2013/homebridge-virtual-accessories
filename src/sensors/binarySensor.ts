import type { Characteristic, CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from '../accessories/accessory.js';

import { AccessoryFactory } from '../accessoryFactory.js';
import { Trigger } from './triggers/trigger.js';
import { TriggerNotAllowedError, InvalidSensorValue } from '../errors.js';
import { TriggerType } from '../configuration/schema.js';

/**
 * Sensor - Abstract accessory
 */
export abstract class BinarySensor extends Accessory {

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  static readonly NORMAL_INACTIVE: string = 'NORMAL-INACTIVE';
  static readonly TRIGGERED_ACTIVE: string = 'TRIGGERED-ACTIVE';

  private readonly stateStorageKey: string = 'SensorState';

  protected trigger: Trigger | undefined;

  protected EventDetectedCharacteristic: WithUUID<{ new (): Characteristic; }>;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    serviceType: WithUUID<typeof Service>,
    eventDetectedCharacteristic: WithUUID<{ new (): Characteristic; }>,
  ) {
    super(platform, accessory, accessoryConfiguration, serviceType);

    this.EventDetectedCharacteristic = eventDetectedCharacteristic;

    // First configure the device based on the accessory details
    let SensorState: number = BinarySensor.NORMAL;

    // If the accessory is stateful retrieve stored state. Only webhook triggers save state, so only they restore it
    if (this.accessoryConfiguration.accessoryIsStateful && this.isWebhookTriggered()) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: unknown = accessoryState[this.stateStorageKey];

      if (cachedState !== undefined) {
        SensorState = (cachedState === true || cachedState === BinarySensor.TRIGGERED) ? BinarySensor.TRIGGERED : BinarySensor.NORMAL;
      }
    }

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
    // MotionDetected is Boolean; other binary sensor characteristics use numeric states.
    return Number(this.getCharacteristicValue(this.EventDetectedCharacteristic));
  }

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
    return JSON.stringify({ [this.stateStorageKey]: this.getSensorState() });
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
      SensorState = Number(this.updateCharacteristicValue(this.EventDetectedCharacteristic, sensorState));
      this.log.info(`[${this.accessoryName}] Setting Sensor Current State: ${BinarySensor.getStateName(SensorState)}`, isLoggingDisabled);

      this.saveState();
    }
  }

  // Only Webhook triggers can save state
  protected saveState() {
    if (this.isWebhookTriggered()) {
      super.saveState();
    }
  }

  // Other triggers recompute their state themselves, so there is nothing to persist for them
  private isWebhookTriggered(): boolean {
    return this.accessoryConfiguration.sensor?.trigger === TriggerType.Webhook;
  }

  //
  // ****************************** Characteristics ******************************
  //

  // Lazy static getters

  static get NORMAL(): number     { return 0; }
  static get TRIGGERED(): number  { return 1; }

  static getStateName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case BinarySensor.NORMAL: { name = BinarySensor.NORMAL_INACTIVE; break; }
    case BinarySensor.TRIGGERED: { name = BinarySensor.TRIGGERED_ACTIVE; break; }
    default: { name = state.toString();}
    }

    return name;
  }
}
