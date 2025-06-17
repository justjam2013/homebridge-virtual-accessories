/* eslint-disable brace-style */
import { Units, CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

import { Utils } from '../utils.js';

/**
 * Lock - Accessory implementation
 */
export class Lock extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Lock';

  static readonly UNSECURED: number = 0;  // Characteristic.LockCurrentState.UNSECURED;
  static readonly SECURED: number = 1;    // Characteristic.LockCurrentState.SECURED;
  static readonly JAMMED: number = 2;     // Characteristic.LockCurrentState.JAMMED;
  static readonly UNKNOWN: number = 3;    // Characteristic.LockCurrentState.UNKNOWN;

  static readonly SECURED_REMOTELY: number = 6;                 // Characteristic.LockLastKnownAction.SECURED_REMOTELY;
  static readonly UNSECURED_REMOTELY: number = 7;               // Characteristic.LockLastKnownAction.UNSECURED_REMOTELY
  static readonly SECURED_BY_AUTO_SECURE_TIMEOUT: number = 8;   // Characteristic.LockLastKnownAction.SECURED_BY_AUTO_SECURE_TIMEOUT

  private readonly stateStorageKey: string = 'LockState';
  private readonly securityTimeoutStorageKey: string = 'LockAutoSecurityTimeout';
  private readonly lastKnownAction: string = 'LockLastKnownAction';

  private securityTimerId: ReturnType<typeof setTimeout> | undefined;

  private states = {
    LockCurrentState: Lock.SECURED,
    LockTargetState: Lock.SECURED,
    LockManagementAutoSecurityTimeout: 0,
    LockLastKnownAction: Lock.UNSECURED_REMOTELY,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.lock.defaultState === 'unlocked' ? Lock.UNSECURED : Lock.SECURED;
    const autoSecurityTimeout = this.accessoryConfiguration.lock.autoSecurityTimeout;

    this.states.LockCurrentState = this.defaultState;
    this.states.LockManagementAutoSecurityTimeout = autoSecurityTimeout;
    this.states.LockLastKnownAction = Lock.UNSECURED_REMOTELY;      // There is no "unknown" value

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedSecurityTimeout: number = accessoryState[this.securityTimeoutStorageKey] as number;
      const cachedLastKnownAction: number = accessoryState[this.lastKnownAction] as number;

      if (cachedState !== undefined) {
        this.states.LockCurrentState = cachedState;
      }
      if (cachedSecurityTimeout !== undefined) {
        this.states.LockManagementAutoSecurityTimeout = cachedSecurityTimeout;
      }
      if (cachedLastKnownAction !== undefined) {
        this.states.LockLastKnownAction = cachedLastKnownAction;
      }
    }

    this.states.LockTargetState = this.states.LockCurrentState;

    this.service = this.accessory.getService(this.platform.Service.LockMechanism) || this.accessory.addService(this.platform.Service.LockMechanism);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Current State: ${Lock.getStateName(this.states.LockCurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, (this.states.LockCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, (this.states.LockTargetState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.LockCurrentState)
      .onGet(this.getLockCurrentState.bind(this)); // GET - bind to the 'handleLockCurrentStateGet` method below

    this.service.getCharacteristic(this.platform.Characteristic.LockTargetState)
      .onSet(this.setLockTargetState.bind(this)) // SET - bind to the `handleLockTargetStateSet` method below
      .onGet(this.getLockTargetState.bind(this)); // GET - bind to the `handleLockTargetStateGet` method below

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

    // Creating Lock Management service
    const lockManagementServiceName = `${this.accessoryConfiguration.accessoryName} Management`;
    const lockManagementService = this.accessory.getService(lockManagementServiceName)
      || this.accessory.addService(this.platform.Service.LockManagement, lockManagementServiceName, this.accessory.UUID + '-LMS');

    lockManagementService.getCharacteristic(this.platform.Characteristic.LockControlPoint)
      .onSet(this.setLockControlPoint.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.Version)
      .onGet(this.getVersion.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.LockManagementAutoSecurityTimeout)
      .onSet(this.setLockManagementAutoSecurityTimeout.bind(this))
      .onGet(this.getLockManagementAutoSecurityTimeout.bind(this))
      .setProps({
        minValue: 0,
        maxValue: 3600,
        minStep: 1,
        unit: Units.SECONDS,
      });
    lockManagementService.getCharacteristic(this.platform.Characteristic.LockLastKnownAction)
      .onGet(this.getLockLastKnownAction.bind(this));
  }

  // Handlers

  async getLockCurrentState(): Promise<CharacteristicValue> {
    const lockState = this.states.LockCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current State: ${Lock.getStateName(lockState)}`);

    return lockState;
  }

  async setLockTargetState(value: CharacteristicValue) {
    this.states.LockTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target State: ${Lock.getStateName(this.states.LockTargetState)}`);

    this.states.LockCurrentState = this.states.LockTargetState;
    this.service!.setCharacteristic(this.platform.Characteristic.LockCurrentState, (this.states.LockCurrentState));

    this.states.LockLastKnownAction = (this.states.LockCurrentState === Lock.SECURED) ?
      Lock.SECURED_REMOTELY :
      Lock.UNSECURED_REMOTELY;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current State: ${Lock.getStateName(this.states.LockCurrentState)}`);

    // Run auto lock timeout
    this.startAutoSecurityTimeout();
  }

  async getLockTargetState(): Promise<CharacteristicValue> {
    const lockState = this.states.LockTargetState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target State: ${Lock.getStateName(lockState)}`);

    return lockState;
  }

  // Lock Management Service handlers

  async setLockControlPoint(value: CharacteristicValue) {
    const lockControlPoint = value;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Control Point: ${lockControlPoint}`);
  }

  async getVersion(): Promise<CharacteristicValue> {
    const version = '1.0.0';

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Management Version: ${version}`);

    return version;
  }

  async setLockManagementAutoSecurityTimeout(value: CharacteristicValue) {
    this.states.LockManagementAutoSecurityTimeout = value as number;

    // eslint-disable-next-line max-len
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Management Auto Security Timeout: ${this.states.LockManagementAutoSecurityTimeout}`);
  }

  async getLockManagementAutoSecurityTimeout(): Promise<CharacteristicValue> {
    const lockManagementAutoSecurityTimeout = this.states.LockManagementAutoSecurityTimeout;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Management Auto Security Timeout: ${lockManagementAutoSecurityTimeout}`);

    return lockManagementAutoSecurityTimeout;
  }

  async getLockLastKnownAction(): Promise<CharacteristicValue> {
    const lockLastKnownAction = this.states.LockLastKnownAction;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Last Known Action: ${lockLastKnownAction}`);

    return lockLastKnownAction;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.LockCurrentState,
      [this.securityTimeoutStorageKey]: this.states.LockManagementAutoSecurityTimeout,
      [this.lastKnownAction]: this.states.LockLastKnownAction,
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return Lock.ACCESSORY_TYPE_NAME;
  }

  static getStateName(state: number): string {
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

  private startAutoSecurityTimeout(): void {
    if (this.states.LockTargetState !== this.defaultState && this.states.LockManagementAutoSecurityTimeout > 0) {
      const securityTimeoutMillis: number = this.states.LockManagementAutoSecurityTimeout * 1000;
      this.securityTimerId = setTimeout(() => {
        // Reset timer
        clearTimeout(this.securityTimerId);

        this.service!.setCharacteristic(this.platform.Characteristic.LockTargetState, (this.defaultState));

        this.states.LockLastKnownAction = Lock.SECURED_BY_AUTO_SECURE_TIMEOUT;
      }, securityTimeoutMillis);
 
      const timeout: string = Utils.secondsToHHmmss(this.states.LockManagementAutoSecurityTimeout);
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Security Timeout in ${timeout}`);
    }
    else {
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] No Security Timeout defined`);
    }
  }
}
