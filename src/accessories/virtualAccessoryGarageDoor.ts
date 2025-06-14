/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

import { InvalidObstructionValueType, ObstructionValueUpdateNotAllowed } from '../errors.js';
import { UpdatableObstruction } from '../updatableObstruction.js';

/**
 * GarageDoor - Accessory implementation
 */
export class GarageDoor extends Accessory implements UpdatableObstruction {

  static readonly ACCESSORY_TYPE_NAME: string = 'GarageDoor';

  static readonly OPEN: number = 0;     // Characteristic.CurrentDoorState.OPEN   - Characteristic.TargetDoorState.OPEN
  static readonly CLOSED: number = 1;   // Characteristic.CurrentDoorState.CLOSED - Characteristic.TargetDoorState.CLOSED
  static readonly OPENING: number = 2;  // Characteristic.CurrentDoorState.OPENING;
  static readonly CLOSING: number = 3;  // Characteristic.CurrentDoorState.CLOSING;
  static readonly STOPPED: number = 4;  // Characteristic.CurrentDoorState.STOPPED;

  private static readonly DEFAULT_TIMEOUT_SECS: number = 3;

  private readonly stateStorageKey: string = 'GarageDoorState';

  private transitionTimerId: ReturnType<typeof setTimeout> | undefined;

  private states = {
    GarageDoorCurrentState: GarageDoor.CLOSED,
    GarageDoorTargetState: GarageDoor.CLOSED,
    ObstructionDetected: false,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.garageDoor.defaultState === 'open' ? GarageDoor.OPEN : GarageDoor.CLOSED;

    this.states.GarageDoorCurrentState = this.defaultState;

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

    // Clear the obstruction flag
    this.states.ObstructionDetected = false;
    this.service!.setCharacteristic(this.platform.Characteristic.ObstructionDetected, (this.states.ObstructionDetected));
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Obstruction Detected: ${this.states.ObstructionDetected}`);

    // CurrentDoorState CLOSING/OPENING
    this.states.GarageDoorCurrentState = (this.states.GarageDoorTargetState === GarageDoor.OPEN) ? GarageDoor.OPENING : GarageDoor.CLOSING;
    this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);

    // CurrentDoorState CLOSED/OPEN with 3 second delay
    const transitionDuration = this.accessoryConfiguration.garageDoor.transitionDuration;
    const transitionDelayMillis: number = (transitionDuration ? transitionDuration : GarageDoor.DEFAULT_TIMEOUT_SECS) * 1000;

    // Reset timer, if running
    clearTimeout(this.transitionTimerId);

    this.transitionTimerId = setTimeout(() => {
      this.states.GarageDoorCurrentState = this.states.GarageDoorTargetState;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));

      this.storeState();

      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);
    }, transitionDelayMillis);
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
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Value ${value} is not valid for a Garage Door obstruction detected`);

      throw new InvalidObstructionValueType(`Invalid sensor value: ${value}`);
    }
    else if (this.states.GarageDoorCurrentState === GarageDoor.OPENING || this.states.GarageDoorCurrentState === GarageDoor.CLOSING) {
      this.states.ObstructionDetected = value;
      this.service!.setCharacteristic(this.platform.Characteristic.ObstructionDetected, (this.states.ObstructionDetected));
      // Only log to 'info' if setting ObstructionDetected to true
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Updating obstruction detected to ${value}`);

      if (value === true) {
        // Reset timer, if running
        clearTimeout(this.transitionTimerId);

        this.states.GarageDoorCurrentState = GarageDoor.STOPPED;
        this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));
        this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);
      }
    }
    else {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Ignoring. Garage Door is ${GarageDoor.getStateName(this.states.GarageDoorCurrentState)}`);
    }
  }
}
