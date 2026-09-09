import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * AirPurifier - Accessory implementation
 */
export class AirPurifier extends Accessory {

  private readonly stateStorageKey: string = 'AirPurifierActive';
  private readonly targetStateStorageKey: string = 'AirPurifierTargetState';
  private readonly rotatioSpeedStorageKey: string = 'AirPurifierRotationSpeed';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.AirPurifier);

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

  // Lazy static getters

  static get CURRENTLY_INACTIVE(): number       { return CharacteristicType.CurrentAirPurifierState.INACTIVE; }
  static get CURRENTLY_IDLE(): number           { return CharacteristicType.CurrentAirPurifierState.IDLE; }
  static get CURRENTLY_PURIFYING_AIR(): number  { return CharacteristicType.CurrentAirPurifierState.PURIFYING_AIR; }

  static get MANUAL(): number                   { return CharacteristicType.TargetAirPurifierState.MANUAL; }
  static get AUTO(): number                     { return CharacteristicType.TargetAirPurifierState.AUTO; }

  static get INACTIVE(): number                 { return CharacteristicType.Active.INACTIVE; }
  static get ACTIVE(): number                   { return CharacteristicType.Active.ACTIVE; }

  static getActiveName(status: number): string {
    let name: string;

    switch (status) {
    case undefined: { name = 'undefined'; break; }
    case AirPurifier.INACTIVE: { name = 'INACTIVE'; break; }
    case AirPurifier.ACTIVE: { name = 'ACTIVE'; break; }
    default: { name = status.toString(); }
    }

    return name;
  }

  static getCurrentStateName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case AirPurifier.CURRENTLY_INACTIVE: { name = 'INACTIVE'; break; }
    case AirPurifier.CURRENTLY_IDLE: { name = 'IDLE'; break; }
    case AirPurifier.CURRENTLY_PURIFYING_AIR: { name = 'HEATING'; break; }
    default: { name = state.toString(); }
    }

    return name;
  }

  static getTargetStateName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case AirPurifier.MANUAL: { name = 'MANUAL'; break; }
    case AirPurifier.AUTO: { name = 'AUTO'; break; }
    default: { name = state.toString(); }
    }

    return name;
  }
}
