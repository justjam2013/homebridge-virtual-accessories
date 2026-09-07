/* eslint-disable brace-style */
 
import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
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

  private readonly stateStorageKey: string = 'SecuritySystemState';

  private awayArmingDelayTimer: Timer;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.SecuritySystem);

    let SecuritySystemCurrentState: number = SecuritySystem.DISARMED;
    let SecuritySystemTargetState: number = SecuritySystem.DISARMED;

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

    SecuritySystemCurrentState = this.defaultState;

    // Timer is not resettable
    const timerIsResettable: boolean = false;
    this.awayArmingDelayTimer = new Timer(
      this.accessoryName,
      this.log,
      timerIsResettable,
    );

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        SecuritySystemCurrentState = cachedState;
      }
    }

    SecuritySystemTargetState = SecuritySystemCurrentState;

    this.setSecurityServiceProperties(this.service!);

    // Update the initial state of the accessory
    this.setSecuritySystemCurrentState(SecuritySystemCurrentState);
    this.setSecuritySystemTargetState(SecuritySystemTargetState);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.SecuritySystemCurrentState)
      .onGet(this.getSecuritySystemCurrentStateHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.SecuritySystemTargetState)
      .onSet(this.setSecuritySystemTargetStateHandler.bind(this))
      .onGet(this.getSecuritySystemTargetStateHandler.bind(this));
  }

  //
  // ****************************** Handlers ******************************
  //

  // SecuritySystemCurrentState

  async getSecuritySystemCurrentStateHandler(): Promise<CharacteristicValue> {
    const SecuritySystemCurrentState: number = this.getSecuritySystemCurrentState();
    this.log.debug(`[${this.accessoryName}] Getting Current State: ${SecuritySystem.getStateName(SecuritySystemCurrentState)}`);

    return SecuritySystemCurrentState;
  }

  // SecuritySystemTargetState

  async getSecuritySystemTargetStateHandler(): Promise<CharacteristicValue> {
    const SecuritySystemTargetState: number = this.getSecuritySystemTargetState();
    this.log.debug(`[${this.accessoryName}] Getting Target State: ${SecuritySystem.getStateName(SecuritySystemTargetState)}`);

    return SecuritySystemTargetState;
  }

  async setSecuritySystemTargetStateHandler(value: CharacteristicValue) {
    let SecuritySystemTargetState: number = value as number;
    SecuritySystemTargetState = this.updateSecuritySystemTargetState(SecuritySystemTargetState);

    this.log.info(`[${this.accessoryName}] Setting Target State: ${SecuritySystem.getStateName(SecuritySystemTargetState)}`);

    // No delay when disarming or switching betweem armed modes
    const delayTime: number = (SecuritySystemTargetState === SecuritySystem.AWAY_ARM) ?
      this.accessoryConfiguration.securitySystem.awayArmingDelay :
      0;
    this.log.debug(`[${this.accessoryName}] Target State: ${SecuritySystem.getStateName(SecuritySystemTargetState)} - Delay timer: ${delayTime}`);

    // Stop timer in case it's running
    this.awayArmingDelayTimer.stop();

    this.awayArmingDelayTimer.start(
      () => {
        const SecuritySystemCurrentState: number = SecuritySystemTargetState;
        this.updateSecuritySystemCurrentState(SecuritySystemCurrentState);
        this.log.info(`[${this.accessoryName}] Setting Current State: ${SecuritySystem.getStateName(SecuritySystemCurrentState)}`);

        this.saveState();
      },
      delayTime,
    );
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getSecuritySystemCurrentState(),
    };

    const json = JSON.stringify(jsonState);
    return json;
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

      this.log.debug(`[${this.accessoryName}] Night Arm is not an available armed mode`);
    }

    if (currentStateValues.size > 0) {
      this.log.debug(`[${this.accessoryName}] Setting Current State values: ${this.generatePropertyValueList(currentStateValues)}`);

      service.getCharacteristic(SecuritySystemCurrentState)
        .setProps({
          validValues: Array.from(currentStateValues),
        });

       
      this.log.debug(`[${this.accessoryName}] Current State Props: ${JSON.stringify(service.getCharacteristic(SecuritySystemCurrentState).props)}`);
    }
    if (targetStateValues.size > 0) {
      this.log.debug(`[${this.accessoryName}] Setting Target State values: ${this.generatePropertyValueList(targetStateValues)}`);

      service.getCharacteristic(SecuritySystemTargetState)
        .setProps({
          validValues: Array.from(targetStateValues),
        });

       
      this.log.debug(`[${this.accessoryName}] Target State Props: ${JSON.stringify(service.getCharacteristic(SecuritySystemTargetState).props)}`);
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
    this.log.debug(`[${this.accessoryName}] Request update triggered state to ${SecurityServiceTriggerType.getName(value)}`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number' || !SecurityServiceTriggerType.isValid(value)) {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for a Security System triggered state`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }

    let SecuritySystemCurrentState: number = this.getSecuritySystemCurrentState();
    if (value === SecurityServiceTriggerType.TriggerPanic ||
       (value === SecurityServiceTriggerType.TriggerAlarm && SecuritySystemCurrentState !== SecuritySystem.DISARMED)
    ) {
      SecuritySystemCurrentState = SecuritySystem.ALARM_TRIGGERED;
      this.updateSecuritySystemCurrentState(SecuritySystemCurrentState);
      this.log.info(`[${this.accessoryName}] Updating triggered state to ${SecurityServiceTriggerType.getName(value)}`);
    }
    else {
      this.log.debug(`[${this.accessoryName}] Current state: ${SecuritySystem.getStateName(SecuritySystemCurrentState)}`);
      this.log.debug(`[${this.accessoryName}] Not updating triggered state to ${SecurityServiceTriggerType.getName(value)}`);
    }
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly STAY_ARM: number =            CharacteristicType.SecuritySystemCurrentState.STAY_ARM;
  static readonly AWAY_ARM: number =            CharacteristicType.SecuritySystemCurrentState.AWAY_ARM;
  static readonly NIGHT_ARM: number =           CharacteristicType.SecuritySystemCurrentState.NIGHT_ARM;
  static readonly DISARMED: number =            CharacteristicType.SecuritySystemCurrentState.DISARMED;
  static readonly ALARM_TRIGGERED: number =     CharacteristicType.SecuritySystemCurrentState.ALARM_TRIGGERED;

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
