import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';
import { Timer } from '../timer.js';
import { Utils } from '../utils.js';

/**
 * FilterMaintenance - Accessory implementation
 */
export class FilterMaintenance extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Filter';

  static readonly FILTER_OK: number = 0;      // Characteristic.FilterChangeIndication.FILTER_OK
  static readonly CHANGE_FILTER: number = 1;  // Characteristic.FilterChangeIndication.CHANGE_FILTER

  private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  private readonly timerDurationStorageKey: string = 'TimerDuration';
  private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  private lifespan: number;
  private lifespanTimer: Timer;

  private filterChangeIndicator: number;

  private states = {
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details

    this.lifespan = Utils.daysHoursMinutesSecondsToSeconds(
      this.accessoryConfiguration.filterMaintenance.lifespan.days,
      this.accessoryConfiguration.filterMaintenance.lifespan.hours,
      this.accessoryConfiguration.filterMaintenance.lifespan.minutes,
      this.accessoryConfiguration.filterMaintenance.lifespan.seconds,
    );

    // Timer is resettable
    const timerIsResettable: boolean = true;
    this.lifespanTimer = new Timer(
      this.accessoryConfiguration.accessoryName,
      this.log,
      timerIsResettable,
      this.lifespan,
    );

    this.filterChangeIndicator = this.lifespanTimer?.isTimerRunning() ? FilterMaintenance.FILTER_OK : FilterMaintenance.CHANGE_FILTER;

    const accessoryState: string = this.loadAccessoryState(this.storagePath);

    const cachedTimerStartTime = accessoryState[this.timerStartTimeStorageKey] as string;
    const cachedTimerDuration = accessoryState[this.timerDurationStorageKey] as number;
    const cachedTimerIsRunning = accessoryState[this.timerIsRunningStorageKey] as boolean;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Start Time: ${cachedTimerStartTime}`);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Duration: ${cachedTimerDuration}`);
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Cached Timer Is Running: ${cachedTimerIsRunning}`);

    // If the timer was running, calculate elapsed time and set timer for remaining duration
    if (cachedTimerIsRunning) {
      Utils.restoreRunningTimer(
        this.lifespanTimer,
        cachedTimerStartTime,
        cachedTimerDuration,
        this.onTimerExpired,
        this.accessoryConfiguration.accessoryName,
        this.log,
      );
      this.storeState();
    }

    this.service = this.accessory.getService(this.platform.Service.FilterMaintenance) || this.accessory.addService(this.platform.Service.FilterMaintenance);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    this.service.getCharacteristic(this.platform.Characteristic.FilterChangeIndication)
      .onGet(this.getFilterChangeIndication.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.FilterLifeLevel)
      .onGet(this.getFilterLifeLevel.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ResetFilterIndication)
      .onSet(this.setResetFilterIndication.bind(this));
  }

  // Handlers

  async getFilterChangeIndication(): Promise<CharacteristicValue> {
    const filterChangeIndicator = this.filterChangeIndicator;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Filter Change Indication: ${FilterMaintenance.getStateName(filterChangeIndicator)}`);

    return filterChangeIndicator;
  }

  async getFilterLifeLevel(): Promise<CharacteristicValue> {
    const lifeLevel = this.lifespanTimer.getRemainingDuration() / this.lifespanTimer.getRuntime() * 100;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Filter Life Level: ${lifeLevel}`);

    return lifeLevel;
  }

  async setResetFilterIndication(value: CharacteristicValue) {
    const reset = value as number;

    if (reset === 1) {
      this.lifespanTimer.stop();
      this.lifespanTimer.start(
        this.onTimerExpired,
      );
      this.filterChangeIndicator = FilterMaintenance.FILTER_OK;
    }

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Reset Filter Indication`);
  }

  protected getJsonState(): string {
    const timerStartTime: string = this.lifespanTimer.getStartTime().toString();
    const timerDuration: number = (this.lifespanTimer.getRuntime() > 0) ? this.lifespanTimer.getRuntime() : this.lifespanTimer.getDefaultDuration();
    const timerIsRunning: boolean = this.lifespanTimer.isTimerRunning();

    const jsonState = {
      [this.timerStartTimeStorageKey]: timerStartTime,
      [this.timerDurationStorageKey]: timerDuration,
      [this.timerIsRunningStorageKey]: timerIsRunning,
    };

    const json = JSON.stringify(jsonState);

    return json;
  }

  protected getAccessoryTypeName(): string {
    return FilterMaintenance.ACCESSORY_TYPE_NAME;
  }

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

  private onTimerExpired(): void {
    this.filterChangeIndicator = FilterMaintenance.CHANGE_FILTER;
  }
}
