/* eslint-disable brace-style */

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * AirPurifier - Accessory implementation
 */
export class AirPurifier extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'AirPurifier';

  // Because of how Homebridge works, these are not initialized until the constructor runs

  static CURRENTLY_INACTIVE: number;      // CharacteristicType.CurrentAirPurifierState.INACTIVE;
  static CURRENTLY_IDLE: number;          // CharacteristicType.CurrentAirPurifierState.IDLE;
  static CURRENTLY_PURIFYING_AIR: number; // CharacteristicType.CurrentAirPurifierState.PURIFYING_AIR;

  static MANUAL: number;                  // CharacteristicType.TargetAirPurifierState.MANUAL;
  static AUTO: number;                    // CharacteristicType.TargetAirPurifierState.AUTO;

  static INACTIVE: number;                // CharacteristicType.Active.INACTIVE;
  static ACTIVE: number;                  // CharacteristicType.Active.ACTIVE;

  private readonly stateStorageKey: string = 'AirPurifierActive';
  private readonly targetStateStorageKey: string = 'AirPurifierTargetState';
  private readonly rotatioSpeedStorageKey: string = 'AirPurifierRotationSpeed';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.setupStaticFields();

    // First configure the device based on the accessory details
    const rotationSpeed: number = this.accessoryConfiguration.airPurifier.rotationSpeed as number;

    let Active: number = AirPurifier.INACTIVE;
    const CurrentAirPurifierState: number = AirPurifier.CURRENTLY_INACTIVE;
    let TargetAirPurifierState: number = AirPurifier.MANUAL;
    let RotationSpeed: number = rotationSpeed;

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

    this.service = this.accessory.getService(ServiceType.AirPurifier) || this.accessory.addService(ServiceType.AirPurifier);

    this.setValue(CharacteristicType.Name, this.accessoryName);

    // Update the initial state of the accessory     
    this.log.debug(`[${this.accessoryName}] Setting Air Purifier Current State: ${AirPurifier.getCurrentStateName(Active)}`);
    this.updateActive(Active);
    this.updateCurrentAirPurifierState(CurrentAirPurifierState);
    this.updateTargetAirPurifierState(TargetAirPurifierState);
    this.updateRotationSpeed(RotationSpeed);

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
    const Active: number = this.getActive();
    this.log.debug(`[${this.accessoryName}] Getting State: ${AirPurifier.getActiveName(Active)}`);

    return Active;
  }

  async setActiveHamdler(value: CharacteristicValue) {
    const Active: number = value as number;
    this.updateActive(Active);
    this.log.info(`[${this.accessoryName}] Setting State: ${AirPurifier.getActiveName(Active)}`);

    this.setDeviceOperationalCondition();
  }

  // CurrentAirPurifierState

  async getCurrentAirPurifierStateHamdler(): Promise<CharacteristicValue> {
    const CurrentAirPurifierState: number = this.getCurrentAirPurifierState();
    this.log.debug(`[${this.accessoryName}] Getting Current Air Purifier State: ${AirPurifier.getCurrentStateName(CurrentAirPurifierState)}`);

    return CurrentAirPurifierState;
  }

  // TargetAirPurifierState

  async getTargetAirPurifierStateHamdler(): Promise<CharacteristicValue> {
    const TargetAirPurifierState = this.getTargetAirPurifierState();
    this.log.debug(`[${this.accessoryName}] Getting Target Air Purifier State: ${AirPurifier.getTargetStateName(TargetAirPurifierState)}`);

    return TargetAirPurifierState;
  }

  async setTargetAirPurifierStateHamdler(value: CharacteristicValue) {
    const TargetAirPurifierState:number = value as number;
    this.updateTargetAirPurifierState(TargetAirPurifierState);
    this.log.info(`[${this.accessoryName}] Setting Target Air Purifier State: ${AirPurifier.getTargetStateName(TargetAirPurifierState)}`);

    this.setDeviceOperationalCondition();
  }

  // RotationSpeed

  async getRotationSpeedHamdler(): Promise<CharacteristicValue> {
    const RotationSpeed = this.getRotationSpeed();
    this.log.debug(`[${this.accessoryName}] Getting Rotation Speed: ${RotationSpeed}%`);

    return RotationSpeed;
  }

  async setRotationSpeedHamdler(value: CharacteristicValue) {
    const RotationSpeed = value as number;
    this.updateRotationSpeed(RotationSpeed);
    this.log.info(`[${this.accessoryName}] Setting Rotation Speed: ${RotationSpeed}%`);

    this.storeState();
  }

  // *** Handlers ***

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.getActive(),
      [this.targetStateStorageKey]: this.getTargetAirPurifierState(),
      [this.rotatioSpeedStorageKey]: this.getRotationSpeed(),
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return AirPurifier.ACCESSORY_TYPE_NAME;
  }

  private setDeviceOperationalCondition() {
    if (this.getActive() === AirPurifier.ACTIVE) {
      this.updateCurrentAirPurifierState(AirPurifier.CURRENTLY_PURIFYING_AIR);
    }
    else {  // (this.states.AirPurifierActive === AirPurifier.INACTIVE)
      const TargetAirPurifierState = this.getTargetAirPurifierState();

      if (TargetAirPurifierState === AirPurifier.AUTO) {
        this.updateCurrentAirPurifierState(AirPurifier.CURRENTLY_IDLE);
      }
      else if (TargetAirPurifierState === AirPurifier.MANUAL) {
        this.updateCurrentAirPurifierState(AirPurifier.CURRENTLY_INACTIVE);
      }
    }

    const CurrentAirPurifierState: number = this.getCurrentAirPurifierState();
    this.log.debug(`[${this.accessoryName}] Air Purifier current state: ${AirPurifier.getCurrentStateName(CurrentAirPurifierState)}`);

    this.storeState();
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

  // Convenience methods

  private setupStaticFields() {
    AirPurifier.CURRENTLY_INACTIVE      = CharacteristicType.CurrentAirPurifierState.INACTIVE;
    AirPurifier.CURRENTLY_IDLE          = CharacteristicType.CurrentAirPurifierState.IDLE;
    AirPurifier.CURRENTLY_PURIFYING_AIR = CharacteristicType.CurrentAirPurifierState.PURIFYING_AIR;

    AirPurifier.MANUAL                  = CharacteristicType.TargetAirPurifierState.MANUAL;
    AirPurifier.AUTO                    = CharacteristicType.TargetAirPurifierState.AUTO;

    AirPurifier.INACTIVE                = CharacteristicType.Active.INACTIVE;
    AirPurifier.ACTIVE                  = CharacteristicType.Active.ACTIVE;
  }

  // Active

  private getActive(): number {
    return this.getValue(CharacteristicType.Active) as number;
  }

  private updateActive(
    value: number,
  ) {
    this.updateValue(CharacteristicType.Active, value);
  }

  // CurrentAirPurifierState

  private getCurrentAirPurifierState(): number {
    return this.getValue(CharacteristicType.CurrentAirPurifierState) as number;
  }

  private updateCurrentAirPurifierState(
    value: number,
  ) {
    this.updateValue(CharacteristicType.CurrentAirPurifierState, value);
  }

  // TargetAirPurifierState

  private getTargetAirPurifierState(): number {
    return this.getValue(CharacteristicType.TargetAirPurifierState) as number;
  }

  private updateTargetAirPurifierState(
    value: number,
  ) {
    this.updateValue(CharacteristicType.TargetAirPurifierState, value);
  }

  // RotationSpeed

  private getRotationSpeed(): number {
    return this.getValue(CharacteristicType.RotationSpeed) as number;
  }

  private updateRotationSpeed(
    value: number,
  ) {
    this.updateValue(CharacteristicType.RotationSpeed, value);
  }
}
