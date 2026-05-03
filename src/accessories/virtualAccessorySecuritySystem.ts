/* eslint-disable brace-style */
 
import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { InvalidSensorValueType, SensorValueUpdateNotAllowed } from '../errors.js';
import { SecuritySystemState } from '../configuration/schema.js';
import { TriggerableAlarm } from './triggerableAlarm.js';
import { Timer } from '../utils/timer.js';
import { SecuritySystemCurrentState, SecuritySystemTargetState } from './accessoryCharacteristics.js';

/**
 * SecuritySystem - Accessory implementation
 */
export class SecuritySystem extends Accessory<typeof Service.SecuritySystem> implements TriggerableAlarm {

  private static readonly ACCESSORY_TYPE_NAME: string = 'SecuritySystem';

  private readonly stateStorageKey: string = 'SecuritySystemState';

  private awayArmingDelayTimer: Timer;

  // Device states
  private CurrentState: number = SecuritySystemCurrentState.DISARMED;
  private TargetState: number = SecuritySystemTargetState.DISARMED;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.SecuritySystem,
      SecuritySystem.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    switch (this.accessoryConfiguration.securitySystem.defaultState) {
    case SecuritySystemState.ArmedStay:
      this.defaultState = SecuritySystemCurrentState.STAY_ARM;
      break;
    case SecuritySystemState.ArmedAway:
      this.defaultState = SecuritySystemCurrentState.AWAY_ARM;
      break;
    case SecuritySystemState.ArmedNight:
      this.defaultState = SecuritySystemCurrentState.NIGHT_ARM;
      break;
    case SecuritySystemState.Disarmed:
      this.defaultState = SecuritySystemCurrentState.DISARMED;
      break;
    case SecuritySystemState.AlarmTriggered:
      this.defaultState = SecuritySystemCurrentState.ALARM_TRIGGERED;
      break;
    default:
      this.defaultState = SecuritySystemCurrentState.DISARMED;
    }

    this.CurrentState = this.defaultState;

    // Timer is not resettable
    const timerIsResettable: boolean = false;
    this.awayArmingDelayTimer = new Timer(
      this.accessoryName,
      this.log,
      timerIsResettable,
    );

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.CurrentState = cachedState;
      }
    }

    this.TargetState = this.CurrentState;

    this.setSecurityServiceProperties(this.service!);

    // Update the initial state of the accessory
     
    this.log.debug(`[${this.accessoryName}] Setting Security System Current State: ${SecuritySystemCurrentState.getName(this.CurrentState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, (this.CurrentState));
    this.service.updateCharacteristic(this.platform.Characteristic.SecuritySystemTargetState, (this.TargetState));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState)
      .onGet(this.getSecuritySystemCurrentState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState)
      .onSet(this.setSecuritySystemTargetState.bind(this))
      .onGet(this.getSecuritySystemTargetState.bind(this));
  }

  // Handlers

  async getSecuritySystemCurrentState(): Promise<CharacteristicValue> {
    const securitySystemState = this.CurrentState;

    this.log.debug(`[${this.accessoryName}] Getting Current State: ${SecuritySystemCurrentState.getName(securitySystemState)}`);

    return securitySystemState;
  }

  async setSecuritySystemTargetState(value: CharacteristicValue) {
    this.TargetState = value as number;

    this.log.info(`[${this.accessoryName}] Setting Target State: ${SecuritySystemTargetState.getName(this.TargetState)}`);

    // No delay when disarming or switching betweem armed modes
    const delayTime: number = (this.TargetState === SecuritySystemTargetState.AWAY_ARM) ?
      this.accessoryConfiguration.securitySystem.awayArmingDelay :
      0;
     
    this.log.debug(`[${this.accessoryName}] Target State: ${SecuritySystemTargetState.getName(this.TargetState)} - Delay timer: ${delayTime}`);

    // Stop timer in case it's running
    this.awayArmingDelayTimer.stop();

    this.awayArmingDelayTimer.start(
      () => {
        this.CurrentState = this.TargetState;
        this.service!.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, (this.CurrentState));

         
        this.log.info(`[${this.accessoryName}] Setting Current State: ${SecuritySystemCurrentState.getName(this.CurrentState)}`);

        this.storeState();
      },
      delayTime,
    );
  }

  async getSecuritySystemTargetState(): Promise<CharacteristicValue> {
    const securitySystemState = this.TargetState;

    this.log.debug(`[${this.accessoryName}] Getting Target State: ${SecuritySystemTargetState.getName(securitySystemState)}`);

    return securitySystemState;
  }

  //

  protected override getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.CurrentState,
    });
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
      names.add(SecuritySystemCurrentState.getName(value));
    });

    return Array.from(names).join(', ');
  }

  // Triggerable Alarm interface

  triggerAlarm(value: number, accessoryId: string): void {
    this.log.debug(`[${this.accessoryName}] Request update triggered state to ${SecurityServiceTriggerType.getName(value)}`);

    if (accessoryId !== this.accessoryId) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new SensorValueUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }
    else if (typeof value !== 'number' || !SecurityServiceTriggerType.isValid(value)) {
      this.log.error(`[${this.accessoryName}] Value ${value} is not valid for a Security System triggered state`);

      throw new InvalidSensorValueType(`Invalid sensor value: ${value}`);
    }

    if (value === SecurityServiceTriggerType.TriggerPanic ||
       (value === SecurityServiceTriggerType.TriggerAlarm && this.CurrentState !== SecuritySystemCurrentState.DISARMED)
    ) {
      this.CurrentState = SecuritySystemCurrentState.ALARM_TRIGGERED;
      this.service!.setCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState, (this.CurrentState));

      this.log.info(`[${this.accessoryName}] Updating triggered state to ${SecurityServiceTriggerType.getName(value)}`);
    }
    else {
      this.log.debug(`[${this.accessoryName}] Current state: ${SecuritySystemCurrentState.getName(this.CurrentState)}`);
      this.log.debug(`[${this.accessoryName}] Not updating triggered state to ${SecurityServiceTriggerType.getName(value)}`);
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
