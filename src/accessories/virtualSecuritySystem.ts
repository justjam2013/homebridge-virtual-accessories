import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * SecuritySystem - Accessory implementation
 */
export class SecuritySystem extends Accessory {
  
  static readonly STAY_ARM: number = 0;         // Characteristic.CurrentDoorState.OPEN;
  static readonly AWAY_ARM: number = 1;         // Characteristic.CurrentDoorState.CLOSED;
  static readonly NIGHT_ARM: number = 2;        // Characteristic.CurrentDoorState.OPENING;
  static readonly DISARMED: number = 3;         // Characteristic.CurrentDoorState.CLOSING;
  static readonly ALARM_TRIGGERED: number = 4;  // Characteristic.CurrentDoorState.STOPPED;

  private readonly stateStorageKey: string = 'SecuritySystemState';

  private states = {
    SecuritySystemCurrentState: SecuritySystem.DISARMED,
    SecuritySystemTargetState: SecuritySystem.DISARMED,
  };

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    switch (this.accessoryConfiguration.garageDoorDefaultState) {
    case 'stayarm':
      this.defaultState = SecuritySystem.STAY_ARM;
      break;
    case 'awayarm':
      this.defaultState = SecuritySystem.AWAY_ARM;
      break;
    case 'nightarm':
      this.defaultState = SecuritySystem.NIGHT_ARM;
      break;
    case 'disarmed':
      this.defaultState = SecuritySystem.DISARMED;
      break;
    default:
      this.defaultState = SecuritySystem.DISARMED;
    }

    this.states.SecuritySystemCurrentState = this.defaultState;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.SecuritySystemCurrentState = cachedState;
      }
    }

    this.states.SecuritySystemTargetState = this.states.SecuritySystemCurrentState;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Accessory - Security System')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.SecuritySystem) || this.accessory.addService(this.platform.Service.SecuritySystem);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    // eslint-disable-next-line max-len
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Security System Current State: ${this.getStateName(this.states.SecuritySystemCurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, (this.states.SecuritySystemCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.SecuritySystemTargetState, (this.states.SecuritySystemTargetState));

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the CurrentDoorState Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState)
      .onGet(this.handleSecuritySystemCurrentStateGet.bind(this)); // GET - bind to the 'handleSecuritySystemCurrentStateGet` method below

    // register handlers for the TargetDoorState Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .onSet(this.handleSecuritySystemTargetStateSet.bind(this)) // SET - bind to the `handleSecuritySystemTargetStateSet` method below
      .onGet(this.handleSecuritySystemTargetStateGet.bind(this)); // GET - bind to the `handleSecuritySystemTargetStateGet` method below

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
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async handleSecuritySystemCurrentStateGet() {
    // implement your own code to check if the device is on
    const securitySystemState = this.states.SecuritySystemCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current State: ${this.getStateName(securitySystemState)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return securitySystemState;
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  async handleSecuritySystemTargetStateSet(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.SecuritySystemTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target State: ${this.getStateName(this.states.SecuritySystemTargetState)}`);

    this.states.SecuritySystemCurrentState = this.states.SecuritySystemTargetState;
    this.service!.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, (this.states.SecuritySystemCurrentState));
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current State: ${this.getStateName(this.states.SecuritySystemCurrentState)}`);

    // Store device state if stateful
    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
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
  async handleSecuritySystemTargetStateGet(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const securitySystemState = this.states.SecuritySystemTargetState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target State: ${this.getStateName(securitySystemState)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return securitySystemState;
  }

  private getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.SecuritySystemCurrentState,
    });
    return json;
  }

  private getStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case SecuritySystem.STAY_ARM: { stateName = 'STAY_ARM'; break; }
    case SecuritySystem.AWAY_ARM: { stateName = 'AWAY_ARM'; break; }
    case SecuritySystem.NIGHT_ARM: { stateName = 'NIGHT_ARM'; break; }
    case SecuritySystem.DISARMED: { stateName = 'DISARMED'; break; }
    case SecuritySystem.ALARM_TRIGGERED: { stateName = 'ALARM_TRIGGERED'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }

}