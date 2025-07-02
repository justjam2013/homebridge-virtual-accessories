import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { Timer } from '../utils/timer.js';

/**
 * Valve - Accessory implementation
 */
export class Valve extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Valve';

  static readonly GENERIC_VALVE: number = 0;  // Characteristic.ValveType.GENERIC_VALVE
  static readonly IRRIGATION: number = 1;     // Characteristic.ValveType.IRRIGATION
  static readonly SHOWER_HEAD: number = 2;    // Characteristic.ValveType.SHOWER_HEAD
  static readonly WATER_FAUCET: number = 3;   // Characteristic.ValveType.WATER_FAUCET

  static readonly INACTIVE: number = 0;   // Characteristic.Active.INACTIVE
  static readonly ACTIVE: number = 1;     // Characteristic.Active.ACTIVE

  static readonly NOT_IN_USE: number = 0;   // Characteristic.InUse.NOT_IN_USE
  static readonly IN_USE: number = 1;       // Characteristic.InUse.IN_USE

  private valveType: number;
  private durationTimer: Timer;

  private readonly stateStorageKey: string = 'ValveActive';
  // private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  // private readonly timerDurationStorageKey: string = 'TimerDuration';
  // private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  private states = {
    ValveActive: Valve.INACTIVE,
    ValveInUse: Valve.NOT_IN_USE,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    switch(this.accessoryConfiguration.valve.type) {
    case 'generic':
      this.valveType = Valve.GENERIC_VALVE;
      break;
    case 'irrigation':
      this.valveType = Valve.IRRIGATION;
      break;
    case 'showerhead':
      this.valveType = Valve.SHOWER_HEAD;
      break;
    case 'waterfaucet':
      this.valveType = Valve.WATER_FAUCET;
      break;
    // Should never drop down to here, but being defensive
    default:
      this.valveType = Valve.GENERIC_VALVE;
      break;
    }

    // First configure the device based on the accessory details
    this.states.ValveActive = Valve.INACTIVE;
    this.states.ValveInUse = Valve.NOT_IN_USE;

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.ValveActive = cachedState;
        this.states.ValveInUse = (this.states.ValveActive === Valve.ACTIVE) ? Valve.IN_USE : Valve.NOT_IN_USE;
      }
    }

    // Timer is not resettable
    const timerIsResettable: boolean = false;
    this.durationTimer = new Timer(
      this.accessoryConfiguration.accessoryName,
      this.log,
      timerIsResettable,
      this.accessoryConfiguration.valve.duration.toSeconds(),
    );

    this.service = this.accessory.getService(this.platform.Service.Valve) || this.accessory.addService(this.platform.Service.Valve);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Valve Current State: ${Valve.getActiveName(this.states.ValveActive)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.Active, (this.states.ValveActive));
    this.service.updateCharacteristic(this.platform.Characteristic.InUse, (this.states.ValveInUse));
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

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Valve Type: ${Valve.getValveTypeName(valveType)}`);

    return valveType;
  }

  async setActive(value: CharacteristicValue) {
    this.states.ValveActive = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Active: ${Valve.getActiveName(this.states.ValveActive)}`);

    this.states.ValveInUse = (this.states.ValveActive === Valve.ACTIVE) ? Valve.IN_USE : Valve.NOT_IN_USE;
    this.service!.setCharacteristic(this.platform.Characteristic.InUse, (this.states.ValveInUse));

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting In Use: ${Valve.getInUseName(this.states.ValveInUse)}`);

    // Valve was turned off: turn off timer
    if (this.states.ValveActive === Valve.INACTIVE) {
      this.durationTimer.stop();
    }
    // Valve was turned on: try to start timer
    if (this.states.ValveActive === Valve.ACTIVE) {
      this.durationTimer.start(
        () => {
          this.service!.setCharacteristic(this.platform.Characteristic.Active, Valve.INACTIVE);
        },
      );
    }
  }

  async getActive(): Promise<CharacteristicValue> {
    const valveActive = this.states.ValveActive;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Active: ${Valve.getActiveName(valveActive)}`);

    return valveActive;
  }

  async getInUse(): Promise<CharacteristicValue> {
    const valveInUse = this.states.ValveInUse;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting In Use: ${Valve.getInUseName(valveInUse)}`);

    return valveInUse;
  }

  async setSetDuration(value: CharacteristicValue) {
    const duration = value as number;

    this.durationTimer.setDefaultDuration(duration);

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Set Duration: ${duration} seconds`);
  }

  async getSetDuration(): Promise<CharacteristicValue> {
    const duration = this.durationTimer.getDefaultDuration();

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Set Duration: ${duration} seconds`);

    return duration;
  }

  async getRemainingDuration(): Promise<CharacteristicValue> {
    const remainingDuration = this.durationTimer.getRemainingDuration();

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Remaining Duration: ${remainingDuration} seconds`);

    return remainingDuration;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.ValveActive,
      // [this.timerStartTimeStorageKey]: this.durationTimer.getStartTime().toString(),
      // [this.timerDurationStorageKey]: this.durationTimer.getDuration(),
      // [this.timerIsRunningStorageKey]: this.durationTimer.isTimerRunning(),
    });
    return json;
  }

  protected getAccessoryTypeName(): string {
    return Valve.ACCESSORY_TYPE_NAME;
  }

  static getValveTypeName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case Valve.GENERIC_VALVE: { eventName = 'GENERIC VALVE'; break; }
    case Valve.IRRIGATION: { eventName = 'IRRIGATION'; break; }
    case Valve.SHOWER_HEAD: { eventName = 'SHOWER HEAD'; break; }
    case Valve.WATER_FAUCET: { eventName = 'WATER FAUCET'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }

  static getActiveName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case Valve.INACTIVE: { eventName = 'INACTIVE'; break; }
    case Valve.ACTIVE: { eventName = 'ACTIVE'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }

  static getInUseName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case Valve.NOT_IN_USE: { eventName = 'NOT IN USE'; break; }
    case Valve.IN_USE: { eventName = 'IN USE'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }
}
