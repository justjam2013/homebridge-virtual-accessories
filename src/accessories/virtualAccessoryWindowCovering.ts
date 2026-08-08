import type { Characteristic, CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { OpeningAccessory } from './openingAccessory.js';

import { OpenableAccessoryConfiguration } from '../configuration/configurationOpenableAccesory.js';
import { TiltType } from '../configuration/schema.js';
import { Timer } from '../utils/timer.js';

/**
 * WindowCovering - Accessory implementation
 */
export class WindowCovering extends OpeningAccessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Window Covering';

  // Tilt angle range in degrees: -90 (fully one way) to 90 (fully the other way)
  static readonly TILT_ANGLE_MIN: number = -90;
  static readonly TILT_ANGLE_MAX: number = 90;
  static readonly TILT_ANGLE_RANGE: number = WindowCovering.TILT_ANGLE_MAX - WindowCovering.TILT_ANGLE_MIN;   // 180

  private static readonly TILT_MIN_TIMEOUT_SECS: number = 1;
  private static readonly TILT_DEFAULT_TIMEOUT_SECS: number = 3;

  private readonly tiltStateStorageKey: string = 'TiltAngle';

  private hasTilt: boolean = false;
  private currentTiltCharacteristic!: WithUUID<new () => Characteristic>;
  private targetTiltCharacteristic!: WithUUID<new () => Characteristic>;

  private tiltTransitionTimer!: Timer;
  private tiltTransitionSteps: number = 0;

  private tiltStates = {
    CurrentTiltAngle: 0,   // degrees
    TargetTiltAngle: 0,    // degrees
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // Tilt is an optional, configurable feature of the window covering
    this.hasTilt = this.accessoryConfiguration.windowCovering.hasTilt;

    if (this.hasTilt) {
      this.configureTilt();
    }
  }

  private configureTilt(): void {
    // Select horizontal or vertical tilt characteristics based on config
    if (this.accessoryConfiguration.windowCovering.tiltType === TiltType.Vertical) {
      this.currentTiltCharacteristic = this.platform.Characteristic.CurrentVerticalTiltAngle;
      this.targetTiltCharacteristic = this.platform.Characteristic.TargetVerticalTiltAngle;
    } else {
      this.currentTiltCharacteristic = this.platform.Characteristic.CurrentHorizontalTiltAngle;
      this.targetTiltCharacteristic = this.platform.Characteristic.TargetHorizontalTiltAngle;
    }

    const defaultTiltAngle: number = this.accessoryConfiguration.windowCovering.defaultTiltAngle ?? 0;
    this.tiltStates.CurrentTiltAngle = defaultTiltAngle;

    // If the accessory is stateful retrieve stored tilt state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedTiltAngle: number = accessoryState[this.tiltStateStorageKey] as number;

      if (cachedTiltAngle !== undefined) {
        this.tiltStates.CurrentTiltAngle = cachedTiltAngle;
      }
    }

    this.tiltStates.TargetTiltAngle = this.tiltStates.CurrentTiltAngle;

    const timerIsResettable: boolean = true;
    this.tiltTransitionTimer = new Timer(
      this.accessoryConfiguration.accessoryName,
      this.log,
      timerIsResettable,
      // No default timer duration
    );

    // Update the initial tilt state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Window Covering Current Tilt Angle: ${this.tiltStates.CurrentTiltAngle}º`);
    this.service!.updateCharacteristic(this.currentTiltCharacteristic, (this.tiltStates.CurrentTiltAngle));
    this.service!.updateCharacteristic(this.targetTiltCharacteristic, (this.tiltStates.TargetTiltAngle));

    // register handlers

    this.service!.getCharacteristic(this.currentTiltCharacteristic)
      .onGet(this.getCurrentTiltAngle.bind(this));

    this.service!.getCharacteristic(this.targetTiltCharacteristic)
      .onSet(this.setTargetTiltAngle.bind(this))
      .onGet(this.getTargetTiltAngle.bind(this));
  }

  // Tilt handlers

  async getCurrentTiltAngle(): Promise<CharacteristicValue> {
    // If timer is running, then the tilt is moving, so calculate the interim angle
    if (this.tiltTransitionTimer.isTimerRunning()) {
      const runtimeMillis: number = this.tiltTransitionTimer.getRuntime() * 1000;
      const remainingSteps: number = Math.ceil(this.tiltTransitionTimer.getRemainingDurationMillis() / runtimeMillis * this.tiltTransitionSteps);
      this.tiltStates.CurrentTiltAngle = this.tiltStates.TargetTiltAngle - remainingSteps;
    }
    const currentTiltAngle = this.tiltStates.CurrentTiltAngle;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Tilt Angle: ${currentTiltAngle}º`);

    return currentTiltAngle;
  }

  async setTargetTiltAngle(value: CharacteristicValue) {
    this.tiltStates.TargetTiltAngle = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Tilt Angle: ${this.tiltStates.TargetTiltAngle}º`);

    const transitionDuration = this.accessoryConfiguration.windowCovering.transitionDuration;
    const transitionDelay: number = (transitionDuration ? transitionDuration : WindowCovering.TILT_DEFAULT_TIMEOUT_SECS);

    this.tiltTransitionSteps = this.tiltStates.TargetTiltAngle - this.tiltStates.CurrentTiltAngle;
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Tilt Transition Steps: ${this.tiltTransitionSteps}`);
    const proportionalTransitionDelay: number = Math.max(
      // Round up to the nearest second
      Math.ceil(transitionDelay / WindowCovering.TILT_ANGLE_RANGE * Math.abs(this.tiltTransitionSteps)),
      WindowCovering.TILT_MIN_TIMEOUT_SECS);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Tilt Proportional Delay: ${proportionalTransitionDelay}/(${transitionDelay})`);

    const updateIntervalMillis = 100;

    // Stop tilt transition timer, if running
    this.tiltTransitionTimer.stop();

    this.tiltTransitionTimer.start(
      () => {
        this.tiltStates.CurrentTiltAngle = this.tiltStates.TargetTiltAngle;
        this.service!.setCharacteristic(this.currentTiltCharacteristic, (this.tiltStates.CurrentTiltAngle));

        this.tiltTransitionSteps = 0;

        this.storeState();

        this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Tilt Angle: ${this.tiltStates.CurrentTiltAngle}º`);
      },
      proportionalTransitionDelay,
      updateIntervalMillis,
    );
  }

  async getTargetTiltAngle(): Promise<CharacteristicValue> {
    const targetTiltAngle = this.tiltStates.TargetTiltAngle;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Tilt Angle: ${targetTiltAngle}º`);

    return targetTiltAngle;
  }

  protected getOpeningAccessoryConfiguration(): OpenableAccessoryConfiguration {
    return this.accessoryConfiguration.windowCovering;
  }

  protected getOpeningAccessoryService(): WithUUID<typeof Service> {
    return this.platform.Service.WindowCovering;
  }

  protected getAccessoryTypeName(): string {
    return WindowCovering.ACCESSORY_TYPE_NAME;
  }

  protected getJsonState(): string {
    const state = JSON.parse(super.getJsonState());
    if (this.hasTilt) {
      state[this.tiltStateStorageKey] = this.tiltStates.CurrentTiltAngle;
    }
    return JSON.stringify(state);
  }
}
