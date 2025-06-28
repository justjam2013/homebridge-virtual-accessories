/* eslint-disable brace-style */
 

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

import { UpdatableChargingState } from '../updatableChargingState.js';
import { ChargingStateUpdateNotAllowed, InvalidChargingStateType } from '../errors.js';

/**
 * Battery - Accessory implementation
 */
export class Battery extends Accessory implements UpdatableChargingState {

  static readonly ACCESSORY_TYPE_NAME: string = 'Battery';

  static readonly BATTERY_LEVEL_NORMAL: number = 0;   // Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
  static readonly BATTERY_LEVEL_LOW: number = 1;      // Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW

  static readonly NOT_CHARGING: number = 0;     // Characteristic.ChargingState.NOT_CHARGING
  static readonly CHARGING: number = 1;         // Characteristic.ChargingState.CHARGING
  static readonly NOT_CHARGEABLE: number = 2;   // Characteristic.ChargingState.NOT_CHARGEABLE

  private readonly batteryLevelStorageKey: string = 'BatteryLevel';
  private readonly chargingStateStorageKey: string = 'ChargingState';

  private lowLevelThreshold: number;

  private states = {
    BatteryLevelStatus: 100,
    ChargingState: Battery.NOT_CHARGING,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.states.ChargingState = this.accessoryConfiguration.battery.isRechargeable ? Battery.NOT_CHARGING : Battery.NOT_CHARGEABLE;
    this.lowLevelThreshold = this.accessoryConfiguration.battery.lowLevelThreshold;

    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (this.isEmptyAccessoryState(accessoryState)) {
      const cachedBatteryLevel = accessoryState[this.batteryLevelStorageKey] as number;
      const cachedChargingState = accessoryState[this.chargingStateStorageKey] as number;

      if (cachedBatteryLevel !== undefined) {
        this.states.BatteryLevelStatus = cachedBatteryLevel;
      }

      if (cachedChargingState !== undefined) {
        this.states.ChargingState = cachedChargingState;
      }
    }

    this.service = this.accessory.getService(this.platform.Service.Battery) || this.accessory.addService(this.platform.Service.Battery);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .onGet(this.getStatusLowBattery.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(this.getBatteryLevel.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ChargingState)
      .onGet(this.getChargingState.bind(this));
  }

  // Handlers

  async getStatusLowBattery(): Promise<CharacteristicValue> {
    const batteryLevel = (this.states.BatteryLevelStatus <= this.lowLevelThreshold) ? Battery.BATTERY_LEVEL_LOW : Battery.BATTERY_LEVEL_NORMAL;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Status Low Battery: ${Battery.getStatusLowBatteryName(batteryLevel)}`);

    return batteryLevel;
  }

  async getBatteryLevel(): Promise<CharacteristicValue> {
    const batteryLevel = this.states.BatteryLevelStatus;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Battery Level: ${batteryLevel}%`);

    return batteryLevel;
  }

  async getChargingState(): Promise<CharacteristicValue> {
    const chargingState = this.states.ChargingState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Charging State: ${Battery.getChargingStateName(chargingState)}`);

    return chargingState;
  }

  protected getJsonState(): string {
    const jsonState = {
      [this.batteryLevelStorageKey]: this.states.BatteryLevelStatus,
      [this.chargingStateStorageKey]: this.states.ChargingState,
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

  updateChargingState(
    charging: boolean,
    charge: number,
    accessoryId: string,
  ): void {
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Request update charging to ${charging}`);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Request update charge to ${charge}`);

    if (accessoryId !== this.accessoryConfiguration.accessoryID) {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new ChargingStateUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }

    if (typeof charging !== 'boolean') {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Value ${charging} is not valid for Battery charging state`);

      throw new InvalidChargingStateType(`Invalid charging value: ${charging}`);
    }
    else {
      if (this.states.ChargingState !== Battery.NOT_CHARGEABLE) {
        this.states.ChargingState = charging ? Battery.CHARGING : Battery.NOT_CHARGING;
      }
    }

    if (typeof charge !== 'number') {
      this.log.error(`[${this.accessoryConfiguration.accessoryName}] Value ${charge} is not valid for Battery charge state`);

      throw new InvalidChargingStateType(`Invalid charge value: ${charge}`);
    }
    else {
      this.states.BatteryLevelStatus = Math.min(charge, 100);

      if (this.states.BatteryLevelStatus === 100) {
        this.states.ChargingState = Battery.NOT_CHARGING;
      }
    }

    this.storeState();
  }
}
