import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './accessory.js';

/**
 * Fan - Accessory implementation
 */
export class Fan extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Fan';

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  static readonly CLOCKWISE: number = 0;          // Characteristic.ProgrammableSwitchEvent.RotationDirection.CLOCKWISE
  static readonly COUNTER_CLOCKWISE: number = 1;  // Characteristic.ProgrammableSwitchEvent.RotationDirection.COUNTER_CLOCKWISE

  private readonly stateStorageKey: string = 'FanState';
  private readonly rotatioDirectionStorageKey: string = 'FanRotationDirection';
  private readonly rotatioSpeedStorageKey: string = 'FanRotationSpeed';

  private states = {
    FanState: Fan.OFF,
    FanRotationDirection: Fan.CLOCKWISE,
    FanRotationSpeed: 100,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.fan.defaultState === 'on' ? Fan.ON : Fan.OFF;
    const rotationDirection: number = this.accessoryConfiguration.fan.rotationDirection === 'clockwise' ? Fan.CLOCKWISE : Fan.COUNTER_CLOCKWISE;
    const rotationSpeed: number = this.accessoryConfiguration.fan.rotationSpeed as number;

    this.states.FanState = this.defaultState;
    this.states.FanRotationDirection = rotationDirection;
    this.states.FanRotationSpeed = rotationSpeed;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;
      const cachedRotationDirection: number = accessoryState[this.rotatioDirectionStorageKey] as number;
      const cachedRotationSpeed: number = accessoryState[this.rotatioSpeedStorageKey] as number;

      if (cachedState !== undefined && cachedRotationDirection !== undefined && cachedRotationSpeed !== undefined) {
        this.states.FanState = cachedState;
        this.states.FanRotationDirection = cachedRotationDirection;
        this.states.FanRotationSpeed = cachedRotationSpeed;
      }
    }

    this.service = this.accessory.getService(this.platform.Service.Fan) || this.accessory.addService(this.platform.Service.Fan);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory     
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Fan Current State: ${Fan.getStateName(this.states.FanState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.states.FanState));
    this.service.updateCharacteristic(this.platform.Characteristic.RotationDirection, (this.states.FanRotationDirection));
    this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, (this.states.FanRotationSpeed));

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
    this.states.FanState = value as boolean;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${Fan.getStateName(this.states.FanState)}`);
  }

  async getOn(): Promise<CharacteristicValue> {
    const fanState = this.states.FanState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${Fan.getStateName(fanState)}`);

    return fanState;
  }

  async setRotationDirection(value: CharacteristicValue) {
    this.states.FanRotationDirection = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Rotation Direction: ${this.states.FanRotationDirection}`);
  }

  async getRotationDirection(): Promise<CharacteristicValue> {
    const fanRotationDirection = this.states.FanRotationDirection;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Rotation Direction: ${fanRotationDirection}`);

    return fanRotationDirection;
  }

  async setRotationSpeed(value: CharacteristicValue) {
    this.states.FanRotationSpeed = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Rotation Speed: ${this.states.FanRotationSpeed}%`);
  }

  async getRotationSpeed(): Promise<CharacteristicValue> {
    const fanRotationSpeed = this.states.FanRotationSpeed;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Rotation Speed: ${fanRotationSpeed}%`);

    return fanRotationSpeed;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.FanState,
      [this.rotatioDirectionStorageKey]: this.states.FanRotationDirection,
      [this.rotatioSpeedStorageKey]: this.states.FanRotationSpeed,
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return Fan.ACCESSORY_TYPE_NAME;
  }

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
