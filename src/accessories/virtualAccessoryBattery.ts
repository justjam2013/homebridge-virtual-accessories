/* eslint-disable brace-style */

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { UpdatableCharging } from './updatableChargingState.js';
import { ChargingStateUpdateNotAllowed, InvalidChargingStateType } from '../errors.js';

/**
 * Battery - Accessory implementation
 */
export class Battery extends Accessory implements UpdatableCharging {

  static readonly ACCESSORY_TYPE_NAME: string = 'Battery';

  static BATTERY_LEVEL_NORMAL: number;  // Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
  static BATTERY_LEVEL_LOW: number;     // Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW

  static NOT_CHARGING: number;          // Characteristic.ChargingState.NOT_CHARGING
  static CHARGING: number;              // Characteristic.ChargingState.CHARGING
  static NOT_CHARGEABLE: number;        // Characteristic.ChargingState.NOT_CHARGEABLE

  private readonly batteryLevelStorageKey: string = 'BatteryLevel';
  private readonly chargingStateStorageKey: string = 'ChargingState';

  private lowLevelThreshold: number;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    this.setupStaticFields();

    // First configure the device based on the accessory details
    let ChargingState = this.accessoryConfiguration.battery.isRechargeable ? Battery.NOT_CHARGING : Battery.NOT_CHARGEABLE;
    this.lowLevelThreshold = this.accessoryConfiguration.battery.lowLevelThreshold;

    let BatteryLevel = 100;
    let StatusLowBattery = Battery.BATTERY_LEVEL_NORMAL;

    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedBatteryLevel = accessoryState[this.batteryLevelStorageKey] as number;
      const cachedChargingState = accessoryState[this.chargingStateStorageKey] as number;

      if (cachedBatteryLevel !== undefined) {
        BatteryLevel = cachedBatteryLevel;
        StatusLowBattery = (BatteryLevel <= this.lowLevelThreshold) ? Battery.BATTERY_LEVEL_LOW : Battery.BATTERY_LEVEL_NORMAL;
      }

