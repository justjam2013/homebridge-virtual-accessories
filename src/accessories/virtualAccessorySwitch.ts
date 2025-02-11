import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';
import { AccessoryFactory } from '../accessoryFactory.js';
import { Timer } from '../timer.js';
import { NotCompanionError } from '../errors.js';
import { TimerConfiguration } from '../configuration/configurationTimer.js';
// import { Utils } from '../utils.js';

// import { Duration } from '@js-joda/core';

/**
 * Switch - Accessory implementation
 */
export class Switch extends Accessory {

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  private readonly stateStorageKey: string = 'SwitchState';
  // private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  // private readonly timerDurationStorageKey: string = 'TimerDuration';
  // private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  private durationTimer?: Timer;
  private isCompanionSwitch: boolean = false;

  private companionSwitchPostfix: string = '-switch';

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    SwitchState: Switch.OFF,
    SensorState: this.CLOSED_NORMAL,
  };

  constructor(
    platform: VirtualAccessoryPlatform,
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
      if (this.accessoryConfiguration.accessoryHasResetTimer) {
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
      this.defaultState = this.accessoryConfiguration.switchDefaultState === 'on' ? Switch.ON : Switch.OFF;

      this.states.SwitchState = this.defaultState;
      this.states.SensorState = this.CLOSED_NORMAL;

      // If the accessory is stateful retrieve stored state
      if (this.accessoryConfiguration.accessoryIsStateful) {
        const accessoryState = this.loadAccessoryState(this.storagePath);
        const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;
  
        if (cachedState !== undefined) {
          this.states.SwitchState = cachedState;
          this.states.SensorState = this.determineSensorState();
        }

        // if (this.accessoryConfiguration.accessoryHasResetTimer) {
        //   const cachedTimerStartTime = accessoryState[this.timerStartTimeStorageKey] as string;
        //   const cachedTimerDuration = accessoryState[this.timerDurationStorageKey] as number;
        //   const cachedTimerIsRunning = accessoryState[this.timerIsRunningStorageKey] as boolean;

        //   // If the timer was running, calculate elapsed time and set timer for remaining duration
        //   if (cachedTimerIsRunning) {
        //     const elapsedTime: number = Duration.between(Utils.now(), Utils.zonedDateTime(cachedTimerStartTime)).toMillis() / 1000;
        //     // If the timer is expired, set timer to 1 second to trigger switch off
        //     const timerExpired = cachedTimerDuration <= elapsedTime;
        //     const remainingTimerDuration: number = (timerExpired) ? 1 : (cachedTimerDuration - elapsedTime);

        //     if (timerExpired) {
        //       this.log.info(`[${this.accessoryConfiguration.accessoryName}] Timer expired. Triggering switch`);
        //     } else {
        //       this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Timer for remaining duration (${remainingTimerDuration} seconds)`);
        //     }

        //     this.durationTimer!.start(
        //       () => {
        //         this.service!.setCharacteristic(this.platform.Characteristic.On, this.defaultState);
        //       },
        //       remainingTimerDuration,
        //       Timer.Units.Seconds,
        //     );
        //   }
        // }
      }
    }

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Accessory - Switch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID);

    // get the Switch service if it exists, otherwise create a new Switch service
    // you can create multiple services for each accessory
    if (!this.isCompanionSwitch) {
      this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
    } else {
      this.service = this.accessory.getService(companionSwitchName!) ||
                     this.accessory.addService(this.platform.Service.Switch, companionSwitchName, accessory.UUID + this.companionSwitchPostfix);
    }

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    if (!this.isCompanionSwitch) {
      this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);
    } else {
      this.service.setCharacteristic(this.platform.Characteristic.Name, companionSwitchName!);
    }

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Switch Current State: ${Switch.getStateName(this.states.SwitchState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.states.SwitchState));

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
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
      if (this.accessoryConfiguration.accessoryHasCompanionSensor) {
        this.companionSensor = AccessoryFactory.createVirtualCompanionSensor(
          this.platform, this.accessory, this.accessoryConfiguration.companionSensor.type, this.accessoryConfiguration.companionSensor.name);

        this.companionSensor!.triggerCompanionSensorState(this.states.SensorState, this);
      }
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.SwitchState = value as boolean;

    if (this.accessoryConfiguration.accessoryHasResetTimer) {
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

    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${Switch.getStateName(this.states.SwitchState)}`);

    if (this.accessoryConfiguration.accessoryHasCompanionSensor) {
      this.states.SensorState = this.determineSensorState();

      this.companionSensor!.triggerCompanionSensorState(this.states.SensorState, this);
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const switchState = this.states.SwitchState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${Switch.getStateName(switchState)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return switchState;
  }

  setCompanionSwitchState(value: boolean) {
    if (this.isCompanionSwitch) {
      this.states.SwitchState = value;
    } else {
      throw new NotCompanionError(`${this.accessoryConfiguration.accessoryName} is not a companion switch`);
    }
  }

  private getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.SwitchState,
    });

    // if (this.accessoryConfiguration.accessoryHasResetTimer) {
    //   const timerStartTime: string = this.durationTimer!.getStartTime().toString();
    //   const timerDuration: number = this.durationTimer!.getDuration();
    //   const timerIsRunning: boolean = this.durationTimer!.isTimerRunning();

    //   Object.assign(json, { [this.timerStartTimeStorageKey]: timerStartTime });
    //   Object.assign(json, { [this.timerDurationStorageKey]: timerDuration });
    //   Object.assign(json, { [this.timerIsRunningStorageKey]: timerIsRunning });
    // }

    return json;
  }

  // Default switch state Off:
  //     switch turns on -> contact opens
  //     switch turns off -> contact closes
  // Default state state On:
  //     switch turns off -> contact opens
  //     switch turns on -> contact closes
  private determineSensorState(): number {
    let sensorState: number;

    if (this.defaultState === Switch.OFF) {
      sensorState = (this.states.SwitchState === Switch.OFF) ? this.CLOSED_NORMAL : this.OPEN_TRIGGERED;
    } else {
      sensorState = (this.states.SwitchState === Switch.ON) ? this.CLOSED_NORMAL : this.OPEN_TRIGGERED;
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
