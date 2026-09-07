/* eslint-disable brace-style */
 

import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * AirPurifier - Accessory implementation
 */
export class AirPurifier extends Accessory {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.AirPurifier;

  private readonly stateStorageKey: string = 'AirPurifierActive';
  private readonly targetStateStorageKey: string = 'AirPurifierTargetState';
  private readonly rotatioSpeedStorageKey: string = 'AirPurifierRotationSpeed';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    let Active: number = AirPurifier.INACTIVE;
    const CurrentAirPurifierState: number = AirPurifier.CURRENTLY_INACTIVE;
    let TargetAirPurifierState: number = AirPurifier.MANUAL;
    let RotationSpeed: number = 100;

    // First configure the device based on the accessory details
    RotationSpeed = this.accessoryConfiguration.airPurifier.rotationSpeed as number;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedTargetState: number = accessoryState[this.targetStateStorageKey] as number;
      const cachedRotationSpeed: number = accessoryState[this.rotatioSpeedStorageKey] as number;

      if (cachedState !== undefined) {
        Active = cachedState;
      }
      if (cachedTargetState !== undefined) {
        TargetAirPurifierState = cachedTargetState;
      }
      if (cachedRotationSpeed !== undefined) {
        RotationSpeed = cachedRotationSpeed;
      }
    }

    // Update the initial state of the accessory     
    this.setActive(Active);
    this.setCurrentAirPurifierState(CurrentAirPurifierState);
    this.setTargetAirPurifierState(TargetAirPurifierState);
    this.setRotationSpeed(RotationSpeed);

    this.refreshDeviceOperationalCondition();

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.Active)
      .onSet(this.setActiveHandler.bind(this))
      .onGet(this.getActiveHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.CurrentAirPurifierState)
      .onGet(this.getCurrentAirPurifierStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.TargetAirPurifierState)
      .onSet(this.setTargetAirPurifierStateHandler.bind(this))
      .onGet(this.getTargetAirPurifierStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.RotationSpeed)
      .onSet(this.setRotationSpeedHandler.bind(this))
      .onGet(this.getRotationSpeedHandler.bind(this));
  }

  //
  // ****************************** Handlers ******************************
  //

  // Active

  async getActiveHandler(): Promise<CharacteristicValue> {
    const Active: number = this.getActive();
    this.log.debug(`[${this.accessoryName}] Getting Active: ${AirPurifier.getActiveName(Active)}`);

    return Active;
  }

  async setActiveHandler(value: CharacteristicValue) {
    let Active: number = value as number;
    Active = this.updateActive(Active);
    this.log.info(`[${this.accessoryName}] Setting Active: ${AirPurifier.getActiveName(Active)}`);

    this.refreshDeviceOperationalCondition();
  }

  // CurrentAirPurifierState

  async getCurrentAirPurifierStateHandler(): Promise<CharacteristicValue> {
    const CurrentAirPurifierState = this.getCurrentAirPurifierState();
    this.log.debug(`[${this.accessoryName}] Getting Current Air Purifier State: ${AirPurifier.getCurrentStateName(CurrentAirPurifierState)}`);

    return CurrentAirPurifierState;
  }

  // TargetAirPurifierState

  async getTargetAirPurifierStateHandler(): Promise<CharacteristicValue> {
    const TargetAirPurifierState: number = this.getTargetAirPurifierState();
    this.log.debug(`[${this.accessoryName}] Getting Target Air Purifier State: ${AirPurifier.getTargetStateName(TargetAirPurifierState)}`);

    return TargetAirPurifierState;
  }

  async setTargetAirPurifierStateHandler(value: CharacteristicValue) {
    let TargetAirPurifierState: number = value as number;
    TargetAirPurifierState = this.updateTargetAirPurifierState(TargetAirPurifierState);
    this.log.info(`[${this.accessoryName}] Setting Target Air Purifier State: ${AirPurifier.getTargetStateName(TargetAirPurifierState)}`);

    this.refreshDeviceOperationalCondition();

    const CurrentAirPurifierState: number = this.getCurrentAirPurifierState();
    this.log.info(`[${this.accessoryName}] Setting Current Air Purifier State: ${AirPurifier.getCurrentStateName(CurrentAirPurifierState)}`);
  }

  // RotationSpeed

  async getRotationSpeedHandler(): Promise<CharacteristicValue> {
    const RotationSpeed: number = this.getRotationSpeed();
    this.log.debug(`[${this.accessoryName}] Getting Rotation Speed: ${RotationSpeed}%`);

    return RotationSpeed;
  }

  async setRotationSpeedHandler(value: CharacteristicValue) {
    let RotationSpeed = value as number;
    RotationSpeed = this.updateRotationSpeed(RotationSpeed);
    this.log.info(`[${this.accessoryName}] Setting Rotation Speed: ${RotationSpeed}%`);

    this.saveState();
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getActive(),
      [this.targetStateStorageKey]: this.getTargetAirPurifierState(),
      [this.rotatioSpeedStorageKey]: this.getRotationSpeed(),
    };

    const json = JSON.stringify(jsonState);
    return json;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return AirPurifier.ACCESSORY_SERVICE_TYPE;
  }

  private refreshDeviceOperationalCondition() {
    const Active = this.getActive();
    const TargetAirPurifierState: number = this.getTargetAirPurifierState();
    let CurrentAirPurifierState: number = this.getCurrentAirPurifierState();

    if (Active === AirPurifier.ACTIVE) {
      CurrentAirPurifierState = AirPurifier.CURRENTLY_PURIFYING_AIR;
    }
    else {  // (this.status.AirPurifierActive === AirPurifier.INACTIVE)
      if (TargetAirPurifierState === AirPurifier.AUTO) {
        CurrentAirPurifierState = AirPurifier.CURRENTLY_IDLE;
      }
      else if (TargetAirPurifierState === AirPurifier.MANUAL) {
        CurrentAirPurifierState = AirPurifier.CURRENTLY_INACTIVE;
      }
    }

    CurrentAirPurifierState = this.updateCurrentAirPurifierState(CurrentAirPurifierState);
    this.log.debug(`[${this.accessoryName}] Air Purifier current state: ${AirPurifier.getCurrentStateName(CurrentAirPurifierState)}`);

    this.saveState();
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly CURRENTLY_INACTIVE: number =          CharacteristicType.CurrentAirPurifierState.INACTIVE;
  static readonly CURRENTLY_IDLE: number =              CharacteristicType.CurrentAirPurifierState.IDLE;
  static readonly CURRENTLY_PURIFYING_AIR: number =     CharacteristicType.CurrentAirPurifierState.PURIFYING_AIR;

  static readonly MANUAL: number =                      CharacteristicType.TargetAirPurifierState.MANUAL;
  static readonly AUTO: number =                        CharacteristicType.TargetAirPurifierState.AUTO;

  static readonly INACTIVE: number =                    CharacteristicType.Active.INACTIVE;
  static readonly ACTIVE: number =                      CharacteristicType.Active.ACTIVE;

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
