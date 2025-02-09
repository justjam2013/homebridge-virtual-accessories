 

import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';
import { Timer } from '../timer.js';

export class Valve extends Accessory {

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

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    ValveActive: Valve.INACTIVE,
    ValveInUse: Valve.NOT_IN_USE,
  };

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    switch(this.accessoryConfiguration.valveType) {
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
      this.accessoryConfiguration.valveDuration,
      Timer.Units.Seconds,
    );

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Accessory - Valve')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Valve) || this.accessory.addService(this.platform.Service.Valve);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Valve Current State: ${this.getActiveName(this.states.ValveActive)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.Active, (this.states.ValveActive));
    this.service.updateCharacteristic(this.platform.Characteristic.InUse, (this.states.ValveInUse));
    this.service.updateCharacteristic(this.platform.Characteristic.SetDuration, (this.accessoryConfiguration.valveDuration));

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the ValveType Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.ValveType)
      .onGet(this.handleValveTypeGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.handleActiveSet.bind(this)) // SET - bind to the 'handleVolumeSet` method below
      .onGet(this.handleActiveGet.bind(this)); // GET - bind to the 'handleActiveGet` method below

    this.service.getCharacteristic(this.platform.Characteristic.InUse)
      .onGet(this.handleInUseGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.SetDuration)
      .onSet(this.handleSetDurationSet.bind(this))
      .onGet(this.handleSetDurationGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RemainingDuration)
      .onGet(this.handleRemainingDurationGet.bind(this));

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same subtype id.)
     */

  }

  /**
   * Handle "GET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async handleValveTypeGet(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const valveType = this.valveType;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Valve Type: ${this.getValveTypeName(valveType)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return valveType;
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  async handleActiveSet(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.ValveActive = value as number;

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Active: ${this.getActiveName(this.states.ValveActive)}`);

    this.states.ValveInUse = (this.states.ValveActive === Valve.ACTIVE) ? Valve.IN_USE : Valve.NOT_IN_USE;
    this.service!.setCharacteristic(this.platform.Characteristic.InUse, (this.states.ValveInUse));

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting In Use: ${this.getInUseName(this.states.ValveInUse)}`);

    // Store device state if stateful
    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }

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

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async handleActiveGet(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const valveActive = this.states.ValveActive;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Active: ${this.getActiveName(valveActive)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return valveActive;
  }

  /**
   * Handle "GET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async handleInUseGet(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const valveInUse = this.states.ValveInUse;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting In Use: ${this.getInUseName(valveInUse)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return valveInUse;
  }

  /**
   * Duration
   */
  async handleSetDurationSet(value: CharacteristicValue) {
    const duration = value as number;

    this.durationTimer.setDuration(duration, Timer.Units.Seconds);

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting Set Duration: ${duration} seconds`);
  }

  async handleSetDurationGet(): Promise<CharacteristicValue> {
    const duration = this.durationTimer.getDuration();

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Set Duration: ${duration} seconds`);

    return duration;
  }

  async handleRemainingDurationGet(): Promise<CharacteristicValue> {
    const remainingDuration = this.durationTimer.getRemainingDuration();

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Remaining Duration: ${remainingDuration} seconds`);

    return remainingDuration;
  }

  private getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.ValveActive,
      // [this.timerStartTimeStorageKey]: this.durationTimer.getStartTime().toString(),
      // [this.timerDurationStorageKey]: this.durationTimer.getDuration(),
      // [this.timerIsRunningStorageKey]: this.durationTimer.isTimerRunning(),
    });
    return json;
  }

  private getValveTypeName(event: number): string {
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

  private getActiveName(event: number): string {
    let eventName: string;

    switch (event) {
    case undefined: { eventName = 'undefined'; break; }
    case Valve.INACTIVE: { eventName = 'INACTIVE'; break; }
    case Valve.ACTIVE: { eventName = 'ACTIVE'; break; }
    default: { eventName = event.toString(); }
    }

    return eventName;
  }

  private getInUseName(event: number): string {
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
