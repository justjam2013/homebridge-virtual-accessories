/* eslint-disable brace-style */
 
import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { VirtualAccessoriesPlatform } from '../platform.js';
import { Accessory } from './accessory.js';

import { Utils } from '../utils/utils.js';
import { ColorHSL, Colors } from '../utils/colorUtils.js';

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

  private readonly stateStorageKey: string = 'LightbulbState';
  private readonly brightnessStorageKey: string = 'LightbulbBrightness';
  private readonly colorTemperatureStorageKey: string = 'LightbulbColorTemperature';
  private readonly hueStorageKey: string = 'LightbulbHue';
  private readonly saturationStorageKey: string = 'LightbulbSaturation';

  private type: string = Lightbulb.WHITE;

  private states = {
    LightbulbState: Lightbulb.OFF,
    LightbulbBrightness: 0,
    LightbulbColorTemperature: 2700,  // Kelvin
    LightbulbHue: 0,
    LightbulbSaturation: 0,
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    this.type = this.accessoryConfiguration.lightbulb.type;

    // First configure the device based on the accessory details
    this.defaultState = this.accessoryConfiguration.lightbulb.defaultState === 'on' ? Lightbulb.ON : Lightbulb.OFF;
    const brightness: number = this.accessoryConfiguration.lightbulb.brightness;
    const colorTemperatureKelvin: number = this.accessoryConfiguration.lightbulb.colorTemperatureKelvin;
    const colorHex: string = this.accessoryConfiguration.lightbulb.colorHex;

    this.states.LightbulbState = this.defaultState;
    this.states.LightbulbBrightness = brightness;

    if (this.type === Lightbulb.WHITE) {
      this.states.LightbulbBrightness = brightness;
    }
    else if (this.type === Lightbulb.AMBIANCE) {
      this.states.LightbulbBrightness = brightness;
      this.states.LightbulbColorTemperature = colorTemperatureKelvin;
    }
    else if (this.type === Lightbulb.COLOR) {
      const hsl: ColorHSL = Colors.HexToHSL(colorHex)!;
      this.states.LightbulbHue = hsl.hue;
      this.states.LightbulbSaturation = hsl.saturation;
      this.states.LightbulbBrightness = hsl.luminance;
    }

    // If the accessory is stateful retrieve stored state
    if (this.accessoryConfiguration.accessoryIsStateful) {
      const accessoryState = this.loadAccessoryState(this.storagePath);
      const cachedState: boolean = accessoryState[this.stateStorageKey] as boolean;
      const cachedBrightness: number = accessoryState[this.brightnessStorageKey] as number;
      const cachedColorTemperature: number = accessoryState[this.colorTemperatureStorageKey] as number;
      const cachedHue: number = accessoryState[this.hueStorageKey] as number;
      const cachedSaturation: number = accessoryState[this.saturationStorageKey] as number;

      if (cachedState !== undefined) {
        this.states.LightbulbState = cachedState;
      }
      if (cachedBrightness !== undefined) {
        this.states.LightbulbBrightness = cachedBrightness;
      }

      if (this.type === Lightbulb.AMBIANCE && cachedColorTemperature !== undefined) {
        this.states.LightbulbColorTemperature = cachedColorTemperature;
      }

      if (this.type === Lightbulb.COLOR) {
        if (cachedHue !== undefined) {
          this.states.LightbulbHue = cachedHue;
        }
        if (cachedSaturation !== undefined) {
          this.states.LightbulbSaturation = cachedSaturation;
        }
      }
    }

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessoryConfiguration.accessoryName);

    // Update the initial state of the accessory
    this.log.debug(`[${this.accessoryName}] Setting Lightbulb Current State: ${Lightbulb.getStateName(this.states.LightbulbState)}`);
    this.service.updateCharacteristic(this.platform.Characteristic.On, (this.states.LightbulbState));
    this.service.updateCharacteristic(this.platform.Characteristic.Brightness, (this.states.LightbulbBrightness));

    // register handlers

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(Utils.debounce(this.setBrightness.bind(this)))
      .onGet(this.getBrightness.bind(this));

    switch(this.type) {
    case Lightbulb.AMBIANCE:
      // register handlers for the ColorTemperature Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
        .onSet(Utils.debounce(this.setColorTemperature.bind(this)))
        .onGet(this.getColorTemperature.bind(this));
      break;
    case Lightbulb.COLOR:
      this.service.getCharacteristic(this.platform.Characteristic.Hue)
        .onSet(Utils.debounce(this.setHue.bind(this)))
        .onGet(this.getHue.bind(this));

      this.service.getCharacteristic(this.platform.Characteristic.Saturation)
        .onSet(Utils.debounce(this.setSaturation.bind(this)))
        .onGet(this.getSaturation.bind(this));
      break;
    case Lightbulb.WHITE:
      // No additional characteristics
      break;
    }
  }

  // Handlers

  async setOn(value: CharacteristicValue) {
    this.states.LightbulbState = value as boolean;

    // If brightness is 0% or 100%, ON = 100%, OFF = 0%
    if ((this.states.LightbulbState === Lightbulb.ON) && (this.states.LightbulbBrightness === 0)) {
      this.states.LightbulbBrightness = 100;
      this.service?.updateCharacteristic(this.platform.Characteristic.Brightness, (this.states.LightbulbBrightness));
    }
    else if ((this.states.LightbulbState === Lightbulb.OFF) && (this.states.LightbulbBrightness === 100)) {
      this.states.LightbulbBrightness = 0;
      this.service?.updateCharacteristic(this.platform.Characteristic.Brightness, (this.states.LightbulbBrightness));
    }

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting State: ${Lightbulb.getStateName(this.states.LightbulbState)}`);
  }

  async getOn(): Promise<CharacteristicValue> {
    const lightbulbState = this.states.LightbulbState;

    this.log.debug(`[${this.accessoryName}] Getting State: ${Lightbulb.getStateName(lightbulbState)}`);

    return lightbulbState;
  }

  async setBrightness(value: CharacteristicValue) {
    this.states.LightbulbBrightness = value as number;

    // Setting the brightness to 0 turns lightbulb OFF
    if ((this.states.LightbulbBrightness === 0) && (this.states.LightbulbState === Lightbulb.ON)) {
      this.states.LightbulbState = Lightbulb.OFF;
      this.service?.updateCharacteristic(this.platform.Characteristic.On, (this.states.LightbulbState));
    }

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Brightness: ${this.states.LightbulbBrightness}%`);
  }

  async getBrightness(): Promise<CharacteristicValue> {
    const lightbulbBrightness = this.states.LightbulbBrightness;

    this.log.debug(`[${this.accessoryName}] Getting Brightness: ${lightbulbBrightness}%`);

    return lightbulbBrightness;
  }

  async setColorTemperature(miredValue: CharacteristicValue) {
    this.states.LightbulbColorTemperature = this.miredToKelvin(miredValue as number);

    this.storeState();

    this.log.debug(`[${this.accessoryName}] Setting Color Temperature: ${this.states.LightbulbColorTemperature}K (${miredValue} Mired)`);
  }

  async getColorTemperature(): Promise<CharacteristicValue> {
    const miredValue = this.kelvinToMired(this.states.LightbulbColorTemperature);

    this.log.debug(`[${this.accessoryName}] Getting Color Temperature: ${this.states.LightbulbColorTemperature}K (${miredValue} Mired)`);

    return miredValue;
  }

  async setHue(value: CharacteristicValue) {
    this.states.LightbulbHue = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Hue: ${this.states.LightbulbHue}º`);
  }

  async getHue(): Promise<CharacteristicValue> {
    const lightbulbHue = this.states.LightbulbHue;

    this.log.debug(`[${this.accessoryName}] Getting Hue: ${lightbulbHue}º`);

    return lightbulbHue;
  }

  async setSaturation(value: CharacteristicValue) {
    this.states.LightbulbSaturation = value as number;

    this.storeState();

    this.log.info(`[${this.accessoryName}] Setting Saturation: ${this.states.LightbulbSaturation}º`);
  }

  async getSaturation(): Promise<CharacteristicValue> {
    const lightbulbSaturation = this.states.LightbulbSaturation;

    this.log.debug(`[${this.accessoryName}] Getting Saturation: ${lightbulbSaturation}º`);

    return lightbulbSaturation;
  }

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.states.LightbulbState,
      [this.brightnessStorageKey]: this.states.LightbulbBrightness,
    };

    if (this.type === Lightbulb.AMBIANCE) {
      Object.assign(jsonState, { [this.colorTemperatureStorageKey]: this.states.LightbulbColorTemperature });
    }

    if (this.type === Lightbulb.COLOR) {
      Object.assign(jsonState, { [this.hueStorageKey]: this.states.LightbulbHue });
      Object.assign(jsonState, { [this.saturationStorageKey]: this.states.LightbulbSaturation });
    }

    const json = JSON.stringify(jsonState);

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
