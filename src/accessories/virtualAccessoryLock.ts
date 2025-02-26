import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

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

  static readonly AUDIO_FEEDBACK_ON: boolean = true;
  static readonly AUDIO_FEEDBACK_OFF: boolean = false;

  private readonly stateStorageKey: string = 'LockState';
  private readonly audioFeedbackStorageKey: string = 'LockAudioFeedback';
  private readonly securityTimeoutStorageKey: string = 'LockAutoSecurityTimeout';

  private securityTimerId: ReturnType<typeof setTimeout> | undefined;

  private states = {
    LockCurrentState: Lock.SECURED,
    LockTargetState: Lock.SECURED,
    LockManagementAudioFeedback: Lock.AUDIO_FEEDBACK_OFF,
    LockManagementAutoSecurityTimeout: 0,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.lock.defaultState === 'unlocked' ? Lock.UNSECURED : Lock.SECURED;
    // eslint-disable-next-line max-len
    const audioFeedback = (this.accessoryConfiguration.lock.hasAudioFeedback !== undefined) ? this.accessoryConfiguration.lock.hasAudioFeedback : Lock.AUDIO_FEEDBACK_OFF;
    const autoSecurityTimeout = this.accessoryConfiguration.lock.autoSecurityTimeout;

    this.states.LockCurrentState = this.defaultState;
    this.states.LockManagementAudioFeedback = audioFeedback;
    this.states.LockManagementAutoSecurityTimeout = autoSecurityTimeout;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;
      const cachedAudioFeedback: boolean = accessoryState[this.audioFeedbackStorageKey] as boolean;
      const cachedSecurityTimeout: number = accessoryState[this.securityTimeoutStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.LockCurrentState = cachedState;
      }
      if (cachedAudioFeedback !== undefined) {
        this.states.LockManagementAudioFeedback = cachedAudioFeedback;
      }
      if (cachedSecurityTimeout !== undefined) {
        this.states.LockManagementAutoSecurityTimeout = cachedSecurityTimeout;
      }
    }

    this.states.LockTargetState = this.states.LockCurrentState;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.HardwareFinish, this.accessoryConfiguration.lock.hardwareFinish);

    this.service = this.accessory.getService(this.platform.Service.LockMechanism) || this.accessory.addService(this.platform.Service.LockMechanism);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Current State: ${Lock.getStateName(this.states.LockCurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, (this.states.LockCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, (this.states.LockTargetState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.LockCurrentState)
      .onGet(this.handleLockCurrentStateGet.bind(this)); // GET - bind to the 'handleLockCurrentStateGet` method below

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
    nfcAccessService.getCharacteristic(this.platform.Characteristic.NFCAccessControlPoint)
      .onGet(this.handleNFCAccessControlPointGet.bind(this));
    nfcAccessService.getCharacteristic(this.platform.Characteristic.NFCAccessSupportedConfiguration)
      .onGet(this.handleNFCAccessSupportedConfigurationGet.bind(this));

    // Creating Lock Management service
    const lockManagementServiceName = 'Lock Management';
    const lockManagementService = this.accessory.getService(lockManagementServiceName)
      || this.accessory.addService(this.platform.Service.LockManagement, lockManagementServiceName, this.accessory.UUID + '-LMS');

    lockManagementService.getCharacteristic(this.platform.Characteristic.LockControlPoint)
      .onSet(this.handleLockControlPointSet.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.Version)
      .onGet(this.handleVersionGet.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.AudioFeedback)
      .onSet(this.handleAudioFeedbackSet.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.AudioFeedback)
      .onGet(this.handleAudioFeedbackGet.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.LockManagementAutoSecurityTimeout)
      .onSet(this.handleLockManagementAutoSecurityTimeoutSet.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.LockManagementAutoSecurityTimeout)
      .onGet(this.handleLockManagementAutoSecurityTimeoutGet.bind(this));
  }

  /**
   * Handle "GET" requests from HomeKit
   */
  async handleLockCurrentStateGet() {
    const lockState = this.states.LockCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current State: ${Lock.getStateName(lockState)}`);

    return lockState;
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  async handleLockTargetStateSet(value: CharacteristicValue) {
    this.states.LockTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target State: ${Lock.getStateName(this.states.LockTargetState)}`);

    this.states.LockCurrentState = this.states.LockTargetState;
    this.service!.setCharacteristic(this.platform.Characteristic.LockCurrentState, (this.states.LockCurrentState));

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current State: ${Lock.getStateName(this.states.LockCurrentState)}`);

    if (this.states.LockTargetState !== this.defaultState && this.states.LockManagementAutoSecurityTimeout > 0) {
      const securityTimeoutMillis: number = this.states.LockManagementAutoSecurityTimeout * 1000;
      this.securityTimerId = setTimeout(() => {
        // Reset timer
        clearTimeout(this.securityTimerId);

        this.service!.setCharacteristic(this.platform.Characteristic.LockTargetState, (this.defaultState));

      }, securityTimeoutMillis);
 
      const timeout: string = Utils.secondsToHHmmss(this.states.LockManagementAutoSecurityTimeout);
      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Security Timeout in ${timeout}`);
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   */
  async handleLockTargetStateGet(): Promise<CharacteristicValue> {
    const lockState = this.states.LockTargetState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target State: ${Lock.getStateName(lockState)}`);

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

  async handleNFCAccessControlPointGet(): Promise<CharacteristicValue> {
    const nfcAccessControlPoint = '';

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting NFC Access Control Point: ${nfcAccessControlPoint}`);

    return nfcAccessControlPoint;
  }

  async handleNFCAccessSupportedConfigurationGet(): Promise<CharacteristicValue> {
    const nFCAccessSupportedConfiguration = 'AQEQAgEQ';

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting NFC Access Supported Configuration: ${nFCAccessSupportedConfiguration}`);

    return nFCAccessSupportedConfiguration;
  }

  // Lock Management Service handlers

  async handleLockControlPointSet(value: CharacteristicValue) {
    const lockControlPoint = value;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Control Point: ${lockControlPoint}`);
  }

  async handleVersionGet(): Promise<CharacteristicValue> {
    const version = '1.0.0';

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Management Version: ${version}`);

    return version;
  }

  async handleAudioFeedbackSet(value: CharacteristicValue) {
    this.states.LockManagementAudioFeedback = value as boolean;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Management Audio Feedback: ${this.states.LockManagementAudioFeedback}`);
  }

  async handleAudioFeedbackGet() {
    const audioFeedback = this.states.LockManagementAudioFeedback;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Management Audio Feedback: ${audioFeedback}`);

    return audioFeedback;
  }

  async handleLockManagementAutoSecurityTimeoutSet(value: CharacteristicValue) {
    this.states.LockManagementAutoSecurityTimeout = value as number;

    // eslint-disable-next-line max-len
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Management Auto Security Timeout: ${this.states.LockManagementAutoSecurityTimeout}`);
  }

  async handleLockManagementAutoSecurityTimeoutGet() {
    const lockManagementAutoSecurityTimeout = this.states.LockManagementAutoSecurityTimeout;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Management Auto Security Timeout: ${lockManagementAutoSecurityTimeout}`);

    return lockManagementAutoSecurityTimeout;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.LockCurrentState,
      [this.audioFeedbackStorageKey]: this.states.LockManagementAudioFeedback,
      [this.securityTimeoutStorageKey]: this.states.LockManagementAutoSecurityTimeout,
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
}
