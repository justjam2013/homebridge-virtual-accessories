/* eslint-disable brace-style */

import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { UpdatableCharging } from './updatableChargingState.js';
import { ChargingStateUpdateNotAllowed, InvalidChargingStateType } from '../errors.js';

class BatteryStatus {
  ChargingState: number = Battery.NOT_CHARGING;
  BatteryLevel: number = 100;
  StatusLowBattery: number = Battery.BATTERY_LEVEL_NORMAL;

  lowLevelThreshold: number = 5;
}

/**
 * Battery - Accessory implementation
 */
export class Battery extends Accessory implements UpdatableCharging {

  static readonly ACCESSORY_TYPE_NAME: string = 'Battery';

  static readonly BATTERY_LEVEL_NORMAL: number =  CharacteristicType.StatusLowBattery.BATTERY_LEVEL_NORMAL;
  static readonly BATTERY_LEVEL_LOW: number =     CharacteristicType.StatusLowBattery.BATTERY_LEVEL_LOW;

  static readonly NOT_CHARGING: number =          CharacteristicType.ChargingState.NOT_CHARGING;
  static readonly CHARGING: number =              CharacteristicType.ChargingState.CHARGING;
  static readonly NOT_CHARGEABLE: number =        CharacteristicType.ChargingState.NOT_CHARGEABLE;

  private readonly batteryLevelStorageKey: string = 'BatteryLevel';
  private readonly chargingStateStorageKey: string = 'ChargingState';

  private status: BatteryStatus = new BatteryStatus();

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.status.ChargingState = this.accessoryConfiguration.battery.isRechargeable ? Battery.NOT_CHARGING : Battery.NOT_CHARGEABLE;
    this.status.lowLevelThreshold = this.accessoryConfiguration.battery.lowLevelThreshold;

    // If the accessory is stateful retrieve stored state
    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedBatteryLevel = accessoryState[this.batteryLevelStorageKey] as number;
      const cachedChargingState = accessoryState[this.chargingStateStorageKey] as number;

      if (cachedBatteryLevel !== undefined) {
        this.status.BatteryLevel = cachedBatteryLevel;
        this.status.StatusLowBattery = (this.status.BatteryLevel <= this.status.lowLevelThreshold) ? Battery.BATTERY_LEVEL_LOW : Battery.BATTERY_LEVEL_NORMAL;
      }

      if (cachedChargingState !== undefined) {
        this.status.ChargingState = cachedChargingState;
      }
    }

    // register handlers

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
    const StatusLowBattery = this.status.StatusLowBattery;
    this.log.debug(`[${this.accessoryName}] Getting Status Low Battery: ${Battery.getStatusLowBatteryName(StatusLowBattery)}`);

    return StatusLowBattery;
  }

  // BatteryLevel

  async getBatteryLevelHandler(): Promise<CharacteristicValue> {
    const BatteryLevel = this.status.BatteryLevel;
    this.log.debug(`[${this.accessoryName}] Getting Battery Level: ${BatteryLevel}%`);

    return BatteryLevel;
  }

  // ChargingState

  async getChargingStateHandler(): Promise<CharacteristicValue> {
    const ChargingState = this.status.ChargingState;
    this.log.debug(`[${this.accessoryName}] Getting Charging State: ${Battery.getChargingStateName(ChargingState)}`);

    return ChargingState;
  }

  // Absract method implementations

  protected getJsonState(): string {
    const jsonState = {
      [this.batteryLevelStorageKey]: this.status.BatteryLevel,
      [this.chargingStateStorageKey]: this.status.ChargingState,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }

  protected getAccessoryTypeName(): string {
    return Battery.ACCESSORY_TYPE_NAME;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return ServiceType.Battery;
  }

  // Static

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
        if (this.status.ChargingState !== Battery.NOT_CHARGEABLE) {
          this.status.ChargingState = charging ? Battery.CHARGING : Battery.NOT_CHARGING;
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
        this.status.BatteryLevel = BatteryLevel;
        this.status.StatusLowBattery = (BatteryLevel <= this.status.lowLevelThreshold) ? Battery.BATTERY_LEVEL_LOW : Battery.BATTERY_LEVEL_NORMAL;
      }
    }

    this.storeState();
  }
}
