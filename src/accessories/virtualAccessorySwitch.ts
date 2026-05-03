/* eslint-disable brace-style */

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { CompanionSensor, TriggerableCompanionSensor } from '../sensors/companions/companionSensors.js';
import { Timer } from '../utils/timer.js';
import { TimerConfiguration } from '../configuration/configurationTimer.js';
import { Utils } from '../utils/utils.js';

import { Duration } from '@js-joda/core';
import { Power } from './accessoryCharacteristics.js';
import { TriggeredState } from '../sensors/sensorCharacteristics.js';

/**
 * Switch - Accessory implementation
 */
export class Switch extends Accessory<typeof Service.Switch> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Switch';

  private readonly stateStorageKey: string = 'SwitchState';
  private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  private readonly timerDurationStorageKey: string = 'TimerDuration';
  private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  protected resetTimer?: Timer;
  protected companionSensor?: TriggerableCompanionSensor;

  protected muteLogging: boolean;

  // Device states
  protected PowerState: boolean = Power.OFF;
  private SensorState: number = TriggeredState.NORMAL;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.Switch,
      Switch.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.switch.defaultState === 'on' ? Power.ON : Power.OFF;
    this.muteLogging = this.accessoryConfiguration.switch.muteLogging;

    this.PowerState = this.defaultState;
    this.SensorState = TriggeredState.NORMAL;

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      this.setupResetTimer(this.accessoryConfiguration.resetTimer);
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      this.log.debug(`[${this.accessoryName}] Switch is stateful`);

      const accessoryState: string = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;

      if (cachedState !== undefined) {
        this.PowerState = cachedState;
        this.SensorState = this.determineSensorState();
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
          this.storeState();
        }
      }
    }

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Switch Current State: ${Power.getName(this.PowerState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.PowerState));

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
    else {
      // Remove any existing sensor services
      this.removeCompanionSensorService();
    }
  }
  
  // Handlers

  async setOn(value: CharacteristicValue) {
    this.PowerState = value as boolean;

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      // switch is reset: turn off timer
      if (this.PowerState === this.defaultState) {
        this.resetTimer!.stop();
      } else {
        this.resetTimer!.start(
          this.onTimerExpired.bind(this),
        );
      }
    }

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting State: ${Power.getName(this.PowerState)}`, this.muteLogging);

    if (this.accessoryConfiguration.switch.hasCompanionSensor) {
      this.SensorState = this.determineSensorState();

      this.companionSensor!.triggerCompanionSensorState(this.SensorState, this, this.muteLogging);
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    const switchState = this.PowerState;

    this.log.debug(`[${this.accessoryName}] Getting State: ${Power.getName(switchState)}`);

    return switchState;
  }

  //

  protected override getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.PowerState,
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

  private determineSensorState(): number {
    let sensorState: number;

    if (this.defaultState === Power.OFF) {
      sensorState = (this.PowerState === Power.OFF) ? TriggeredState.NORMAL : TriggeredState.TRIGGERED;
    } else {
      sensorState = (this.PowerState === Power.ON) ? TriggeredState.NORMAL : TriggeredState.TRIGGERED;
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
      this.accessoryName,
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
    this.companionSensor!.triggerCompanionSensorState(this.SensorState, this, this.muteLogging);
  }

  private removeCompanionSensorService(): void {
    const companionSensorServiceUUIDs: string[] = CompanionSensor.getCompanionSensorServiceUUIDs(this.platform);
    for (const service of this.accessory.services) {
      if (companionSensorServiceUUIDs.includes(service.UUID)) {
        this.accessory.removeService(service);
      }
    }
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
    this.service!.setCharacteristic(this.platform.Characteristic.On, this.defaultState);
  }
}
