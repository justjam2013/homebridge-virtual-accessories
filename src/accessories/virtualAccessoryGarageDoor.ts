/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidObstructionValueType, ObstructionValueUpdateNotAllowed } from '../errors.js';
import { UpdatableObstruction } from './updatableObstruction.js';
import { Timer } from '../utils/timer.js';

class GarageDoorStatus {
  CurrentDoorState: number = GarageDoor.CLOSED;
  TargetDoorState: number = GarageDoor.CLOSED;
  ObstructionDetected: boolean = false;

  transitionDuration: number = 0;
}

/**
 * GarageDoor - Accessory implementation
 */
export class GarageDoor extends Accessory implements UpdatableObstruction {

  static readonly ACCESSORY_TYPE_NAME: string = 'GarageDoor';

  static readonly OPEN: number =      CharacteristicType.CurrentDoorState.OPEN;   // Characteristic.TargetDoorState.OPEN;
  static readonly CLOSED: number =    CharacteristicType.CurrentDoorState.CLOSED; // Characteristic.TargetDoorState.CLOSED;
  static readonly OPENING: number =   CharacteristicType.CurrentDoorState.OPENING;
  static readonly CLOSING: number =   CharacteristicType.CurrentDoorState.CLOSING;
  static readonly STOPPED: number =   CharacteristicType.CurrentDoorState.STOPPED;

  private static readonly DEFAULT_TIMEOUT_SECS: number = 10;

  private readonly stateStorageKey: string = 'GarageDoorState';

  private transitionTimer: Timer;

  private status: GarageDoorStatus = new GarageDoorStatus();

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.garageDoor.defaultState === 'open' ? GarageDoor.OPEN : GarageDoor.CLOSED;
    this.status.CurrentDoorState = this.defaultState;

