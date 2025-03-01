import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';
import { AccessoryFactory } from '../accessoryFactory.js';
import { Timer } from '../timer.js';
import { NotCompanionError } from '../errors.js';
import { TimerConfiguration } from '../configuration/configurationTimer.js';
import { Sensor } from '../sensors/virtualSensor.js';
import { Utils } from '../utils.js';

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

  private durationTimer?: Timer;
  private isCompanionSwitch: boolean = false;

  private companionSwitchPostfix: string = '-switch';

  private states = {
    SwitchState: Switch.OFF,
    SensorState: Sensor.NORMAL,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    companionSwitchName?: string,
  ) {
    super(platform, accessory);

    if (companionSwitchName !== undefined) {
      this.isCompanionSwitch = true;
    }

    // If this is a companion switch to a doorbell, it will be a plain Switch
    if (!this.isCompanionSwitch) {

      // Setup reset timer first
      if (this.accessoryConfiguration.switch.hasResetTimer) {
        const timerConfig: TimerConfiguration = this.accessoryConfiguration.resetTimer;
        const duration: number = timerConfig.durationIsRandom ?
          Math.floor(Math.random() * (timerConfig.durationRandomMax + 1 - timerConfig.durationRandomMin) + timerConfig.durationRandomMin) :
          timerConfig.duration;
        this.durationTimer = new Timer(
          this.accessoryConfiguration.accessoryName,
          this.log,
          this.accessoryConfiguration.resetTimer.isResettable,
          duration,
          timerConfig.units,
        );
      }

      // First configure the device based on the accessory details
      this.defaultState = this.accessoryConfiguration.switch.defaultState === 'on' ? Switch.ON : Switch.OFF;

      this.states.SwitchState = this.defaultState;
      this.states.SensorState = Sensor.NORMAL;

      // If the accessory is stateful retrieve stored state
      if (this.accessoryConfiguration.accessoryIsStateful) {
        const accessoryState = this.loadAccessoryState(this.storagePath);
        const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;

        if (cachedState !== undefined) {
          this.states.SwitchState = cachedState;
          this.states.SensorState = this.determineSensorState();
        }

        if (this.accessoryConfiguration.switch.hasResetTimer) {
          const cachedTimerStartTime = accessoryState[this.timerStartTimeStorageKey] as string;
          const cachedTimerDuration = accessoryState[this.timerDurationStorageKey] as number;
          const cachedTimerIsRunning = accessoryState[this.timerIsRunningStorageKey] as boolean;

          // If the timer was running, calculate elapsed time and set timer for remaining duration
          if (cachedTimerIsRunning) {
            const elapsedTimeSinceTimerStart: number = Duration.between(Utils.now(), Utils.zonedDateTime(cachedTimerStartTime)).toMillis() / 1000; // seconds
            const timeDifferential: number = (cachedTimerDuration - elapsedTimeSinceTimerStart);

            // If the timer is expired, set timer to 1 second to issue trigger switch off
            const remainingTimerDuration: number = (timeDifferential <= 0) ? 1 : timeDifferential;

            if (remainingTimerDuration === 1) {
              this.log.info(`[${this.accessoryConfiguration.accessoryName}] Timer expired. Setting timer to 1 second to trigger switch off`);
            } else {
              this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Timer for remaining duration (${remainingTimerDuration} seconds)`);
            }

            this.durationTimer!.start(
              () => {
                this.service!.setCharacteristic(this.platform.Characteristic.On, this.defaultState);
              },
              remainingTimerDuration,
              Timer.Units.Seconds,
            );
          }
        }
      }
    }

    if (!this.isCompanionSwitch) {
      this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
    } else {
      this.service = this.accessory.getService(companionSwitchName!) ||
                     this.accessory.addService(this.platform.Service.Switch, companionSwitchName, accessory.UUID + this.companionSwitchPostfix);
    }

    if (!this.isCompanionSwitch) {
      this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);
    } else {
      this.service.setCharacteristic(this.platform.Characteristic.Name, companionSwitchName!);
    }

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Switch Current State: ${Switch.getStateName(this.states.SwitchState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.states.SwitchState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below

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

    if (!this.isCompanionSwitch) {
      // Create sensor service
      if (this.accessoryConfiguration.switch.hasCompanionSensor) {
        this.companionSensor = AccessoryFactory.createVirtualCompanionSensor(
          this.platform, this.accessory, this.accessoryConfiguration.companionSensor.type, this.accessoryConfiguration.companionSensor.name);

        this.companionSensor!.triggerCompanionSensorState(this.states.SensorState, this);
      }
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  async setOn(value: CharacteristicValue) {
    this.states.SwitchState = value as boolean;

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      // switch is reset: turn off timer
      if (this.states.SwitchState === this.defaultState) {
        this.durationTimer!.stop();
      } else {
        this.durationTimer!.start(
          () => {
            this.service!.setCharacteristic(this.platform.Characteristic.On, this.defaultState);
          },
        );
      }
    }

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${Switch.getStateName(this.states.SwitchState)}`);

    if (this.accessoryConfiguration.switch.hasCompanionSensor) {
      this.states.SensorState = this.determineSensorState();

      this.companionSensor!.triggerCompanionSensorState(this.states.SensorState, this);
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   */
  async getOn(): Promise<CharacteristicValue> {
    const switchState = this.states.SwitchState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${Switch.getStateName(switchState)}`);

    return switchState;
  }

  setCompanionSwitchState(value: boolean) {
    if (this.isCompanionSwitch) {
      this.states.SwitchState = value;
    } else {
      throw new NotCompanionError(`${this.accessoryConfiguration.accessoryName} is not a companion switch`);
    }
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.SwitchState,
    });

    if (this.accessoryConfiguration.switch.hasResetTimer) {
      const timerStartTime: string = this.durationTimer!.getStartTime().toString();
      const timerDuration: number = this.durationTimer!.getDuration();
      const timerIsRunning: boolean = this.durationTimer!.isTimerRunning();

      Object.assign(json, { [this.timerStartTimeStorageKey]: timerStartTime });
      Object.assign(json, { [this.timerDurationStorageKey]: timerDuration });
      Object.assign(json, { [this.timerIsRunningStorageKey]: timerIsRunning });
    }

    return json;
  }

  protected getAccessoryTypeName(): string {
    return Switch.ACCESSORY_TYPE_NAME;
  }

  private determineSensorState(): number {
    let sensorState: number;

    if (this.defaultState === Switch.OFF) {
      sensorState = (this.states.SwitchState === Switch.OFF) ? Sensor.NORMAL : Sensor.TRIGGERED;
    } else {
      sensorState = (this.states.SwitchState === Switch.ON) ? Sensor.NORMAL : Sensor.TRIGGERED;
    }

    return sensorState;
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
}
