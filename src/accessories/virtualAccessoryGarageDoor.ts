/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidObstructionValueType, ObstructionValueUpdateNotAllowed } from '../errors.js';
import { UpdatableObstruction } from './updatableObstruction.js';
import { Timer } from '../utils/timer.js';

/**
 * GarageDoor - Accessory implementation
 */
export class GarageDoor extends Accessory implements UpdatableObstruction {

  static readonly ACCESSORY_TYPE_NAME: string = 'GarageDoor';

  static readonly OPEN: number = 0;     // Characteristic.CurrentDoorState.OPEN   - Characteristic.TargetDoorState.OPEN
  static readonly CLOSED: number = 1;   // Characteristic.CurrentDoorState.CLOSED - Characteristic.TargetDoorState.CLOSED
  static readonly OPENING: number = 2;  // Characteristic.CurrentDoorState.OPENING
  static readonly CLOSING: number = 3;  // Characteristic.CurrentDoorState.CLOSING
  static readonly STOPPED: number = 4;  // Characteristic.CurrentDoorState.STOPPED

  private static readonly DEFAULT_TIMEOUT_SECS: number = 10;

  private readonly stateStorageKey: string = 'GarageDoorState';

  private transitionTimer: Timer;
  private transitionDuration: number;

  private states = {
    GarageDoorCurrentState: GarageDoor.CLOSED,
    GarageDoorTargetState: GarageDoor.CLOSED,
    ObstructionDetected: false,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.garageDoor.defaultState === 'open' ? GarageDoor.OPEN : GarageDoor.CLOSED;

    this.states.GarageDoorCurrentState = this.defaultState;

    this.transitionDuration = (this.accessoryConfiguration.garageDoor.transitionDuration !== undefined) ? this.accessoryConfiguration.garageDoor.transitionDuration : GarageDoor.DEFAULT_TIMEOUT_SECS;
    const timerIsResettable: boolean = false;
    this.transitionTimer = new Timer(
      this.accessoryConfiguration.accessoryName,
      this.log,
      timerIsResettable,
      this.transitionDuration,
    );

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.GarageDoorCurrentState = cachedState;
      }
    }

    this.states.GarageDoorTargetState = this.states.GarageDoorCurrentState;

    this.service = this.accessory.getService(this.platform.Service.GarageDoorOpener) || this.accessory.addService(this.platform.Service.GarageDoorOpener);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Garage Door Current State: ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetDoorState, (this.states.GarageDoorTargetState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState)
      .onGet(this.getCurrentDoorState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState)
      .onSet(this.setTargetDoorState.bind(this))
      .onGet(this.getTargetDoorState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ObstructionDetected)
      .onGet(this.getObstructionDetected.bind(this));
  }

  // Handlers

  async getCurrentDoorState(): Promise<CharacteristicValue> {
    const garageDoorCurrentState = this.states.GarageDoorCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Door State: ${GarageDoor.getStateName(garageDoorCurrentState)}`);

    return garageDoorCurrentState;
  }

  async setTargetDoorState(value: CharacteristicValue) {
    this.states.GarageDoorTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Door State: ${GarageDoor.getStateName(this.states.GarageDoorTargetState)}`);

    // Check if door already in position
    if (
      (this.states.GarageDoorTargetState === GarageDoor.OPEN && this.states.GarageDoorCurrentState === GarageDoor.OPEN) ||
      (this.states.GarageDoorTargetState === GarageDoor.CLOSED && this.states.GarageDoorCurrentState === GarageDoor.CLOSED)
    ) {
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Current Door State already: ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);
    }
    // Check if obstruction is detected when trying to close
    else if (this.states.GarageDoorTargetState === GarageDoor.CLOSED && this.states.ObstructionDetected === true) {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Obstruction Detected. Refusing to close`);
    }
    // Check if door should be Stopped
    else if (
      (this.states.GarageDoorTargetState === GarageDoor.CLOSED && this.states.GarageDoorCurrentState === GarageDoor.OPENING) ||
      (this.states.GarageDoorTargetState === GarageDoor.OPEN && this.states.GarageDoorCurrentState === GarageDoor.CLOSING)
    ) {
      this.states.GarageDoorCurrentState = GarageDoor.STOPPED;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);

      this.transitionTimer.stop();
    }
    // Check if door is already moving in the right direction
    else if (
      (this.states.GarageDoorTargetState === GarageDoor.OPEN && this.states.GarageDoorCurrentState === GarageDoor.OPENING) ||
      (this.states.GarageDoorTargetState === GarageDoor.CLOSED && this.states.GarageDoorCurrentState === GarageDoor.CLOSING)
    ) {
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Current Door State already: ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);
    }
    else {
      // GarageDoorCurrentState CLOSED && GarageDoorTargetState OPEN -> GarageDoorCurrentState.OPENING
      // GarageDoorCurrentState OPEN && GarageDoorTargetState CLOSED -> GarageDoorCurrentState.CLOSING

      this.states.GarageDoorCurrentState = (this.states.GarageDoorTargetState === GarageDoor.OPEN) ?  GarageDoor.OPENING : GarageDoor.CLOSING;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);

      this.transitionTimer.stop();

      this.transitionTimer.start(
        () => {
          this.states.GarageDoorCurrentState = this.states.GarageDoorTargetState;
          this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));

          this.storeState();

          this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);
        }, this.transitionDuration);
    }
  }

  async getTargetDoorState(): Promise<CharacteristicValue> {
    const garageDoorTargetState = this.states.GarageDoorTargetState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Door State: ${GarageDoor.getStateName(garageDoorTargetState)}`);

    return garageDoorTargetState;
  }

  async getObstructionDetected(): Promise<CharacteristicValue> {
    const obstructionDetected = this.states.ObstructionDetected;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Obstruction Detected: ${obstructionDetected}`);

    return obstructionDetected;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.GarageDoorCurrentState,
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return GarageDoor.ACCESSORY_TYPE_NAME;
  }

  cleanup(): void {
    this.transitionTimer.stop();
    super.cleanup();
  }

  static getStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case GarageDoor.OPEN: { stateName = 'OPEN'; break; }
    case GarageDoor.CLOSED: { stateName = 'CLOSED'; break; }
    case GarageDoor.OPENING: { stateName = 'OPENING'; break; }
    case GarageDoor.CLOSING: { stateName = 'CLOSING'; break; }
    case GarageDoor.STOPPED: { stateName = 'STOPPED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }

  // Updatable Obstruction interface

  updateObstruction(value: boolean, accessoryId: string): void {
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Request update obstruction detected to ${value}`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new ObstructionValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'boolean') {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Value ${value} is not valid for Garage Door obstruction detected`);

      throw new InvalidObstructionValueType(`Invalid sensor value: ${value}`);
    }

    this.states.ObstructionDetected = value;
    this.service!.setCharacteristic(this.platform.Characteristic.ObstructionDetected, (this.states.ObstructionDetected));
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Obstruction Detected: ${value}`);

    // If the door is closing, it should reverse back to Open
    if (this.states.GarageDoorCurrentState === GarageDoor.CLOSING && this.states.ObstructionDetected === true) {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Obstruction Detected. Rolling back to Open`);

      this.states.GarageDoorTargetState = GarageDoor.OPEN;
      this.service!.setCharacteristic(this.platform.Characteristic.TargetDoorState, (this.states.GarageDoorTargetState));
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Door State: ${GarageDoor.getStateName(this.states.GarageDoorTargetState)}`);

      this.states.GarageDoorCurrentState = GarageDoor.OPENING;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);

      this.transitionTimer.stop();

      this.transitionTimer.start(
        () => {
          this.states.GarageDoorCurrentState = this.states.GarageDoorTargetState;
          this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));

          this.storeState();

          this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);
        }, this.transitionDuration);
    }
  }
}
