/* eslint-disable brace-style */
 
import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';
import { Active, CurrentAirPurifierState, TargetAirPurifierState } from './accessoryCharacteristics.js';

/**
 * AirPurifier - Accessory implementation
 */
export class AirPurifier extends Accessory<typeof Service.AirPurifier> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'AirPurifier';

  private readonly stateStorageKey: string = 'AirPurifierActive';
  private readonly targetStateStorageKey: string = 'AirPurifierTargetState';
  private readonly rotatioSpeedStorageKey: string = 'AirPurifierRotationSpeed';

  // Device state
  private Active: number = Active.INACTIVE;
  private CurrentState: number = CurrentAirPurifierState.INACTIVE;
  private TargetState: number = TargetAirPurifierState.MANUAL;
  private RotationSpeed: number = 100;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.AirPurifier,
      AirPurifier.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    const rotationSpeed: number = this.accessoryConfiguration.airPurifier.rotationSpeed as number;

    this.Active = Active.INACTIVE;
    this.CurrentState = CurrentAirPurifierState.INACTIVE;
    this.TargetState = TargetAirPurifierState.MANUAL;
    this.RotationSpeed = rotationSpeed;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedTargetState: number = accessoryState[this.targetStateStorageKey] as number;
      const cachedRotationSpeed: number = accessoryState[this.rotatioSpeedStorageKey] as number;

      if (cachedState !== undefined) {
        this.Active = cachedState;
      }
      if (cachedTargetState !== undefined) {
        this.TargetState = cachedTargetState;
      }
      if (cachedRotationSpeed !== undefined) {
        this.RotationSpeed = cachedRotationSpeed;
      }
    }

    this.setDeviceOperationalCondition();

    // Update the initial state of the accessory     
    this.log.debug(`[${this.accessoryName}] Setting Air Purifier Current State: ${CurrentAirPurifierState.getName(this.Active)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, (this.CurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetAirPurifierState, (this.TargetState));
    this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, (this.RotationSpeed));

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
    this.Active = value as number;

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryName}] Setting State: ${Active.getName(this.Active)}`);
  }

  async getActive(): Promise<CharacteristicValue> {
    const airPurifierActive = this.Active;

    this.log.debug(`[${this.accessoryName}] Getting State: ${Active.getName(airPurifierActive)}`);

    return airPurifierActive;
  }

  async getCurrentAirPurifierState(): Promise<CharacteristicValue> {
    const airPurifierCurrentState = this.CurrentState;

    this.log.debug(`[${this.accessoryName}] Getting Current Air Purifier State: ${CurrentAirPurifierState.getName(airPurifierCurrentState)}`);

    return airPurifierCurrentState;
  }

  async setTargetAirPurifierState(value: CharacteristicValue) {
    this.TargetState = value as number;

    this.log.info(`[${this.accessoryName}] Setting Target Air Purifier State: ${TargetAirPurifierState.getName(this.TargetState)}`);

    this.setDeviceOperationalCondition();

    this.log.info(`[${this.accessoryName}] Setting Current Air Purifier State: ${CurrentAirPurifierState.getName(this.CurrentState)}`);
  }

  async getTargetAirPurifierState(): Promise<CharacteristicValue> {
    const airPurifierTargetState = this.TargetState;

    this.log.debug(`[${this.accessoryName}] Getting Target Air Purifier State: ${TargetAirPurifierState.getName(airPurifierTargetState)}`);

    return airPurifierTargetState;
  }

  async setRotationSpeed(value: CharacteristicValue) {
    this.RotationSpeed = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Rotation Speed: ${this.RotationSpeed}%`);
  }

  async getRotationSpeed(): Promise<CharacteristicValue> {
    const airPurifierRotationSpeed = this.RotationSpeed;

    this.log.debug(`[${this.accessoryName}] Getting Rotation Speed: ${airPurifierRotationSpeed}%`);

    return airPurifierRotationSpeed;
  }

  //

  protected override getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.Active,
      [this.targetStateStorageKey]: this.TargetState,
      [this.rotatioSpeedStorageKey]: this.RotationSpeed,
    });
    return json;
  }

  private setDeviceOperationalCondition() {
    if (this.Active === Active.ACTIVE) {
      this.CurrentState = CurrentAirPurifierState.PURIFYING_AIR;
    }
    else {  // (this.Active === Active.INACTIVE)
      if (this.TargetState === TargetAirPurifierState.AUTO) {
        this.CurrentState = CurrentAirPurifierState.IDLE;
      }
      else if (this.TargetState === TargetAirPurifierState.MANUAL) {
        this.CurrentState = CurrentAirPurifierState.INACTIVE;
      }
    }

    this.service.setCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, (this.CurrentState));

    this.storeState();

    this.log.debug(`[${this.accessoryName}] Air Purifier current state: ${CurrentAirPurifierState.getName(this.CurrentState)}`);
  }
}
