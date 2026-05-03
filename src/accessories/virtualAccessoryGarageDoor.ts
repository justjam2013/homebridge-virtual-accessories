/* eslint-disable brace-style */
/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidObstructionValueType, ObstructionValueUpdateNotAllowed } from '../errors.js';
import { UpdatableObstruction } from './updatableObstruction.js';
import { Timer } from '../utils/timer.js';
import { CurrentDoorState, TargetDoorState } from './accessoryCharacteristics.js';

/**
 * GarageDoor - Accessory implementation
 */
export class GarageDoor extends Accessory<typeof Service.GarageDoorOpener> implements UpdatableObstruction {

  private static readonly ACCESSORY_TYPE_NAME: string = 'GarageDoor';

  private static readonly DEFAULT_TIMEOUT_SECS: number = 10;

  private readonly stateStorageKey: string = 'GarageDoorState';

  private transitionTimer: Timer;
  private transitionDuration: number;

  // Device state
  private CurrentState: number = CurrentDoorState.CLOSED;
  private TargetState: number = TargetDoorState.CLOSED;
  private ObstructionDetected: boolean = false;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.GarageDoorOpener,
      GarageDoor.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.garageDoor.defaultState === 'open' ? CurrentDoorState.OPEN : CurrentDoorState.CLOSED;

    this.CurrentState = this.defaultState;

    this.transitionDuration = (this.accessoryConfiguration.garageDoor.transitionDuration !== undefined) ? this.accessoryConfiguration.garageDoor.transitionDuration : GarageDoor.DEFAULT_TIMEOUT_SECS;
    const timerIsResettable: boolean = false;
    this.transitionTimer = new Timer(
      this.accessoryName,
      this.log,
      timerIsResettable,
      this.transitionDuration,
    );

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.CurrentState = cachedState;
      }
    }

    this.TargetState = this.CurrentState;

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Garage Door Current State: ${CurrentDoorState.getName(this.CurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.CurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetDoorState, (this.TargetState));

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
    const garageDoorCurrentState = this.CurrentState;

    this.log.debug(`[${this.accessoryName}] Getting Current Door State: ${CurrentDoorState.getName(garageDoorCurrentState)}`);

    return garageDoorCurrentState;
  }

  async setTargetDoorState(value: CharacteristicValue) {
    this.TargetState = value as number;

    this.log.info(`[${this.accessoryName}] Setting Target Door State: ${TargetDoorState.getName(this.TargetState)}`);

    // Check if door already in position
    if (
      (this.TargetState === TargetDoorState.OPEN && this.CurrentState === CurrentDoorState.OPEN) ||
      (this.TargetState === TargetDoorState.CLOSED && this.CurrentState === CurrentDoorState.CLOSED)
    ) {
      this.log.info(`[${this.accessoryName}] Current Door State already: ${CurrentDoorState.getName(this.CurrentState)}`);
    }
    // Check if obstruction is detected when trying to close
    else if (this.TargetState === TargetDoorState.CLOSED && this.ObstructionDetected === true) {
      this.log.error(`[${this.accessoryName}] Obstruction Detected. Refusing to close`);
    }
    // Check if door should be Stopped
    else if (
      (this.TargetState === TargetDoorState.CLOSED && this.CurrentState === CurrentDoorState.OPENING) ||
      (this.TargetState === TargetDoorState.OPEN && this.CurrentState === CurrentDoorState.CLOSING)
    ) {
      this.CurrentState = CurrentDoorState.STOPPED;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.CurrentState));
      this.log.info(`[${this.accessoryName}] Setting Current Door State: ${CurrentDoorState.getName(this.CurrentState)}`);

      this.transitionTimer.stop();
    }
    // Check if door is already moving in the right direction
    else if (
      (this.TargetState === TargetDoorState.OPEN && this.CurrentState === CurrentDoorState.OPENING) ||
      (this.TargetState === TargetDoorState.CLOSED && this.CurrentState === CurrentDoorState.CLOSING)
    ) {
      this.log.info(`[${this.accessoryName}] Current Door State already: ${CurrentDoorState.getName(this.CurrentState)}`);
    }
    else {
      // GarageDoorCurrentState CLOSED && GarageDoorTargetState OPEN -> GarageDoorCurrentState.OPENING
      // GarageDoorCurrentState OPEN && GarageDoorTargetState CLOSED -> GarageDoorCurrentState.CLOSING

      this.CurrentState = (this.TargetState === TargetDoorState.OPEN) ?  CurrentDoorState.OPENING : CurrentDoorState.CLOSING;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.CurrentState));
      this.log.info(`[${this.accessoryName}] Setting Current Door State: ${CurrentDoorState.getName(this.CurrentState)}`);

      this.transitionTimer.stop();

      this.transitionTimer.start(
        () => {
          this.CurrentState = this.TargetState;
          this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.CurrentState));

          this.storeState();

          this.log.info(`[${this.accessoryName}] Setting Current Door State: ${CurrentDoorState.getName(this.CurrentState)}`);
        }, this.transitionDuration);
    }
  }

  async getTargetDoorState(): Promise<CharacteristicValue> {
    const garageDoorTargetState = this.TargetState;

    this.log.debug(`[${this.accessoryName}] Getting Target Door State: ${TargetDoorState.getName(garageDoorTargetState)}`);

    return garageDoorTargetState;
  }

  async getObstructionDetected(): Promise<CharacteristicValue> {
    const obstructionDetected = this.ObstructionDetected;

    this.log.debug(`[${this.accessoryName}] Getting Obstruction Detected: ${obstructionDetected}`);

    return obstructionDetected;
  }

  //

  protected override getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.CurrentState,
    });
    return json;
  }

  // Updatable Obstruction interface

  updateObstruction(value: boolean, accessoryId: string): void {
    this.log.debug(`[${this.accessoryName}] Request update obstruction detected to ${value}`);

    if (accessoryId !== this.accessoryId) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new ObstructionValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'boolean') {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for Garage Door obstruction detected`);

      throw new InvalidObstructionValueType(`Invalid sensor value: ${value}`);
    }

    this.ObstructionDetected = value;
    this.service!.setCharacteristic(this.platform.Characteristic.ObstructionDetected, (this.ObstructionDetected));
    this.log.info(`[${this.accessoryName}] Setting Obstruction Detected: ${value}`);

    // If the door is closing, it should reverse back to Open
    if (this.CurrentState === CurrentDoorState.CLOSING && this.ObstructionDetected === true) {
      this.log.error(`[${this.accessoryName}] Obstruction Detected. Rolling back to Open`);

      this.TargetState = TargetDoorState.OPEN;
      this.service!.setCharacteristic(this.platform.Characteristic.TargetDoorState, (this.TargetState));
      this.log.info(`[${this.accessoryName}] Setting Target Door State: ${TargetDoorState.getName(this.TargetState)}`);

      this.CurrentState = CurrentDoorState.OPENING;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.CurrentState));
      this.log.info(`[${this.accessoryName}] Setting Current Door State: ${CurrentDoorState.getName(this.CurrentState)}`);

      this.transitionTimer.stop();

      this.transitionTimer.start(
        () => {
          this.CurrentState = this.TargetState;
          this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.CurrentState));

          this.storeState();

          this.log.info(`[${this.accessoryName}] Setting Current Door State: ${CurrentDoorState.getName(this.CurrentState)}`);
        }, this.transitionDuration);
    }
  }
}
