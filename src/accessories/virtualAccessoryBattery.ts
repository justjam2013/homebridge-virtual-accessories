/* eslint-disable brace-style */

import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { UpdatableChargingStatus } from './updatableChargingState.js';
import { ChargingStateUpdateNotAllowed, InvalidChargingStateType } from '../errors.js';

/**
 * Battery - Accessory implementation
 */
export class Battery extends Accessory implements UpdatableChargingStatus {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.Battery;

  private readonly batteryLevelStorageKey: string = 'BatteryLevel';
  private readonly chargingStateStorageKey: string = 'ChargingState';

  private lowLevelThreshold: number;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    let StatusLowBattery: number = Battery.BATTERY_LEVEL_NORMAL;
    let BatteryLevel: number = 100;
    let ChargingState: number = Battery.NOT_CHARGING;

    // First configure the device based on the accessory details
    ChargingState = this.accessoryConfiguration.battery.isRechargeable ? Battery.NOT_CHARGING : Battery.NOT_CHARGEABLE;
    this.lowLevelThreshold = this.accessoryConfiguration.battery.lowLevelThreshold;

    // Accessory is stateful, retrieve stored state
    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedBatteryLevel = accessoryState[this.batteryLevelStorageKey] as number;
      const cachedChargingState = accessoryState[this.chargingStateStorageKey] as number;

      if (cachedBatteryLevel !== undefined) {
        BatteryLevel = cachedBatteryLevel;
      }

      if (cachedChargingState !== undefined) {
        ChargingState = cachedChargingState;
      }
    }

    StatusLowBattery = (BatteryLevel <= this.lowLevelThreshold) ? Battery.BATTERY_LEVEL_LOW : Battery.BATTERY_LEVEL_NORMAL;

    // Update the initial state of the accessory     
    this.setStatusLowBattery(StatusLowBattery);
    this.setBatteryLevel(BatteryLevel);
    this.setChargingState(ChargingState);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.StatusLowBattery)
      .onGet(this.getStatusLowBatteryHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.BatteryLevel)
      .onGet(this.getBatteryLevelHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.ChargingState)
      .onGet(this.getChargingStateHandler.bind(this));
  }

  //
  // ****************************** Handlers ******************************
  //

  // StatusLowBattery

  async getStatusLowBatteryHandler(): Promise<CharacteristicValue> {
    const StatusLowBattery: number = this.getStatusLowBattery();
    this.log.debug(`[${this.accessoryName}] Getting Status Low Battery: ${Battery.getStatusLowBatteryName(StatusLowBattery)}`);

    return StatusLowBattery;
  }

  // BatteryLevel

  async getBatteryLevelHandler(): Promise<CharacteristicValue> {
    const BatteryLevel: number = this.getBatteryLevel();
    this.log.debug(`[${this.accessoryName}] Getting Battery Level: ${BatteryLevel}%`);

    return BatteryLevel;
  }

  // ChargingState

  async getChargingStateHandler(): Promise<CharacteristicValue> {
    const ChargingState: number = this.getChargingState();
    this.log.debug(`[${this.accessoryName}] Getting Charging State: ${Battery.getChargingStateName(ChargingState)}`);

    return ChargingState;
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.batteryLevelStorageKey]: this.getBatteryLevel(),
      [this.chargingStateStorageKey]: this.getChargingState(),
    };

    const json = JSON.stringify(jsonState);
    return json;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return Battery.ACCESSORY_SERVICE_TYPE;
  }

  // Updatable Charging State interface

  updateChargingStatus(
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
          const ChargingState: number = this.updateChargingState(charging ? Battery.CHARGING : Battery.NOT_CHARGING);
          this.log.debug(`[${this.accessoryName}] Battery charging state: ${Battery.getChargingStateName(ChargingState)}`);
        }
      }
    }

    if (charge !== undefined) {
      if (typeof charge !== 'number') {
        this.log.error(`[${this.accessoryName}] Value ${charge} is not valid for Battery charge state`);

        throw new InvalidChargingStateType(`Invalid charge value: ${charge}`);
      }
      else {
        const BatteryLevel: number = this.updateBatteryLevel(Math.min(charge, 100));
        this.log.debug(`[${this.accessoryName}] Battery chatrge level: ${BatteryLevel}`);
      }
    }

    this.saveState();
  }

  //
  // ****************************** Characteristics ******************************
  //

  static readonly BATTERY_LEVEL_NORMAL: number =      CharacteristicType.StatusLowBattery.BATTERY_LEVEL_NORMAL;
  static readonly BATTERY_LEVEL_LOW: number =         CharacteristicType.StatusLowBattery.BATTERY_LEVEL_LOW;

  static readonly NOT_CHARGING: number =              CharacteristicType.ChargingState.NOT_CHARGING;
  static readonly CHARGING: number =                  CharacteristicType.ChargingState.CHARGING;
  static readonly NOT_CHARGEABLE: number =            CharacteristicType.ChargingState.NOT_CHARGEABLE;

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
}