      if (cachedChargingState !== undefined) {
        ChargingState = cachedChargingState;
      }
    }

    this.service = this.accessory.getService(ServiceType.Battery) || this.accessory.addService(ServiceType.Battery);

    this.service.setCharacteristic(CharacteristicType.Name, this.accessoryName);

    this.updateChargingState(ChargingState);
    this.updateBatteryLevel(BatteryLevel);
    this.updateStatusLowBattery(StatusLowBattery);

    this.service.getCharacteristic(CharacteristicType.StatusLowBattery)
      .onGet(this.getStatusLowBatteryHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.BatteryLevel)
      .onGet(this.getBatteryLevelHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.ChargingState)
      .onGet(this.getChargingStateHandler.bind(this));
  }

  // *** Handlers ***

  // StatusLowBattery

  async getStatusLowBatteryHandler(): Promise<CharacteristicValue> {
    const StatusLowBattery = this.getStatusLowBattery();
    this.log.debug(`[${this.accessoryName}] Getting Status Low Battery: ${Battery.getStatusLowBatteryName(StatusLowBattery)}`);

    return StatusLowBattery;
  }

  // BatteryLevel

  async getBatteryLevelHandler(): Promise<CharacteristicValue> {
    const BatteryLevel = this.getBatteryLevel();
    this.log.debug(`[${this.accessoryName}] Getting Battery Level: ${BatteryLevel}%`);

    return BatteryLevel;
  }

  // ChargingState

  async getChargingStateHandler(): Promise<CharacteristicValue> {
    const ChargingState = this.getChargingState();
    this.log.debug(`[${this.accessoryName}] Getting Charging State: ${Battery.getChargingStateName(ChargingState)}`);

    return ChargingState;
  }

  // *** Handlers ***

  protected getJsonState(): string {
    const jsonState = {
      [this.batteryLevelStorageKey]: this.getBatteryLevel(),
      [this.chargingStateStorageKey]: this.getChargingState(),
    };

    const json = JSON.stringify(jsonState);

    return json;
  }

  protected getAccessoryTypeName(): string {
    return Battery.ACCESSORY_TYPE_NAME;
  }

  static getStatusLowBatteryName(level: number): string {
    let levelName: string;

    switch (level) {
    case undefined: { levelName = 'undefined'; break; }
    case Battery.BATTERY_LEVEL_NORMAL: { levelName = 'BATTERY LEVEL NORMAL'; break; }
    case Battery.BATTERY_LEVEL_LOW: { levelName = 'BATTERY LEVEL LOW'; break; }
    default: { levelName = level.toString(); }
    }

    return levelName;
  }

  static getChargingStateName(state: number): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Battery.NOT_CHARGING: { stateName = 'NOT CHARGING'; break; }
    case Battery.CHARGING: { stateName = 'CHARGING'; break; }
    case Battery.NOT_CHARGEABLE: { stateName = 'NOT CHARGEABLE'; break; }
    default: { stateName = state.toString(); }
    }

    return stateName;
  }

  // Updatable Charging State interface

  updateCharging(
    charging: boolean,
    charge: number,
    accessoryId: string,
  ): void {
    this.log.debug(`[${this.accessoryName}] Request update charging to ${charging}`);
    this.log.debug(`[${this.accessoryName}] Request update charge to ${charge}`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new ChargingStateUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }

    if (charging !== undefined) {
      if (typeof charging !== 'boolean') {
        this.log.error(`[${this.accessoryName}] Value ${charging} is not valid for Battery charging state`);

        throw new InvalidChargingStateType(`Invalid charging value: ${charging}`);
      }
      else {
        if (this.getChargingState() !== Battery.NOT_CHARGEABLE) {
          this.updateChargingState(charging ? Battery.CHARGING : Battery.NOT_CHARGING);
        }
      }
    }

    if (charge !== undefined) {
      if (typeof charge !== 'number') {
        this.log.error(`[${this.accessoryName}] Value ${charge} is not valid for Battery charge state`);

        throw new InvalidChargingStateType(`Invalid charge value: ${charge}`);
      }
      else {
        const BatteryLevel: number = Math.min(charge, 100);
        this.updateBatteryLevel(BatteryLevel);
        this.updateStatusLowBattery((BatteryLevel <= this.lowLevelThreshold) ? Battery.BATTERY_LEVEL_LOW : Battery.BATTERY_LEVEL_NORMAL);
      }
    }

    this.storeState();
  }

  // Convenience methods

  private setupStaticFields() {
    Battery.BATTERY_LEVEL_NORMAL  = CharacteristicType.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    Battery.BATTERY_LEVEL_LOW     = CharacteristicType.StatusLowBattery.BATTERY_LEVEL_LOW;

    Battery.NOT_CHARGING          = CharacteristicType.ChargingState.NOT_CHARGING;
    Battery.CHARGING              = CharacteristicType.ChargingState.CHARGING;
    Battery.NOT_CHARGEABLE        = CharacteristicType.ChargingState.NOT_CHARGEABLE;
  }

  // StatusLowBattery

  private getStatusLowBattery(): number {
    return this.getValue(CharacteristicType.StatusLowBattery) as number;
  }

  private updateStatusLowBattery(
    value: number,
  ) {
    this.updateValue(CharacteristicType.StatusLowBattery, value);
  }

  // BatteryLevel

  private getBatteryLevel(): number {
    return this.getValue(CharacteristicType.BatteryLevel) as number;
  }

  private updateBatteryLevel(
    value: number,
  ) {
    this.updateValue(CharacteristicType.BatteryLevel, value);
  }

  // ChargingState

  private getChargingState(): number {
    return this.getValue(CharacteristicType.ChargingState) as number;
  }

  private updateChargingState(
    value: number,
  ) {
    this.updateValue(CharacteristicType.ChargingState, value);
  }
}
