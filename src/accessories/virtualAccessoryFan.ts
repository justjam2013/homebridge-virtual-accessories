import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * Fan - Accessory implementation
 */
export class Fan extends Accessory {

  private readonly stateStorageKey: string = 'FanState';
  private readonly rotatioDirectionStorageKey: string = 'FanRotationDirection';
  private readonly rotatioSpeedStorageKey: string = 'FanRotationSpeed';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.Fan);

    let On: boolean = Fan.OFF;
    let RotationDirection: number = Fan.CLOCKWISE;
    let RotationSpeed: number = 100;

    // First configure the device based on the accessory details
    RotationDirection = this.accessoryConfiguration.fan.rotationDirection === 'clockwise' ? Fan.CLOCKWISE : Fan.COUNTER_CLOCKWISE;
    RotationSpeed = this.accessoryConfiguration.fan.rotationSpeed as number;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;
      const cachedRotationDirection: number = accessoryState[this.rotatioDirectionStorageKey] as number;
      const cachedRotationSpeed: number = accessoryState[this.rotatioSpeedStorageKey] as number;

      if (cachedState !== undefined && cachedRotationDirection !== undefined && cachedRotationSpeed !== undefined) {
        On = cachedState;
        RotationDirection = cachedRotationDirection;
        RotationSpeed = cachedRotationSpeed;
      }
    }

    // Update the initial state of the accessory     
    this.setOn(On);
    this.setRotationDirection(RotationDirection);
    this.setRotationSpeed(RotationSpeed);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.On)
      .onSet(this.setOnHandler.bind(this))
      .onGet(this.getOnHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.RotationDirection)
      .onSet(this.setRotationDirectionHandler.bind(this))
      .onGet(this.getRotationDirectionHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.RotationSpeed)
      .onSet(this.setRotationSpeedHandler.bind(this))
      .onGet(this.getRotationSpeedHandler.bind(this));
  }

  //
  // ****************************** Handlers ******************************
  //

  // On

  async getOnHandler(): Promise<CharacteristicValue> {
    const On: boolean = this.getOn();
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${Fan.getOnName(On)}`);

    return On;
  }

  async setOnHandler(value: CharacteristicValue) {
    let On = value as boolean;
    On = this.updateOn(On);
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${Fan.getOnName(On)}`);

    this.saveState();
  }

  // RotationDirection

  async getRotationDirectionHandler(): Promise<CharacteristicValue> {
    const RotationDirection = this.getRotationDirection();
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Rotation Direction: ${Fan.getRotationDirectionName(RotationDirection)}`);

    return RotationDirection;
  }

  async setRotationDirectionHandler(value: CharacteristicValue) {
    let RotationDirection = value as number;
    RotationDirection = this.updateRotationDirection(RotationDirection);
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Rotation Direction: ${Fan.getRotationDirectionName(RotationDirection)}`);

    this.saveState();
  }

  // RotationSpeed

  async getRotationSpeedHandler(): Promise<CharacteristicValue> {
    const RotationSpeed = this.getRotationSpeed();
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Rotation Speed: ${RotationSpeed}%`);

    return RotationSpeed;
  }

  async setRotationSpeedHandler(value: CharacteristicValue) {
    let RotationSpeed = value as number;
    RotationSpeed = this.updateRotationSpeed(RotationSpeed);
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Rotation Speed: ${RotationSpeed}%`);

    this.saveState();
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getOn(),
      [this.rotatioDirectionStorageKey]: this.getRotationDirection(),
      [this.rotatioSpeedStorageKey]: this.getRotationSpeed(),
    };

    const json = JSON.stringify(jsonState);
    return json;
  }
  
  //
  // ****************************** Characteristics ******************************
  //

  // Lazy static getters

  static get ON(): boolean                { return  true; }
  static get OFF(): boolean               { return  false; }

  static get CLOCKWISE(): number          { return CharacteristicType.RotationDirection.CLOCKWISE; }
  static get COUNTER_CLOCKWISE(): number  { return CharacteristicType.RotationDirection.COUNTER_CLOCKWISE; }

  static getOnName(state: boolean): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case Fan.ON: { name = 'ON'; break; }
    case Fan.OFF: { name = 'OFF'; break; }
    default: { name = state.toString();}
    }

    return name;
  }

  static getRotationDirectionName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case Fan.CLOCKWISE: { name = 'CLOCKWISE'; break; }
    case Fan.COUNTER_CLOCKWISE: { name = 'COUNTER CLOCKWISE'; break; }
    default: { name = state.toString();}
    }

    return name;
  }
}
