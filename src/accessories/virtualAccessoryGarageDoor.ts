/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidObstructionValueType, ObstructionValueUpdateNotAllowed } from '../errors.js';
import { UpdatableObstruction } from './updatableObstruction.js';
import { Timer } from '../utils/timer.js';

/**
 * GarageDoor - Accessory implementation
 */
export class GarageDoor extends Accessory implements UpdatableObstruction {

  private static readonly DEFAULT_TIMEOUT_SECS: number = 10;

  private readonly stateStorageKey: string = 'GarageDoorState';

  private transitionTimer: Timer;
  private transitionDuration: number;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.GarageDoorOpener);

    let GarageDoorCurrentState: number = GarageDoor.CLOSED;
    let GarageDoorTargetState: number = GarageDoor.CLOSED;
    const ObstructionDetected: boolean = false;

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.garageDoor.defaultState === 'open' ? GarageDoor.OPEN : GarageDoor.CLOSED;

    GarageDoorCurrentState = this.defaultState;

    this.transitionDuration = (this.accessoryConfiguration.garageDoor.transitionDuration !== undefined) ? this.accessoryConfiguration.garageDoor.transitionDuration : GarageDoor.DEFAULT_TIMEOUT_SECS;
    const timerIsResettable: boolean = false;
    this.transitionTimer = new Timer(
      this.accessoryName,
      this.log,
      timerIsResettable,
      this.transitionDuration,
    );

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        GarageDoorCurrentState = cachedState;
      }
    }

    GarageDoorTargetState = GarageDoorCurrentState;

    // Update the initial state of the accessory
    this.setCurrentDoorState(GarageDoorCurrentState);
    this.setTargetDoorState(GarageDoorTargetState);
    this.setObstructionDetected(ObstructionDetected);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.CurrentDoorState)
      .onGet(this.getCurrentDoorStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.TargetDoorState)
      .onSet(this.setTargetDoorStateHandler.bind(this))
      .onGet(this.getTargetDoorStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.ObstructionDetected)
      .onGet(this.getObstructionDetectedHandler.bind(this));
  }

  //
  // ****************************** Handlers ******************************
  //

  // CurrentDoorState

  async getCurrentDoorStateHandler(): Promise<CharacteristicValue> {
    const CurrentDoorState: number = this.getCurrentDoorState();
    this.log.debug(`[${this.accessoryName}] Getting Current Door State: ${GarageDoor.getStateName(CurrentDoorState)}`);

    return CurrentDoorState;
  }

  // TargetDoorState

  async getTargetDoorStateHandler(): Promise<CharacteristicValue> {
    const TargetDoorState: number = this.getTargetDoorState();
    this.log.debug(`[${this.accessoryName}] Getting Target Door State: ${GarageDoor.getStateName(TargetDoorState)}`);

    return TargetDoorState;
  }

  async setTargetDoorStateHandler(value: CharacteristicValue) {
    let TargetDoorState: number = value as number;
    TargetDoorState = this.updateTargetDoorState(TargetDoorState);
    this.log.info(`[${this.accessoryName}] Setting Target Door State: ${GarageDoor.getStateName(TargetDoorState)}`);

    // Check if door already in position
    let CurrentDoorState: number = this.getCurrentDoorState();
    const ObstructionDetected: boolean = this.getObstructionDetected();
    if (
      (TargetDoorState === GarageDoor.OPEN && CurrentDoorState === GarageDoor.OPEN) ||
      (TargetDoorState === GarageDoor.CLOSED && CurrentDoorState === GarageDoor.CLOSED)
    ) {
      this.log.info(`[${this.accessoryName}] Current Door State already: ${GarageDoor.getStateName(CurrentDoorState)}`);
    }
    // Check if obstruction is detected when trying to close
    else if (TargetDoorState === GarageDoor.CLOSED && ObstructionDetected === true) {
      this.log.error(`[${this.accessoryName}] Obstruction Detected. Refusing to close`);
    }
    // Check if door should be Stopped
    else if (
      (TargetDoorState === GarageDoor.CLOSED && CurrentDoorState === GarageDoor.OPENING) ||
      (TargetDoorState === GarageDoor.OPEN && CurrentDoorState === GarageDoor.CLOSING)
    ) {
      CurrentDoorState = this.updateCurrentDoorState(GarageDoor.STOPPED);
      this.log.info(`[${this.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(CurrentDoorState)}`);

      this.transitionTimer.stop();
    }
    // Check if door is already moving in the right direction
    else if (
      (TargetDoorState === GarageDoor.OPEN && CurrentDoorState === GarageDoor.OPENING) ||
      (TargetDoorState === GarageDoor.CLOSED && CurrentDoorState === GarageDoor.CLOSING)
    ) {
      this.log.info(`[${this.accessoryName}] Current Door State already: ${GarageDoor.getStateName(CurrentDoorState)}`);
    }
    else {
      // CurrentDoorState === CLOSED && TargetDoorState ==== OPEN -> GarageDoorCurrentState.OPENING
      // CurrentDoorState ==== OPEN && TargetDoorState ==== CLOSED -> GarageDoorCurrentState.CLOSING

      CurrentDoorState = this.updateCurrentDoorState((TargetDoorState === GarageDoor.OPEN) ?  GarageDoor.OPENING : GarageDoor.CLOSING);
      this.log.info(`[${this.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(CurrentDoorState)}`);

      this.transitionTimer.stop();

      this.transitionTimer.start(
        () => {
          const TargetDoorState: number = this.getTargetDoorState();
          const CurrentDoorState: number = this.updateCurrentDoorState(TargetDoorState);
          this.log.info(`[${this.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(CurrentDoorState)}`);

          this.saveState();
        },
        this.transitionDuration,
      );
    }
  }

  // ObstructionDetected

  async getObstructionDetectedHandler(): Promise<CharacteristicValue> {
    const ObstructionDetected: boolean = this.getObstructionDetected();
    this.log.debug(`[${this.accessoryName}] Getting Obstruction Detected: ${ObstructionDetected}`);

    return ObstructionDetected;
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getCurrentDoorState(),
    };

    const json = JSON.stringify(jsonState);
    return json;
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

    let ObstructionDetected: boolean = value;
    ObstructionDetected = this.updateObstructionDetected(ObstructionDetected);
    this.log.info(`[${this.accessoryName}] Setting Obstruction Detected: ${value}`);

    // If the door is closing, it should reverse back to Open
    let CurrentDoorState: number = this.getCurrentDoorState();
    let TargetDoorState: number = this.getTargetDoorState();
    if (CurrentDoorState === GarageDoor.CLOSING && ObstructionDetected === true) {
      this.log.error(`[${this.accessoryName}] Obstruction Detected. Rolling back to Open`);

      TargetDoorState = this.updateTargetDoorState(GarageDoor.OPEN);
      this.log.info(`[${this.accessoryName}] Setting Target Door State: ${GarageDoor.getStateName(TargetDoorState)}`);

      CurrentDoorState = this.updateCurrentDoorState(GarageDoor.OPENING);
      this.log.info(`[${this.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(CurrentDoorState)}`);

      this.transitionTimer.stop();

      this.transitionTimer.start(
        () => {
          const TargetDoorState: number = this.getTargetDoorState();
          const CurrentDoorState: number = this.updateCurrentDoorState(TargetDoorState);
          this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (CurrentDoorState));
          this.log.info(`[${this.accessoryName}] Setting Current Door State: ${GarageDoor.getStateName(CurrentDoorState)}`);

          this.saveState();
        },
        this.transitionDuration,
      );
    }
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly OPEN: number =        CharacteristicType.CurrentDoorState.OPEN;     // Characteristic.TargetDoorState.OPEN
  static readonly CLOSED: number =      CharacteristicType.CurrentDoorState.CLOSED;   // Characteristic.TargetDoorState.CLOSED
  static readonly OPENING: number =     CharacteristicType.CurrentDoorState.OPENING;
  static readonly CLOSING: number =     CharacteristicType.CurrentDoorState.CLOSING;
  static readonly STOPPED: number =     CharacteristicType.CurrentDoorState.STOPPED;

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
}
