/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * WindowCovering - Accessory implementation
 */
export class WindowCovering extends Accessory {
  
  static readonly CLOSED: number = 0;   // 0%
  static readonly OPEN: number = 100;   // 100%

  static readonly DECREASING: number = 0;   //	Characteristic.PositionState.DECREASING;  -> CLOSING
  static readonly INCREASING: number = 1;   //	Characteristic.PositionState.INCREASING;  -> OPENING
  static readonly STOPPED: number = 2;      //	Characteristic.PositionState.STOPPED;     -> OPEN or CLOSED

  private readonly stateStorageKey: string = 'WindowCoveringPosition';

  private transitionTimerId: ReturnType<typeof setTimeout> | undefined;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    WindowCoveringTargetPosition: WindowCovering.CLOSED,
    WindowCoveringCurrentPosition: WindowCovering.CLOSED,
    WindowCoveringPositionState: WindowCovering.STOPPED,
  };

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.windowCoveringDefaultState === 'open' ? WindowCovering.OPEN : WindowCovering.CLOSED;

    // If the accessory is stateful retrieve stored state, otherwise set to default state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.WindowCoveringCurrentPosition = cachedState;
      } else {
        this.states.WindowCoveringCurrentPosition = this.defaultState;
      }
    } else {
      this.states.WindowCoveringCurrentPosition = this.defaultState;
    }
    this.states.WindowCoveringTargetPosition = this.states.WindowCoveringCurrentPosition;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Accessory - Window Covering')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.WindowCovering) || this.accessory.addService(this.platform.Service.WindowCovering);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Window Covering Current Position: ${this.getStateName(this.states.WindowCoveringCurrentPosition)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, (this.states.WindowCoveringCurrentPosition));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, (this.states.WindowCoveringTargetPosition));
    this.service.updateCharacteristic(this.platform.Characteristic.PositionState, (this.states.WindowCoveringPositionState));

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the CurrentDoorState Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .onGet(this.handleCurrentPositionGet.bind(this)); // GET - bind to the 'handleCurrentPositionGet` method below

    // register handlers for the TargetDoorState Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onSet(this.handleTargetPositionSet.bind(this)) // SET - bind to the `handleTargetPositionSet` method below
      .onGet(this.handleTargetPositionGet.bind(this)); // GET - bind to the `handleTargetPositionGet` method below

    // register handlers for the ObstructionDetected Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.PositionState)
      .onGet(this.handlePositionStateGet.bind(this)); // GET - bind to the 'handlePositionStateGet` method below

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

  }

  /**
   * Handle "GET" requests from HomeKit
   */
  async handleCurrentPositionGet() {
    // implement your own code to check if the device is on
    const windowCoveringCurrentPosition = this.states.WindowCoveringCurrentPosition;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Position: ${this.getStateName(windowCoveringCurrentPosition)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return windowCoveringCurrentPosition;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async handleTargetPositionSet(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.WindowCoveringTargetPosition = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Position: ${this.getStateName(this.states.WindowCoveringTargetPosition)}`);

    // PositionState DECREASING/INCREASING
    this.states.WindowCoveringPositionState = (this.states.WindowCoveringTargetPosition === WindowCovering.OPEN) ? WindowCovering.INCREASING : WindowCovering.DECREASING;
    this.service!.setCharacteristic(this.platform.Characteristic.PositionState, (this.states.WindowCoveringPositionState));
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Position State: ${this.getPositionName(this.states.WindowCoveringPositionState)}`);
    
    // PositionState STOPPED
    const transitionDelayMillis: number = this.accessoryConfiguration.transitionDuration * 1000;
    this.transitionTimerId = setTimeout(() => {
      // Reset timer
      clearTimeout(this.transitionTimerId);

      this.states.WindowCoveringPositionState = WindowCovering.STOPPED;
      this.service!.setCharacteristic(this.platform.Characteristic.PositionState, (this.states.WindowCoveringPositionState));
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Position State: ${this.getPositionName(this.states.WindowCoveringPositionState)}`);

      this.states.WindowCoveringCurrentPosition = this.states.WindowCoveringTargetPosition;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentPosition, (this.states.WindowCoveringCurrentPosition));
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Position: ${this.getStateName(this.states.WindowCoveringCurrentPosition)}`);

      // Store device state if stateful
      if (this.accessoryConfiguration.accessoryIsStateful) {
        this.saveAccessoryState(this.storagePath, this.getJsonState());
      }
    }, transitionDelayMillis);
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
  async handleTargetPositionGet(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const windowCoveringTargetPosition = this.states.WindowCoveringTargetPosition;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Position: ${this.getStateName(windowCoveringTargetPosition)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return windowCoveringTargetPosition;
  }

  /**
   * Handle "GET" requests from HomeKit
   */
  async handlePositionStateGet() {
    // implement your own code to check if the device is on
    const windowCoveringPositionState = this.states.WindowCoveringPositionState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Position State: ${this.getPositionName(windowCoveringPositionState)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return windowCoveringPositionState;
  }

  private getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.WindowCoveringCurrentPosition,
    });
    return json;
  }

  private getStateName(position: number): string {
    let positionName: string;

    switch (position) {
    case undefined: { positionName = 'undefined'; break; }
    case WindowCovering.CLOSED: { positionName = 'CLOSED'; break; }
    case WindowCovering.OPEN: { positionName = 'OPEN'; break; }
    default: { positionName = `POSITION: ${position.toString()}%`; }
    }

    if (position > WindowCovering.OPEN) {
      positionName = `INVALID ${positionName}%`;
    }

    return positionName;
  }

  private getPositionName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case WindowCovering.DECREASING: { stateName = 'DECREASING'; break; }
    case WindowCovering.INCREASING: { stateName = 'INCREASING'; break; }
    case WindowCovering.STOPPED: { stateName = 'STOPPED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}
