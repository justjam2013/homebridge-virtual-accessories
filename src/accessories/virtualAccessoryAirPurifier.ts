/* eslint-disable brace-style */

import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

class AirPurifierStatus {
  Active: number = AirPurifier.INACTIVE;
  CurrentAirPurifierState: number = AirPurifier.CURRENTLY_INACTIVE;
  TargetAirPurifierState: number = AirPurifier.MANUAL;
  RotationSpeed: number = 0;
}

/**
 * AirPurifier - Accessory implementation
 */
export class AirPurifier extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'AirPurifier';

  // Because of how Homebridge works, these are not initialized until the constructor runs

  static readonly CURRENTLY_INACTIVE: number =      CharacteristicType.CurrentAirPurifierState.INACTIVE;
  static readonly CURRENTLY_IDLE: number =          CharacteristicType.CurrentAirPurifierState.IDLE;
  static readonly CURRENTLY_PURIFYING_AIR: number = CharacteristicType.CurrentAirPurifierState.PURIFYING_AIR;

  static readonly MANUAL: number =                  CharacteristicType.TargetAirPurifierState.MANUAL;
  static readonly AUTO: number =                    CharacteristicType.TargetAirPurifierState.AUTO;

  static readonly INACTIVE: number =                CharacteristicType.Active.INACTIVE;
  static readonly ACTIVE: number =                  CharacteristicType.Active.ACTIVE;

  private readonly stateStorageKey: string = 'AirPurifierActive';
  private readonly targetStateStorageKey: string = 'AirPurifierTargetState';
  private readonly rotatioSpeedStorageKey: string = 'AirPurifierRotationSpeed';

  private status: AirPurifierStatus = new AirPurifierStatus();

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    const rotationSpeed: number = this.accessoryConfiguration.airPurifier.rotationSpeed as number;

    this.status.RotationSpeed = rotationSpeed;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedTargetState: number = accessoryState[this.targetStateStorageKey] as number;
      const cachedRotationSpeed: number = accessoryState[this.rotatioSpeedStorageKey] as number;

      if (cachedState !== undefined) {
        this.status.Active = cachedState;
      }
      if (cachedTargetState !== undefined) {
        this.status.TargetAirPurifierState = cachedTargetState;
      }
      if (cachedRotationSpeed !== undefined) {
        this.status.RotationSpeed = cachedRotationSpeed;
      }
    }

    // Adjust CurrentAirPurifierState
    this.setDeviceOperationalCondition();

    // register handlers

    this.service.getCharacteristic(CharacteristicType.Active)
      .onGet(this.getActiveHamdler.bind(this))
      .onSet(this.setActiveHamdler.bind(this));

    this.service.getCharacteristic(CharacteristicType.CurrentAirPurifierState)
      .onGet(this.getCurrentAirPurifierStateHamdler.bind(this));

    this.service.getCharacteristic(CharacteristicType.TargetAirPurifierState)
      .onGet(this.getTargetAirPurifierStateHamdler.bind(this))
      .onSet(this.setTargetAirPurifierStateHamdler.bind(this));

    this.service.getCharacteristic(CharacteristicType.RotationSpeed)
      .onGet(this.getRotationSpeedHamdler.bind(this))
      .onSet(this.setRotationSpeedHamdler.bind(this));
  }

  // *** Handlers ***

  // Active

  async getActiveHamdler(): Promise<CharacteristicValue> {
    const Active: number = this.status.Active;
    this.log.debug(`[${this.accessoryName}] Getting State: ${AirPurifier.getActiveName(Active)}`);

    return Active;
  }

  async setActiveHamdler(value: CharacteristicValue) {
    const Active: number = value as number;

    this.status.Active = Active;
    this.log.info(`[${this.accessoryName}] Setting State: ${AirPurifier.getActiveName(Active)}`);

    this.setDeviceOperationalCondition();
  }

  // CurrentAirPurifierState

  async getCurrentAirPurifierStateHamdler(): Promise<CharacteristicValue> {
    const CurrentAirPurifierState: number = this.status.CurrentAirPurifierState;
    this.log.debug(`[${this.accessoryName}] Getting Current Air Purifier State: ${AirPurifier.getCurrentStateName(CurrentAirPurifierState)}`);

    return CurrentAirPurifierState;
  }

  // TargetAirPurifierState

  async getTargetAirPurifierStateHamdler(): Promise<CharacteristicValue> {
    const TargetAirPurifierState: number = this.status.TargetAirPurifierState;
    this.log.debug(`[${this.accessoryName}] Getting Target Air Purifier State: ${AirPurifier.getTargetStateName(TargetAirPurifierState)}`);

    return TargetAirPurifierState;
  }

  async setTargetAirPurifierStateHamdler(value: CharacteristicValue) {
    const TargetAirPurifierState:number = value as number;

    this.status.TargetAirPurifierState = TargetAirPurifierState;
    this.log.info(`[${this.accessoryName}] Setting Target Air Purifier State: ${AirPurifier.getTargetStateName(TargetAirPurifierState)}`);

    this.setDeviceOperationalCondition();
  }

  // RotationSpeed

  async getRotationSpeedHamdler(): Promise<CharacteristicValue> {
    const RotationSpeed = this.status.RotationSpeed;
    this.log.debug(`[${this.accessoryName}] Getting Rotation Speed: ${RotationSpeed}%`);

    return RotationSpeed;
  }

  async setRotationSpeedHamdler(value: CharacteristicValue) {
    const RotationSpeed = value as number;

    this.status.RotationSpeed = RotationSpeed;
    this.log.info(`[${this.accessoryName}] Setting Rotation Speed: ${RotationSpeed}%`);

    this.storeState();
  }

  // Absract method implementations

  protected getAccessoryTypeName(): string {
    return AirPurifier.ACCESSORY_TYPE_NAME;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return ServiceType.AirPurifier;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.status.Active,
      [this.targetStateStorageKey]: this.status.TargetAirPurifierState,
      [this.rotatioSpeedStorageKey]: this.status.RotationSpeed,
    });
    return json;
  }  

  private setDeviceOperationalCondition() {
    if (this.status.Active === AirPurifier.ACTIVE) {
      this.status.CurrentAirPurifierState = AirPurifier.CURRENTLY_PURIFYING_AIR;
    }
    else {  // (this.states.AirPurifierActive === AirPurifier.INACTIVE)
      const TargetAirPurifierState = this.status.TargetAirPurifierState;

      if (TargetAirPurifierState === AirPurifier.AUTO) {
        this.status.CurrentAirPurifierState = AirPurifier.CURRENTLY_IDLE;
      }
      else if (TargetAirPurifierState === AirPurifier.MANUAL) {
        this.status.CurrentAirPurifierState = AirPurifier.CURRENTLY_INACTIVE;
      }
    }

    const CurrentAirPurifierState: number = this.status.CurrentAirPurifierState;
    this.log.debug(`[${this.accessoryName}] Air Purifier current state: ${AirPurifier.getCurrentStateName(CurrentAirPurifierState)}`);

    this.storeState();
  }

  // Static

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
