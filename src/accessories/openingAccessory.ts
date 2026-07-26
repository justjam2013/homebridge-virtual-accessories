import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';
import { Timer } from '../utils/timer.js';
import { CurrentPosition, PositionState, TargetPosition } from './accessoryCharacteristics.js';

/**
 * OpeningAccessory - Abstract accessory
 */
export abstract class OpeningAccessory<S extends typeof Service> extends Accessory<S> {

  private static readonly MIN_TIMEOUT_SECS: number = 1;
  private static readonly DEFAULT_TIMEOUT_SECS: number = 3;

  private readonly stateStorageKey: string = 'Position';

  private transitionTimer: Timer;
  private transitionSteps: number = 0;

  private openingAccessoryConfiguration: OpenableAccessoryConfiguration;

  // Device states
  protected CurrentPosition: number = CurrentPosition.CLOSED; // %
  protected TargetPosition: number = TargetPosition.CLOSED;   // %
  protected PositionState: number = PositionState.STOPPED;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
    serviceType: S,
    accessoryTypeName: string,
  ) {
    super(platform, accessory, accessoryConfiguration, serviceType, accessoryTypeName);

    // First configure the device based on the accessory details
    this.openingAccessoryConfiguration = this.getOpeningAccessoryConfiguration();
    this.defaultState = this.openingAccessoryConfiguration.defaultState === 'open' ? CurrentPosition.OPEN : CurrentPosition.CLOSED;

    this.CurrentPosition = this.defaultState;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.CurrentPosition = cachedState;
      }
    }

    this.TargetPosition = this.CurrentPosition;

    const timerIsResettable: boolean = true;
    this.transitionTimer = new Timer(
      this.accessoryName,
      this.log,
      timerIsResettable,
      // No default timer duration
    );

    // Update the initial state of the accessory
     
    this.log.debug(`[${this.accessoryName}] Setting Window Covering Current Position: ${CurrentPosition.getName(this.CurrentPosition)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, (this.CurrentPosition));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, (this.TargetPosition));
    this.service.updateCharacteristic(this.platform.Characteristic.PositionState, (this.PositionState));

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
    // If timer is running, then blinds are moving, so calculate the interim position
    if (this.transitionTimer.isTimerRunning()) {
      const runtimeMillis: number = this.transitionTimer.getRuntime() * 1000;
      const remainingSteps: number = Math.ceil(this.transitionTimer.getRemainingDurationMillis() / runtimeMillis * this.transitionSteps);
      this.CurrentPosition = this.TargetPosition - remainingSteps;
    }
    const currentPosition = this.CurrentPosition;

    this.log.debug(`[${this.accessoryName}] Getting Current Position: ${CurrentPosition.getName(currentPosition)}`);

    return currentPosition;
  }

  async setTargetPosition(value: CharacteristicValue) {
    this.TargetPosition = value as number;

    this.log.info(`[${this.accessoryName}] Setting Target Position: ${TargetPosition.getName(this.TargetPosition)}`);

    this.PositionState = (this.TargetPosition > this.CurrentPosition) ? PositionState.INCREASING : PositionState.DECREASING;
    this.service!.setCharacteristic(this.platform.Characteristic.PositionState, (this.PositionState));
    this.log.info(`[${this.accessoryName}] Setting Position State: ${PositionState.getName(this.PositionState)}`);

    const transitionDuration = this.openingAccessoryConfiguration.transitionDuration;
    const transitionDelay: number = (transitionDuration ? transitionDuration : OpeningAccessory.DEFAULT_TIMEOUT_SECS);

    this.transitionSteps = this.TargetPosition - this.CurrentPosition;
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
        this.PositionState = PositionState.STOPPED;
        this.service!.setCharacteristic(this.platform.Characteristic.PositionState, (this.PositionState));
        this.log.info(`[${this.accessoryName}] Setting Position State: ${PositionState.getName(this.PositionState)}`);

        this.CurrentPosition = this.TargetPosition;
        this.service!.setCharacteristic(this.platform.Characteristic.CurrentPosition, (this.CurrentPosition));

        this.transitionSteps = 0;

        this.storeState();

        this.log.info(`[${this.accessoryName}] Setting Current Position: ${CurrentPosition.getName(this.CurrentPosition)}`);
      },
      proportionalTransitionDelay,
      updateIntervalMillis,
    );
  }

  async getTargetPosition(): Promise<CharacteristicValue> {
    const targetPosition = this.TargetPosition;

    this.log.debug(`[${this.accessoryName}] Getting Target Position: ${TargetPosition.getName(targetPosition)}`);

    return targetPosition;
  }

  async getPositionState(): Promise<CharacteristicValue> {
    const positionState = this.PositionState;

    this.log.debug(`[${this.accessoryName}] Getting Position State: ${PositionState.getName(positionState)}`);

    return positionState;
  }

  //

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.CurrentPosition,
    });
    return json;
  }

  protected abstract getOpeningAccessoryConfiguration(): OpenableAccessoryConfiguration;
}
