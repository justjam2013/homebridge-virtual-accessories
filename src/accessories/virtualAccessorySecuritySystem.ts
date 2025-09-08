/* eslint-disable brace-style */
 
import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { SecuritySystemState } from '../configuration/schema.js';
import { TriggerableAlarm } from './triggerableAlarm.js';
import { Timer } from '../utils/timer.js';

/**
 * SecuritySystem - Accessory implementation
 */
export class SecuritySystem extends Accessory implements TriggerableAlarm {

  static readonly ACCESSORY_TYPE_NAME: string = 'SecuritySystem';

  static readonly STAY_ARM: number = 0;         // Characteristic.SecuritySystemCurrentState.STAY_ARM
  static readonly AWAY_ARM: number = 1;         // Characteristic.SecuritySystemCurrentState.AWAY_ARM
  static readonly NIGHT_ARM: number = 2;        // Characteristic.SecuritySystemCurrentState.NIGHT_ARM
  static readonly DISARMED: number = 3;         // Characteristic.SecuritySystemCurrentState.DISARMED
  static readonly ALARM_TRIGGERED: number = 4;  // Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED

  private readonly stateStorageKey: string = 'SecuritySystemState';

  private awayArmingDelayTimer: Timer;

  private states = {
    SecuritySystemCurrentState: SecuritySystem.DISARMED,
    SecuritySystemTargetState: SecuritySystem.DISARMED,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    switch (this.accessoryConfiguration.securitySystem.defaultState) {
    case SecuritySystemState.ArmedStay:
      this.defaultState = SecuritySystem.STAY_ARM;
      break;
    case SecuritySystemState.ArmedAway:
      this.defaultState = SecuritySystem.AWAY_ARM;
      break;
    case SecuritySystemState.ArmedNight:
      this.defaultState = SecuritySystem.NIGHT_ARM;
      break;
    case SecuritySystemState.Disarmed:
      this.defaultState = SecuritySystem.DISARMED;
      break;
    case SecuritySystemState.AlarmTriggered:
      this.defaultState = SecuritySystem.ALARM_TRIGGERED;
      break;
    default:
      this.defaultState = SecuritySystem.DISARMED;
    }

    this.states.SecuritySystemCurrentState = this.defaultState;

    // Timer is not resettable
    const timerIsResettable: boolean = false;
    this.awayArmingDelayTimer = new Timer(
      this.accessoryConfiguration.accessoryName,
      this.log,
      timerIsResettable,
    );

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

    this.setSecurityServiceProperties(this.service!);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    // eslint-disable-next-line max-len
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Security System Current State: ${SecuritySystem.getStateName(this.states.SecuritySystemCurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, (this.states.SecuritySystemCurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.SecuritySystemTargetState, (this.states.SecuritySystemTargetState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState)
      .onGet(this.getSecuritySystemCurrentState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .onSet(this.setSecuritySystemTargetState.bind(this))
      .onGet(this.getSecuritySystemTargetState.bind(this));
  }

  // Handlers

  async getSecuritySystemCurrentState(): Promise<CharacteristicValue> {
    const securitySystemState = this.states.SecuritySystemCurrentState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Current State: ${SecuritySystem.getStateName(securitySystemState)}`);

    return securitySystemState;
  }

  async setSecuritySystemTargetState(value: CharacteristicValue) {
    this.states.SecuritySystemTargetState = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Target State: ${SecuritySystem.getStateName(this.states.SecuritySystemTargetState)}`);

    // No delay when disarming or switching betweem armed modes
    const delayTime: number = (this.states.SecuritySystemTargetState === SecuritySystem.AWAY_ARM) ?
      this.accessoryConfiguration.securitySystem.awayArmingDelay :
      0;
    this.awayArmingDelayTimer.start(
      () => {
        this.states.SecuritySystemCurrentState = this.states.SecuritySystemTargetState;
        this.service!.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, (this.states.SecuritySystemCurrentState));

        // eslint-disable-next-line max-len
        this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Current State: ${SecuritySystem.getStateName(this.states.SecuritySystemCurrentState)}`);

        this.storeState();
      },
      delayTime,
    );
  }

  async getSecuritySystemTargetState(): Promise<CharacteristicValue> {
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

  /**
   * Ensure all the property values are set, then remove as required
   */
  private setSecurityServiceProperties(
    service: Service,
  ) {
    const SecuritySystemCurrentState = this.platform.Characteristic.SecuritySystemCurrentState;
    const SecuritySystemTargetState = this.platform.Characteristic.SecuritySystemTargetState;

    const currentStateValues: Set<number> = new Set([
      SecuritySystemCurrentState.STAY_ARM,
      SecuritySystemCurrentState.AWAY_ARM,
      SecuritySystemCurrentState.NIGHT_ARM,
      SecuritySystemCurrentState.DISARMED,
      SecuritySystemCurrentState.ALARM_TRIGGERED,
      // 5, ... 255 Reserved
    ]);
    const targetStateValues: Set<number> = new Set([
      SecuritySystemTargetState.STAY_ARM,
      SecuritySystemTargetState.AWAY_ARM,
      SecuritySystemTargetState.NIGHT_ARM,
      SecuritySystemTargetState.DISARM,
      // 4, ... 255 Reserved
    ]);

    if (!this.accessoryConfiguration.securitySystem.hasNightMode) {
      currentStateValues.delete(SecuritySystemCurrentState.NIGHT_ARM);
      targetStateValues.delete(SecuritySystemTargetState.NIGHT_ARM);

      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Night Arm is not an available armed mode`);
    }

    if (currentStateValues.size > 0) {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Current State values: ${this.generatePropertyValueList(currentStateValues)}`);

      service.getCharacteristic(SecuritySystemCurrentState)
        .setProps({
          validValues: Array.from(currentStateValues),
        });

      // eslint-disable-next-line max-len
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Current State Props: ${JSON.stringify(service.getCharacteristic(SecuritySystemCurrentState).props)}`);
    }
    if (targetStateValues.size > 0) {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Target State values: ${this.generatePropertyValueList(targetStateValues)}`);

      service.getCharacteristic(SecuritySystemTargetState)
        .setProps({
          validValues: Array.from(targetStateValues),
        });

      // eslint-disable-next-line max-len
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Target State Props: ${JSON.stringify(service.getCharacteristic(SecuritySystemTargetState).props)}`);
    }
  }

