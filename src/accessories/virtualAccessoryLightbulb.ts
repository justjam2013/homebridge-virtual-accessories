/* eslint-disable @typescript-eslint/no-explicit-any */
 
import type { CharacteristicValue, PlatformAccessory } from 'homebridge';

import { CharacteristicType, ServiceType, VirtualAccessoriesPlatform } from '../platform.js';
import { AccessoryConfiguration } from '../configuration/configurationAccessory.js';
import { Accessory } from './accessory.js';

import { ColorHSL, Colors } from '../utils/colorUtils.js';
import { Utils } from '../utils/utils.js';
import { LightbulbType } from '../configuration/schema.js';

/**
 * Lightbulb - Accessory implementation
 */
export class Lightbulb extends Accessory {

  private readonly stateStorageKey: string = 'LightbulbState';
  private readonly brightnessStorageKey: string = 'LightbulbBrightness';
  private readonly colorTemperatureStorageKey: string = 'LightbulbColorTemperatureMired';
  private readonly hueStorageKey: string = 'LightbulbHue';
  private readonly saturationStorageKey: string = 'LightbulbSaturation';

  private type: number;

  private states = {
  };

  constructor(
    platform: VirtualAccessoriesPlatform,
    accessory: PlatformAccessory,
    accessoryConfiguration: AccessoryConfiguration,
  ) {
    super(platform, accessory, accessoryConfiguration, ServiceType.Lightbulb);

    let On: boolean = Lightbulb.OFF;
    let Brightness: number = 0;
    let ColorTemperature: number = this.kelvinToMired(2700);  // Kelvin
    let Hue: number = 0;
    let Saturation: number = 0;

    // First configure the device based on the accessory details
    this.type =
      this.accessoryConfiguration.lightbulb.type === LightbulbType.Color ?
        Lightbulb.COLOR :
        (this.accessoryConfiguration.lightbulb.type === LightbulbType.Ambiance ?
          Lightbulb.AMBIANCE :
          Lightbulb.WHITE);
    this.defaultState = this.accessoryConfiguration.lightbulb.defaultState === 'on' ? Lightbulb.ON : Lightbulb.OFF;

    const brightness: number = this.accessoryConfiguration.lightbulb.brightness;
    const colorTemperatureKelvin: number = this.accessoryConfiguration.lightbulb.colorTemperatureKelvin;
    const colorHex: string = this.accessoryConfiguration.lightbulb.colorHex;

    On = this.defaultState;

    if (this.type === Lightbulb.WHITE) {
      Brightness = brightness;
    }
    else if (this.type === Lightbulb.AMBIANCE) {
      Brightness = brightness;
      ColorTemperature = this.kelvinToMired(colorTemperatureKelvin);
    }
    else if (this.type === Lightbulb.COLOR) {
      const hsl: ColorHSL = Colors.HexToHSL(colorHex)!;
      Hue = hsl.hue;
      Saturation = hsl.saturation;
      Brightness = hsl.luminance;
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
        On = cachedState;
      }
      if (cachedBrightness !== undefined) {
        Brightness = cachedBrightness;
      }

      if (this.type === Lightbulb.AMBIANCE && cachedColorTemperature !== undefined) {
        ColorTemperature = this.kelvinToMired(cachedColorTemperature);
      }

      if (this.type === Lightbulb.COLOR) {
        if (cachedHue !== undefined) {
          Hue = cachedHue;
        }
        if (cachedSaturation !== undefined) {
          Saturation = cachedSaturation;
        }
      }
    }

    // Update the initial state of the accessory
    this.setOn(On);
    this.setBrightness(Brightness);
    this.setColorTemperature(ColorTemperature);
    this.setHue(Hue);
    this.setSaturation(Saturation);

    // Last register handlers

    this.service.getCharacteristic(CharacteristicType.On)
      .onSet(this.setOnHandler.bind(this))
      .onGet(this.getOnHandler.bind(this));

    this.service.getCharacteristic(CharacteristicType.Brightness)
      .onSet(this.debounce(this.setBrightnessHandler.bind(this)))
      .onGet(this.getBrightnessHandler.bind(this));

