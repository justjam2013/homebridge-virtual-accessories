/* eslint-disable brace-style */

import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { Timer } from '../utils/timer.js';
import { Utils } from '../utils/utils.js';

class FilterMaintenanceStatus {
  lifespan: number = 0;
  filterChangeIndicator: number = 0;
}

/**
 * FilterMaintenance - Accessory implementation
 */
export class FilterMaintenance extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Filter';

  static readonly FILTER_OK: number =       CharacteristicType.FilterChangeIndication.FILTER_OK;
  static readonly CHANGE_FILTER: number =   CharacteristicType.FilterChangeIndication.CHANGE_FILTER;

  private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  private readonly timerDurationStorageKey: string = 'TimerDuration';
  private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  private lifespanTimer: Timer;

  private status: FilterMaintenanceStatus = new FilterMaintenanceStatus();

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    // First configure the device based on the accessory details
    this.status.lifespan = Utils.daysHoursMinutesSecondsToSeconds(
      this.accessoryConfiguration.filterMaintenance.lifespan.days,
      (this.accessoryConfiguration.filterMaintenance.lifespan.hours ??= 0),
      (this.accessoryConfiguration.filterMaintenance.lifespan.minutes ??= 0),
      (this.accessoryConfiguration.filterMaintenance.lifespan.seconds ??= 0),
    );

    const timerIsResettable: boolean = true;
    this.lifespanTimer = new Timer(
      this.accessoryConfiguration.accessoryName,
      this.log,
      timerIsResettable,
      this.status.lifespan,
    );

    // If the accessory is stateful retrieve stored state
    const accessoryState: string = this.loadAccessoryState(this.storagePath);
    if (this.isEmptyAccessoryState(accessoryState)) {
      // No stored state -> First run
      this.lifespanTimer.start(
        this.onTimerExpired.bind(this),
      );
      this.storeState();
    }
    else {
      const cachedTimerStartTime = accessoryState[this.timerStartTimeStorageKey] as string;
      const cachedTimerDuration = accessoryState[this.timerDurationStorageKey] as number;
      const cachedTimerIsRunning = accessoryState[this.timerIsRunningStorageKey] as boolean;

      if (this.status.lifespan === cachedTimerDuration) {
        // If the timer was running, calculate elapsed time and set timer for remaining duration
        if (cachedTimerIsRunning) {
          Utils.restoreRunningTimer(
            this.lifespanTimer,
            cachedTimerStartTime,
            cachedTimerDuration,
            this.onTimerExpired.bind(this),
            this.accessoryConfiguration.accessoryName,
            this.log,
          );

          // Do not store state if the timer was restored!
          // Store state only when the timer started or reset
        }
      }
      else {
        this.log.debug(`[${this.accessoryName}] Lifespan was changed from: ${cachedTimerDuration} to: ${this.status.lifespan}. Restart the timer`);

        // The lifetime was changed, restart the timer
        this.lifespanTimer.start(
          this.onTimerExpired.bind(this),
        );
        this.storeState();
      }
    }

    this.status.filterChangeIndicator = this.lifespanTimer?.isRunning() ? FilterMaintenance.FILTER_OK : FilterMaintenance.CHANGE_FILTER;

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.FilterChangeIndication)
      .onGet(this.getFilterChangeIndicationHandler.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.FilterLifeLevel)
      .onGet(this.getFilterLifeLevelHandler.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ResetFilterIndication)
      .onSet(this.setResetFilterIndicationHandler.bind(this));
  }

  // *** Handlers ***

  // FilterChangeIndication

  async getFilterChangeIndicationHandler(): Promise<CharacteristicValue> {
    const filterChangeIndicator = this.status.filterChangeIndicator;
    this.log.debug(`[${this.accessoryName}] Getting Filter Change Indication: ${FilterMaintenance.getStateName(filterChangeIndicator)}`);

    return filterChangeIndicator;
  }

  // FilterLifeLevel

  async getFilterLifeLevelHandler(): Promise<CharacteristicValue> {
    const filterLifeLevel = this.lifespanTimer.getRemainingDuration() / this.status.lifespan * 100;
    this.log.debug(`[${this.accessoryName}] Getting Filter Life Level: ${filterLifeLevel.toFixed(2)}%`);

    return filterLifeLevel;
  }

  // ResetFilterIndication

  async setResetFilterIndicationHandler(value: CharacteristicValue) {
    const reset = value as number;

    if (reset === 1) {
      this.lifespanTimer.stop();
      this.lifespanTimer.start(
        this.onTimerExpired.bind(this),
      );
      this.status.filterChangeIndicator = FilterMaintenance.FILTER_OK;
      this.storeState();

      this.log.info(`[${this.accessoryName}] Reset Filter Indication`);
    }
    else {
      this.log.error(`[${this.accessoryName}] Reset Filter Indication called with invalid value ${reset}`);
    }
  }

  protected getJsonState(): string {
    const timerStartTime: string = this.lifespanTimer.getStartTime().toString();
    const timerDuration: number = (this.lifespanTimer.getDuration() > 0) ? this.lifespanTimer.getDuration() : this.lifespanTimer.getDefaultDuration();
    const timerIsRunning: boolean = this.lifespanTimer.isRunning();

    const jsonState = {
      [this.timerStartTimeStorageKey]: timerStartTime,
      [this.timerDurationStorageKey]: timerDuration,
      [this.timerIsRunningStorageKey]: timerIsRunning,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }

  // Absract method implementations

  protected getAccessoryTypeName(): string {
    return FilterMaintenance.ACCESSORY_TYPE_NAME;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return ServiceType.Fan;
  }

  private onTimerExpired(): void {
    this.status.filterChangeIndicator = FilterMaintenance.CHANGE_FILTER;
    this.storeState();

    this.log.info(`[${this.accessoryName}] Filter lifetime expired`);
  }

  // Static

  static getStateName(event: number): string {
    let stateName: string;

    switch (event) {
    case undefined: { stateName = 'undefined'; break; }
    case FilterMaintenance.FILTER_OK: { stateName = 'FILTER OK'; break; }
    case FilterMaintenance.CHANGE_FILTER: { stateName = 'CHANGE FILTER'; break; }
    default: { stateName = event.toString(); }
    }

    return stateName;
  }
}
