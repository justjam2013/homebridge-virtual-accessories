import { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

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
    serviceType: WithUUID<typeof Service>,
  ) {
    super(platform, accessory, accessoryConfiguration, serviceType);

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
    this.log.debug(`[${this.accessoryName}] Getting Current Position: ${PositionAccessory.getPositionName(currentPosition)}`);

    return currentPosition;
  }

  // TargetPosition

  async getTargetPositionHandler(): Promise<CharacteristicValue> {
    const targetPosition: number = this.getCharacteristicValue(CharacteristicType.TargetPosition) as number;
    this.log.debug(`[${this.accessoryName}] Getting Target Position: ${PositionAccessory.getPositionName(targetPosition)}`);

    return targetPosition;
  }

  async setTargetPositionHandler(value: CharacteristicValue) {
    let TargetPosition: number = value as number;
    TargetPosition = this.updateTargetPosition(TargetPosition);
    this.log.info(`[${this.accessoryName}] Setting Target Position: ${PositionAccessory.getPositionName(TargetPosition)}`);

    const CurrentPosition: number = this.getCurrentPosition();
    let PositionState: number = (TargetPosition > CurrentPosition) ? PositionAccessory.INCREASING : PositionAccessory.DECREASING;
    PositionState = this.updatePositionState(PositionState);
    this.log.info(`[${this.accessoryName}] Setting Position State: ${PositionAccessory.getPositionStateName(PositionState)}`);

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
        this.log.info(`[${this.accessoryName}] Setting Position State: ${PositionAccessory.getPositionStateName(PositionState)}`);

        const CurrentPosition: number = this.updateCurrentPosition(this.getTargetPosition());
        this.log.info(`[${this.accessoryName}] Setting Current Position: ${PositionAccessory.getPositionName(CurrentPosition)}`);

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
    this.log.debug(`[${this.accessoryName}] Getting Position State: ${PositionAccessory.getPositionStateName(positionState)}`);

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

  // Lazy static getters

  static get CLOSED(): number     { return 0; }   // 0%
  static get OPEN(): number       { return 100; } // 100%

  static get DECREASING(): number { return CharacteristicType.PositionState.DECREASING; }  // -> CLOSING
  static get INCREASING(): number { return CharacteristicType.PositionState.INCREASING; }  // -> OPENING
  static get STOPPED(): number    { return CharacteristicType.PositionState.STOPPED; }     // -> OPEN or CLOSED

  static getPositionName(position: number): string {
    let name: string;

    switch (position) {
    case undefined: { name = 'undefined'; break; }
    case PositionAccessory.CLOSED: { name = 'CLOSED'; break; }
    case PositionAccessory.OPEN: { name = 'OPEN'; break; }
    default: { name = `POSITION: ${position.toString()}%`; }
    }

    if (position > PositionAccessory.OPEN) {
      name = `INVALID ${name}%`;
    }

    return name;
  }

  static getPositionStateName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case PositionAccessory.DECREASING: { name = 'DECREASING'; break; }
    case PositionAccessory.INCREASING: { name = 'INCREASING'; break; }
    case PositionAccessory.STOPPED: { name = 'STOPPED'; break; }
    default: { name = state.toString(); }
    }

    return name;
  }
}
