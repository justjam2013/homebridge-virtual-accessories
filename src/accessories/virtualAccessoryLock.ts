import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * Lock - Accessory implementation
 */
export class Lock extends Accessory {

  static readonly UNSECURED: number = 0;  // Characteristic.LockCurrentState.UNSECURED;
  static readonly SECURED: number = 1;    // Characteristic.LockCurrentState.SECURED;
  static readonly JAMMED: number = 2;     // Characteristic.LockCurrentState.JAMMED;
  static readonly UNKNOWN: number = 3;    // Characteristic.LockCurrentState.UNKNOWN;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    LockState: Lock.UNSECURED,
  };

  private readonly stateStorageKey: string = 'LockState';

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.lockDefaultState === 'unlocked' ? Lock.UNSECURED : Lock.SECURED;

    // If the accessory is stateful retrieve stored state, otherwise set to default state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.LockState = cachedState;
      } else {
        this.states.LockState = this.defaultState;
      }
    } else  {
      this.states.LockState = this.defaultState;
    }
    
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Accessory - Lock')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID)
      .setCharacteristic(this.platform.Characteristic.HardwareFinish, this.accessoryConfiguration.lockHardwareFinish);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.LockMechanism) || this.accessory.addService(this.platform.Service.LockMechanism);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Current State: ${this.getStateName(this.states.LockState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, (this.states.LockState));
    this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, (this.states.LockState));

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the LockCurrentState Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.LockCurrentState)
      .onGet(this.handleLockCurrentStateGet.bind(this)); // GET - bind to the 'handleLockCurrentStateGet` method below

    // register handlers for the LockTargetState Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.LockTargetState)
      .onSet(this.handleLockTargetStateSet.bind(this)) // SET - bind to the `handleLockTargetStateSet` method below
      .onGet(this.handleLockTargetStateGet.bind(this)); // GET - bind to the `handleLockTargetStateGet` method below

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

    // Creating Homekey service
    const nfcAccessServiceName = 'NFC Access';
    const nfcAccessService = this.accessory.getService(nfcAccessServiceName)
      || this.accessory.addService(this.platform.Service.NFCAccess, nfcAccessServiceName, this.accessory.UUID + '-NFC');

    nfcAccessService.getCharacteristic(this.platform.Characteristic.ConfigurationState)
      .onGet(this.handleConfigurationStateGet.bind(this));
    nfcAccessService.getCharacteristic(this.platform.Characteristic.NFCAccessControlPoint)
      .onSet(this.handleNFCAccessControlPointSet.bind(this));
    nfcAccessService.getCharacteristic(this.platform.Characteristic.NFCAccessSupportedConfiguration)
      .onGet(this.handleNFCAccessSupportedConfigurationGet.bind(this));
  }

  /**
   * Handle "GET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async handleLockCurrentStateGet() {
    // implement your own code to check if the device is on
    const lockState = this.states.LockState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Current State: ${this.getStateName(lockState)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return lockState;
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  async handleLockTargetStateSet(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.LockState = value as number;

    // Store device state if stateful
    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Target State to ${this.getStateName(this.states.LockState)}`);
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
  async handleLockTargetStateGet(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const lockState = this.states.LockState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Target State: ${this.getStateName(lockState)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return lockState;
  }

  // NFC Access Service handlers
  async handleConfigurationStateGet(): Promise<CharacteristicValue> {
    const configurationState = 0;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Configuration State: ${configurationState}`);

    return configurationState;
  }

  async handleNFCAccessControlPointSet(value: CharacteristicValue) {
    const nfcAccessControlPoint = value;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting NFC Access Control Point: ${nfcAccessControlPoint}`);
  }

  async handleNFCAccessSupportedConfigurationGet(): Promise<CharacteristicValue> {
    const nFCAccessSupportedConfiguration = 'AQEQAgEQ';

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting NFC Access Supported Configuration: ${nFCAccessSupportedConfiguration}`);

    return nFCAccessSupportedConfiguration;
  }

  private getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.LockState,
    });
    return json;
  }

  private getStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Lock.UNSECURED: { stateName = 'UNSECURED'; break; }
    case Lock.SECURED: { stateName = 'SECURED'; break; }
    case Lock.JAMMED: { stateName = 'JAMMED'; break; }
    case Lock.UNKNOWN: { stateName = 'UNKNOWN'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }
}
