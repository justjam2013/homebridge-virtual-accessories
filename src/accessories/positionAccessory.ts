import { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';
import { Timer } from '../utils/timer.js';

/**
 * PositionAccessory - Abstract accessory
 */
export abstract class PositionAccessory extends Accessory {

  private static readonly MIN_TIMEOUT_SECS: number = 1;
  private static readonly DEFAULT_TIMEOUT_SECS: number = 3;

  private readonly stateStorageKey: string = 'Position';

  private transitionTimer: Timer;
  private transitionSteps: number = 0;

  private openableAccessoryConfiguration: OpenableAccessoryConfiguration;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // Default state
    let CurrentPosition: number = PositionAccessory.CLOSED;
    let TargetPosition: number = PositionAccessory.CLOSED;
    const PositionState: number = PositionAccessory.STOPPED;

    // First configure the device based on the accessory details
    this.openableAccessoryConfiguration = this.getOpenableAccessoryConfiguration();
    this.defaultState = this.openableAccessoryConfiguration.defaultState === 'open' ? PositionAccessory.OPEN : PositionAccessory.CLOSED;

    CurrentPosition = this.defaultState;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        CurrentPosition = cachedState;
      }
    }

    TargetPosition = CurrentPosition;

    const timerIsResettable: boolean = true;
    this.transitionTimer = new Timer(
      this.accessoryConfiguration.accessoryName,
      this.log,
      timerIsResettable,
      // No default timer duration
    );

    // Update the initial state of the accessory
     
    this.setCurrentPosition(CurrentPosition);
    this.setTargetPosition(TargetPosition);
    this.setPositionState(PositionState);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.CurrentPosition)
      .onGet(this.getCurrentPositionHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.TargetPosition)
      .onSet(this.setTargetPositionHandler.bind(this))
      .onGet(this.getTargetPositionHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.PositionState)
      .onGet(this.getPositionStateHandler.bind(this));
  }

  //
  // ****************************** Handlers ******************************
  //

  // CurrentPosition

  async getCurrentPositionHandler(): Promise<CharacteristicValue> {
    // If timer is running, then blinds are moving, so calculate the interim position
    if (this.transitionTimer.isTimerRunning()) {
      const runtimeMillis: number = this.transitionTimer.getRuntime() * 1000;
      const remainingSteps: number = Math.ceil(this.transitionTimer.getRemainingDurationMillis() / runtimeMillis * this.transitionSteps);

      const TargetPosition: number = this.getTargetPosition();
      this.updateCurrentPosition(TargetPosition - remainingSteps);
    }

    const currentPosition = this.getCurrentPosition();
    this.log.debug(`[${this.accessoryName}] Getting Current Position: ${PositionAccessory.getStateName(currentPosition)}`);

    return currentPosition;
  }

  // TargetPosition

  async getTargetPositionHandler(): Promise<CharacteristicValue> {
    const targetPosition: number = this.getCharacteristicValue(CharacteristicType.TargetPosition) as number;
    this.log.debug(`[${this.accessoryName}] Getting Target Position: ${PositionAccessory.getStateName(targetPosition)}`);

    return targetPosition;
  }

  async setTargetPositionHandler(value: CharacteristicValue) {
    let TargetPosition: number = value as number;
    TargetPosition = this.updateTargetPosition(TargetPosition);
    this.log.info(`[${this.accessoryName}] Setting Target Position: ${PositionAccessory.getStateName(TargetPosition)}`);

    const CurrentPosition: number = this.getCurrentPosition();
    let PositionState: number = (TargetPosition > CurrentPosition) ? PositionAccessory.INCREASING : PositionAccessory.DECREASING;
    PositionState = this.updatePositionState(PositionState);
    this.log.info(`[${this.accessoryName}] Setting Position State: ${PositionAccessory.getPositionName(PositionState)}`);

    const transitionDuration = this.openableAccessoryConfiguration.transitionDuration;
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
        const PositionState: number = this.updatePositionState(PositionAccessory.STOPPED);
        this.log.info(`[${this.accessoryName}] Setting Position State: ${PositionAccessory.getPositionName(PositionState)}`);

        const CurrentPosition: number = this.updateCurrentPosition(this.getTargetPosition());
        this.log.info(`[${this.accessoryName}] Setting Current Position: ${PositionAccessory.getStateName(CurrentPosition)}`);

        this.transitionSteps = 0;

        this.saveState();
      },
      proportionalTransitionDelay,
      updateIntervalMillis,
    );
  }

  // PositionState

  async getPositionStateHandler(): Promise<CharacteristicValue> {
    const positionState: number = this.getPositionState();
    this.log.debug(`[${this.accessoryName}] Getting Position State: ${PositionAccessory.getPositionName(positionState)}`);

    return positionState;
  }

  //

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.getCurrentPosition(),
    });
    return json;
  }

  //
  // Abstract methods
  //

  protected abstract getOpenableAccessoryConfiguration(): OpenableAccessoryConfiguration;

  //
  // ****************************** Characteristics ******************************
  //

  static readonly CLOSED: number = 0;   // 0%
  static readonly OPEN: number = 100;   // 100%

  static readonly DECREASING: number =      CharacteristicType.PositionState.DECREASING;  // -> CLOSING
  static readonly INCREASING: number =      CharacteristicType.PositionState.INCREASING;  // -> OPENING
  static readonly STOPPED: number =         CharacteristicType.PositionState.STOPPED;     // -> OPEN or CLOSED

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
