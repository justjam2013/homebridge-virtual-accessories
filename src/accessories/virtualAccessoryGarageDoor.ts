/* eslint-disable max-len */

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * GarageDoor - Accessory implementation
 */
export class GarageDoor extends Accessory {
  
  static readonly OPEN: number = 0;     // Characteristic.CurrentDoorState.OPEN;
  static readonly CLOSED: number = 1;   // Characteristic.CurrentDoorState.CLOSED;
  static readonly OPENING: number = 2;  // Characteristic.CurrentDoorState.OPENING;
  static readonly CLOSING: number = 3;  // Characteristic.CurrentDoorState.CLOSING;
  static readonly STOPPED: number = 4;  // Characteristic.CurrentDoorState.STOPPED;

  private readonly stateStorageKey: string = 'GarageDoorState';

  private transitionTimerId: ReturnType<typeof setTimeout> | undefined;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    GarageDoorCurrentState: GarageDoor.CLOSED,
    GarageDoorTargetState: GarageDoor.CLOSED,
    ObstructionDetected: false,
  };

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.garageDoorDefaultState === 'open' ? GarageDoor.OPEN : GarageDoor.CLOSED;

    // If the accessory is stateful retrieve stored state, otherwise set to default state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.GarageDoorCurrentState = cachedState;
      } else {
        this.states.GarageDoorCurrentState = this.defaultState;
      }
    } else {
      this.states.GarageDoorCurrentState = this.defaultState;
    }
    this.states.GarageDoorTargetState = this.states.GarageDoorCurrentState;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Accessory - Garage Door')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.GarageDoorOpener) || this.accessory.addService(this.platform.Service.GarageDoorOpener);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Garage Door Current State: ${this.getStateName(this.states.GarageDoorCurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.TargetDoorState, (this.states.GarageDoorTargetState));

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the CurrentDoorState Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState)
      .onGet(this.handleCurrentDoorStateGet.bind(this)); // GET - bind to the 'handleCurrentDoorStateGet` method below

    // register handlers for the TargetDoorState Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState)
      .onSet(this.handleTargetDoorStateSet.bind(this)) // SET - bind to the `handleTargetDoorStateSet` method below
      .onGet(this.handleTargetDoorStateGet.bind(this)); // GET - bind to the `handleTargetDoorStateGet` method below

    // register handlers for the ObstructionDetected Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.ObstructionDetected)
      .onGet(this.handleObstructionDetectedGet.bind(this)); // GET - bind to the 'handleObstructionDetectedGet` method below

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
  async handleCurrentDoorStateGet() {
    // implement your own code to check if the device is on
    const garageDoorCurrentState = this.states.GarageDoorCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current Door State: ${this.getStateName(garageDoorCurrentState)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return garageDoorCurrentState;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async handleTargetDoorStateSet(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.GarageDoorTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target Door State: ${this.getStateName(this.states.GarageDoorTargetState)}`);

    // CurrentDoorState CLOSING/OPENING
    this.states.GarageDoorCurrentState = (this.states.GarageDoorTargetState === GarageDoor.OPEN) ? GarageDoor.OPENING : GarageDoor.CLOSING;
    this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Curent Door State: ${this.getStateName(this.states.GarageDoorCurrentState)}`);

    // CurrentDoorState CLOSED/OPEN with 3 second delay
    const transitionDelayMillis: number = 3 * 1000;
    this.transitionTimerId = setTimeout(() => {
      // Reset timer
      clearTimeout(this.transitionTimerId);

      this.states.GarageDoorCurrentState = this.states.GarageDoorTargetState;
      this.service!.setCharacteristic(this.platform.Characteristic.CurrentDoorState, (this.states.GarageDoorCurrentState));
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current Door State: ${this.getStateName(this.states.GarageDoorCurrentState)}`);

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
  async handleTargetDoorStateGet(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const garageDoorTargetState = this.states.GarageDoorTargetState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target Door State: ${this.getStateName(garageDoorTargetState)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return garageDoorTargetState;
  }

  /**
   * Handle "GET" requests from HomeKit
   */
  async handleObstructionDetectedGet() {
    // implement your own code to check if the device is on
    const obstructionDetected = this.states.ObstructionDetected;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Obstruction Detected: ${obstructionDetected}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return obstructionDetected;
  }

  private getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.GarageDoorCurrentState,
    });
    return json;
  }

  private getStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case GarageDoor.OPEN: { stateName = 'OPEN'; break; }
    case GarageDoor.CLOSED: { stateName = 'CLOSED'; break; }
    case GarageDoor.OPENING: { stateName = 'OPENING'; break; }
    case GarageDoor.CLOSING: { stateName = 'CLOSING'; break; }
    case GarageDoor.STOPPED: { stateName = 'STOPPED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}
