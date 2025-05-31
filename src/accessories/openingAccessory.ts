import { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';
import { OpeningAccessoryConfiguration } from '../configuration/configurationOpeningAccesory.js';

export abstract class OpeningAccessory extends Accessory {

  static readonly CLOSED: number = 0;   // 0%
  static readonly OPEN: number = 100;   // 100%

  static readonly DECREASING: number = 0;   //	Characteristic.PositionState.DECREASING;  -> CLOSING
  static readonly INCREASING: number = 1;   //	Characteristic.PositionState.INCREASING;  -> OPENING
  static readonly STOPPED: number = 2;      //	Characteristic.PositionState.STOPPED;     -> OPEN or CLOSED

  protected static readonly MIN_TIMEOUT_SECS: number = 1;
  protected static readonly DEFAULT_TIMEOUT_SECS: number = 3;

  protected readonly stateStorageKey: string = 'Position';

  protected transitionTimerId: ReturnType<typeof setTimeout> | undefined;

  private openingAccessoryConfiguration: OpeningAccessoryConfiguration;

  protected states = {
    TargetPosition: OpeningAccessory.CLOSED,
    CurrentPosition: OpeningAccessory.CLOSED,
    PositionState: OpeningAccessory.STOPPED,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.openingAccessoryConfiguration = this.getOpeningAccessoryConfiguration();
    this.defaultState = this.openingAccessoryConfiguration.defaultState === 'open' ? OpeningAccessory.OPEN : OpeningAccessory.CLOSED;

    this.states.CurrentPosition = this.defaultState;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.CurrentPosition = cachedState;
      }
    }

    this.states.TargetPosition = this.states.CurrentPosition;

    // set accessory information
    const service: WithUUID<typeof Service> = this.getOpeningAccessoryService();
    this.service = this.accessory.getService(service) || this.accessory.addService(service as unknown as Service);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    // eslint-disable-next-line max-len
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Window Covering Current Position: ${OpeningAccessory.getStateName(this.states.CurrentPosition)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, (this.states.CurrentPosition));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, (this.states.TargetPosition));
    this.service.updateCharacteristic(this.platform.Characteristic.PositionState, (this.states.PositionState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .onGet(this.getCurrentPosition.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onSet(this.setTargetPosition.bind(this))
      .onGet(this.getTargetPosition.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.PositionState)
      .onGet(this.getPositionState.bind(this));
  }

  // Handlers

  async getCurrentPosition(): Promise<CharacteristicValue> {
    const currentPosition = this.states.CurrentPosition;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Position: ${OpeningAccessory.getStateName(currentPosition)}`);

    return currentPosition;
  }

  async setTargetPosition(value: CharacteristicValue) {
    this.states.TargetPosition = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Position: ${OpeningAccessory.getStateName(this.states.TargetPosition)}`);

    this.states.PositionState = (this.states.TargetPosition > this.states.CurrentPosition) ? OpeningAccessory.INCREASING : OpeningAccessory.DECREASING;
    this.service!.setCharacteristic(this.platform.Characteristic.PositionState, (this.states.PositionState));
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Position State: ${OpeningAccessory.getPositionName(this.states.PositionState)}`);

    const transitionDuration = this.openingAccessoryConfiguration.transitionDuration;
    const transitionDelayMillis: number = (transitionDuration ? transitionDuration : OpeningAccessory.DEFAULT_TIMEOUT_SECS) * 1000;

    const proportionalTransitionDelayMillis = Math.max(
      transitionDelayMillis / 100 * Math.abs(this.states.TargetPosition - this.states.CurrentPosition),
      OpeningAccessory.MIN_TIMEOUT_SECS * 1000);

    // Reset transition timer, if running
    clearTimeout(this.transitionTimerId);

    this.transitionTimerId = setTimeout(() => {
      this.states.PositionState = OpeningAccessory.STOPPED;
      this.service!.setCharacteristic(this.platform.Characteristic.PositionState, (this.states.PositionState));
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Position State: ${OpeningAccessory.getPositionName(this.states.PositionState)}`);

      this.states.CurrentPosition = this.states.TargetPosition;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentPosition, (this.states.CurrentPosition));

      this.storeState();

      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Position: ${OpeningAccessory.getStateName(this.states.CurrentPosition)}`);
    }, proportionalTransitionDelayMillis);
  }

  async getTargetPosition(): Promise<CharacteristicValue> {
    const targetPosition = this.states.TargetPosition;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Position: ${OpeningAccessory.getStateName(targetPosition)}`);

    return targetPosition;
  }

  async getPositionState(): Promise<CharacteristicValue> {
    const positionState = this.states.PositionState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Position State: ${OpeningAccessory.getPositionName(positionState)}`);

    return positionState;
  }

  protected abstract getOpeningAccessoryConfiguration(): OpeningAccessoryConfiguration;

  protected abstract getOpeningAccessoryService(): WithUUID<typeof Service>;

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.CurrentPosition,
    });
    return json;
  }

  static getStateName(position: number): string {
    let positionName: string;

    switch (position) {
    case undefined: { positionName = 'undefined'; break; }
    case OpeningAccessory.CLOSED: { positionName = 'CLOSED'; break; }
    case OpeningAccessory.OPEN: { positionName = 'OPEN'; break; }
    default: { positionName = `POSITION: ${position.toString()}%`; }
    }

    if (position > OpeningAccessory.OPEN) {
      positionName = `INVALID ${positionName}%`;
    }

    return positionName;
  }

  static getPositionName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case OpeningAccessory.DECREASING: { stateName = 'DECREASING'; break; }
    case OpeningAccessory.INCREASING: { stateName = 'INCREASING'; break; }
    case OpeningAccessory.STOPPED: { stateName = 'STOPPED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}
