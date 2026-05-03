/* eslint-disable brace-style */

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { UpdatableChargingState } from './updatableChargingState.js';
import { ChargingStateUpdateNotAllowed, InvalidChargingStateType } from '../errors.js';
import { ChargingState, StatusLowBattery } from './accessoryCharacteristics.js';

/**
 * Battery - Accessory implementation
 */
export class Battery extends Accessory<typeof Service.Battery> implements UpdatableChargingState {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Battery';

  private readonly batteryLevelStorageKey: string = 'BatteryLevel';
  private readonly chargingStateStorageKey: string = 'ChargingState';

  private lowLevelThreshold: number;

  // Device state
  private ChargeLevel: number = 100;
  private ChargingState: number = ChargingState.NOT_CHARGING;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.Battery,
      Battery.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details
    this.ChargingState = this.accessoryConfiguration.battery.isRechargeable ? ChargingState.NOT_CHARGING : ChargingState.NOT_CHARGEABLE;
    this.lowLevelThreshold = this.accessoryConfiguration.battery.lowLevelThreshold;

    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (!this.isEmptyAccessoryState(accessoryState)) {
      const cachedBatteryLevel = accessoryState[this.batteryLevelStorageKey] as number;
      const cachedChargingState = accessoryState[this.chargingStateStorageKey] as number;

      if (cachedBatteryLevel !== undefined) {
        this.ChargeLevel = cachedBatteryLevel;
      }

      if (cachedChargingState !== undefined) {
        this.ChargingState = cachedChargingState;
      }
    }

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .onGet(this.getStatusLowBattery.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(this.getBatteryLevel.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ChargingState)
      .onGet(this.getChargingState.bind(this));
  }

  // Handlers

  async getStatusLowBattery(): Promise<CharacteristicValue> {
    const batteryLevel = (this.ChargeLevel <= this.lowLevelThreshold) ? StatusLowBattery.BATTERY_LEVEL_LOW : StatusLowBattery.BATTERY_LEVEL_NORMAL;

    this.log.debug(`[${this.accessoryName}] Getting Status Low Battery: ${StatusLowBattery.getName(batteryLevel)}`);

    return batteryLevel;
  }

  async getBatteryLevel(): Promise<CharacteristicValue> {
    const batteryLevel = this.ChargeLevel;

    this.log.debug(`[${this.accessoryName}] Getting Battery Level: ${batteryLevel}%`);

    return batteryLevel;
  }

  async getChargingState(): Promise<CharacteristicValue> {
    const chargingState = this.ChargingState;

    this.log.debug(`[${this.accessoryName}] Getting Charging State: ${ChargingState.getName(chargingState)}`);

    return chargingState;
  }

  //

  protected override getJsonState(): string {
    const jsonState = {
      [this.batteryLevelStorageKey]: this.ChargeLevel,
      [this.chargingStateStorageKey]: this.ChargingState,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }

  // Updatable Charging State interface

  updateChargingState(
    charging: boolean,
    charge: number,
    accessoryId: string,
  ): void {
    this.log.debug(`[${this.accessoryName}] Request update charging to ${charging}`);
    this.log.debug(`[${this.accessoryName}] Request update charge to ${charge}`);

    if (accessoryId !== this.accessoryId) {
      this.log.error(`[${this.accessoryName}] Accessory Id  ${accessoryId} is not valid for this accessory`);

      throw new ChargingStateUpdateNotAllowed(`Invalid accessory id: ${accessoryId}`);
    }

    if (charging !== undefined) {
      if (typeof charging !== 'boolean') {
        this.log.error(`[${this.accessoryName}] Value ${charging} is not valid for Battery charging state`);

        throw new InvalidChargingStateType(`Invalid charging value: ${charging}`);
      }
      else {
        if (this.ChargingState !== ChargingState.NOT_CHARGEABLE) {
          this.ChargingState = charging ? ChargingState.CHARGING : ChargingState.NOT_CHARGING;
        }
      }
    }

    if (charge !== undefined) {
      if (typeof charge !== 'number') {
        this.log.error(`[${this.accessoryName}] Value ${charge} is not valid for Battery charge state`);

        throw new InvalidChargingStateType(`Invalid charge value: ${charge}`);
      }
      else {
        this.ChargeLevel = Math.min(charge, 100);
      }
    }

    this.storeState();
  }
}
