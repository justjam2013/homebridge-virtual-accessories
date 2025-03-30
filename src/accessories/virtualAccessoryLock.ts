// https://github.com/KhaosT/HAP-NodeJS/commit/80cdb1535f5bee874cc06657ef283ee91f258815

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

  // https://github.com/kupa22/apple-homekey?tab=readme-ov-file#characteristic-hardware-finish
  static readonly TAN_FINISH: string = 'AQTO1doA';
  static readonly GOLD_FINISH: string = 'AQSq1uwA';
  static readonly SILVER_FINISH: string = 'AQTj4+MA';
  static readonly BLACK_FINISH: string = 'AQQAAAAA';
  static readonly DEFAULT_FINISH: string = Lock.TAN_FINISH;

  static readonly AUDIO_FEEDBACK_ON: boolean = true;
  static readonly AUDIO_FEEDBACK_OFF: boolean = false;

  private readonly stateStorageKey: string = 'LockState';
  private readonly audioFeedbackStorageKey: string = 'LockAudioFeedback';
  private readonly securityTimeoutStorageKey: string = 'LockAutoSecurityTimeout';

  private securityTimerId: ReturnType<typeof setTimeout> | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private nfcAccessControlPoint: any = '';

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
     
    const audioFeedback = Lock.AUDIO_FEEDBACK_OFF;
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
      .setCharacteristic(this.platform.Characteristic.HardwareFinish, this.getHardwareFinish(this.accessoryConfiguration.lock.hardwareFinish));

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
    const lockManagementServiceName = 'Lock Management';
    const lockManagementService = this.accessory.getService(lockManagementServiceName)
      || this.accessory.addService(this.platform.Service.LockManagement, lockManagementServiceName, this.accessory.UUID + '-LMS');

    lockManagementService.getCharacteristic(this.platform.Characteristic.LockControlPoint)
      .onSet(this.setLockControlPoint.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.Version)
      .onGet(this.getVersion.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.AudioFeedback)
      .onSet(this.setAudioFeedback.bind(this))
      .onGet(this.getAudioFeedback.bind(this));
    lockManagementService.getCharacteristic(this.platform.Characteristic.LockManagementAutoSecurityTimeout)
      .onSet(this.setLockManagementAutoSecurityTimeout.bind(this))
      .onGet(this.getLockManagementAutoSecurityTimeout.bind(this));
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

  async setAudioFeedback(value: CharacteristicValue) {
    this.states.LockManagementAudioFeedback = value as boolean;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Lock Management Audio Feedback: ${this.states.LockManagementAudioFeedback}`);
  }

  async getAudioFeedback(): Promise<CharacteristicValue> {
    const audioFeedback = this.states.LockManagementAudioFeedback;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Lock Management Audio Feedback: ${audioFeedback}`);

    return audioFeedback;
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

  private getHardwareFinish(color: string) {
    let finish: string;

    switch (color) {
    case undefined: { finish = Lock.DEFAULT_FINISH; break; }
    case 'tan': { finish = Lock.TAN_FINISH; break; }
    case 'gold': { finish = Lock.GOLD_FINISH; break; }
    case 'silver': { finish = Lock.SILVER_FINISH; break; }
    case 'black': { finish = Lock.BLACK_FINISH; break; }
    default: { finish = Lock.DEFAULT_FINISH; }
    }

    return finish;
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
