import type { CharacteristicValue, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { Timer } from '../utils/timer.js';

/**
 * Valve - Accessory implementation
 */
export class Valve extends Accessory {

  static readonly ACCESSORY_SERVICE_TYPE: WithUUID<typeof Service> = ServiceType.Valve;

  private durationTimer: Timer;

  private readonly stateStorageKey: string = 'ValveActive';
  // private readonly timerStartTimeStorageKey: string = 'TimerStartTime';
  // private readonly timerDurationStorageKey: string = 'TimerDuration';
  // private readonly timerIsRunningStorageKey: string = 'TimerIsRunning';

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration);

    let ValveType: number = Valve.GENERIC_VALVE;
    let Active: number = Valve.INACTIVE;
    let InUse: number = Valve.NOT_IN_USE;
    let SetDuration: number = 0;
    const RemainingDuration: number = 0;

    switch(this.accessoryConfiguration.valve.type) {
    case 'generic':
      ValveType = Valve.GENERIC_VALVE;
      break;
    case 'irrigation':
      ValveType = Valve.IRRIGATION;
      break;
    case 'showerhead':
      ValveType = Valve.SHOWER_HEAD;
      break;
    case 'waterfaucet':
      ValveType = Valve.WATER_FAUCET;
      break;
    // Should never drop down to here, but being defensive
    default:
      ValveType = Valve.GENERIC_VALVE;
      break;
    }

    // First configure the device based on the accessory details
    SetDuration = this.accessoryConfiguration.valve.duration.toSeconds();

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: number = accessoryState[this.stateStorageKey] as number;

      if (cachedState !== undefined) {
        Active = cachedState;
        InUse = (Active === Valve.ACTIVE) ? Valve.IN_USE : Valve.NOT_IN_USE;
      }
    }

    // Timer is not resettable
    const timerIsResettable: boolean = false;
    this.durationTimer = new Timer(
      this.accessoryName,
      this.log,
      timerIsResettable,
      SetDuration,
    );

    // Update the initial state of the accessory
    this.setValveType(ValveType);
    this.setActive(Active);
    this.setInUse(InUse);
    this.setSetDuration(SetDuration);
    this.setRemainingDuration(RemainingDuration);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.ValveType)
      .onGet(this.getValveTypeHelper.bind(this));

    this.service.getCharacteristic(CharacteristicType.Active)
      .onSet(this.setActiveHelper.bind(this))
      .onGet(this.getActiveHelper.bind(this));

    this.service.getCharacteristic(CharacteristicType.InUse)
      .onGet(this.getInUseHelper.bind(this));

    this.service.getCharacteristic(CharacteristicType.SetDuration)
      .onSet(this.setSetDurationHelper.bind(this))
      .onGet(this.getSetDurationHelper.bind(this));

    this.service.getCharacteristic(CharacteristicType.RemainingDuration)
      .onGet(this.getRemainingDurationHelper.bind(this));
  }

  // Handlers

  //
  // ****************************** Handlers ******************************
  //

  // ValveType

  async getValveTypeHelper(): Promise<CharacteristicValue> {
    const ValveType: number = this.getValveType();
    this.log.debug(`[${this.accessoryName}] Getting Valve Type: ${Valve.getValveTypeName(ValveType)}`);

    return ValveType;
  }

  // Active

  async getActiveHelper(): Promise<CharacteristicValue> {
    const Active = this.getActive();
    this.log.debug(`[${this.accessoryName}] Getting Active: ${Valve.getActiveName(Active)}`);

    return Active;
  }

  async setActiveHelper(value: CharacteristicValue) {
    let Active: number = value as number;
    Active = this.updateActive(Active);
    this.log.info(`[${this.accessoryName}] Setting Active: ${Valve.getActiveName(Active)}`);

    let InUse: number = (Active === Valve.ACTIVE) ? Valve.IN_USE : Valve.NOT_IN_USE;
    InUse = this.updateInUse(InUse);
    this.log.info(`[${this.accessoryName}] Setting In Use: ${Valve.getInUseName(InUse)}`);

    this.saveState();

    // Valve was turned off: turn off timer
    if (Active === Valve.INACTIVE) {
      this.durationTimer.stop();
    }
    // Valve was turned on: try to start timer
    if (Active === Valve.ACTIVE && this.accessoryConfiguration.valve.duration.toSeconds() > 0) {
      this.durationTimer.start(
        () => {
          this.updateActive(Valve.INACTIVE);
        },
      );
    }
  }

  // InUse

  async getInUseHelper(): Promise<CharacteristicValue> {
    const InUse: number = this.getInUse();
    this.log.debug(`[${this.accessoryName}] Getting In Use: ${Valve.getInUseName(InUse)}`);

    return InUse;
  }

  // SetDuration

  async getSetDurationHelper(): Promise<CharacteristicValue> {
    const SetDuration = this.getSetDuration();
    this.log.debug(`[${this.accessoryName}] Getting Set Duration: ${SetDuration} seconds`);

    return SetDuration;
  }

  async setSetDurationHelper(value: CharacteristicValue) {
    let SetDuration: number = value as number;
    SetDuration = this.updateSetDuration(SetDuration);
    this.log.info(`[${this.accessoryName}] Setting Set Duration: ${SetDuration} seconds`);

    this.durationTimer.setDefaultDuration(SetDuration);
  }

  // RemainingDuration

  async getRemainingDurationHelper(): Promise<CharacteristicValue> {
    const RemainingDuration: number = this.durationTimer.getRemainingDuration();
    this.log.debug(`[${this.accessoryName}] Getting Remaining Duration: ${RemainingDuration} seconds`);

    return RemainingDuration;
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getActive(),
      // [this.timerStartTimeStorageKey]: this.durationTimer.getStartTime().toString(),
      // [this.timerDurationStorageKey]: this.durationTimer.getDuration(),
      // [this.timerIsRunningStorageKey]: this.durationTimer.isTimerRunning(),
    };

    const json = JSON.stringify(jsonState);
    return json;
  }

  protected getAccessoryService(): WithUUID<typeof Service> {
    return Valve.ACCESSORY_SERVICE_TYPE;
  }

  //
  // ****************************** Companion Switch ******************************
  //

  static readonly GENERIC_VALVE: number =       CharacteristicType.ValveType.GENERIC_VALVE;
  static readonly IRRIGATION: number =          CharacteristicType.ValveType.IRRIGATION;
  static readonly SHOWER_HEAD: number =         CharacteristicType.ValveType.SHOWER_HEAD;
  static readonly WATER_FAUCET: number =        CharacteristicType.ValveType.WATER_FAUCET;

  static readonly INACTIVE: number =            CharacteristicType.Active.INACTIVE;
  static readonly ACTIVE: number =              CharacteristicType.Active.ACTIVE;

  static readonly NOT_IN_USE: number =          CharacteristicType.InUse.NOT_IN_USE;
  static readonly IN_USE: number =              CharacteristicType.InUse.IN_USE;

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
