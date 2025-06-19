import type { Characteristic, CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from '../accessories/virtualAccessory.js';

import { AccessoryFactory } from '../accessoryFactory.js';
import { Trigger } from '../triggers/trigger.js';
import { NotCompanionError, AccessoryNotAllowedError, TriggerNotAllowedError } from '../errors.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export abstract class Sensor extends Accessory {

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  static readonly NORMAL_INACTIVE: string = 'NORMAL-INACTIVE';
  static readonly TRIGGERED_ACTIVE: string = 'TRIGGERED-ACTIVE';

  static readonly NORMAL: number = 0;
  static readonly TRIGGERED: number = 1;

  private uuidPostfix: string = '-sensor';

  private eventDetected: WithUUID<{ new (): Characteristic; }>;

  private isCompanionSensor: boolean = false;

  private trigger: Trigger | undefined;

  protected states = {
    SensorState: Sensor.NORMAL,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSensorName?: string,
  ) {
    super(platform, accessory);

    this.eventDetected = this.getEventDetectedCharacteristic();

    if (companionSensorName !== undefined) {
      this.isCompanionSensor = true;
    }

    const sensorService: WithUUID<typeof Service> = this.getService();
    if (!this.isCompanionSensor) {
      this.service = this.accessory.getService(sensorService) || this.accessory.addService(sensorService as unknown as Service);

      this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);
    } else {
      this.service = this.accessory.getService(companionSensorName!) ||
                     this.accessory.addService(sensorService, companionSensorName, accessory.UUID + this.uuidPostfix);

      this.service.setCharacteristic(this.platform.Characteristic.Name, companionSensorName!);
    }

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Sensor Current State: ${Sensor.getStateName(this.states.SensorState)}`);
    this.service.updateCharacteristic(this.eventDetected, (this.states.SensorState));

    // register handlers

    this.service.getCharacteristic(this.eventDetected)
      .onGet(this.getEventDetected.bind(this));

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same subtype id.)
     */

    // Ceate Trigger
    if (this.accessoryConfiguration.sensor !== undefined && this.accessoryConfiguration.sensor.trigger !== undefined) {
      this.trigger = AccessoryFactory.createTrigger(this, this.accessoryConfiguration.sensor.trigger, this.accessoryConfiguration.accessoryName + ' Trigger');
    }
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
   * This method is called by the accessory that has this sensor as a companion
   */
  async triggerCompanionSensorState(sensorState: number, accessory: Accessory, isLoggingDisabled: boolean = false) {
    if (!this.isCompanionSensor) {
      throw new NotCompanionError(`${this.accessoryConfiguration.accessoryName} is not a companion sensor`);
    } else if (accessory.accessory.UUID !== this.accessory.UUID) {
      throw new AccessoryNotAllowedError(`Switch ${accessory.accessoryConfiguration.accessoryName} is not allowed to trigger this sensor`);
    }

    this.states.SensorState = sensorState;

    this.service!.updateCharacteristic(this.eventDetected, (this.states.SensorState));

    // eslint-disable-next-line max-len
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Sensor Current State: ${Sensor.getStateName(this.states.SensorState)}`, isLoggingDisabled);
  }

  /**
   * This method is called by this sensor's trigger
   */
  async triggerSensorState(sensorState: number, trigger: Trigger, isLoggingDisabled: boolean = false) {
    if (trigger.sensorConfig.accessoryID !== this.accessoryConfiguration.accessoryID) {
      throw new TriggerNotAllowedError(`Trigger ${trigger.name} is not allowed to trigger this sensor`);
    }

    const sensorStateChanged: boolean = (this.states.SensorState !== sensorState) ? true : false;

    this.states.SensorState = sensorState;

    this.service!.updateCharacteristic(this.eventDetected, (this.states.SensorState));

    if (sensorStateChanged) {
      // eslint-disable-next-line max-len
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Sensor Current State: ${Sensor.getStateName(this.states.SensorState)}`, isLoggingDisabled);
    }
  }
}