    switch(this.type) {
    case Lightbulb.WHITE:
      this.removeCharacteristic(this.service.getCharacteristic(CharacteristicType.ColorTemperature));
      this.removeCharacteristic(this.service.getCharacteristic(CharacteristicType.Hue));
      this.removeCharacteristic(this.service.getCharacteristic(CharacteristicType.Saturation));
      break;
    case Lightbulb.AMBIANCE:
      this.service.getCharacteristic(CharacteristicType.ColorTemperature)
        .onSet(this.debounce(this.setColorTemperatureHandler.bind(this)))
        .onGet(this.getColorTemperatureHandler.bind(this));
      this.removeCharacteristic(this.service.getCharacteristic(CharacteristicType.Hue));
      this.removeCharacteristic(this.service.getCharacteristic(CharacteristicType.Saturation));
      break;
    case Lightbulb.COLOR:
      this.removeCharacteristic(this.service.getCharacteristic(CharacteristicType.ColorTemperature));
      this.service.getCharacteristic(CharacteristicType.Hue)
        .onSet(this.debounce(this.setHueHandler.bind(this)))
        .onGet(this.getHueHandler.bind(this));

      this.service.getCharacteristic(CharacteristicType.Saturation)
        .onSet(this.debounce(this.setSaturationHandler.bind(this)))
        .onGet(this.getSaturationHandler.bind(this));
      break;
    }
  }

  private debounce<T extends (...args: any[]) => void>(
    func: T,
  ): ((...args: any[]) => void) {
    const debounce = Utils.debounce(
      func,
      undefined,
      this.accessoryName,
      this.log,
    );
    return debounce!;
  }

  //
  // ****************************** Handlers ******************************
  //

  // On

  async getOnHandler(): Promise<CharacteristicValue> {
    const On: boolean = this.getOn();
    this.log.debug(`[${this.accessoryName}] Getting On: ${Lightbulb.getOnName(On)}`);

    return On;
  }

  async setOnHandler(value: CharacteristicValue) {
    let On: boolean = value as boolean;
    On = this.updateOn(On);
    this.log.info(`[${this.accessoryName}] Setting On: ${Lightbulb.getOnName(On)}`);

    // If brightness is 0% or 100%, ON = 100%, OFF = 0%
    let Brightness: number = this.getBrightness();
    if ((On === Lightbulb.ON) && (Brightness === 0)) {
      Brightness = 100;
    }
    else if ((On === Lightbulb.OFF) && (Brightness === 100)) {
      Brightness = 0;
    }

    Brightness = this.updateBrightness(Brightness);
    this.log.info(`[${this.accessoryName}] Setting Brightness: ${Brightness}%`);

    this.saveState();
  }

  // Brightness

  async getBrightnessHandler(): Promise<CharacteristicValue> {
    const Brightness: number = this.getBrightness();
    this.log.debug(`[${this.accessoryName}] Getting Brightness: ${Brightness}%`);

    return Brightness;
  }

  async setBrightnessHandler(value: CharacteristicValue) {
    let Brightness: number = value as number;
    Brightness = this.updateBrightness(Brightness);
    this.log.info(`[${this.accessoryName}] Setting Brightness: ${Brightness}%`);

    // Setting the brightness to 0 turns lightbulb OFF
    let On: boolean = this.getOn();
    if ((Brightness === 0) && (On === Lightbulb.ON)) {
      On = Lightbulb.OFF;
    }
    else if ((Brightness === 100) && (On === Lightbulb.OFF)) {
      On = Lightbulb.ON;
    }

    On = this.updateOn(On);
    this.log.info(`[${this.accessoryName}] Setting On: ${Lightbulb.getOnName(On)}`);

    this.saveState();
  }

  // ColorTemperature

  async getColorTemperatureHandler(): Promise<CharacteristicValue> {
    const ColorTemperature: number = this.getColorTemperature();
    const colorTemperatureKelvin: number = this.miredToKelvin(ColorTemperature);
    this.log.debug(`[${this.accessoryName}] Getting Color Temperature: ${colorTemperatureKelvin}K (${ColorTemperature} Mired)`);

    return ColorTemperature;
  }

  async setColorTemperatureHandler(value: CharacteristicValue) {
    let ColorTemperature: number = value as number;
    const colorTemperatureKelvin: number = this.miredToKelvin(ColorTemperature as number);
    ColorTemperature = this.updateColorTemperature(ColorTemperature);
    this.log.debug(`[${this.accessoryName}] Setting Color Temperature: ${colorTemperatureKelvin}K (${ColorTemperature} Mired)`);

    this.saveState();
  }

  // Hue

  async getHueHandler(): Promise<CharacteristicValue> {
    const Hue: number = this.getHue();
    this.log.debug(`[${this.accessoryName}] Getting Hue: ${Hue}º`);

    return Hue;
  }

  async setHueHandler(value: CharacteristicValue) {
    let Hue: number = value as number;
    Hue = this.updateHue(Hue);
    this.log.info(`[${this.accessoryName}] Setting Hue: ${Hue}º`);

    this.saveState();
  }

  // Saturation

  async getSaturationHandler(): Promise<CharacteristicValue> {
    const Saturation: number = this.getSaturation();
    this.log.debug(`[${this.accessoryName}] Getting Saturation: ${Saturation}º`);

    return Saturation;
  }

  async setSaturationHandler(value: CharacteristicValue) {
    let Saturation: number = value as number;
    Saturation = this.updateSaturation(Saturation);
    this.log.info(`[${this.accessoryName}] Setting Saturation: ${Saturation}º`);

    this.saveState();
  }

  // Abstract methods impl

  protected getJsonState(): string {
    const jsonState = {
      [this.stateStorageKey]: this.getOn(),
      [this.brightnessStorageKey]: this.getBrightness(),
    };

    if (this.type === Lightbulb.AMBIANCE) {
      Object.assign(jsonState, { [this.colorTemperatureStorageKey]: this.getColorTemperature() });
    }

    if (this.type === Lightbulb.COLOR) {
      Object.assign(jsonState, { [this.hueStorageKey]: this.getHue() });
      Object.assign(jsonState, { [this.saturationStorageKey]: this.getSaturation() });
    }

    const json = JSON.stringify(jsonState);
    return json;
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

  //
  // ****************************** Characteristics ******************************
  //

  // Lazy static getters

  static get ON(): boolean  { return true; }
  static get OFF(): boolean { return false; }

  static get WHITE(): number    { return 0; }
  static get AMBIANCE(): number { return 1; }
  static get COLOR(): number    { return 2; }

  static getOnName(state: boolean): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case Lightbulb.ON: { name = 'ON'; break; }
    case Lightbulb.OFF: { name = 'OFF'; break; }
    default: { name = state.toString();}
    }

    return name;
  }

  static getTypeName(state: number): string {
    let name: string;

    switch (state) {
    case undefined: { name = 'undefined'; break; }
    case Lightbulb.WHITE: { name = 'WHITE'; break; }
    case Lightbulb.AMBIANCE: { name = 'AMBIANCE'; break; }
    case Lightbulb.COLOR: { name = 'COLOR'; break; }
    default: { name = state.toString();}
    }

    return name;
  }
}
