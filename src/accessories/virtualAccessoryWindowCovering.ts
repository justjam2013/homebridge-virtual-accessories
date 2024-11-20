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

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    WindowCoveringPosition: WindowCovering.CLOSED,
  };

  private readonly stateStorageKey: string = 'WindowCoveringPosition';

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.windowCoveringDefaultState === 'open' ? WindowCovering.OPEN : WindowCovering.CLOSED;

    // If the accessory is stateful retrieve stored state, otherwise set to default state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const cachedState = this.loadState(this.storagePath, this.stateStorageKey) as number;

      if (cachedState !== undefined) {
        this.states.WindowCoveringPosition = cachedState;
      } else {
        this.states.WindowCoveringPosition = this.defaultState;
      }
    } else {
      this.states.WindowCoveringPosition = this.defaultState;
    }

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
    // eslint-disable-next-line max-len
    this.platform.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Window Covering Current Position: ${this.getStateName(this.states.WindowCoveringPosition)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, (this.states.WindowCoveringPosition));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, (this.states.WindowCoveringPosition));
    this.service.updateCharacteristic(this.platform.Characteristic.PositionState, (WindowCovering.STOPPED));

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
    const windowCoveringPosition = this.states.WindowCoveringPosition;

    // eslint-disable-next-line max-len
    this.platform.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Window Covering Position: ${this.getStateName(windowCoveringPosition)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return windowCoveringPosition;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async handleTargetPositionSet(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.WindowCoveringPosition = value as number;

    // Store device state if stateful
    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveState(this.storagePath, this.stateStorageKey, this.states.WindowCoveringPosition);
    }

    // eslint-disable-next-line max-len
    this.platform.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Window Covering Position: ${this.getStateName(this.states.WindowCoveringPosition)}`);
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
    const windowCoveringPosition = this.states.WindowCoveringPosition;

    // eslint-disable-next-line max-len
    this.platform.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Window Covering Position: ${this.getStateName(windowCoveringPosition)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return windowCoveringPosition;
  }

  /**
   * Handle "GET" requests from HomeKit
   */
  async handlePositionStateGet() {
    // implement your own code to check if the device is on
    const windowCoveringPosition = this.platform.Characteristic.PositionState.STOPPED;

    this.platform.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Window Covering Position: ${this.getPositionName(windowCoveringPosition)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return windowCoveringPosition;
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
