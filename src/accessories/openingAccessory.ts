/* eslint-disable brace-style */

import { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';
import { Timer } from '../utils/timer.js';

/**
 * OpeningAccessory - Abstract accessory
 */
export abstract class OpeningAccessory extends Accessory {

  static readonly CLOSED: number = 0;
  static readonly OPEN: number = 100;

  // Because of how Homebridge works, these are not initialized until the constructor runs

  static DECREASING: number;  // CharacteristicType.PositionState.DECREASING;
  static INCREASING: number;  // CharacteristicType.PositionState.INCREASING;
  static STOPPED: number;     // CharacteristicType.PositionState.STOPPED;

  private static readonly MIN_TIMEOUT_SECS: number = 1;
  private static readonly DEFAULT_TIMEOUT_SECS: number = 3;

  private readonly stateStorageKey: string = 'Position';

  private transitionTimer: Timer;
  private transitionSteps: number = 0;
  private transitionIntervalId: ReturnType<typeof setInterval> | undefined;

  private openingAccessoryConfiguration: OpenableAccessoryConfiguration;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.setupStaticFields();

    // Set service
    const implService: WithUUID<typeof Service> = this.getOpeningAccessoryService();
    this.service = this.accessory.getService(implService) || this.accessory.addService(implService as unknown as Service);

    // First configure the device based on the accessory details
    this.openingAccessoryConfiguration = this.getOpeningAccessoryConfiguration();
    this.defaultState = this.openingAccessoryConfiguration.defaultState === 'open' ? OpeningAccessory.OPEN : OpeningAccessory.CLOSED;

    let currentPosition: number = this.defaultState;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        currentPosition = cachedState;
      }
    }

    const targetPosition = currentPosition;

    const timerIsResettable: boolean = true;
    this.transitionTimer = new Timer(
      this.accessoryName,
      this.log,
      timerIsResettable,
      // No default timer duration
    );

    // Set accessory information
    this.setValue(CharacteristicType.Name, this.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Window Covering Current Position: ${OpeningAccessory.getStateName(currentPosition)}`);
    this.updateCurrentPosition(currentPosition);
    this.updateTargetPosition(targetPosition);
    this.updatePositionState(OpeningAccessory.STOPPED);

    // register handlers

    this.service.getCharacteristic(CharacteristicType.CurrentPosition)
      .onGet(this.getCurrentPositionHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.TargetPosition)
      .onGet(this.getTargetPositionHandler.bind(this))
      .onSet(this.setTargetPositionHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.PositionState)
      .onGet(this.getPositionStateHandler.bind(this));
  }

  // *** Handlers ***

  // CurrentPosition

  async getCurrentPositionHandler(): Promise<CharacteristicValue> {
    // If timer is running, then blinds are moving, so calculate the interim position
    if (this.transitionTimer.isTimerRunning()) {
      const runtimeMillis: number = this.transitionTimer.getRuntime() * 1000;
      const remainingSteps: number = Math.ceil(this.transitionTimer.getRemainingDurationMillis() / runtimeMillis * this.transitionSteps);
      this.updateCurrentPosition(this.getTargetPosition() - remainingSteps);
    }

    const CurrentPosition: number = this.getCurrentPosition();
    this.log.debug(`[${this.accessoryName}] Getting Current Position: ${OpeningAccessory.getStateName(CurrentPosition)}`);

    return CurrentPosition;
  }

  // TargetPosition

  async getTargetPositionHandler(): Promise<CharacteristicValue> {
    const TargetPosition: number = this.getTargetPosition();
    this.log.debug(`[${this.accessoryName}] Getting Target Position: ${OpeningAccessory.getStateName(TargetPosition)}`);

    return TargetPosition;
  }

  async setTargetPositionHandler(value: CharacteristicValue) {
    const TargetPosition: number = value as number;
    this.updateTargetPosition(TargetPosition);
    this.log.info(`[${this.accessoryName}] Setting Target Position: ${OpeningAccessory.getStateName(TargetPosition)}`);

    const CurrentPosition: number = this.getCurrentPosition();

    const PositionState: number = (TargetPosition > CurrentPosition) ? OpeningAccessory.INCREASING : OpeningAccessory.DECREASING;
    this.updatePositionState(PositionState);
    this.log.info(`[${this.accessoryName}] Setting Position State: ${OpeningAccessory.getPositionName(PositionState)}`);

    const transitionDuration = this.openingAccessoryConfiguration.transitionDuration;
    const transitionDelay: number = (transitionDuration ? transitionDuration : OpeningAccessory.DEFAULT_TIMEOUT_SECS);

    this.transitionSteps = TargetPosition - CurrentPosition;
    this.log.debug(`[${this.accessoryName}] Transition Steps: ${this.transitionSteps}`);
    const proportionalTransitionDelay: number = Math.max(
      // Round up to the nearest second
      Math.ceil(transitionDelay / 100 * Math.abs(this.transitionSteps)),
      OpeningAccessory.MIN_TIMEOUT_SECS);
    this.log.debug(`[${this.accessoryName}] Proportional Delay: ${proportionalTransitionDelay}/(${transitionDelay})`);

    const updateIntervalMillis = 100;

    // Stop transition timer, if running
    this.transitionTimer.stop();

    this.transitionTimer.start(
      () => {
        const CurrentPosition: number = this.getTargetPosition();
        this.updateCurrentPosition(CurrentPosition);
        this.log.info(`[${this.accessoryName}] Setting Current Position: ${OpeningAccessory.getStateName(CurrentPosition)}`);

        const PositionState: number = OpeningAccessory.STOPPED;
        this.updatePositionState(PositionState);
        this.log.info(`[${this.accessoryName}] Setting Position State: ${OpeningAccessory.getPositionName(PositionState)}`);

        this.transitionSteps = 0;

        this.storeState();
      },
      proportionalTransitionDelay,
      updateIntervalMillis,
    );

    const runtime: number = this.transitionTimer.getRuntime();
    const direction: number = (TargetPosition > CurrentPosition) ? OpeningAccessory.INCREASING : OpeningAccessory.DECREASING;

    clearInterval(this.transitionIntervalId);

    this.transitionIntervalId = setInterval(() => {
      if (this.transitionTimer.getRemainingDurationMillis() === 0) {
        clearInterval(this.transitionIntervalId);
      }
      else {
        const remainingDuration: number = this.transitionTimer.getRemainingDuration();
        const complete: number = (direction === OpeningAccessory.INCREASING) ? runtime - remainingDuration : remainingDuration;
        const transitionCompletePct: number = Math.trunc((complete / runtime) * 100);
        this.updateCurrentPosition(transitionCompletePct);
        this.log.debug(`[${this.accessoryName}] Setting Current Position: ${transitionCompletePct}% - ${complete} of ${runtime}`);
      }
    }, 1000);
  }

  // PositionState

  async getPositionStateHandler(): Promise<CharacteristicValue> {
    const PositionState: number = this.getPositionState();
    this.log.debug(`[${this.accessoryName}] Getting Position State: ${OpeningAccessory.getPositionName(PositionState)}`);

    return PositionState;
  }

  // *** Handlers ***

  protected abstract getOpeningAccessoryConfiguration(): OpenableAccessoryConfiguration;

  protected abstract getOpeningAccessoryService(): WithUUID<typeof Service>;

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.getValue(CharacteristicType.CurrentPosition) as number,
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

  // Convenience methods

  protected setupStaticFields() {
    OpeningAccessory.DECREASING = CharacteristicType.PositionState.DECREASING;
    OpeningAccessory.INCREASING = CharacteristicType.PositionState.INCREASING;
    OpeningAccessory.STOPPED    = CharacteristicType.PositionState.STOPPED;
  }

  // CurrentPosition

  private getCurrentPosition(): number {
    return this.getValue(CharacteristicType.CurrentPosition) as number;
  }

  private updateCurrentPosition(
    value: number,
  ) {
    this.updateValue(CharacteristicType.CurrentPosition, value);
  }

  // TargetPosition

  private getTargetPosition(): number {
    return this.getValue(CharacteristicType.TargetPosition) as number;
  }

  private updateTargetPosition(
    value: number,
  ) {
    this.updateValue(CharacteristicType.TargetPosition, value);
  }

  // PositionState

  private getPositionState(): number {
    return this.getValue(CharacteristicType.PositionState) as number;
  }

  private updatePositionState(
    value: number,
  ) {
    this.updateValue(CharacteristicType.PositionState, value);
  }
}
