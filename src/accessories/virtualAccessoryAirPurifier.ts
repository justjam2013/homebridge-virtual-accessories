/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * AirPurifier - Accessory implementation
 */
export class AirPurifier extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'AirPurifier';

  static readonly CURRENTLY_INACTIVE: number = 0;       // Characteristic.CurrentAirPurifierState.INACTIVE
  static readonly CURRENTLY_IDLE: number = 1;           // Characteristic.CurrentAirPurifierState.IDLE
  static readonly CURRENTLY_PURIFYING_AIR: number = 2;  // Characteristic.CurrentAirPurifierState.PURIFYING_AIR

  static readonly MANUAL: number = 0;                   // Characteristic.TargetAirPurifierState.MANUAL
  static readonly AUTO: number = 1;                     // Characteristic.TargetAirPurifierState.AUTO

  static readonly INACTIVE: number = 0;                 // Characteristic.Active.INACTIVE
  static readonly ACTIVE: number = 1;                   // Characteristic.Active.ACTIVE

  private readonly stateStorageKey: string = 'AirPurifierActive';
  private readonly targetStateStorageKey: string = 'AirPurifierTargetState';
  private readonly rotatioSpeedStorageKey: string = 'AirPurifierRotationSpeed';

  private states = {
    AirPurifierActive: AirPurifier.INACTIVE,
    AirPurifierCurrentState: AirPurifier.CURRENTLY_INACTIVE,
    AirPurifierTargetState: AirPurifier.MANUAL,
    AirPurifierRotationSpeed: 100,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.states.AirPurifierActive = AirPurifier.INACTIVE;
    this.states.AirPurifierCurrentState = AirPurifier.CURRENTLY_INACTIVE;
    this.states.AirPurifierTargetState = AirPurifier.MANUAL;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedTargetState: number = accessoryState[this.targetStateStorageKey] as number;
      const cachedRotationSpeed: number = accessoryState[this.rotatioSpeedStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.AirPurifierActive = cachedState;
      }
      if (cachedTargetState !== undefined) {
        this.states.AirPurifierTargetState = cachedTargetState;
      }
      if (cachedRotationSpeed !== undefined) {
        this.states.AirPurifierRotationSpeed = cachedRotationSpeed;
      }
    }

    this.setDeviceOperationalCondition();

    this.service = this.accessory.getService(this.platform.Service.AirPurifier) || this.accessory.addService(this.platform.Service.AirPurifier);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory     
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Air Purifier Current State: ${AirPurifier.getCurrentStateName(this.states.AirPurifierActive)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, (this.states.AirPurifierCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetAirPurifierState, (this.states.AirPurifierTargetState));
    this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, (this.states.AirPurifierRotationSpeed));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentAirPurifierState)
      .onGet(this.getCurrentAirPurifierState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetAirPurifierState)
      .onSet(this.setTargetAirPurifierState.bind(this))
      .onGet(this.getTargetAirPurifierState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onSet(this.setRotationSpeed.bind(this))
      .onGet(this.getRotationSpeed.bind(this));
  }

  // Handlers

  async setActive(value: CharacteristicValue) {
    this.states.AirPurifierActive = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${AirPurifier.getActiveName(this.states.AirPurifierActive)}`);
  }

  async getActive(): Promise<CharacteristicValue> {
    const airPurifierActive = this.states.AirPurifierActive;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${AirPurifier.getActiveName(airPurifierActive)}`);

    return airPurifierActive;
  }

  async getCurrentAirPurifierState(): Promise<CharacteristicValue> {
    const airPurifierCurrentState = this.states.AirPurifierCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Air Purifier State: ${AirPurifier.getCurrentStateName(airPurifierCurrentState)}`);

    return airPurifierCurrentState;
  }

  async setTargetAirPurifierState(value: CharacteristicValue) {
    this.states.AirPurifierTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Air Purifier State: ${AirPurifier.getTargetStateName(this.states.AirPurifierTargetState)}`);

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Air Purifier State: ${AirPurifier.getCurrentStateName(this.states.AirPurifierCurrentState)}`);
  }

  async getTargetAirPurifierState(): Promise<CharacteristicValue> {
    const airPurifierTargetState = this.states.AirPurifierTargetState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Air Purifier State: ${AirPurifier.getTargetStateName(airPurifierTargetState)}`);

    return airPurifierTargetState;
  }

  async setRotationSpeed(value: CharacteristicValue) {
    this.states.AirPurifierRotationSpeed = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Rotation Speed: ${this.states.AirPurifierRotationSpeed}%`);
  }

  async getRotationSpeed(): Promise<CharacteristicValue> {
    const airPurifierRotationSpeed = this.states.AirPurifierRotationSpeed;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Rotation Speed: ${airPurifierRotationSpeed}%`);

    return airPurifierRotationSpeed;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.AirPurifierActive,
      [this.targetStateStorageKey]: this.states.AirPurifierTargetState,
      [this.rotatioSpeedStorageKey]: this.states.AirPurifierRotationSpeed,
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return AirPurifier.ACCESSORY_TYPE_NAME;
  }

  private setDeviceOperationalCondition() {
    if (this.states.AirPurifierActive === AirPurifier.INACTIVE) {
      this.states.AirPurifierCurrentState = AirPurifier.CURRENTLY_INACTIVE;
    }
    else {  // (this.states.AirPurifierActive === AirPurifier.ACTIVE)
      if (this.states.AirPurifierTargetState === AirPurifier.AUTO) {
        this.states.AirPurifierCurrentState = AirPurifier.CURRENTLY_PURIFYING_AIR;
      }
      else if (this.states.AirPurifierTargetState === AirPurifier.MANUAL) {
        this.states.AirPurifierCurrentState = AirPurifier.CURRENTLY_IDLE;
      }
    }

    this.service?.setCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, (this.states.AirPurifierCurrentState));

    this.storeState();

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Air Purifier current state: ${AirPurifier.getCurrentStateName(this.states.AirPurifierCurrentState)}`);
  }

  static getActiveName(status: number): string {
    let activeName: string;

    switch (status) {
    case undefined: { activeName = 'undefined'; break; }
    case AirPurifier.INACTIVE: { activeName = 'INACTIVE'; break; }
    case AirPurifier.ACTIVE: { activeName = 'ACTIVE'; break; }
    default: { activeName = status.toString(); }
    }

    return activeName;
  }

  static getCurrentStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case AirPurifier.CURRENTLY_INACTIVE: { stateName = 'INACTIVE'; break; }
    case AirPurifier.CURRENTLY_IDLE: { stateName = 'IDLE'; break; }
    case AirPurifier.CURRENTLY_PURIFYING_AIR: { stateName = 'HEATING'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }

  static getTargetStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case AirPurifier.MANUAL: { stateName = 'MANUAL'; break; }
    case AirPurifier.AUTO: { stateName = 'AUTO'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}