  private generatePropertyValueList(
    values: Set<number>,
  ): string {
    const names: Set<string> = new Set();
    values.forEach((value) => {
      names.add(SecuritySystem.getStateName(value));
    });

    return Array.from(names).join(', ');
  }

  // Triggerable Alarm interface

  triggerAlarm(value: number, accessoryId: string): void {
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Request update triggered state to ${SecurityServiceTriggerType.getName(value)}`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number' || !SecurityServiceTriggerType.isValid(value)) {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Value ${value} is not valid for a Security System triggered state`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }

    if (value === SecurityServiceTriggerType.TriggerPanic ||
       (value === SecurityServiceTriggerType.TriggerAlarm && this.states.SecuritySystemCurrentState !== SecuritySystem.DISARMED)
    ) {
      this.states.SecuritySystemCurrentState = SecuritySystem.ALARM_TRIGGERED;
      this.service!.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, (this.states.SecuritySystemCurrentState));

      this.log.info(`[${this.accessoryConfiguration.accessoryName}] Updating triggered state to ${SecurityServiceTriggerType.getName(value)}`);
    }
    else {
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Current state: ${SecuritySystem.getStateName(this.states.SecuritySystemCurrentState)}`);
      this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Not updating triggered state to ${SecurityServiceTriggerType.getName(value)}`);
    }
  }
}

export class SecurityServiceTriggerType {

  static None: number = 0;
  static TriggerAlarm: number = 1;
  static TriggerPanic: number = 2;

  static isValid(value: number) {
    return (
      value === SecurityServiceTriggerType.None ||
      value === SecurityServiceTriggerType.TriggerAlarm ||
      value === SecurityServiceTriggerType.TriggerPanic
    );
  }

  static getName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case SecurityServiceTriggerType.None: { name = 'NONE'; break; }
    case SecurityServiceTriggerType.TriggerAlarm: { name = 'TRIGGER ALARM'; break; }
    case SecurityServiceTriggerType.TriggerPanic: { name = 'TRIGGER PANIC'; break; }
    default: { name = state.toString(); }
    }

    return name;
  }
}
