/* eslint-disable brace-style */

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { Timer } from '../utils/timer.js';
import { Utils } from '../utils/utils.js';
import { FilterChangeIndication } from './accessoryCharacteristics.js';

/**
 * FilterMaintenance - Accessory implementation
 */
export class FilterMaintenance extends Accessory<typeof Service.FilterMaintenance> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Filter';

  private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  private readonly timerDurationStorageKey: string = 'TimerDuration';
  private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  private lifespan: number;
  private lifespanTimer: Timer;

  private filterChangeIndicator: number;

  // Device state
  //

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.FilterMaintenance,
      FilterMaintenance.ACCESSORY_TYPE_NAME,
    );

    // First configure the device based on the accessory details

    this.lifespan = Utils.daysHoursMinutesSecondsToSeconds(
      this.accessoryConfiguration.filterMaintenance.lifespan.days,
      (this.accessoryConfiguration.filterMaintenance.lifespan.hours ??= 0),
      (this.accessoryConfiguration.filterMaintenance.lifespan.minutes ??= 0),
      (this.accessoryConfiguration.filterMaintenance.lifespan.seconds ??= 0),
    );

    const timerIsResettable: boolean = true;
    this.lifespanTimer = new Timer(
      this.accessoryName,
      this.log,
      timerIsResettable,
      this.lifespan,
    );

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

      if (this.lifespan === cachedTimerDuration) {
        // If the timer was running, calculate elapsed time and set timer for remaining duration
        if (cachedTimerIsRunning) {
          Utils.restoreRunningTimer(
            this.lifespanTimer,
            cachedTimerStartTime,
            cachedTimerDuration,
            this.onTimerExpired.bind(this),
            this.accessoryName,
            this.log,
          );

        // Do not store state if the timer was restored!
        // Store state only when the timer started or reset
        }
      }
      else {
         
        this.log.debug(`[${this.accessoryName}] Lifespan was changed from: ${cachedTimerDuration} to: ${this.lifespan}. Restart the timer`);

        // The lifetime was changed, restart the timer
        this.lifespanTimer.start(
          this.onTimerExpired.bind(this),
        );
        this.storeState();
      }
    }

    this.filterChangeIndicator = this.lifespanTimer?.isTimerRunning() ? FilterChangeIndication.FILTER_OK : FilterChangeIndication.CHANGE_FILTER;

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

    this.log.debug(`[${this.accessoryName}] Getting Filter Change Indication: ${FilterChangeIndication.getName(filterChangeIndicator)}`);

    return filterChangeIndicator;
  }

  async getFilterLifeLevel(): Promise<CharacteristicValue> {
    const filterLifeLevel = this.lifespanTimer.getRemainingDuration() / this.lifespan * 100;

    this.log.debug(`[${this.accessoryName}] Getting Filter Life Level: ${filterLifeLevel.toFixed(2)}%`);

    return filterLifeLevel;
  }

  async setResetFilterIndication(value: CharacteristicValue) {
    const reset = value as number;

    if (reset === 1) {
      this.lifespanTimer.stop();
      this.lifespanTimer.start(
        this.onTimerExpired.bind(this),
      );
      this.filterChangeIndicator = FilterChangeIndication.FILTER_OK;
      this.storeState();

      this.log.info(`[${this.accessoryName}] Reset Filter Indication`);
    }
    else {
      this.log.error(`[${this.accessoryName}] Reset Filter Indication called with invalid value ${reset}`);
    }
  }

  //

  protected override getJsonState(): string {
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

  private onTimerExpired(): void {
    this.filterChangeIndicator = FilterChangeIndication.CHANGE_FILTER;
    this.storeState();

    this.log.info(`[${this.accessoryName}] Filter lifetime expired`);
  }
}
