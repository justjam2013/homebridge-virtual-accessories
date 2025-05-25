/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * WindowCovering - Accessory implementation
 */
export class WindowCovering extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Window Covering';

  static readonly CLOSED: number = 0;   // 0%
  static readonly OPEN: number = 100;   // 100%

  static readonly DECREASING: number = 0;   //	Characteristic.PositionState.DECREASING;  -> CLOSING
  static readonly INCREASING: number = 1;   //	Characteristic.PositionState.INCREASING;  -> OPENING
  static readonly STOPPED: number = 2;      //	Characteristic.PositionState.STOPPED;     -> OPEN or CLOSED

  private readonly stateStorageKey: string = 'WindowCoveringPosition';

  private transitionTimerId: ReturnType<typeof setTimeout> | undefined;

  private states = {
    WindowCoveringTargetPosition: WindowCovering.CLOSED,
    WindowCoveringCurrentPosition: WindowCovering.CLOSED,
    WindowCoveringPositionState: WindowCovering.STOPPED,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.windowCovering.defaultState === 'open' ? WindowCovering.OPEN : WindowCovering.CLOSED;

    this.states.WindowCoveringCurrentPosition = this.defaultState;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.WindowCoveringCurrentPosition = cachedState;
      }
    }

    this.states.WindowCoveringTargetPosition = this.states.WindowCoveringCurrentPosition;

    this.service = this.accessory.getService(this.platform.Service.WindowCovering) || this.accessory.addService(this.platform.Service.WindowCovering);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Window Covering Current Position: ${WindowCovering.getStateName(this.states.WindowCoveringCurrentPosition)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, (this.states.WindowCoveringCurrentPosition));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, (this.states.WindowCoveringTargetPosition));
    this.service.updateCharacteristic(this.platform.Characteristic.PositionState, (this.states.WindowCoveringPositionState));

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
    const windowCoveringCurrentPosition = this.states.WindowCoveringCurrentPosition;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Position: ${WindowCovering.getStateName(windowCoveringCurrentPosition)}`);

    return windowCoveringCurrentPosition;
  }

  async setTargetPosition(value: CharacteristicValue) {
    this.states.WindowCoveringTargetPosition = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Position: ${WindowCovering.getStateName(this.states.WindowCoveringTargetPosition)}`);

    this.states.WindowCoveringPositionState = (this.states.WindowCoveringTargetPosition > this.states.WindowCoveringCurrentPosition) ? WindowCovering.INCREASING : WindowCovering.DECREASING;
    this.service!.setCharacteristic(this.platform.Characteristic.PositionState, (this.states.WindowCoveringPositionState));
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Position State: ${WindowCovering.getPositionName(this.states.WindowCoveringPositionState)}`);

    const transitionDuration = this.accessoryConfiguration.windowCovering.transitionDuration;
    const transitionDelayMillis: number = (transitionDuration ? transitionDuration : 3) * 1000;
    this.transitionTimerId = setTimeout(() => {
      // Reset timer
      clearTimeout(this.transitionTimerId);

      this.states.WindowCoveringPositionState = WindowCovering.STOPPED;
      this.service!.setCharacteristic(this.platform.Characteristic.PositionState, (this.states.WindowCoveringPositionState));
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Position State: ${WindowCovering.getPositionName(this.states.WindowCoveringPositionState)}`);

      this.states.WindowCoveringCurrentPosition = this.states.WindowCoveringTargetPosition;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentPosition, (this.states.WindowCoveringCurrentPosition));

      this.storeState();

      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Position: ${WindowCovering.getStateName(this.states.WindowCoveringCurrentPosition)}`);
    }, transitionDelayMillis);
  }

  async getTargetPosition(): Promise<CharacteristicValue> {
    const windowCoveringTargetPosition = this.states.WindowCoveringTargetPosition;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Position: ${WindowCovering.getStateName(windowCoveringTargetPosition)}`);

    return windowCoveringTargetPosition;
  }

  async getPositionState(): Promise<CharacteristicValue> {
    const windowCoveringPositionState = this.states.WindowCoveringPositionState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Position State: ${WindowCovering.getPositionName(windowCoveringPositionState)}`);

    return windowCoveringPositionState;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.WindowCoveringCurrentPosition,
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return WindowCovering.ACCESSORY_TYPE_NAME;
  }

  static getStateName(position: number): string {
    let positionName: string;

    switch (position) {
    case undefined: { positionName = 'undefined'; break; }
    case WindowCovering.CLOSED: { positionName = 'CLOSED'; break; }
    case WindowCovering.OPEN: { positionName = 'OPEN'; break; }
    default: { positionName = `POSITION: ${position.toString()}%`; }
    }

    if (position > WindowCovering.OPEN) {
      positionName = `INVALID ${positionName}%`;
    }

    return positionName;
  }

  static getPositionName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case WindowCovering.DECREASING: { stateName = 'DECREASING'; break; }
    case WindowCovering.INCREASING: { stateName = 'INCREASING'; break; }
    case WindowCovering.STOPPED: { stateName = 'STOPPED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}
