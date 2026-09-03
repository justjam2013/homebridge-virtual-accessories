import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

/**
 * FanStatus - Accessory status
 */

class FanStatus {
  On: boolean = Fan.OFF;
  RotationDirection: number = Fan.CLOCKWISE;
  RotationSpeed: number = 0;
}

/**
 * Fan - Accessory implementation
 */
export class Fan extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Fan';

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  static readonly CLOCKWISE: number =             CharacteristicType.ProgrammableSwitchEvent.RotationDirection.CLOCKWISE;
  static readonly COUNTER_CLOCKWISE: number =     CharacteristicType.ProgrammableSwitchEvent.RotationDirection.COUNTER_CLOCKWISE;

  private readonly stateStorageKey: string = 'FanState';
  private readonly rotatioDirectionStorageKey: string = 'FanRotationDirection';
  private readonly rotatioSpeedStorageKey: string = 'FanRotationSpeed';

  private status: FanStatus = new FanStatus();

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.status.RotationDirection = this.accessoryConfiguration.fan.rotationDirection === 'clockwise' ? Fan.CLOCKWISE : Fan.COUNTER_CLOCKWISE;
    this.status.RotationSpeed = this.accessoryConfiguration.fan.rotationSpeed;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;
      const cachedRotationDirection: number = accessoryState[this.rotatioDirectionStorageKey] as number;
      const cachedRotationSpeed: number = accessoryState[this.rotatioSpeedStorageKey] as number;

      if (cachedState !== undefined && cachedRotationDirection !== undefined && cachedRotationSpeed !== undefined) {
        this.status.On = cachedState;
        this.status.RotationDirection = cachedRotationDirection;
        this.status.RotationSpeed = cachedRotationSpeed;
      }
    }

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOnHamdler.bind(this))
      .onGet(this.getOnHamdler.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RotationDirection)
      .onSet(this.setRotationDirectionHamdler.bind(this))
      .onGet(this.getRotationDirectionHamdler.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onSet(this.setRotationSpeedHamdler.bind(this))
      .onGet(this.getRotationSpeedHamdler.bind(this));
  }

  // *** Handlers ***

  // On

  async getOnHamdler(): Promise<CharacteristicValue> {
    const On: boolean = this.status.On;
    this.log.debug(`[${this.accessoryName}] Getting State: ${Fan.getStateName(On)}`);

    return On;
  }

  async setOnHamdler(value: CharacteristicValue) {
    const On = value as boolean;
    this.status.On = On;
    this.log.info(`[${this.accessoryName}] Setting State: ${Fan.getStateName(On)}`);

    this.storeState();
  }

  // RotationDirection

  async getRotationDirectionHamdler(): Promise<CharacteristicValue> {
    const RotationDirection = this.status.RotationDirection;
    this.log.debug(`[${this.accessoryName}] Getting Rotation Direction: ${RotationDirection}%`);

    return RotationDirection;
  }

  async setRotationDirectionHamdler(value: CharacteristicValue) {
    const RotationDirection = value as number;
    this.status.RotationDirection = RotationDirection;
    this.log.info(`[${this.accessoryName}] Setting Rotation Direction: ${RotationDirection}%`);

    this.storeState();
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
    return Fan.ACCESSORY_TYPE_NAME;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return ServiceType.Fan;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.status.On,
      [this.rotatioDirectionStorageKey]: this.status.RotationDirection,
      [this.rotatioSpeedStorageKey]: this.status.RotationSpeed,
    });
    return json;
  }

  // Static

  static getStateName(state: boolean): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Fan.ON: { stateName = 'ON'; break; }
    case Fan.OFF: { stateName = 'OFF'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }
}
