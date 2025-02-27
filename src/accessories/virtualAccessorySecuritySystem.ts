import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * SecuritySystem - Accessory implementation
 */
export class SecuritySystem extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'SecuritySystem';

  static readonly STAY_ARM: number = 0;         // Characteristic.SecuritySystemCurrentState.STAY_ARM;
  static readonly AWAY_ARM: number = 1;         // Characteristic.SecuritySystemCurrentState.AWAY_ARM;
  static readonly NIGHT_ARM: number = 2;        // Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
  static readonly DISARMED: number = 3;         // Characteristic.SecuritySystemCurrentState.DISARMED;
  static readonly ALARM_TRIGGERED: number = 4;  // Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;

  private readonly stateStorageKey: string = 'SecuritySystemState';

  private states = {
    SecuritySystemCurrentState: SecuritySystem.DISARMED,
    SecuritySystemTargetState: SecuritySystem.DISARMED,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    switch (this.accessoryConfiguration.securitySystem.defaultState) {
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

    this.service = this.accessory.getService(this.platform.Service.SecuritySystem) || this.accessory.addService(this.platform.Service.SecuritySystem);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    // eslint-disable-next-line max-len
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Security System Current State: ${SecuritySystem.getStateName(this.states.SecuritySystemCurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, (this.states.SecuritySystemCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.SecuritySystemTargetState, (this.states.SecuritySystemTargetState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState)
      .onGet(this.handleSecuritySystemCurrentStateGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .onSet(this.handleSecuritySystemTargetStateSet.bind(this))
      .onGet(this.handleSecuritySystemTargetStateGet.bind(this));
  }

  /**
   * Handle "GET" requests from HomeKit
   */
  async handleSecuritySystemCurrentStateGet(): Promise<CharacteristicValue> {
    const securitySystemState = this.states.SecuritySystemCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current State: ${SecuritySystem.getStateName(securitySystemState)}`);

    return securitySystemState;
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  async handleSecuritySystemTargetStateSet(value: CharacteristicValue) {
    this.states.SecuritySystemTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target State: ${SecuritySystem.getStateName(this.states.SecuritySystemTargetState)}`);

    this.states.SecuritySystemCurrentState = this.states.SecuritySystemTargetState;
    this.service!.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, (this.states.SecuritySystemCurrentState));

    this.storeState();

    // eslint-disable-next-line max-len
    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current State: ${SecuritySystem.getStateName(this.states.SecuritySystemCurrentState)}`);
  }

  /**
   * Handle the "GET" requests from HomeKit
   */
  async handleSecuritySystemTargetStateGet(): Promise<CharacteristicValue> {
    const securitySystemState = this.states.SecuritySystemTargetState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Target State: ${SecuritySystem.getStateName(securitySystemState)}`);

    return securitySystemState;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.SecuritySystemCurrentState,
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return SecuritySystem.ACCESSORY_TYPE_NAME;
  }

  static getStateName(state: number): string {
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
