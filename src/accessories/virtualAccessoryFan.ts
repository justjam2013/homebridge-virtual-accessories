import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';
import { Power } from './accessoryCharacteristics.js';

/**
 * Fan - Accessory implementation
 */
export class Fan extends Accessory<typeof Service.Fan> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Fan';

  static readonly CLOCKWISE: number = 0;          // Characteristic.ProgrammableSwitchEvent.RotationDirection.CLOCKWISE
  static readonly COUNTER_CLOCKWISE: number = 1;  // Characteristic.ProgrammableSwitchEvent.RotationDirection.COUNTER_CLOCKWISE

  private readonly stateStorageKey: string = 'FanState';
  private readonly rotatioDirectionStorageKey: string = 'FanRotationDirection';
  private readonly rotatioSpeedStorageKey: string = 'FanRotationSpeed';

  // Device state
  private PowerState: boolean = Power.OFF;
  private RotationDirection: number = Fan.CLOCKWISE;
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
      platform.Service.Fan,
      Fan.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    const rotationDirection: number = this.accessoryConfiguration.fan.rotationDirection === 'clockwise' ? Fan.CLOCKWISE : Fan.COUNTER_CLOCKWISE;
    const rotationSpeed: number = this.accessoryConfiguration.fan.rotationSpeed as number;

    this.PowerState = Power.OFF;
    this.RotationDirection = rotationDirection;
    this.RotationSpeed = rotationSpeed;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;
      const cachedRotationDirection: number = accessoryState[this.rotatioDirectionStorageKey] as number;
      const cachedRotationSpeed: number = accessoryState[this.rotatioSpeedStorageKey] as number;

      if (cachedState !== undefined && cachedRotationDirection !== undefined && cachedRotationSpeed !== undefined) {
        this.PowerState = cachedState;
        this.RotationDirection = cachedRotationDirection;
        this.RotationSpeed = cachedRotationSpeed;
      }
    }

    // Update the initial state of the accessory     
    this.log.debug(`[${this.accessoryName}] Setting Fan Current State: ${Power.getName(this.PowerState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.PowerState));
    this.service.updateCharacteristic(this.platform.Characteristic.RotationDirection, (this.RotationDirection));
    this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, (this.RotationSpeed));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RotationDirection)
      .onSet(this.setRotationDirection.bind(this))
      .onGet(this.getRotationDirection.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onSet(this.setRotationSpeed.bind(this))
      .onGet(this.getRotationSpeed.bind(this));
  }

  // Handlers

  async setOn(value: CharacteristicValue) {
    this.PowerState = value as boolean;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting State: ${Power.getName(this.PowerState)}`);
  }

  async getOn(): Promise<CharacteristicValue> {
    const fanState = this.PowerState;

    this.log.debug(`[${this.accessoryName}] Getting State: ${Power.getName(fanState)}`);

    return fanState;
  }

  async setRotationDirection(value: CharacteristicValue) {
    this.RotationDirection = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Rotation Direction: ${this.RotationDirection}`);
  }

  async getRotationDirection(): Promise<CharacteristicValue> {
    const fanRotationDirection = this.RotationDirection;

    this.log.debug(`[${this.accessoryName}] Getting Rotation Direction: ${fanRotationDirection}`);

    return fanRotationDirection;
  }

  async setRotationSpeed(value: CharacteristicValue) {
    this.RotationSpeed = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Rotation Speed: ${this.RotationSpeed}%`);
  }

  async getRotationSpeed(): Promise<CharacteristicValue> {
    const fanRotationSpeed = this.RotationSpeed;

    this.log.debug(`[${this.accessoryName}] Getting Rotation Speed: ${fanRotationSpeed}%`);

    return fanRotationSpeed;
  }

  //

  protected override getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.PowerState,
      [this.rotatioDirectionStorageKey]: this.RotationDirection,
      [this.rotatioSpeedStorageKey]: this.RotationSpeed,
    });
    return json;
  }
}
