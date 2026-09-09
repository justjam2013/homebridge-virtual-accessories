import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { Timer } from '../utils/timer.js';
import { Utils } from '../utils/utils.js';

/**
 * FilterMaintenance - Accessory implementation
 */
export class FilterMaintenance extends Accessory {

  private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  private readonly timerDurationStorageKey: string = 'TimerDuration';
  private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  private lifespan: number;
  private lifespanTimer: Timer;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.FilterMaintenance);

    let FilterChangeIndication: number = FilterMaintenance.FILTER_OK;
    const FilterLifeLevel: number = 100;

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
        this.onTimerExpiredHandler.bind(this),
      );
      this.saveState();
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
            this.onTimerExpiredHandler.bind(this),
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
          this.onTimerExpiredHandler.bind(this),
        );
        this.saveState();
      }
    }

    FilterChangeIndication = this.lifespanTimer?.isTimerRunning() ? FilterMaintenance.FILTER_OK : FilterMaintenance.CHANGE_FILTER;

    // Update the initial state of the accessory
    this.setFilterChangeIndication(FilterChangeIndication);
    this.setFilterLifeLevel(FilterLifeLevel);
    //this.updateResetFilterIndication(ResetFilterIndication);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.FilterChangeIndication)
      .onGet(this.getFilterChangeIndicationHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.FilterLifeLevel)
      .onGet(this.getFilterLifeLevelHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.ResetFilterIndication)
      .onSet(this.setResetFilterIndicationHandler.bind(this));
  }

  //
  // ****************************** Handlers ******************************
  //

  // FilterChangeIndication

  async getFilterChangeIndicationHandler(): Promise<CharacteristicValue> {
    const FilterChangeIndication: number = this.getFilterChangeIndication();
    this.log.debug(`[${this.accessoryName}] Getting Filter Change Indication: ${FilterMaintenance.getFilterChangeIndicationName(FilterChangeIndication)}`);

    return FilterChangeIndication;
  }

  // FilterLifeLevel

  async getFilterLifeLevelHandler(): Promise<CharacteristicValue> {
    const FilterLifeLevel: number = this.lifespanTimer.getRemainingDuration() / this.lifespan * 100;
    this.log.debug(`[${this.accessoryName}] Getting Filter Life Level: ${FilterLifeLevel.toFixed(2)}%`);

    return FilterLifeLevel;
  }

  // ResetFilterIndication

  async setResetFilterIndicationHandler(value: CharacteristicValue) {
    const ResetFilterIndication: number = value as number;

    if (ResetFilterIndication === 1) {
      this.lifespanTimer.stop();
      this.lifespanTimer.start(
        this.onTimerExpiredHandler.bind(this),
      );
      this.updateFilterChangeIndication(FilterMaintenance.FILTER_OK);
      this.log.info(`[${this.accessoryName}] Reset Filter Indication`);

      this.saveState();
    }
    else {
      this.log.error(`[${this.accessoryName}] Reset Filter Indication called with invalid value ${ResetFilterIndication}`);
    }
  }

  // Abstract methods impl

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

  private onTimerExpiredHandler(): void {
    this.updateResetFilterIndication(FilterMaintenance.CHANGE_FILTER);
    this.log.info(`[${this.accessoryName}] Filter lifetime expired`);

    this.saveState();
  }

  //
  // ****************************** Characteristics ******************************
  //

  // Lazy static getters

  static get FILTER_OK(): number      { return CharacteristicType.FilterChangeIndication.FILTER_OK; }
  static get CHANGE_FILTER(): number  { return CharacteristicType.FilterChangeIndication.CHANGE_FILTER; }

  static getFilterChangeIndicationName(event: number): string {
    let name: string;

    switch (event) {
    case undefined: { name = 'undefined'; break; }
    case FilterMaintenance.FILTER_OK: { name = 'FILTER OK'; break; }
    case FilterMaintenance.CHANGE_FILTER: { name = 'CHANGE FILTER'; break; }
    default: { name = event.toString(); }
    }

    return name;
  }
}
