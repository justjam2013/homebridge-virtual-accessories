import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
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

  protected muteLogging: boolean;

  protected states = {
    SwitchState: Switch.OFF,
    SensorState: BinarySensor.NORMAL,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.switch.defaultState === 'on' ? Switch.ON : Switch.OFF;
    this.muteLogging = this.accessoryConfiguration.switch.muteLogging;

    this.states.SwitchState = this.defaultState;
    this.states.SensorState = BinarySensor.NORMAL;

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      this.setupResetTimer(this.accessoryConfiguration.resetTimer);
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Switch is stateful`);

      const accessoryState: string = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;

      if (cachedState !== undefined) {
        this.states.SwitchState = cachedState;
        this.states.SensorState = this.determineSensorState();
      }

      if (this.accessoryConfiguration.switch.hasResetTimer) {
        this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Switch has reset timer`);

        const cachedTimerStartTime = accessoryState[this.timerStartTimeStorageKey] as string;
        const cachedTimerDuration = accessoryState[this.timerDurationStorageKey] as number;
        const cachedTimerIsRunning = accessoryState[this.timerIsRunningStorageKey] as boolean;

        this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Start Time: ${cachedTimerStartTime}`);
        this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Duration: ${cachedTimerDuration}`);
        this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Is Running: ${cachedTimerIsRunning}`);

        // If the timer was running, calculate elapsed time and set timer for remaining duration
        if (cachedTimerIsRunning) {
          this.restoreRunningTimer(cachedTimerStartTime, cachedTimerDuration);
          this.storeState();
        }
      }
    }

    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Switch Current State: ${Switch.getStateName(this.states.SwitchState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.states.SwitchState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same subtype id.)
     */

    // Create sensor service
    if (this.accessoryConfiguration.switch.hasCompanionSensor) {
      this.createCompanionSensor();
    }
  }

  // Handlers

  async setOn(value: CharacteristicValue) {
    this.states.SwitchState = value as boolean;

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      // switch is reset: turn off timer
      if (this.states.SwitchState === this.defaultState) {
        this.resetTimer!.stop();
      } else {
        this.resetTimer!.start(
          this.onTimerExpired.bind(this),
        );
      }
    }

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${Switch.getStateName(this.states.SwitchState)}`, this.muteLogging);

    if (this.accessoryConfiguration.switch.hasCompanionSensor) {
      this.states.SensorState = this.determineSensorState();

      this.companionSensor!.triggerCompanionSensorState(this.states.SensorState, this, this.muteLogging);
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    const switchState = this.states.SwitchState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${Switch.getStateName(switchState)}`);

    return switchState;
  }

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.states.SwitchState,
    };

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      const timerStartTime: string = this.resetTimer!.getStartTime().toString();
      const timerDuration: number = (this.resetTimer!.getRuntime() > 0) ? this.resetTimer!.getRuntime() : this.resetTimer!.getDefaultDuration();
      const timerIsRunning: boolean = this.resetTimer!.isTimerRunning();

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

    if (this.defaultState === Switch.OFF) {
      sensorState = (this.states.SwitchState === Switch.OFF) ? BinarySensor.NORMAL : BinarySensor.TRIGGERED;
    } else {
      sensorState = (this.states.SwitchState === Switch.ON) ? BinarySensor.NORMAL : BinarySensor.TRIGGERED;
    }

    return sensorState;
  }

  // Setup stuff

  private setupResetTimer(timerConfig: TimerConfiguration): void {
    const duration: number = timerConfig.durationIsRandom ?
      Math.floor(
        Math.random() *
        (timerConfig.durationRandomMax.toSeconds() + 1 - timerConfig.durationRandomMin.toSeconds()) +
       timerConfig.durationRandomMin.toSeconds(),
      ):
      timerConfig.duration.toSeconds();
    this.resetTimer = new Timer(
      this.accessoryConfiguration.accessoryName,
      this.log,
      this.accessoryConfiguration.resetTimer.isResettable,
      duration,
    );
  }

  private createCompanionSensor(): void {
    this.companionSensor = CompanionSensor.getTriggerableCompanionSensor(
      this.platform,
      this.accessory,
      this.accessoryConfiguration);

    // Set initial sensor state
    this.companionSensor!.triggerCompanionSensorState(this.states.SensorState, this, this.muteLogging);
  }

  private restoreRunningTimer(
    cachedTimerStartTime: string,
    cachedTimerDuration: number,
  ): void {
    // eslint-disable-next-line max-len
    const elapsedTimeSinceTimerStart: number = Math.trunc(Duration.between(Utils.zonedDateTime(cachedTimerStartTime), Utils.now()).toMillis() / 1000); // seconds
    const timeDifferential: number = (cachedTimerDuration - elapsedTimeSinceTimerStart);

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Elapsed Time Since Timer Start: ${elapsedTimeSinceTimerStart}`);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Time Differential: ${timeDifferential}`);
  
    // If the timer is expired, set timer to 1 second to issue trigger switch off
    const remainingTimerDuration: number = (timeDifferential <= 0) ? 1 : timeDifferential;

    if (remainingTimerDuration === 1) {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Timer expired. Setting timer to 1 second to trigger switch off`);
    } else {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Timer for remaining duration (${remainingTimerDuration} seconds)`);
    }

    this.resetTimer!.debugCountdown();
    this.resetTimer!.start(
      this.onTimerExpired.bind(this),
      remainingTimerDuration,
    );
  }

  private onTimerExpired(): void {
    this.service!.setCharacteristic(this.platform.Characteristic.On, this.defaultState);
  }

  cleanup(): void {
    if (this.resetTimer !== undefined) {
      this.resetTimer.stop();
    }
    super.cleanup();
  }
}
