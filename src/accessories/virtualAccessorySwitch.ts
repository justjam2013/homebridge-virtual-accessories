/* eslint-disable brace-style */
import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { CompanionSensor, TriggerableCompanionSensor } from '../sensors/companions/companionSensors.js';
import { BinarySensor } from '../sensors/binarySensor.js';
import { Timer } from '../utils/timer.js';
import { TimerConfiguration } from '../configuration/configurationTimer.js';
import { Utils } from '../utils/utils.js';

import { Duration } from '@js-joda/core';

/**
 * Switch - Accessory implementation
 */
export class Switch extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Switch';

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  private readonly stateStorageKey: string = 'SwitchState';
  private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  private readonly timerDurationStorageKey: string = 'TimerDuration';
  private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  protected resetTimer?: Timer;

  protected companionSensor?: TriggerableCompanionSensor;
  protected sensorState: number;

  protected muteLogging: boolean;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.setupStaticFields();

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.switch.defaultState === 'on' ? Switch.ON : Switch.OFF;
    this.muteLogging = this.accessoryConfiguration.switch.muteLogging;

    let On: boolean = this.defaultState;
    this.sensorState = BinarySensor.NORMAL;

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      this.setupResetTimer(this.accessoryConfiguration.resetTimer);
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.log.debug(`[${this.accessoryName}] Switch is stateful`);

      const accessoryState: string = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;

      if (cachedState !== undefined) {
        On = cachedState;
      }

      if (this.accessoryConfiguration.switch.hasResetTimer) {
        this.log.debug(`[${this.accessoryName}] Switch has reset timer`);

        const cachedTimerStartTime = accessoryState[this.timerStartTimeStorageKey] as string;
        const cachedTimerDuration = accessoryState[this.timerDurationStorageKey] as number;
        const cachedTimerIsRunning = accessoryState[this.timerIsRunningStorageKey] as boolean;

        this.log.debug(`[${this.accessoryName}] Cached Timer Start Time: ${cachedTimerStartTime}`);
        this.log.debug(`[${this.accessoryName}] Cached Timer Duration: ${cachedTimerDuration}`);
        this.log.debug(`[${this.accessoryName}] Cached Timer Is Running: ${cachedTimerIsRunning}`);

        // If the timer was running, calculate elapsed time and set timer for remaining duration
        if (cachedTimerIsRunning) {
          this.restoreRunningTimer(cachedTimerStartTime, cachedTimerDuration);
          //          this.storeState();
        }
      }
    }

    this.service = this.accessory.getService(ServiceType.Switch) || this.accessory.addService(ServiceType.Switch);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Switch Current State: ${Switch.getStateName(On)}`);
    this.updateOn(On);

    // register handlers

    this.service.getCharacteristic(CharacteristicType.On)
      .onGet(this.getOnHandler.bind(this))
      .onSet(this.setOnHandler.bind(this));

    // Create sensor service
    if (this.accessoryConfiguration.switch.hasCompanionSensor) {
      this.sensorState = this.determineSensorState();
      this.createCompanionSensor();
    }
  }

  // *** Handlers ***

  // On

  async getOnHandler(): Promise<CharacteristicValue> {
    const On: boolean = this.getOn();
    this.log.debug(`[${this.accessoryName}] Getting State: ${Switch.getStateName(On)}`);

    return On;
  }

  async setOnHandler(value: CharacteristicValue) {
    const On: boolean = value as boolean;
    this.updateOn(On);
    this.log.info(`[${this.accessoryName}] Setting State: ${Switch.getStateName(On)}`, this.muteLogging);

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      // switch is reset: turn off timer
      if (this.getOn() === this.defaultState) {
        this.resetTimer!.stop();
      }
      else {
        this.resetTimer!.start(
          this.onTimerExpired.bind(this),
        );
      }
    }

    this.storeState();

    if (this.accessoryConfiguration.switch.hasCompanionSensor) {
      this.updateCompanionSensor();
      // this.sensorState = this.determineSensorState();

      // this.companionSensor!.triggerCompanionSensorState(this.sensorState, this, this.muteLogging);
    }
  }

  // *** Handlers ***

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getOn(),
    };

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      const timerStartTime: string = this.resetTimer!.getStartTime().toString();
      const timerDuration: number = (this.resetTimer!.getDuration() > 0) ? this.resetTimer!.getDuration() : this.resetTimer!.getDefaultDuration();
      const timerIsRunning: boolean = this.resetTimer!.isRunning();

      Object.assign(jsonState, { [this.timerStartTimeStorageKey]: timerStartTime });
      Object.assign(jsonState, { [this.timerDurationStorageKey]: timerDuration });
      Object.assign(jsonState, { [this.timerIsRunningStorageKey]: timerIsRunning });
    }

    const json = JSON.stringify(jsonState);

    return json;
  }

  protected getAccessoryTypeName(): string {
    return Switch.ACCESSORY_TYPE_NAME;
  }

  static getStateName(state: boolean): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Switch.ON: { stateName = 'ON'; break; }
    case Switch.OFF: { stateName = 'OFF'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }

  private determineSensorState(): number {
    let sensorState: number;
    const On: boolean = this.getOn();

    if (this.defaultState === Switch.OFF) {
      sensorState = (On === Switch.OFF) ? BinarySensor.NORMAL : BinarySensor.TRIGGERED;
    } else {
      sensorState = (On === Switch.ON) ? BinarySensor.NORMAL : BinarySensor.TRIGGERED;
    }

    return sensorState;
  }

  // Setup stuff

  private setupResetTimer(timerConfig: TimerConfiguration): void {
    this.resetTimer = new Timer(
      this.accessoryName,
      this.log,
      this.accessoryConfiguration.resetTimer.isResettable,
      (timerConfig.duration !== undefined) ? timerConfig.duration.toSeconds() : 0,
      this.accessoryConfiguration.resetTimer.durationIsRandom,
      (timerConfig.durationRandomMin !== undefined) ? timerConfig.durationRandomMin.toSeconds() : 0,
      (timerConfig.durationRandomMax !== undefined) ? timerConfig.durationRandomMax.toSeconds() : 0,
    );
  }

  private createCompanionSensor(): void {
    this.companionSensor = CompanionSensor.getTriggerableCompanionSensor(
      this.platform,
      this.accessory,
      this.accessoryConfiguration);

    // Set initial sensor state
    this.companionSensor!.triggerCompanionSensorState(this.sensorState, this, this.muteLogging);
  }

  private updateCompanionSensor(): void {
    this.sensorState = this.determineSensorState();
    this.companionSensor!.triggerCompanionSensorState(this.sensorState, this, this.muteLogging);
  }

  private restoreRunningTimer(
    cachedTimerStartTime: string,
    cachedTimerDuration: number,
  ): void {
    // eslint-disable-next-line max-len
    const elapsedTimeSinceTimerStart: number = Math.trunc(Duration.between(Utils.zonedDateTime(cachedTimerStartTime), Utils.now()).toMillis() / 1000); // seconds
    const timeDifferential: number = (cachedTimerDuration - elapsedTimeSinceTimerStart);

    this.log.debug(`[${this.accessoryName}] Elapsed Time Since Timer Start: ${elapsedTimeSinceTimerStart}`);
    this.log.debug(`[${this.accessoryName}] Time Differential: ${timeDifferential}`);
  
    // If the timer is expired, set timer to 1 second to issue trigger switch off
    const remainingTimerDuration: number = (timeDifferential <= 0) ? 1 : timeDifferential;

    if (remainingTimerDuration === 1) {
      this.log.debug(`[${this.accessoryName}] Timer expired. Setting timer to 1 second to trigger switch off`);
    } else {
      this.log.debug(`[${this.accessoryName}] Setting Timer for remaining duration (${remainingTimerDuration} seconds)`);
    }

    this.resetTimer!.debugCountdown();
    this.resetTimer!.start(
      this.onTimerExpired.bind(this),
      remainingTimerDuration,
    );
  }

  private onTimerExpired(): void {
    this.updateOn(this.defaultState as boolean);

    if (this.accessoryConfiguration.switch.hasCompanionSensor) {
      this.updateCompanionSensor();
    }
  }

  // Convenience methods

  protected setupStaticFields() {
    //
  }

  // On

  protected getOn(): boolean {
    return this.getCharacteristicValue(CharacteristicType.On) as boolean;
  }

  protected updateOn(
    value: boolean,
  ) {
    this.updateCharacteristicValue(CharacteristicType.On, value);
  }
}
