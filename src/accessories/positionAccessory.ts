/* eslint-disable brace-style */

import { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';
import { Timer } from '../utils/timer.js';

class PositionStatus {
  CurrentPosition: number = PositionAccessory.CLOSED;
  TargetPosition: number = PositionAccessory.CLOSED;
  PositionState: number = PositionAccessory.STOPPED;
}

/**
 * PositionAccessory - Abstract accessory
 */
export abstract class PositionAccessory extends Accessory {

  static readonly CLOSED: number = 0;
  static readonly OPEN: number = 100;

  // Because of how Homebridge works, these are not initialized until the constructor runs

  static readonly DECREASING: number =  CharacteristicType.PositionState.DECREASING;
  static readonly INCREASING: number =  CharacteristicType.PositionState.INCREASING;
  static readonly STOPPED: number =     CharacteristicType.PositionState.STOPPED;

  private static readonly MIN_TIMEOUT_SECS: number = 1;
  private static readonly DEFAULT_TIMEOUT_SECS: number = 3;

  private readonly stateStorageKey: string = 'Position';

  private transitionTimer: Timer;
  private transitionSteps: number = 0;
  private transitionIntervalId: ReturnType<typeof setInterval> | undefined;

  private openingAccessoryConfiguration: OpenableAccessoryConfiguration;

  private status: PositionStatus = new PositionStatus();

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.openingAccessoryConfiguration = this.getOpeningAccessoryConfiguration();
    this.defaultState = this.openingAccessoryConfiguration.defaultState === 'open' ? PositionAccessory.OPEN : PositionAccessory.CLOSED;

    this.status.CurrentPosition = this.defaultState;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.status.CurrentPosition = cachedState;
      }
    }

    this.status.TargetPosition = this.status.CurrentPosition;

    const timerIsResettable: boolean = true;
    this.transitionTimer = new Timer(
      this.accessoryName,
      this.log,
      timerIsResettable,
      // No default timer duration
    );

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
    if (this.transitionTimer.isRunning()) {
      const runtimeMillis: number = this.transitionTimer.getDuration() * 1000;
      const remainingSteps: number = Math.ceil(this.transitionTimer.getRemainingDurationMillis() / runtimeMillis * this.transitionSteps);
      this.status.CurrentPosition = (this.status.TargetPosition - remainingSteps);
    }

    const CurrentPosition: number = this.status.CurrentPosition;
    this.log.debug(`[${this.accessoryName}] Getting Current Position: ${PositionAccessory.getStateName(CurrentPosition)}`);

    return CurrentPosition;
  }

  // TargetPosition

  async getTargetPositionHandler(): Promise<CharacteristicValue> {
    const TargetPosition: number = this.status.TargetPosition;
    this.log.debug(`[${this.accessoryName}] Getting Target Position: ${PositionAccessory.getStateName(TargetPosition)}`);

    return TargetPosition;
  }

  async setTargetPositionHandler(value: CharacteristicValue) {
    const TargetPosition: number = value as number;
    this.status.TargetPosition = TargetPosition;
    this.log.info(`[${this.accessoryName}] Setting Target Position: ${PositionAccessory.getStateName(TargetPosition)}`);

    const CurrentPosition: number = this.status.CurrentPosition;

    const PositionState: number = (TargetPosition > CurrentPosition) ? PositionAccessory.INCREASING : PositionAccessory.DECREASING;
    this.status.PositionState = PositionState;
    this.log.info(`[${this.accessoryName}] Setting Position State: ${PositionAccessory.getPositionName(PositionState)}`);

    const transitionDuration = this.openingAccessoryConfiguration.transitionDuration;
    const transitionDelay: number = (transitionDuration ? transitionDuration : PositionAccessory.DEFAULT_TIMEOUT_SECS);

    this.transitionSteps = TargetPosition - CurrentPosition;
    this.log.debug(`[${this.accessoryName}] Transition Steps: ${this.transitionSteps}`);
    const proportionalTransitionDelay: number = Math.max(
      // Round up to the nearest second
      Math.ceil(transitionDelay / 100 * Math.abs(this.transitionSteps)),
      PositionAccessory.MIN_TIMEOUT_SECS);
    this.log.debug(`[${this.accessoryName}] Proportional Delay: ${proportionalTransitionDelay}/(${transitionDelay})`);

    const updateIntervalMillis = 100;

    // Stop transition timer, if running
    this.transitionTimer.stop();

    this.transitionTimer.start(
      () => {
        const CurrentPosition: number = this.status.TargetPosition;
        this.status.CurrentPosition = CurrentPosition;
        this.log.info(`[${this.accessoryName}] Setting Current Position: ${PositionAccessory.getStateName(CurrentPosition)}`);

        const PositionState: number = PositionAccessory.STOPPED;
        this.status.PositionState = PositionState;
        this.log.info(`[${this.accessoryName}] Setting Position State: ${PositionAccessory.getPositionName(PositionState)}`);

        this.transitionSteps = 0;

        this.storeState();
      },
      proportionalTransitionDelay,
      updateIntervalMillis,
    );

    const runtime: number = this.transitionTimer.getDuration();
    const direction: number = (TargetPosition > CurrentPosition) ? PositionAccessory.INCREASING : PositionAccessory.DECREASING;

    clearInterval(this.transitionIntervalId);

    this.transitionIntervalId = setInterval(() => {
      if (this.transitionTimer.getRemainingDurationMillis() === 0) {
        clearInterval(this.transitionIntervalId);
      }
      else {
        const remainingDuration: number = this.transitionTimer.getRemainingDuration();
        const complete: number = (direction === PositionAccessory.INCREASING) ? runtime - remainingDuration : remainingDuration;
        const transitionCompletePct: number = Math.trunc((complete / runtime) * 100);
        this.status.CurrentPosition = transitionCompletePct;
        this.log.debug(`[${this.accessoryName}] Setting Current Position: ${transitionCompletePct}% - ${complete} of ${runtime}`);
      }
    }, 1000);
  }

  // PositionState

  async getPositionStateHandler(): Promise<CharacteristicValue> {
    const PositionState: number = this.status.PositionState;
    this.log.debug(`[${this.accessoryName}] Getting Position State: ${PositionAccessory.getPositionName(PositionState)}`);

    return PositionState;
  }

  // Absract methods

  protected abstract getOpeningAccessoryConfiguration(): OpenableAccessoryConfiguration;

  // Absract method implementations

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.status.CurrentPosition,
    });
    return json;
  }

  // Static

  static getStateName(position: number): string {
    let positionName: string;

    switch (position) {
    case undefined: { positionName = 'undefined'; break; }
    case PositionAccessory.CLOSED: { positionName = 'CLOSED'; break; }
    case PositionAccessory.OPEN: { positionName = 'OPEN'; break; }
    default: { positionName = `POSITION: ${position.toString()}%`; }
    }

    if (position > PositionAccessory.OPEN) {
      positionName = `INVALID ${positionName}%`;
    }

    return positionName;
  }

  static getPositionName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case PositionAccessory.DECREASING: { stateName = 'DECREASING'; break; }
    case PositionAccessory.INCREASING: { stateName = 'INCREASING'; break; }
    case PositionAccessory.STOPPED: { stateName = 'STOPPED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}
