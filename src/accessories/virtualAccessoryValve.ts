import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { Timer } from '../utils/timer.js';
import { Active, InUse, ValveType } from './accessoryCharacteristics.js';

/**
 * Valve - Accessory implementation
 */
export class Valve extends Accessory<typeof Service.Valve> {

  private static readonly ACCESSORY_TYPE_NAME: string = 'Valve';

  private valveType: number;
  private durationTimer: Timer;

  private readonly stateStorageKey: string = 'ValveActive';
  // private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  // private readonly timerDurationStorageKey: string = 'TimerDuration';
  // private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  // Device states
  private Active: number = Active.INACTIVE;
  private InUse: number = InUse.NOT_IN_USE;

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(
      platform,
      accessory,
      accessoryConfiguration,
      platform.Service.Valve,
      Valve.ACCESSORY_TYPE_NAME,
    );

    switch(this.accessoryConfiguration.valve.type) {
    case 'generic':
      this.valveType = ValveType.GENERIC_VALVE;
      break;
    case 'irrigation':
      this.valveType = ValveType.IRRIGATION;
      break;
    case 'showerhead':
      this.valveType = ValveType.SHOWER_HEAD;
      break;
    case 'waterfaucet':
      this.valveType = ValveType.WATER_FAUCET;
      break;
    // Should never drop down to here, but being defensive
    default:
      this.valveType = ValveType.GENERIC_VALVE;
      break;
    }

    // First configure the device based on the accessory details
    this.Active = Active.INACTIVE;
    this.InUse = InUse.NOT_IN_USE;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.Active = cachedState;
        this.InUse = (this.Active === Active.ACTIVE) ? InUse.IN_USE : InUse.NOT_IN_USE;
      }
    }

    // Timer is not resettable
    const timerIsResettable: boolean = false;
    this.durationTimer = new Timer(
      this.accessoryName,
      this.log,
      timerIsResettable,
      this.accessoryConfiguration.valve.duration.toSeconds(),
    );

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Valve Current State: ${Active.getName(this.Active)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.Active, (this.Active));
    this.service.updateCharacteristic(this.platform.Characteristic.InUse, (this.InUse));
    this.service.updateCharacteristic(this.platform.Characteristic.SetDuration, (this.accessoryConfiguration.valve.duration.toSeconds()));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.ValveType)
      .onGet(this.getValveType.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(this.getActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.InUse)
      .onGet(this.getInUse.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.SetDuration)
      .onSet(this.setSetDuration.bind(this))
      .onGet(this.getSetDuration.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RemainingDuration)
      .onGet(this.getRemainingDuration.bind(this));
  }

  // Handlers

  async getValveType(): Promise<CharacteristicValue> {
    const valveType = this.valveType;

    this.log.debug(`[${this.accessoryName}] Getting Valve Type: ${ValveType.getName(valveType)}`);

    return valveType;
  }

  async setActive(value: CharacteristicValue) {
    this.Active = value as number;

    this.log.info(`[${this.accessoryName}] Setting Active: ${Active.getName(this.Active)}`);

    this.InUse = (this.Active === Active.ACTIVE) ? InUse.IN_USE : InUse.NOT_IN_USE;
    this.service!.setCharacteristic(this.platform.Characteristic.InUse, (this.InUse));

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting In Use: ${InUse.getName(this.InUse)}`);

    // Valve was turned off: turn off timer
    if (this.Active === Active.INACTIVE) {
      this.durationTimer.stop();
    }
    // Valve was turned on: try to start timer
    if (this.Active === Active.ACTIVE && this.accessoryConfiguration.valve.duration.toSeconds() > 0) {
      this.durationTimer.start(
        () => {
          this.service!.setCharacteristic(this.platform.Characteristic.Active, Active.INACTIVE);
        },
      );
    }
  }

  async getActive(): Promise<CharacteristicValue> {
    const valveActive = this.Active;

    this.log.debug(`[${this.accessoryName}] Getting Active: ${Active.getName(valveActive)}`);

    return valveActive;
  }

  async getInUse(): Promise<CharacteristicValue> {
    const valveInUse = this.InUse;

    this.log.debug(`[${this.accessoryName}] Getting In Use: ${InUse.getName(valveInUse)}`);

    return valveInUse;
  }

  async setSetDuration(value: CharacteristicValue) {
    const duration = value as number;

    this.durationTimer.setDefaultDuration(duration);

    this.log.info(`[${this.accessoryName}] Setting Set Duration: ${duration} seconds`);
  }

  async getSetDuration(): Promise<CharacteristicValue> {
    const duration = this.durationTimer.getDefaultDuration();

    this.log.debug(`[${this.accessoryName}] Getting Set Duration: ${duration} seconds`);

    return duration;
  }

  async getRemainingDuration(): Promise<CharacteristicValue> {
    const remainingDuration = this.durationTimer.getRemainingDuration();

    this.log.debug(`[${this.accessoryName}] Getting Remaining Duration: ${remainingDuration} seconds`);

    return remainingDuration;
  }

  protected override getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.Active,
      // [this.timerStartTimeStorageKey]: this.durationTimer.getStartTime().toString(),
      // [this.timerDurationStorageKey]: this.durationTimer.getDuration(),
      // [this.timerIsRunningStorageKey]: this.durationTimer.isTimerRunning(),
    });
    return json;
  }
}
