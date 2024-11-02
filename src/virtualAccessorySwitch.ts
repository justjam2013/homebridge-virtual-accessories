import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from './platform.js';
import { VirtualAccessory } from './virtualAccessory.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class VirtualSwitchAccessory extends VirtualAccessory {

  private ON: boolean = true;
  private OFF: boolean = false;

  private CONTACT_DETECTED: number = this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;          // 0
  private CONTACT_NOT_DETECTED: number = this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;  // 1

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    SwitchState: this.OFF,
    SensorState: this.CONTACT_DETECTED,
  };

  private readonly stateStorageKey: string = 'SwitchState';

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // First configure the device based on the accessory details
    this.defaultState = this.device.switchDefaultState === 'on' ? this.ON : this.OFF;
    this.platform.log.info(`[${this.device.accessoryName}] Default state: ${this.getStateName(this.defaultState)}`);

    this.platform.log.info(`[${this.device.accessoryName}] Is stateful: ${this.isStateful}`);

    // If the accessory is stateful retrieve stored state, otherwise set to default state
    if (this.isStateful) {
      const cachedState = this.loadState(this.storagePath, this.stateStorageKey) as boolean;
      this.platform.log.info(`[${this.device.accessoryName}] Cached state: ${this.getStateName(cachedState)}`);

      if (cachedState !== undefined) {
        this.states.SwitchState = cachedState;
        this.states.SensorState = this.determineSensorState();
      } else {
        this.states.SwitchState = this.defaultState;
        this.states.SensorState = this.CONTACT_DETECTED;
      }
    } else {
      this.states.SwitchState = this.defaultState;
      this.states.SensorState = this.CONTACT_DETECTED;
    }

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Switch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID);

    // get the Switch service if it exists, otherwise create a new Switch service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.device.accessoryName);

    // Update the initial state of the accessory
    this.platform.log.debug(`[${this.device.accessoryName}] Setting Switch Current State: ${this.getStateName(this.states.SwitchState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.states.SwitchState));

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below

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

    // Create sensor service
    if (this.hasCompanionSensor) {
      this.sensorService = this.createCompanionSensor(this.accessory.UUID, this.device.companionSensor);

      // Update the initial state of the companion sensor
      this.platform.log.debug(`[${this.device.accessoryName}] Setting Sensor Current State: ${this.getSensorStateName(this.states.SensorState)}`);
      this.sensorService.updateCharacteristic(this.sensorCharacteristic, (this.states.SensorState));

      this.sensorService.getCharacteristic(this.sensorCharacteristic)
        .onGet(this.handleSensorStateGet.bind(this)); // GET - bind to the `handleSensorStateGet` method below
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.SwitchState = value as boolean;

    if (this.hasResetTimer) {
      this.startResetTimer();
    }

    if (this.hasCompanionSensor) {
      this.states.SensorState = this.determineSensorState();

      this.sensorService.updateCharacteristic(this.sensorCharacteristic, this.states.SensorState);
    }

    if (this.isStateful) {
      this.saveState(this.storagePath, this.stateStorageKey, this.states.SwitchState);
    }

    this.platform.log.info(`[${this.device.accessoryName}] Setting Switch Cureent State: ${this.getStateName(this.states.SwitchState)}`);
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
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const switchState = this.states.SwitchState;

    this.platform.log.debug(`[${this.device.accessoryName}] Getting Switch Current State: ${this.getStateName(switchState)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return switchState;
  }

  /**
   * Handle requests to get the current value of the "Contact Sensor State" characteristic
   */
  handleSensorStateGet() {
    const sensorState = this.states.SensorState;

    this.platform.log.debug(`[${this.device.accessoryName}] Getting Sensor Current State: ${this.getSensorStateName(sensorState)}`);

    return sensorState;
  }

  // Create and start the accessory reset delay timer
  protected startResetTimer() {
    const isLeadingEdge = (
      (this.states.SwitchState === this.ON && this.defaultState === this.OFF) ||
      (this.states.SwitchState === this.OFF && this.defaultState === this.ON)
    );
    if (isLeadingEdge) {
      const timerConfig =  this.device.resetTimer;

      let duration: number;
      if (timerConfig.durationIsRandom) {
        const minDuration = timerConfig.durationRandomMin;
        const maxDuration = timerConfig.durationRandomMax;
        duration = Math.floor(Math.random() * (maxDuration + 1 - minDuration) + minDuration);
      } else {
        duration = timerConfig.duration;
      }

      const units = timerConfig.units;
      switch (units) {
      case 'days':
        duration *= 24;
        // falls through
      case 'hours':
        duration *= 60;
        // falls through
      case 'minutes':
        duration *= 60;
        // falls through
      case 'seconds':
        duration *= 1000;
      }

      if (timerConfig.isResettable) {
        clearTimeout(this.timerId);
      }

      // Start the state reset timer
      const resetValue = (this.states.SwitchState === this.ON) ? this.OFF : this.ON;
      this.timerId = setTimeout(() => {
        this.service!.setCharacteristic(this.platform.Characteristic.On, resetValue);
      }, duration);
    }
  }

  // Default switch state Off:
  //     switch turns on -> contact opens
  //     switch turns off -> contact closes
  // Default state state On:
  //     switch turns off -> contact opens
  //     switch turns on -> contact closes
  private determineSensorState(): number {
    let sensorState: number;

    if (this.defaultState === this.OFF) {
      sensorState = (this.states.SwitchState === this.OFF) ? this.CONTACT_DETECTED : this.CONTACT_NOT_DETECTED;
    } else {
      sensorState = (this.states.SwitchState === this.ON) ? this.CONTACT_DETECTED : this.CONTACT_NOT_DETECTED;
    }

    return sensorState;
  }

  private getStateName(state: boolean): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case this.ON: { stateName = 'ON'; break; }
    case this.OFF: { stateName = 'OFF'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }

  private getSensorStateName(state: number): string {
    let sensorStateName: string;

    switch (state) {
    case undefined: { sensorStateName = 'undefined'; break; }
    case this.CONTACT_DETECTED: { sensorStateName = 'CONTACT DETECTED'; break; }
    case this.CONTACT_NOT_DETECTED: { sensorStateName = 'CONTACT NOT DETECTED'; break; }
    default: { sensorStateName = state.toString();}
    }

    return sensorStateName;
  }
}
