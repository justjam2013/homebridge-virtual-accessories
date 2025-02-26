import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './virtualAccessory.js';

/**
 * Lightbulb - Accessory implementation
 */
export class Lightbulb extends Accessory {

  static readonly ACCESSORY_TYPE_NAME: string = 'Lightbulb';

  static readonly ON: boolean = true;
  static readonly OFF: boolean = false;

  static readonly WHITE: string = 'white';
  static readonly AMBIANCE: string = 'ambiance';
  static readonly COLOR: string = 'color';

  // TODO: Add Brightness, Hue, Saturation
  private readonly stateStorageKey: string = 'LightbulbState';
  private readonly brightnessStorageKey: string = 'LightbulbBrightness';
  private readonly colorTemperatureStorageKey: string = 'LightbulbColorTemperature';

  private type: string;

  private states = {
    LightbulbState: Lightbulb.OFF,
    LightbulbBrightness: 100,
    LightbulbColorTemperature: 2700,  // Kelvin
    // TODO: Add Brightness, Hue, Saturation
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    this.type = this.accessoryConfiguration.lightbulb.type;

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.lightbulb.defaultState === 'on' ? Lightbulb.ON : Lightbulb.OFF;
    const brightness = this.accessoryConfiguration.lightbulb.brightness;
    const colorTemperatureKelvin = this.accessoryConfiguration.lightbulb.colorTemperatureKelvin;

    this.states.LightbulbState = this.defaultState;
    this.states.LightbulbBrightness = brightness;

    if (this.type === Lightbulb.AMBIANCE) {
      this.states.LightbulbColorTemperature = colorTemperatureKelvin;
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;
      const cachedBrightness: number = accessoryState[this.brightnessStorageKey] as number;
      const cachedColorTemperature: number = accessoryState[this.colorTemperatureStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.LightbulbState = cachedState;
      }
      if (cachedBrightness !== undefined) {
        this.states.LightbulbBrightness = cachedBrightness;
      }

      if (this.type === Lightbulb.AMBIANCE && cachedColorTemperature !== undefined) {
        this.states.LightbulbColorTemperature = cachedColorTemperature;
      }
    }

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Lightbulb Current State: ${Lightbulb.getStateName(this.states.LightbulbState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.states.LightbulbState));
    this.service.updateCharacteristic(this.platform.Characteristic.Brightness, (this.states.LightbulbBrightness));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))
      .onGet(this.getBrightness.bind(this));

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
  }

  /**
   * Handle "SET" requests from HomeKit
   */
  async setOn(value: CharacteristicValue) {
    this.states.LightbulbState = value as boolean;

    this.storeState();

    this.log.info(`[${this.accessoryConfiguration.accessoryName}] Setting State: ${Lightbulb.getStateName(this.states.LightbulbState)}`);
  }

  /**
   * Handle the "GET" requests from HomeKit
   */
  async getOn(): Promise<CharacteristicValue> {
    const lightbulbState = this.states.LightbulbState;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting State: ${Lightbulb.getStateName(lightbulbState)}`);

    return lightbulbState;
  }

  async setBrightness(value: CharacteristicValue) {
    this.states.LightbulbBrightness = value as number;

    this.storeState();

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Brightness: ${this.states.LightbulbBrightness}%`);
  }

  async getBrightness(): Promise<CharacteristicValue> {
    const lightbulbBrightness = this.states.LightbulbBrightness;

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Brightness: ${lightbulbBrightness}%`);

    return lightbulbBrightness;
  }

  // Receive value in mireds
  async setColorTemperature(miredValue: CharacteristicValue) {
    this.states.LightbulbColorTemperature = this.miredToKelvin(miredValue as number);

    this.storeState();

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Setting Color Temperature: ${this.states.LightbulbColorTemperature}K (${miredValue} Mired)`);
  }

  // Return value in mireds
  async getColorTemperature() {
    const miredValue = this.kelvinToMired(this.states.LightbulbColorTemperature);

    this.log.debug(`[${this.accessoryConfiguration.accessoryName}] Getting Color Temperature: ${this.states.LightbulbColorTemperature}K (${miredValue} Mired)`);

    return miredValue;
  }

  protected getJsonState(): string {
    const json = JSON.stringify({
      [this.stateStorageKey]: this.states.LightbulbState,
      [this.brightnessStorageKey]: this.states.LightbulbBrightness,
    });

    if (this.type === Lightbulb.AMBIANCE) {
      Object.assign(json, { [this.colorTemperatureStorageKey]: this.states.LightbulbColorTemperature });
    }

    return json;
  }

  protected getAccessoryTypeName(): string {
    return Lightbulb.ACCESSORY_TYPE_NAME;
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
    return Math.round(1000000 / kelvin);
  }

  private miredToKelvin(
    mired: number,
  ): number {
    return Math.round(1000000 / mired);
  }
}
