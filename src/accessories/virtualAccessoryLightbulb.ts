import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoryPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * Lightbulb - Accessory implementation
 */
export class Lightbulb extends Accessory {

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  static readonly WHITE: string = 'white';
  static readonly AMBIANCE: string = 'ambiance';
  static readonly COLOR: string = 'color';

  private type: string;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private states = {
    LightbulbState: Lightbulb.OFF,
    LightbulbBrightness: 100,
    LightbulbColorTemperature: this.kelvinToMired(2700),
    // TODO: Add Brightness, Hue, Saturation
  };

  // TODO: Add Brightness, Color Temperature, Hue, Saturation
  private readonly stateStorageKey: string = 'LightbulbState';
  private readonly brightnessStorageKey: string = 'LightbulbBrightness';
  private readonly colorTemperatureStorageKey: string = 'LightbulbColorTemperature';

  constructor(
    platform: VirtualAccessoryPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    this.type = this.accessoryConfiguration.lightbulb.type;

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.lightbulb.defaultState === 'on' ? Lightbulb.ON : Lightbulb.OFF;
    const brightness = this.accessoryConfiguration.lightbulb.brightness;
    const colorTemperatureKelvin = this.accessoryConfiguration.lightbulb.colorTemperatureKelvin;

    // If the accessory is stateful retrieve stored state, otherwise set to default state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;
      const cachedBrightness: number = accessoryState[this.brightnessStorageKey] as number;

      if (cachedState !== undefined && cachedBrightness !== undefined) {
        this.states.LightbulbState = cachedState;
        this.states.LightbulbBrightness = cachedBrightness;
      } else {
        this.states.LightbulbState = this.defaultState;
        this.states.LightbulbBrightness = brightness;
      }

      if (this.type === Lightbulb.AMBIANCE) {
        const cachedColorTemperature: number = accessoryState[this.colorTemperatureStorageKey] as number;

        if (cachedColorTemperature !== undefined) {
          this.states.LightbulbColorTemperature = cachedColorTemperature;
        } else {
          this.states.LightbulbColorTemperature = this.kelvinToMired(colorTemperatureKelvin);
        }
      }
    } else {
      this.states.LightbulbState = this.defaultState;
    }

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Virtual Accessories for Homebridge')
      .setCharacteristic(this.platform.Characteristic.Model, 'Virtual Accessory - Lightbulb')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Lightbulb Current State: ${Lightbulb.getStateName(this.states.LightbulbState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.states.LightbulbState));
    this.service.updateCharacteristic(this.platform.Characteristic.Brightness, (this.states.LightbulbBrightness));

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this)) // SET - bind to the `setBrightness` method below
      .onGet(this.getBrightness.bind(this)); // GET - bind to the `getBrightness` method below

    switch(this.type) {
    case Lightbulb.AMBIANCE:
      // register handlers for the ColorTemperature Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
        .onSet(this.setColorTemperature.bind(this))
        .onGet(this.getColorTemperature.bind(this));

      break;
    case Lightbulb.COLOR:
      // TODO: implement characteristics for color bulbs - Brightness, Saturation, Hue
      break;
    case Lightbulb.WHITE:
      // No additional characteristics
      break;
    }

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
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.LightbulbState = value as boolean;

    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${Lightbulb.getStateName(this.states.LightbulbState)}`);
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
    const lightbulbState = this.states.LightbulbState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${Lightbulb.getStateName(lightbulbState)}`);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return lightbulbState;
  }

  async setBrightness(value: CharacteristicValue) {
    this.states.LightbulbBrightness = value as number;

    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Brightness: ${this.states.LightbulbBrightness}%`);
  }

  async getBrightness(): Promise<CharacteristicValue> {
    const lightbulbBrightness = this.states.LightbulbBrightness;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Brightness: ${lightbulbBrightness}%`);

    return lightbulbBrightness;
  }

  async setColorTemperature(value: CharacteristicValue) {
    this.states.LightbulbColorTemperature = value as number;

    if (this.accessoryConfiguration.accessoryIsStateful) {
      this.saveAccessoryState(this.storagePath, this.getJsonState());
    }

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Color Temperature: ${this.miredToKelvin(this.states.LightbulbColorTemperature)} K`);
  }

  async getColorTemperature() {
    const lightbulbColorTemperature = this.states.LightbulbColorTemperature;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Color Temperature: ${this.miredToKelvin(lightbulbColorTemperature)} K`);

    return lightbulbColorTemperature;
  }

  private getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.LightbulbState,
      [this.brightnessStorageKey]: this.states.LightbulbBrightness,
    });

    if (this.type === Lightbulb.AMBIANCE) {
      Object.assign(json, { [this.colorTemperatureStorageKey]: this.states.LightbulbColorTemperature });
    }

    return json;
  }

  static getStateName(state: boolean): string {
    let stateName: string;

    switch (state) {
    case undefined: { stateName = 'undefined'; break; }
    case Lightbulb.ON: { stateName = 'ON'; break; }
    case Lightbulb.OFF: { stateName = 'OFF'; break; }
    default: { stateName = state.toString();}
    }

    return stateName;
  }

  // micro-reciprocal degrees (mired): 1,000,000 divided by the color temperature in kelvins
  private kelvinToMired(
    kelvin: number,
  ): number {
    return (1000000 / kelvin);
  }

  private miredToKelvin(
    mired: number,
  ): number {
    return (1000000 / mired);
  }
}