    this.status.transitionDuration = (this.accessoryConfiguration.garageDoor.transitionDuration !== undefined) ? this.accessoryConfiguration.garageDoor.transitionDuration : GarageDoor.DEFAULT_TIMEOUT_SECS;
    const timerIsResettable: boolean = false;
    this.transitionTimer = new Timer(
      this.accessoryConfiguration.accessoryName,
      this.log,
      timerIsResettable,
      this.status.transitionDuration,
    );

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.status.CurrentDoorState = cachedState;
      }
    }

    this.status.TargetDoorState = this.status.CurrentDoorState;

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState)
      .onGet(this.getCurrentDoorStateHandler.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState)
      .onSet(this.setTargetDoorStateHandler.bind(this))
      .onGet(this.getTargetDoorStateHandler.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ObstructionDetected)
      .onGet(this.getObstructionDetectedHandler.bind(this));
  }

  // *** Handlers ***

  // CurrentDoorState

  async getCurrentDoorStateHandler(): Promise<CharacteristicValue> {
    const GarageDoorCurrentState = this.status.CurrentDoorState;
    this.log.debug(`[${this.accessoryName}] Getting Current Door State: ${GarageDoor.getStateName(GarageDoorCurrentState)}`);

    return GarageDoorCurrentState;
  }

  // TargetDoorState

  async getTargetDoorStateHandler(): Promise<CharacteristicValue> {
    const GarageDoorTargetState = this.status.TargetDoorState;
    this.log.debug(`[${this.accessoryName}] Getting Target Door State: ${GarageDoor.getStateName(GarageDoorTargetState)}`);

    return GarageDoorTargetState;
  }

  async setTargetDoorStateHandler(value: CharacteristicValue) {
    this.status.TargetDoorState = value as number;
    this.log.info(`[${this.accessoryName}] Setting Target Door State: ${GarageDoor.getStateName(this.status.TargetDoorState)}`);

    // Check if door already in position
    if (
      (this.status.TargetDoorState === GarageDoor.OPEN && this.status.CurrentDoorState === GarageDoor.OPEN) ||
      (this.status.TargetDoorState === GarageDoor.CLOSED && this.status.CurrentDoorState === GarageDoor.CLOSED)
    ) {
      this.log.info(`[${this.accessoryName}] Current Door State already: ${GarageDoor.getStateName(this.status.CurrentDoorState)}`);
    }
    // Check if obstruction is detected when trying to close
    else if (this.status.TargetDoorState === GarageDoor.CLOSED && this.status.ObstructionDetected === true) {
      this.log.error(`[${this.accessoryName}] Obstruction Detected. Refusing to close`);
    }
    // Check if door should be Stopped
    else if (
      (this.status.TargetDoorState === GarageDoor.CLOSED && this.status.CurrentDoorState === GarageDoor.OPENING) ||
      (this.status.TargetDoorState === GarageDoor.OPEN && this.status.CurrentDoorState === GarageDoor.CLOSING)
    ) {
      this.status.CurrentDoorState = GarageDoor.STOPPED;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.status.CurrentDoorState));
      this.log.info(`[${this.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.status.CurrentDoorState)}`);

      this.transitionTimer.stop();
    }
    // Check if door is already moving in the right direction
    else if (
      (this.status.TargetDoorState === GarageDoor.OPEN && this.status.CurrentDoorState === GarageDoor.OPENING) ||
      (this.status.TargetDoorState === GarageDoor.CLOSED && this.status.CurrentDoorState === GarageDoor.CLOSING)
    ) {
      this.log.info(`[${this.accessoryName}] Current Door State already: ${GarageDoor.getStateName(this.status.CurrentDoorState)}`);
    }
    else {
      // GarageDoorCurrentState CLOSED && GarageDoorTargetState OPEN -> GarageDoorCurrentState.OPENING
      // GarageDoorCurrentState OPEN && GarageDoorTargetState CLOSED -> GarageDoorCurrentState.CLOSING

      this.status.CurrentDoorState = (this.status.TargetDoorState === GarageDoor.OPEN) ?  GarageDoor.OPENING : GarageDoor.CLOSING;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.status.CurrentDoorState));
      this.log.info(`[${this.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.status.CurrentDoorState)}`);

      this.transitionTimer.stop();

      this.transitionTimer.start(
        () => {
          this.status.CurrentDoorState = this.status.TargetDoorState;
          this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.status.CurrentDoorState));

          this.storeState();

          this.log.info(`[${this.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.status.CurrentDoorState)}`);
        }, this.status.transitionDuration);
    }
  }

  // ObstructionDetected

  async getObstructionDetectedHandler(): Promise<CharacteristicValue> {
    const obstructionDetected = this.status.ObstructionDetected;

    this.log.debug(`[${this.accessoryName}] Getting Obstruction Detected: ${obstructionDetected}`);

    return obstructionDetected;
  }

  // Absract method implementations

  protected getAccessoryTypeName(): string {
    return GarageDoor.ACCESSORY_TYPE_NAME;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return ServiceType.GarageDoorOpener;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.status.CurrentDoorState,
    });
    return json;
  }

  // Static

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
    this.log.debug(`[${this.accessoryName}] Request update obstruction detected to ${value}`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new ObstructionValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'boolean') {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for Garage Door obstruction detected`);

      throw new InvalidObstructionValueType(`Invalid sensor value: ${value}`);
    }

    this.status.ObstructionDetected = value;
    this.service!.setCharacteristic(this.platform.Characteristic.ObstructionDetected, (this.status.ObstructionDetected));
    this.log.info(`[${this.accessoryName}] Setting Obstruction Detected: ${value}`);

    // If the door is closing, it should reverse back to Open
    if (this.status.CurrentDoorState === GarageDoor.CLOSING && this.status.ObstructionDetected === true) {
      this.log.error(`[${this.accessoryName}] Obstruction Detected. Rolling back to Open`);

      this.status.TargetDoorState = GarageDoor.OPEN;
      this.service!.setCharacteristic(this.platform.Characteristic.TargetDoorState, (this.status.TargetDoorState));
      this.log.info(`[${this.accessoryName}] Setting Target Door State: ${GarageDoor.getStateName(this.status.TargetDoorState)}`);

      this.status.CurrentDoorState = GarageDoor.OPENING;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.status.CurrentDoorState));
      this.log.info(`[${this.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.status.CurrentDoorState)}`);

      this.transitionTimer.stop();

      this.transitionTimer.start(
        () => {
          this.status.CurrentDoorState = this.status.TargetDoorState;
          this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.status.CurrentDoorState));

          this.storeState();

          this.log.info(`[${this.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(this.status.CurrentDoorState)}`);
        }, this.status.transitionDuration);
    }
  }
}
